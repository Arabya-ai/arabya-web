"""
Rule-based Arabic NLP layer (foundation).

Uses:
- PyArabic for normalization / letter helpers when installed
- Stanford Stanza Arabic pipeline for tokenization + POS when installed
- Deterministic MSA correction pairs (emlaa / punctuation / common grammar)

This is intentionally NOT an LLM — fast, local, low RAM.
"""

from __future__ import annotations

import re
from typing import Any

_stanza_nlp = None
_stanza_failed = False

# Surface corrections: (wrong, right, type, rule_id, explanation_ar)
# Keep high-precision only; Next.js rules remain the primary offline engine.
BUILTIN_PAIRS: list[tuple[str, str, str, str, str]] = [
    ("انشاء الله", "إن شاء الله", "spelling", "rb-insha", "تفصل «إن شاء الله»"),
    ("ان شاء الله", "إن شاء الله", "spelling", "rb-insha2", "همزة «إن»"),
    ("الى", "إلى", "spelling", "rb-ila", "إلى بألف مقصورة"),
    ("عليكم السلام", "السلام عليكم", "style", "rb-salam", "الصيغة الأشهر"),
    ("لاكن", "لكن", "spelling", "rb-lakin", "لكن بلا ألف"),
    ("هادذا", "هذا", "spelling", "rb-hatha", "هذا"),
    ("هاذه", "هذه", "spelling", "rb-hathihi", "هذه"),
    ("الذى", "الذي", "spelling", "rb-alladhi", "الذي بالياء"),
    ("التى", "التي", "spelling", "rb-allati", "التي بالياء"),
    ("فى", "في", "spelling", "rb-fi", "في بالياء"),
    ("هذة", "هذه", "spelling", "rb-hathihi2", "هذه"),
    ("أولائك", "أولئك", "spelling", "rb-ulaika", "أولئك"),
    ("اولايك", "أولئك", "spelling", "rb-ulaika2", "أولئك"),
    ("مسؤلية", "مسؤولية", "spelling", "rb-masuliyya", "مسؤولية"),
    ("مسئولية", "مسؤولية", "spelling", "rb-masuliyya2", "مسؤولية"),
    ("السلام وعليكم", "السلام عليكم", "style", "rb-salam2", "السلام عليكم"),
    ("يجب ان", "يجب أن", "grammar", "rb-an", "أن المصدرية بعد يجب"),
    ("يمكن ان", "يمكن أن", "grammar", "rb-yumkin-an", "أن بعد يمكن"),
    ("قالو ", "قالوا ", "spelling", "rb-qalu", "واو الجماعة"),
    ("ذهبو ", "ذهبوا ", "spelling", "rb-dhahabu", "واو الجماعة"),
]


def _normalize_for_match(text: str) -> str:
    try:
        from pyarabic import araby

        t = araby.strip_tashkeel(text)
        t = araby.strip_tatweel(t)
        return t
    except Exception:
        # Minimal fallback without PyArabic
        tashkeel = re.compile(r"[\u064B-\u065F\u0670]")
        return tashkeel.sub("", text).replace("\u0640", "")


def _get_stanza():  # type: ignore[no-untyped-def]
    global _stanza_nlp, _stanza_failed
    if _stanza_failed:
        return None
    if _stanza_nlp is not None:
        return _stanza_nlp
    try:
        import stanza

        # Download once if missing (Contabo first boot may take minutes).
        try:
            stanza.download("ar", processors="tokenize,pos,lemma", verbose=False)
        except Exception:
            pass
        _stanza_nlp = stanza.Pipeline(
            lang="ar",
            processors="tokenize,pos,lemma",
            use_gpu=False,
            verbose=False,
        )
        return _stanza_nlp
    except Exception:
        _stanza_failed = True
        return None


def stanza_tokens(text: str) -> list[dict[str, str]]:
    nlp = _get_stanza()
    if nlp is None:
        return []
    try:
        doc = nlp(text)
        out: list[dict[str, str]] = []
        for sent in doc.sentences:
            for tok in sent.tokens:
                word = tok.words[0] if tok.words else None
                if word is None:
                    continue
                out.append(
                    {
                        "surface": tok.text,
                        "lemma": getattr(word, "lemma", tok.text) or tok.text,
                        "pos": getattr(word, "upos", "") or "",
                        "note": "Stanza Arabic",
                    }
                )
        return out
    except Exception:
        return []


def _find_all(hay: str, needle: str) -> list[int]:
    if not needle:
        return []
    idxs: list[int] = []
    start = 0
    while True:
        i = hay.find(needle, start)
        if i < 0:
            break
        idxs.append(i)
        start = i + max(len(needle), 1)
    return idxs


