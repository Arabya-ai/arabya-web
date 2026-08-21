"""
Layer 1 — Stage 2: local Ollama contextual grammar & rephrasing.

Strict Arabic grammarian prompt → structured JSON only.
Edits MUST carry real character spans on the input text so Next.js can highlight them.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from app.services.ollama_client import OllamaClient, parse_json_object
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.llm_stage")

SYSTEM_PROMPT_AR = """أنت نحويّ عربي خبير ومُدقّق لغوي محترف للغة العربية الفصحى المعاصرة.
مهمتك: إصلاح الأخطاء النحوية والتركيبية والإملائية الواضحة في النص المعطى.

أمثلة إلزامية يجب ألا تفوتك:
- اسم إنّ وأخواتها (إن / أن / كأن / لكن / ليت / لعل) منصوب.
  الجمع المذكر السالم بعد إنّ: المعلمون → المعلمين، المدرسون → المدرسين، الطلابون خطأ شائع مشابه.
- لاكن → لكن

قواعد صارمة:
1) لا تضف تحية أو شرحًا أو تعليقات إنجليزية.
2) لا تغيّر المعنى الأصلي.
3) أعد الناتج بصيغة JSON فقط بالشكل:
{"corrected":"...","edits":[{"type":"grammar|spelling|style","original":"...","suggestion":"...","explanation":"..."}],"notes":[]}
4) كل عنصر في edits يجب أن يحتوي كلمة/عبارة original موجودة حرفيًا في النص المدخل.
5) إن لم يوجد خطأ فأعد النص كما هو في corrected مع edits فارغة.
"""


@dataclass
class LlmStageResult:
    text: str
    edits: list[dict[str, Any]] = field(default_factory=list)
    engine: str = "skipped"
    warnings: list[str] = field(default_factory=list)
    raw_ok: bool = True


_LETTER_RE = re.compile(r"[\u0600-\u06FFa-zA-Z0-9]")


def locate_span(haystack: str, needle: str, *, claimed: set[tuple[int, int]]) -> tuple[int, int] | None:
    """Find needle in haystack preferring whole-token hits; skip already claimed spans."""
    if not needle or needle not in haystack:
        return None
    start = 0
    while True:
        idx = haystack.find(needle, start)
        if idx < 0:
            return None
        end = idx + len(needle)
        before = haystack[idx - 1] if idx > 0 else ""
        after = haystack[end] if end < len(haystack) else ""
        whole = (not before or not _LETTER_RE.match(before)) and (
            not after or not _LETTER_RE.match(after)
        )
        key = (idx, end)
        if key not in claimed and whole:
            return idx, end
        if key not in claimed and not whole:
            # Keep searching for a whole-token hit; fall back later.
            pass
        start = idx + 1
        # Prefer first unclaimed whole token; if none, first unclaimed raw.
        if key not in claimed and whole:
            return idx, end


def locate_span_any(haystack: str, needle: str, *, claimed: set[tuple[int, int]]) -> tuple[int, int] | None:
    found = locate_span(haystack, needle, claimed=claimed)
    if found:
        return found
    if not needle:
        return None
    start = 0
    while True:
        idx = haystack.find(needle, start)
        if idx < 0:
            return None
        end = idx + len(needle)
        key = (idx, end)
        if key not in claimed:
            return idx, end
        start = idx + 1


async def run_llm_stage(
    text: str,
    *,
    client: OllamaClient | None = None,
    settings: Settings | None = None,
    skip: bool = False,
) -> LlmStageResult:
    settings = settings or get_settings()
    if skip or not settings.llm_proofread_enabled:
        return LlmStageResult(text=text, engine="llm-skipped", raw_ok=True)

    client = client or OllamaClient(settings)
    prompt = (
        "صحّح النص التالي نحويًا وإملائيًا دون تغيير المعنى. "
        "انتبه لاسم إنّ المنصوب (المعلمون→المعلمين) ولـ لاكن→لكن. "
        "وأخرج JSON فقط:\n\n"
        f"{text}"
    )
    result = await client.generate(
        model=settings.ollama_proofread_model,
        prompt=prompt,
        system=SYSTEM_PROMPT_AR,
        format_json=True,
    )
    if not result.get("ok"):
        return LlmStageResult(
            text=text,
            engine="ollama-unavailable",
            warnings=[str(result.get("error") or "Ollama failed")],
            raw_ok=False,
        )

    parsed = parse_json_object(str(result.get("response") or ""))
    if not parsed:
        return LlmStageResult(
            text=text,
            engine=f"ollama:{settings.ollama_proofread_model}:parse-fail",
            warnings=["تعذّر تحليل JSON من النموذج المحلي — أُبقي نص المرحلة الأولى"],
            raw_ok=False,
        )

    corrected = str(parsed.get("corrected") or text).strip() or text
    raw_edits = parsed.get("edits") if isinstance(parsed.get("edits"), list) else []
    edits: list[dict[str, Any]] = []
    claimed: set[tuple[int, int]] = set()
    for i, item in enumerate(raw_edits):
        if not isinstance(item, dict):
            continue
        original = str(item.get("original") or "").strip()
        suggestion = str(item.get("suggestion") or "").strip()
        if not original or not suggestion or original == suggestion:
            continue
        span = locate_span_any(text, original, claimed=claimed)
        if not span:
            logger.info("Ollama edit skipped (not found in input): %r → %r", original, suggestion)
            continue
        start, end = span
        claimed.add((start, end))
        edits.append(
            {
                "id": f"llm-{i+1}",
                "start": start,
                "end": end,
                "type": str(item.get("type") or "grammar"),
                "original": original,
                "suggestion": suggestion,
                "rule_id": "ollama-grammar",
                "explanation": str(item.get("explanation") or "تصحيح من محرك لغوي المحلي"),
                "stage": "llm",
            }
        )

    # If model returned a corrected string but omitted span edits, synthesize token diffs.
    if not edits and corrected != text:
        o_tokens = re.findall(r"\S+|\s+", text)
        c_tokens = re.findall(r"\S+|\s+", corrected)
        if len(o_tokens) == len(c_tokens):
            pos = 0
            seq = 0
            for ot, ct in zip(o_tokens, c_tokens):
                end = pos + len(ot)
                if ot != ct and ot.strip() and ct.strip():
                    seq += 1
                    edits.append(
                        {
                            "id": f"llm-diff-{seq}",
                            "start": pos,
                            "end": end,
                            "type": "grammar",
                            "original": ot,
                            "suggestion": ct,
                            "rule_id": "ollama-token-diff",
                            "explanation": "فرق مُستنتج من نص llama المصحّح",
                            "stage": "llm",
                        }
                    )
                pos = end

    return LlmStageResult(
        text=corrected,
        edits=edits,
        engine=f"ollama:{settings.ollama_proofread_model}",
        warnings=[],
        raw_ok=True,
    )
