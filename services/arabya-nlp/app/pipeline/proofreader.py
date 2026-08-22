"""
Layer 1 — Hybrid Arabic NLP proofreader pipeline.

Priority:
  • Always: PyArabic + builtin/Ghalatawi rules (offline-capable)
  • Optional parallel: local Ollama contextual grammar when reachable
  • Never fail the request solely because Ollama is down

Online Contabo path runs rules and Ollama concurrently (asyncio.gather).
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

from sqlalchemy.orm import Session

from app.models import GrammarErrorStat, ProofreadJob, utcnow
from app.pipeline.llm_stage import LlmStageResult, run_llm_stage
from app.pipeline.moa_stage import MoaStageResult, run_moa_stage
from app.pipeline.rule_stage import RuleStageResult, run_rule_stage
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


def merge_edit_lists(
    rule_edits: list[dict[str, Any]],
    llm_edits: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Rules win on overlapping spans; LLM fills non-conflicting gaps."""
    claimed: list[tuple[int, int]] = []
    merged: list[dict[str, Any]] = []

    def overlaps(a: int, b: int) -> bool:
        return any(a < ce and b > cs for cs, ce in claimed)

    for edit in rule_edits:
        start = int(edit["start"])
        end = int(edit["end"])
        if overlaps(start, end):
            continue
        claimed.append((start, end))
        merged.append(edit)

    for edit in llm_edits:
        start = int(edit["start"])
        end = int(edit["end"])
        if overlaps(start, end):
            continue
        claimed.append((start, end))
        merged.append(edit)

    merged.sort(key=lambda e: (int(e["start"]), int(e["end"])))
    return merged


def apply_edits(original: str, edits: list[dict[str, Any]]) -> str:
    """Apply non-overlapping span edits right-to-left onto the original."""
    ordered = sorted(edits, key=lambda e: int(e["start"]), reverse=True)
    out = original
    for edit in ordered:
        start = int(edit["start"])
        end = int(edit["end"])
        suggestion = str(edit.get("suggestion") or "")
        token = str(edit.get("original") or "")
        if end <= start or out[start:end] != token:
            continue
        out = out[:start] + suggestion + out[end:]
    return out


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


async def _run_rules_async(
    text: str, *, preserve_diacritics: bool
) -> RuleStageResult:
    return await asyncio.to_thread(
        run_rule_stage, text, preserve_diacritics=preserve_diacritics
    )


async def proofread_text(
    text: str,
    *,
    preserve_diacritics: bool | None = None,
    skip_llm: bool = False,
    use_moa: bool = False,
    few_shot_pairs: list[dict[str, str]] | None = None,
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
            mode="offline",
            parallel=False,
            warnings=["empty text"],
        )

    # Offline / skip path: rules only (PyArabic + pairs) — never waits on Ollama.
    if skip_llm or not settings.llm_proofread_enabled:
        stage1 = await _run_rules_async(original, preserve_diacritics=preserve)
        stage2 = LlmStageResult(text=stage1.text, engine="llm-skipped", raw_ok=True)
        parallel = False
        mode = "offline"
    else:
        # Online hybrid: rules + Ollama on the *original* text in parallel.
        stage1, stage2 = await asyncio.gather(
            _run_rules_async(original, preserve_diacritics=preserve),
            run_llm_stage(original, skip=False, settings=settings),
        )
        parallel = True
        mode = (
            "hybrid-parallel"
            if stage2.raw_ok and not str(stage2.engine).startswith("ollama-unavailable")
            else "rules-only-fallback"
        )

    # L3 MoA (optional): after rules/Ollama; soft-skip without token / when disabled.
    moa: MoaStageResult = MoaStageResult(text=original, engine="moa-skipped", mode="off")
    if use_moa or settings.moa_enabled:
        moa = await run_moa_stage(
            original,
            settings=settings,
            few_shot_pairs=few_shot_pairs,
            force=use_moa,
        )
        if moa.mode not in {"disabled", "no-token", "off", "skipped"} and moa.raw_ok:
            mode = f"{mode}+{moa.mode}" if mode else moa.mode

    rule_dicts = [e.as_dict() for e in stage1.edits]
    llm_dicts = list(stage2.edits)
    moa_dicts = list(moa.edits)
    rule_located = remap_edits_to_original(original, rule_dicts)
    llm_located = remap_edits_to_original(original, llm_dicts)
    moa_located = remap_edits_to_original(original, moa_dicts)
    # Rules win overlaps; MoA fills gaps after local LLM
    edits = merge_edit_lists(rule_located, merge_edit_lists(llm_located, moa_located))
    warnings = list(stage1.warnings) + list(stage2.warnings) + list(moa.warnings)

    # Prefer applying merged span edits; fall back to sequential texts.
    if edits:
        corrected = apply_edits(original, edits)
        cleaned = apply_edits(original, rule_located) if rule_located else stage1.text
    else:
        cleaned = stage1.text
        # Prefer MoA corrected text, then Ollama, then rules.
        if moa.raw_ok and moa.edits and moa.text and moa.engine not in {
            "moa-skipped",
            "moa-proposers-empty",
        }:
            corrected = moa.text
        elif stage2.raw_ok and stage2.text and stage2.engine not in {
            "llm-skipped",
            "ollama-unavailable",
        }:
            corrected = stage2.text if stage2.text != original else stage1.text
        else:
            corrected = stage1.text

    word_count = count_words(original)
    stage2_label = stage2.engine
    if moa.engine and moa.engine != "moa-skipped":
        stage2_label = f"{stage2.engine}+{moa.engine}"

    if db is not None:
        import json

        job = ProofreadJob(
            client_ip=client_ip,
            input_text=original,
            cleaned_text=cleaned,
            corrected_text=corrected,
            word_count=word_count,
            stage1_engine=stage1.engine,
            stage2_engine=stage2_label,
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
        cleaned=cleaned,
        corrected=corrected,
        word_count=word_count,
        stage1_engine=stage1.engine,
        stage2_engine=stage2_label,
        mode=mode,
        parallel=parallel,
        edits=[TextEdit(**e) for e in edits],
        warnings=warnings,
        moa_engine=moa.engine,
        moa_mode=moa.mode,
    )
