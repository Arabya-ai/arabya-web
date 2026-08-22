"""
L3 Mixture of Agents (MoA) — optional cloud proposers + Qwen judge.

Default OFF (`ARABYA_NLP_MOA=0`). Without HF token → empty result (rules path unchanged).
Proposers run in parallel with soft timeout; judge merges whatever returned.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from app.pipeline.llm_stage import locate_span_any
from app.services.hf_inference import hf_chat_completion, resolve_hf_token
from app.services.ollama_client import parse_json_object
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.moa_stage")

PROPOSER_SYSTEM = """أنت مدقّق لغوي عربي للفصحى المعاصرة.
أصلح الأخطاء الإملائية والنحوية الواضحة دون تغيير المعنى.
أعد JSON فقط:
{"corrected":"...","edits":[{"type":"spelling|grammar|style","original":"...","suggestion":"...","explanation":"..."}]}
كل original يجب أن يظهر حرفياً في النص المدخل. إن لم يوجد خطأ: corrected=النص و edits=[].
"""

JUDGE_SYSTEM = """أنت قاضٍ لغوي عربي (Qwen). لديك النص الأصلي وعدة مسودات تصحيح من نماذج مختلفة.
ادمج أفضل التصحيحات في نص واحد فصيح دون تغيير المعنى ودون اختراع أخطاء.
أعد JSON فقط:
{"corrected":"...","edits":[{"type":"spelling|grammar|style","original":"...","suggestion":"...","explanation":"..."}],"notes":[]}
كل original يجب أن يظهر حرفياً في النص الأصلي. فضّل الإجماع بين المسودات. لا تضف شرحاً خارج JSON.
"""


@dataclass
class MoaStageResult:
    text: str
    edits: list[dict[str, Any]] = field(default_factory=list)
    engine: str = "moa-skipped"
    warnings: list[str] = field(default_factory=list)
    raw_ok: bool = True
    proposer_engines: list[str] = field(default_factory=list)
    judge_engine: str = ""
    mode: str = "skipped"


def _format_few_shot(pairs: list[dict[str, str]] | None) -> str:
    if not pairs:
        return ""
    lines = ["أمثلة تصحيحات ناجحة سابقة (تعلّم من المستخدمين):"]
    for i, pair in enumerate(pairs[:3], start=1):
        src = str(pair.get("from") or pair.get("original") or "").strip()
        dst = str(pair.get("to") or pair.get("suggestion") or "").strip()
        if src and dst and src != dst:
            lines.append(f"{i}) {src} → {dst}")
    if len(lines) == 1:
        return ""
    return "\n".join(lines) + "\n\n"


def _edits_from_parsed(
    text: str,
    parsed: dict[str, Any],
    *,
    prefix: str,
    stage: str,
) -> tuple[str, list[dict[str, Any]]]:
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
            continue
        start, end = span
        claimed.add((start, end))
        edits.append(
            {
                "id": f"{prefix}-{i + 1}",
                "start": start,
                "end": end,
                "type": str(item.get("type") or "grammar"),
                "original": original,
                "suggestion": suggestion,
                "rule_id": f"moa-{prefix}",
                "explanation": str(item.get("explanation") or "تصحيح MoA"),
                "stage": stage,
            }
        )
    # Token-diff fallback when model returns corrected string only
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
                            "id": f"{prefix}-diff-{seq}",
                            "start": pos,
                            "end": end,
                            "type": "grammar",
                            "original": ot,
                            "suggestion": ct,
                            "rule_id": f"moa-{prefix}-diff",
                            "explanation": "فرق مستنتج من نص MoA",
                            "stage": stage,
                        }
                    )
                pos = end
    return corrected, edits


async def _run_proposer(
    *,
    role: str,
    model: str,
    text: str,
    few_shot: str,
    timeout_s: float,
    token: str,
) -> dict[str, Any]:
    user = (
        f"{few_shot}"
        "صحّح النص التالي وأخرج JSON فقط:\n\n"
        f"{text}"
    )

    def _call() -> dict[str, Any]:
        return hf_chat_completion(
            model=model,
            system=PROPOSER_SYSTEM,
            user=user,
            token=token,
            timeout_s=timeout_s,
            max_tokens=1024,
        )

    try:
        raw = await asyncio.wait_for(asyncio.to_thread(_call), timeout=timeout_s + 0.75)
    except asyncio.TimeoutError:
        return {
            "role": role,
            "model": model,
            "ok": False,
            "error": "timeout",
            "corrected": text,
            "edits": [],
            "engine": f"moa-proposer:{role}:timeout",
        }

    if not raw.get("ok"):
        return {
            "role": role,
            "model": model,
            "ok": False,
            "error": str(raw.get("error") or "fail"),
            "corrected": text,
            "edits": [],
            "engine": f"moa-proposer:{role}:fail",
        }

    parsed = parse_json_object(str(raw.get("content") or ""))
    if not parsed:
        return {
            "role": role,
            "model": model,
            "ok": False,
            "error": "parse-fail",
            "corrected": text,
            "edits": [],
            "engine": f"moa-proposer:{role}:parse-fail",
        }

    corrected, edits = _edits_from_parsed(text, parsed, prefix=f"p-{role}", stage="moa-proposer")
    return {
        "role": role,
        "model": model,
        "ok": True,
        "error": "",
        "corrected": corrected,
        "edits": edits,
        "engine": f"moa-proposer:{role}:{model.split('/')[-1]}",
        "ms": raw.get("ms"),
    }


async def _run_judge(
    *,
    model: str,
    text: str,
    drafts: list[dict[str, Any]],
    few_shot: str,
    timeout_s: float,
    token: str,
) -> dict[str, Any]:
    parts = [f"{few_shot}النص الأصلي:\n{text}\n"]
    for d in drafts:
        if not d.get("ok"):
            continue
        parts.append(
            f"--- مسودة {d.get('role')} ({d.get('model')}) ---\n"
            f"{d.get('corrected')}\n"
        )
    parts.append("ادمج أفضل تصحيح وأخرج JSON فقط.")
    user = "\n".join(parts)

    def _call() -> dict[str, Any]:
        return hf_chat_completion(
            model=model,
            system=JUDGE_SYSTEM,
            user=user,
            token=token,
            timeout_s=timeout_s,
            max_tokens=1200,
            temperature=0.15,
        )

    judge_timeout = max(timeout_s, timeout_s * 1.5)
    try:
        raw = await asyncio.wait_for(
            asyncio.to_thread(_call),
            timeout=judge_timeout + 0.75,
        )
    except asyncio.TimeoutError:
        return {"ok": False, "error": "timeout", "corrected": text, "edits": [], "engine": "moa-judge:timeout"}

    if not raw.get("ok"):
        return {
            "ok": False,
            "error": str(raw.get("error") or "fail"),
            "corrected": text,
            "edits": [],
            "engine": "moa-judge:fail",
        }

    parsed = parse_json_object(str(raw.get("content") or ""))
    if not parsed:
        return {
            "ok": False,
            "error": "parse-fail",
            "corrected": text,
            "edits": [],
            "engine": "moa-judge:parse-fail",
        }

    corrected, edits = _edits_from_parsed(text, parsed, prefix="judge", stage="moa-judge")
    return {
        "ok": True,
        "error": "",
        "corrected": corrected,
        "edits": edits,
        "engine": f"moa-judge:{model.split('/')[-1]}",
        "ms": raw.get("ms"),
    }


def _merge_proposer_edits(
    text: str,
    drafts: list[dict[str, Any]],
) -> tuple[str, list[dict[str, Any]]]:
    """When judge fails: keep first successful draft with most edits (soft merge)."""
    ok_drafts = [d for d in drafts if d.get("ok") and (d.get("edits") or d.get("corrected") != text)]
    if not ok_drafts:
        return text, []
    best = max(ok_drafts, key=lambda d: len(d.get("edits") or []))
    return str(best.get("corrected") or text), list(best.get("edits") or [])


async def run_moa_stage(
    text: str,
    *,
    settings: Settings | None = None,
    few_shot_pairs: list[dict[str, str]] | None = None,
    force: bool = False,
    hf_token: str | None = None,
) -> MoaStageResult:
    """
    Run MoA when enabled (or force=True) and HF token present.
    Otherwise returns engine=moa-skipped with empty edits (Contabo rules stay primary).
    """
    settings = settings or get_settings()
    original = text or ""

    if not force and not settings.moa_enabled:
        return MoaStageResult(text=original, engine="moa-skipped", mode="disabled")

    token = (hf_token or "").strip() or resolve_hf_token()
    if not token:
        return MoaStageResult(
            text=original,
            engine="moa-skipped",
            mode="no-token",
            warnings=["MoA skipped — no HF token (Contabo rules still apply)"],
        )

    few_shot = _format_few_shot(few_shot_pairs)
    timeout_s = float(settings.moa_proposer_timeout_s)
    proposers = [
        ("jais", settings.moa_proposer_jais),
        ("llama", settings.moa_proposer_llama),
        ("deepseek", settings.moa_proposer_deepseek),
    ]

    results = await asyncio.gather(
        *[
            _run_proposer(
                role=role,
                model=model,
                text=original,
                few_shot=few_shot,
                timeout_s=timeout_s,
                token=token,
            )
            for role, model in proposers
        ]
    )
    drafts = list(results)
    ok_count = sum(1 for d in drafts if d.get("ok"))
    proposer_engines = [str(d.get("engine") or "") for d in drafts]
    warnings: list[str] = []
    for d in drafts:
        if not d.get("ok"):
            warnings.append(f"{d.get('role')}: {d.get('error') or 'fail'}")

    if ok_count == 0:
        return MoaStageResult(
            text=original,
            engine="moa-proposers-empty",
            warnings=warnings or ["all proposers failed"],
            raw_ok=False,
            proposer_engines=proposer_engines,
            mode="proposers-failed",
        )

    judge = await _run_judge(
        model=settings.moa_judge_model,
        text=original,
        drafts=drafts,
        few_shot=few_shot,
        timeout_s=max(timeout_s, 6.0),
        token=token,
    )

    if judge.get("ok"):
        return MoaStageResult(
            text=str(judge.get("corrected") or original),
            edits=list(judge.get("edits") or []),
            engine=str(judge.get("engine") or "moa-judge"),
            warnings=warnings,
            raw_ok=True,
            proposer_engines=proposer_engines,
            judge_engine=str(judge.get("engine") or ""),
            mode="moa-judge",
        )

    # Soft-fail: use best proposer draft
    corrected, edits = _merge_proposer_edits(original, drafts)
    warnings.append(f"judge: {judge.get('error') or 'fail'} — used best proposer")
    return MoaStageResult(
        text=corrected,
        edits=edits,
        engine="moa-proposers-fallback",
        warnings=warnings,
        raw_ok=True,
        proposer_engines=proposer_engines,
        judge_engine=str(judge.get("engine") or "moa-judge:fail"),
        mode="moa-proposers-only",
    )
