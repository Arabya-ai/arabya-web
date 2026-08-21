"""
Layer 1 — Hybrid Arabic NLP proofreader pipeline.

Every input string passes sequentially through:
  Stage 1: PyArabic + Ghalatawi rule cleanup
  Stage 2: Local Ollama contextual grammar / style
"""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy.orm import Session

from app.models import GrammarErrorStat, ProofreadJob, utcnow
from app.pipeline.llm_stage import run_llm_stage
from app.pipeline.rule_stage import run_rule_stage
from app.schemas import ProofreadResponse, TextEdit
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.proofreader")

_WORD_RE = re.compile(r"[\u0600-\u06FFa-zA-Z0-9]+")
_LETTER_RE = re.compile(r"[\u0600-\u06FFa-zA-Z0-9]")


def count_words(text: str) -> int:
    return len(_WORD_RE.findall(text or ""))


def remap_edits_to_original(
    original: str,
    edits: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Re-locate every edit on the *user-facing original* string.

    Stage-1 rewrites (لاكن→لكن) shift later indices; Ollama historically
    returned start=end=0. Next.js drops edits whose span does not match
    `original.slice(start, end) === original_token`.
    """
    claimed: set[tuple[int, int]] = set()
    located: list[dict[str, Any]] = []
    for edit in edits:
        token = str(edit.get("original") or "")
        suggestion = str(edit.get("suggestion") or "")
        if not token or not suggestion or token == suggestion:
            continue
        start = edit.get("start")
        end = edit.get("end")
        if (
            isinstance(start, int)
            and isinstance(end, int)
            and end > start
            and original[start:end] == token
            and (start, end) not in claimed
        ):
            claimed.add((start, end))
            located.append({**edit, "start": start, "end": end})
            continue

        pos = 0
        found: tuple[int, int] | None = None
        while True:
            idx = original.find(token, pos)
            if idx < 0:
                break
            end_i = idx + len(token)
            before = original[idx - 1] if idx > 0 else ""
            after = original[end_i] if end_i < len(original) else ""
            whole = (not before or not _LETTER_RE.match(before)) and (
                not after or not _LETTER_RE.match(after)
            )
            key = (idx, end_i)
            if key not in claimed and whole:
                found = key
                break
            if found is None and key not in claimed:
                found = key
            pos = idx + 1
        if found is None:
            continue
        claimed.add(found)
        located.append({**edit, "start": found[0], "end": found[1]})
    return located


def _record_error_stats(db: Session | None, edits: list[dict[str, Any]]) -> None:
    if db is None:
        return
    for edit in edits:
        original = (edit.get("original") or "")[:256]
        suggestion = (edit.get("suggestion") or "")[:256]
        if not original:
            continue
        error_type = str(edit.get("type") or "unknown")[:64]
        rule_id = str(edit.get("rule_id") or "")[:128]
        existing = (
            db.query(GrammarErrorStat)
            .filter(
                GrammarErrorStat.error_type == error_type,
                GrammarErrorStat.original == original,
                GrammarErrorStat.suggestion == suggestion,
            )
            .first()
        )
        if existing:
            existing.hit_count += 1
            existing.last_seen_at = utcnow()
        else:
            db.add(
                GrammarErrorStat(
                    error_type=error_type,
                    original=original,
                    suggestion=suggestion,
                    rule_id=rule_id,
                    hit_count=1,
                )
            )


async def proofread_text(
    text: str,
    *,
    preserve_diacritics: bool | None = None,
    skip_llm: bool = False,
    db: Session | None = None,
    client_ip: str | None = None,
    settings: Settings | None = None,
) -> ProofreadResponse:
    settings = settings or get_settings()
    preserve = (
        settings.preserve_diacritics_default
        if preserve_diacritics is None
        else preserve_diacritics
    )
    original = text.strip()
    if not original:
        return ProofreadResponse(
            ok=False,
            original="",
            cleaned="",
            corrected="",
            word_count=0,
            stage1_engine="",
            stage2_engine="",
            warnings=["empty text"],
        )

    stage1 = run_rule_stage(original, preserve_diacritics=preserve)
    stage2 = await run_llm_stage(stage1.text, skip=skip_llm, settings=settings)

    raw_edits: list[dict[str, Any]] = [e.as_dict() for e in stage1.edits] + list(
        stage2.edits
    )
    # Span indices must match the user original for the Next.js highlighter.
    edits = remap_edits_to_original(original, raw_edits)
    warnings = list(stage1.warnings) + list(stage2.warnings)
    word_count = count_words(original)

    if db is not None:
        import json

        job = ProofreadJob(
            client_ip=client_ip,
            input_text=original,
            cleaned_text=stage1.text,
            corrected_text=stage2.text,
            word_count=word_count,
            stage1_engine=stage1.engine,
            stage2_engine=stage2.engine,
            errors_json=json.dumps(edits, ensure_ascii=False),
            preserve_diacritics=preserve,
        )
        db.add(job)
        _record_error_stats(db, edits)
        try:
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to persist proofread job")

    return ProofreadResponse(
        ok=True,
        original=original,
        cleaned=stage1.text,
        corrected=stage2.text,
        word_count=word_count,
        stage1_engine=stage1.engine,
        stage2_engine=stage2.engine,
        edits=[TextEdit(**e) for e in edits],
        warnings=warnings,
    )