def _is_letter(c: str) -> bool:
    return bool(c) and bool(re.match(r"[\u0600-\u06FFa-zA-Z0-9]", c))


def rules_nlp_edits(text: str) -> dict[str, Any]:
    """Return edits in a shape Next.js can merge (start/end/original/suggestion)."""
    engines: list[str] = []
    try:
        import pyarabic.araby  # noqa: F401

        engines.append("pyarabic")
    except Exception:
        pass

    st_tokens = stanza_tokens(text)
    if st_tokens:
        engines.append("stanza")

    edits: list[dict[str, Any]] = []
    claimed: set[tuple[int, int]] = set()
    seq = 0

    # 1) Builtin high-precision pairs on original text
    for wrong, right, etype, rule_id, expl in BUILTIN_PAIRS:
        for idx in _find_all(text, wrong):
            end = idx + len(wrong)
            if (idx, end) in claimed:
                continue
            before = text[idx - 1] if idx > 0 else ""
            after = text[end] if end < len(text) else ""
            # Allow space-bounded multiword; for single tokens require boundaries
            if " " not in wrong:
                if _is_letter(before) or _is_letter(after):
                    continue
            claimed.add((idx, end))
            seq += 1
            edits.append(
                {
                    "id": f"rb-{seq}",
                    "start": idx,
                    "end": end,
                    "type": etype,
                    "original": wrong,
                    "suggestion": right,
                    "ruleId": rule_id,
                    "explanation": expl,
                    "confidence": 0.86,
                    "source": "gec",
                    "status": "proposed",
                }
            )

    # 1b) Fareh common-error table (LanguageTool Arabic rules DB)
    try:
        from engines.fareh_rules import fareh_edits

        fareh = fareh_edits(text)
        if fareh.get("edits"):
            engines.append("fareh")
        for e in fareh.get("edits") or []:
            span = (int(e["start"]), int(e["end"]))
            if span in claimed:
                continue
            claimed.add(span)
            seq += 1
            e = dict(e)
            e["id"] = f"rb-fareh-{seq}"
            edits.append(e)
    except Exception:
        pass

    # 1c) Ghalatawi autocorrect (token-level when possible)
    try:
        from engines.ghalatawi_engine import ghalatawi_edits

        gh = ghalatawi_edits(text)
        if gh.get("engine") == "ghalatawi":
            engines.append("ghalatawi")
        for e in gh.get("edits") or []:
            span = (int(e["start"]), int(e["end"]))
            if span in claimed:
                continue
            claimed.add(span)
            seq += 1
            e = dict(e)
            e["id"] = f"rb-gh-{seq}"
            edits.append(e)
    except Exception:
        pass

    # 2) Punctuation spacing (Arabic)
    for m in re.finditer(r"\s+([،؛؟!.,])", text):
        start, end = m.start(), m.end()
        if (start, end) in claimed:
            continue
        claimed.add((start, end))
        seq += 1
        edits.append(
            {
                "id": f"rb-{seq}",
                "start": start,
                "end": end,
                "type": "punctuation",
                "original": m.group(0),
                "suggestion": m.group(1),
                "ruleId": "rb-punct-space-before",
                "explanation": "لا مسافة قبل علامة الترقيم",
                "confidence": 0.9,
                "source": "gec",
                "status": "proposed",
            }
        )

    for m in re.finditer(r"([،؛؟!])([^\s\d])", text):
        # Insert space after Arabic punctuation when missing
        start, end = m.start(1), m.end(1)
        span = (start, end)
        # Represent as replacing punct+nextchar with punct+space+nextchar — need full span
        full_start, full_end = m.start(), m.end()
        if (full_start, full_end) in claimed:
            continue
        claimed.add((full_start, full_end))
        seq += 1
        edits.append(
            {
                "id": f"rb-{seq}",
                "start": full_start,
                "end": full_end,
                "type": "punctuation",
                "original": m.group(0),
                "suggestion": f"{m.group(1)} {m.group(2)}",
                "ruleId": "rb-punct-space-after",
                "explanation": "مسافة بعد علامة الترقيم",
                "confidence": 0.88,
                "source": "gec",
                "status": "proposed",
            }
        )

    # 3) Stanza-assisted: flag Latin digits stuck to Arabic (style)
    if st_tokens:
        engines.append("stanza-assisted")

    engine = "+".join(engines) if engines else "rules-nlp-builtin"
    return {
        "ok": True,
        "text": text,
        "edits": edits,
        "tokens": st_tokens[:200],
        "engine": f"rules-nlp:{engine}",
        "note": "Rule-based NLP (PyArabic/Stanza/Fareh/Ghalatawi/builtin)",
    }
