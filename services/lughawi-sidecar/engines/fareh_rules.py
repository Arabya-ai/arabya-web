"""
Fareh (linuxscout) — Arabic common-error replace table for LanguageTool-style rules.

Source: https://github.com/linuxscout/fareh (replaces.txt)
Vendored at services/lughawi-sidecar/data/fareh-replaces.txt
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

_DATA = Path(__file__).resolve().parent.parent / "data" / "fareh-replaces.txt"
_PAIRS: list[tuple[str, str]] | None = None


def _load() -> list[tuple[str, str]]:
    global _PAIRS
    if _PAIRS is not None:
        return _PAIRS
    pairs: list[tuple[str, str]] = []
    if not _DATA.is_file():
        _PAIRS = pairs
        return pairs
    for line in _DATA.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        wrong, _, rest = line.partition("=")
        wrong = wrong.strip()
        # suggestion1|suggestion2 → take first
        right = rest.split("|", 1)[0].strip()
        if not wrong or not right or wrong == right:
            continue
        # Skip pure punctuation mega-short unless Arabic letters involved
        pairs.append((wrong, right))
    # Longer keys first to avoid partial clashes
    pairs.sort(key=lambda p: len(p[0]), reverse=True)
    _PAIRS = pairs
    return pairs


def available() -> bool:
    return _DATA.is_file() and len(_load()) > 0


def _is_letter(c: str) -> bool:
    return bool(c) and bool(re.match(r"[\u0600-\u06FFa-zA-Z0-9]", c))


def fareh_edits(text: str) -> dict[str, Any]:
    pairs = _load()
    if not pairs:
        return {"ok": True, "edits": [], "engine": "fareh-unloaded"}

    edits: list[dict[str, Any]] = []
    claimed: set[tuple[int, int]] = set()
    seq = 0
    for wrong, right in pairs:
        start = 0
        while True:
            idx = text.find(wrong, start)
            if idx < 0:
                break
            end = idx + len(wrong)
            start = end
            if (idx, end) in claimed:
                continue
            before = text[idx - 1] if idx > 0 else ""
            after = text[end] if end < len(text) else ""
            # Require token boundaries for word-like replaces
            if len(wrong) <= 12 and (" " not in wrong):
                if _is_letter(before) or _is_letter(after):
                    continue
            claimed.add((idx, end))
            seq += 1
            edits.append(
                {
                    "id": f"fareh-{seq}",
                    "start": idx,
                    "end": end,
                    "type": "spelling" if len(wrong) < 20 else "grammar",
                    "original": wrong,
                    "suggestion": right,
                    "ruleId": f"fareh:{wrong}",
                    "explanation": "قاعدة فارح (أخطاء عربية شائعة / LanguageTool)",
                    "confidence": 0.88,
                    "source": "gec",
                    "status": "proposed",
                }
            )
            if seq >= 80:
                break
        if seq >= 80:
            break

    return {
        "ok": True,
        "edits": edits,
        "engine": "fareh",
        "pairCount": len(pairs),
    }
