"""Morphology via CAMeL Tools when installed; else heuristic tokens."""

from __future__ import annotations

import re
from typing import Any

_disambiguator = None
_disambiguator_failed = False


def _get_disambiguator():  # type: ignore[no-untyped-def]
    global _disambiguator, _disambiguator_failed
    if _disambiguator_failed:
        return None
    if _disambiguator is not None:
        return _disambiguator
    try:
        from camel_tools.morphology.database import MorphologyDB
        from camel_tools.morphology.analyzer import Analyzer
        from camel_tools.disambig.mle import MLEDisambiguator

        # Prefer pretrained MLE; falls back to analyzer-only if download missing.
        try:
            _disambiguator = MLEDisambiguator.pretrained()
        except Exception:
            db = MorphologyDB.builtin_db()
            _disambiguator = Analyzer(db)
        return _disambiguator
    except Exception:
        _disambiguator_failed = True
        return None


def morph_heuristic(text: str) -> list[dict[str, str]]:
    tokens: list[dict[str, str]] = []
    for raw in re.findall(r"[\u0600-\u06FF]+|[A-Za-z0-9]+", text):
        pos = "NOUN"
        note = "تقدير خفيف — ثبّت CAMeL Tools للتحليل الكامل"
        if raw.startswith("ال"):
            pos = "NOUN"
            note = "اسم معرّف بأل (تقدير)"
        elif raw in {"في", "من", "إلى", "على", "عن", "ب", "ل", "ك"}:
            pos = "PREP"
            note = "حرف جر شائع"
        elif raw in {"و", "ف", "ثم", "أو", "أم"}:
            pos = "CONJ"
            note = "حرف عطف"
        elif raw.endswith(("ون", "ين", "ات", "ان")):
            pos = "NOUN"
            note = "جمع/مثنى محتمل"
        tokens.append(
            {
                "surface": raw,
                "lemma": raw.lstrip("والفبلك"),
                "pos": pos,
                "note": note,
            }
        )
    return tokens


def analyze_morph(text: str) -> tuple[list[dict[str, str]], str]:
    """Return (tokens, engine_id)."""
    tool = _get_disambiguator()
    if tool is None:
        return morph_heuristic(text), "sidecar-morph-heuristic"

    try:
        from camel_tools.tokenizers.word import simple_word_tokenize

        words = simple_word_tokenize(text)
        # MLEDisambiguator.disambiguate vs Analyzer.analyze
        tokens: list[dict[str, str]] = []
        if hasattr(tool, "disambiguate"):
            scored = tool.disambiguate(words)
            for word, analyses in zip(words, scored):
                best = analyses[0] if analyses else None
                if best is None:
                    tokens.append(
                        {
                            "surface": word,
                            "lemma": word,
                            "pos": "UNK",
                            "note": "لا تحليل",
                        }
                    )
                    continue
                # analysis may be ScoredAnalysis or dict-like
                ana = getattr(best, "analysis", best)
                if isinstance(ana, dict):
                    lemma = str(ana.get("lex") or ana.get("diac") or word)
                    pos = str(ana.get("pos") or "UNK")
                else:
                    lemma = str(getattr(ana, "lex", word))
                    pos = str(getattr(ana, "pos", "UNK"))
                tokens.append(
                    {
                        "surface": word,
                        "lemma": lemma,
                        "pos": pos,
                        "note": "CAMeL Tools",
                    }
                )
        else:
            # Analyzer path: per-word analyze()
            for word in words:
                analyses = tool.analyze(word)  # type: ignore[attr-defined]
                if not analyses:
                    tokens.append(
                        {
                            "surface": word,
                            "lemma": word,
                            "pos": "UNK",
                            "note": "CAMeL Analyzer — بلا نتيجة",
                        }
                    )
                    continue
                ana = analyses[0]
                tokens.append(
                    {
                        "surface": word,
                        "lemma": str(ana.get("lex") or word),
                        "pos": str(ana.get("pos") or "UNK"),
                        "note": "CAMeL Analyzer",
                    }
                )
        return tokens, "camel"
    except Exception as e:
        return morph_heuristic(text), f"sidecar-morph-fallback:{type(e).__name__}"
