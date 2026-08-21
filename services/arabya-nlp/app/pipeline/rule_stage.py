"""
Layer 1 — Stage 1: rule-based Arabic cleanup (PyArabic + Ghalatawi).

Runs entirely on Contabo CPU with zero LLM overhead.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("arabya_nlp.rules")

_TASHKEEL_RE = re.compile(r"[\u064B-\u065F\u0670]")
_TATWEEL = "\u0640"

# High-precision MSA spelling / hamza / ta-marbuta pairs
BUILTIN_PAIRS: list[tuple[str, str, str, str]] = [
    ("انشاء الله", "إن شاء الله", "spelling", "تفصل «إن شاء الله»"),
    ("ان شاء الله", "إن شاء الله", "spelling", "همزة «إن»"),
    ("الى", "إلى", "spelling", "إلى بألف مقصورة"),
    ("لاكن", "لكن", "spelling", "لكن بلا ألف"),
    ("هادذا", "هذا", "spelling", "هذا"),
    ("هاذه", "هذه", "spelling", "هذه"),
    ("هذة", "هذه", "spelling", "هذه"),
    ("الذى", "الذي", "spelling", "الذي بالياء"),
    ("التى", "التي", "spelling", "التي بالياء"),
    ("فى", "في", "spelling", "في بالياء"),
    ("أولائك", "أولئك", "spelling", "أولئك"),
    ("اولايك", "أولئك", "spelling", "أولئك"),
    ("مسؤلية", "مسؤولية", "spelling", "مسؤولية"),
    ("مسئولية", "مسؤولية", "spelling", "مسؤولية"),
    ("يجب ان", "يجب أن", "grammar", "أن المصدرية بعد يجب"),
    ("يمكن ان", "يمكن أن", "grammar", "أن بعد يمكن"),
    ("لان", "لأن", "spelling", "لأن"),
    ("اذا", "إذا", "spelling", "إذا"),
    ("انة", "أنه", "spelling", "أنه"),
    ("انة ", "أنه ", "spelling", "أنه"),
]


@dataclass
class RuleEdit:
    id: str
    start: int
    end: int
    type: str
    original: str
    suggestion: str
    rule_id: str
    explanation: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "start": self.start,
            "end": self.end,
            "type": self.type,
            "original": self.original,
            "suggestion": self.suggestion,
            "rule_id": self.rule_id,
            "explanation": self.explanation,
            "stage": "rule",
        }


@dataclass
class RuleStageResult:
    text: str
    edits: list[RuleEdit] = field(default_factory=list)
    engine: str = "builtin"
    warnings: list[str] = field(default_factory=list)


def _pyarabic_normalize(text: str, *, preserve_diacritics: bool) -> tuple[str, list[str]]:
    engines: list[str] = []
    try:
        from pyarabic import araby

        engines.append("pyarabic")
        out = araby.strip_tatweel(text)
        if not preserve_diacritics:
            out = araby.strip_tashkeel(out)
        # Normalize alef variants optionally kept separate for linguistics —
        # we only collapse when strip helpers exist; keep surface hamza fixes to pairs.
        return out, engines
    except Exception as exc:
        logger.debug("PyArabic unavailable: %s", exc)
        out = text.replace(_TATWEEL, "")
        if not preserve_diacritics:
            out = _TASHKEEL_RE.sub("", out)
        return out, engines


def _ghalatawi_correct(text: str) -> tuple[str, list[RuleEdit], list[str]]:
    engines: list[str] = []
    edits: list[RuleEdit] = []
    try:
        from ghalatawi.autocorrector import AutoCorrector

        engines.append("ghalatawi")
        tool = AutoCorrector()
        corrected = tool.spell(text)
        if not isinstance(corrected, str) or corrected == text:
            return text, edits, engines

        # Token-aligned edits when possible
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
                        RuleEdit(
                            id=f"ghalatawi-{seq}",
                            start=pos,
                            end=end,
                            type="spelling",
                            original=ot,
                            suggestion=ct,
                            rule_id="ghalatawi-spell",
                            explanation="تصحيح تلقائي (غلطاوي)",
                        )
                    )
                pos = end
        return corrected, edits, engines
    except Exception as exc:
        logger.debug("Ghalatawi unavailable: %s", exc)
        return text, edits, engines


def _apply_builtin_pairs(text: str) -> tuple[str, list[RuleEdit]]:
    edits: list[RuleEdit] = []
    out = text
    seq = 0
    for wrong, right, etype, explanation in BUILTIN_PAIRS:
        start = 0
        while True:
            idx = out.find(wrong, start)
            if idx < 0:
                break
            seq += 1
            end = idx + len(wrong)
            edits.append(
                RuleEdit(
                    id=f"builtin-{seq}",
                    start=idx,
                    end=end,
                    type=etype,
                    original=wrong,
                    suggestion=right,
                    rule_id=f"rb-{seq}",
                    explanation=explanation,
                )
            )
            out = out[:idx] + right + out[end:]
            start = idx + len(right)
    return out, edits


def run_rule_stage(text: str, *, preserve_diacritics: bool = True) -> RuleStageResult:
    warnings: list[str] = []
    engines: list[str] = []

    normalized, py_engines = _pyarabic_normalize(text, preserve_diacritics=preserve_diacritics)
    engines.extend(py_engines)
    if not py_engines:
        warnings.append("PyArabic not installed — using regex fallback")

    corrected, ghalatawi_edits, gh_engines = _ghalatawi_correct(normalized)
    engines.extend(gh_engines)
    if not gh_engines:
        warnings.append("Ghalatawi not installed — builtin pairs only")

    corrected, builtin_edits = _apply_builtin_pairs(corrected)
    engines.append("builtin")

    all_edits = ghalatawi_edits + builtin_edits
    return RuleStageResult(
        text=corrected,
        edits=all_edits,
        engine="+".join(dict.fromkeys(engines)),
        warnings=warnings,
    )
