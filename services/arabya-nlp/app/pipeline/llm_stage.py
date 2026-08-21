"""
Layer 1 — Stage 2: local Ollama contextual grammar & rephrasing.

Strict Arabic grammarian prompt → structured JSON only.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.ollama_client import OllamaClient, parse_json_object
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.llm_stage")

SYSTEM_PROMPT_AR = """أنت نحويّ عربي خبير ومُدقّق لغوي محترف للغة العربية الفصحى المعاصرة.
مهمتك فقط: إصلاح الأخطاء النحوية والتركيبية والأسلوبية العميقة في النص المعطى
(مثل تطابق المبتدأ والخبر، الجزم والنصب والرفع، ضعف الصياغة، أخطاء الضمائر).

قواعد صارمة:
1) لا تضف تحية أو شرحًا أو تعليقات إنجليزية.
2) لا تغيّر المعنى الأصلي.
3) أعد الناتج بصيغة JSON فقط بالشكل:
{"corrected":"...","edits":[{"type":"grammar|style|syntax","original":"...","suggestion":"...","explanation":"..."}],"notes":[]}
4) إن لم يوجد خطأ عميق فأعد النص كما هو في الحقل corrected مع edits فارغة.
"""


@dataclass
class LlmStageResult:
    text: str
    edits: list[dict[str, Any]] = field(default_factory=list)
    engine: str = "skipped"
    warnings: list[str] = field(default_factory=list)
    raw_ok: bool = True


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
        "صحّح النص التالي نحويًا وأسلوبيًا دون تغيير المعنى، "
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
    for i, item in enumerate(raw_edits):
        if not isinstance(item, dict):
            continue
        original = str(item.get("original") or "")
        suggestion = str(item.get("suggestion") or "")
        if not original and not suggestion:
            continue
        edits.append(
            {
                "id": f"llm-{i+1}",
                "start": 0,
                "end": 0,
                "type": str(item.get("type") or "grammar"),
                "original": original,
                "suggestion": suggestion,
                "rule_id": "ollama-grammar",
                "explanation": str(item.get("explanation") or ""),
                "stage": "llm",
            }
        )

    return LlmStageResult(
        text=corrected,
        edits=edits,
        engine=f"ollama:{settings.ollama_proofread_model}",
        warnings=[],
        raw_ok=True,
    )
