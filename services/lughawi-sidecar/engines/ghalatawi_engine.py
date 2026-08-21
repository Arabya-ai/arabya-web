"""Ghalatawi (linuxscout) — Arabic autocorrect when installed."""

from __future__ import annotations

import re
from typing import Any

_autoco = None
_failed = False


def available() -> bool:
    try:
        from ghalatawi.autocorrector import AutoCorrector  # noqa: F401

        return True
    except Exception:
        return False


def _get():  # type: ignore[no-untyped-def]
    global _autoco, _failed
    if _failed:
        return None
    if _autoco is not None:
        return _autoco
    try:
        from ghalatawi.autocorrector import AutoCorrector

        _autoco = AutoCorrector()
        return _autoco
    except Exception:
        _failed = True
        return None


def _is_letter(c: str) -> bool:
    return bool(c) and bool(re.match(r"[\u0600-\u06FFa-zA-Z0-9]", c))


def _word_span_edits(original: str, corrected: str) -> list[dict[str, Any]]:
    """Map ghalatawi full-string output into token-level edits when possible."""
    if original == corrected:
        return []
    # Prefer per-word replacements when whitespace tokenization aligns.
    o_tokens = re.findall(r"\S+|\s+", original)
    c_tokens = re.findall(r"\S+|\s+", corrected)
    edits: list[dict[str, Any]] = []
    if len(o_tokens) == len(c_tokens):
        pos = 0
        seq = 0
        for ot, ct in zip(o_tokens, c_tokens):
            end = pos + len(ot)
            if ot != ct and ot.strip() and ct.strip():
                seq += 1
                edits.append(
                    {
                        "id": f"ghalatawi-{seq}",
                        "start": pos,
                        "end": end,
                        "type": "spelling",
                        "original": ot,
                        "suggestion": ct,
                        "ruleId": "ghalatawi-spell",
                        "explanation": "تصحيح تلقائي (غلطاوي)",
                        "confidence": 0.84,
                        "source": "gec",
                        "status": "proposed",
                    }
                )
            pos = end
        if edits:
            return edits

    # Fallback: locate first differing word occurrences
    for ow, cw in zip(original.split(), corrected.split()):
        if ow == cw:
            continue
        idx = original.find(ow)
        if idx < 0:
            continue
        end = idx + len(ow)
        before = original[idx - 1] if idx > 0 else ""
        after = original[end] if end < len(original) else ""
        if _is_letter(before) or _is_letter(after):
            continue
        edits.append(
            {
                "id": f"ghalatawi-{len(edits)+1}",
                "start": idx,
                "end": end,
                "type": "spelling",
                "original": ow,
                "suggestion": cw,
                "ruleId": "ghalatawi-spell",
                "explanation": "تصحيح تلقائي (غلطاوي)",
                "confidence": 0.8,
                "source": "gec",
                "status": "proposed",
            }
        )
        if len(edits) >= 40:
            break
    return edits


def ghalatawi_edits(text: str) -> dict[str, Any]:
    tool = _get()
    if tool is None:
        return {"ok": True, "edits": [], "engine": "ghalatawi-unloaded"}
    try:
        corrected = tool.spell(text)
        if not isinstance(corrected, str):
            return {"ok": True, "edits": [], "engine": "ghalatawi"}
        edits = _word_span_edits(text, corrected)
        return {
            "ok": True,
            "edits": edits,
            "engine": "ghalatawi",
            "corrected": corrected,
        }
    except Exception as e:
        return {
            "ok": True,
            "edits": [],
            "engine": "ghalatawi-error",
            "warning": f"{type(e).__name__}",
        }
