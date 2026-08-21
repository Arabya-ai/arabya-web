"""
Optional Contabo engines: Mishkal (tashkeel) + libqutrub (conjugation).

If packages are missing, callers get a graceful unavailable payload — never raise
to the HTTP client for import failures.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

logger = logging.getLogger("arabya_nlp.optional_engines")


@lru_cache(maxsize=1)
def mishkal_available() -> bool:
    try:
        import mishkal.tashkeel  # noqa: F401

        return True
    except Exception as exc:
        logger.info("mishkal unavailable: %s", exc)
        return False


@lru_cache(maxsize=1)
def qutrub_available() -> bool:
    try:
        import libqutrub.conjugator  # noqa: F401

        return True
    except Exception as exc:
        logger.info("libqutrub unavailable: %s", exc)
        return False


@lru_cache(maxsize=1)
def pyarabic_available() -> bool:
    try:
        from pyarabic import araby  # noqa: F401

        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def ghalatawi_available() -> bool:
    try:
        from ghalatawi.autocorrector import AutoCorrector  # noqa: F401

        return True
    except Exception:
        return False


@dataclass
class TashkeelResult:
    ok: bool
    original: str
    text: str
    engine: str
    available: bool
    warnings: list[str] = field(default_factory=list)


@dataclass
class ConjugateResult:
    ok: bool
    verb: str
    future_type: str
    table: dict[str, Any]
    engine: str
    available: bool
    warnings: list[str] = field(default_factory=list)


_mishkal_vocalizer: Any | None = None


def _get_mishkal() -> Any | None:
    global _mishkal_vocalizer
    if not mishkal_available():
        return None
    if _mishkal_vocalizer is None:
        import mishkal.tashkeel

        _mishkal_vocalizer = mishkal.tashkeel.TashkeelClass()
    return _mishkal_vocalizer


def run_mishkal_tashkeel(text: str) -> TashkeelResult:
    original = (text or "").strip()
    if not original:
        return TashkeelResult(
            ok=False,
            original="",
            text="",
            engine="",
            available=mishkal_available(),
            warnings=["empty text"],
        )

    vocalizer = _get_mishkal()
    if vocalizer is None:
        return TashkeelResult(
            ok=False,
            original=original,
            text=original,
            engine="mishkal-missing",
            available=False,
            warnings=[
                "حزمة mishkal غير مثبتة — ثبّتها اختياريًا عبر contabo-arabya-nlp-deps.sh"
            ],
        )

    try:
        out = vocalizer.tashkeel(original)
        if not isinstance(out, str) or not out.strip():
            return TashkeelResult(
                ok=False,
                original=original,
                text=original,
                engine="mishkal:empty",
                available=True,
                warnings=["mishkal returned empty"],
            )
        return TashkeelResult(
            ok=True,
            original=original,
            text=out.strip(),
            engine="mishkal",
            available=True,
        )
    except Exception as exc:
        logger.exception("mishkal tashkeel failed")
        return TashkeelResult(
            ok=False,
            original=original,
            text=original,
            engine="mishkal:error",
            available=True,
            warnings=[str(exc)],
        )


def _normalize_future_type(raw: str | None) -> str:
    allowed = {"فتحة", "ضمة", "كسرة"}
    value = (raw or "فتحة").strip()
    return value if value in allowed else "فتحة"


def run_qutrub_conjugate(
    verb: str,
    *,
    future_type: str | None = None,
    transitive: bool = True,
) -> ConjugateResult:
    lemma = (verb or "").strip()
    ft = _normalize_future_type(future_type)
    if not lemma:
        return ConjugateResult(
            ok=False,
            verb="",
            future_type=ft,
            table={},
            engine="",
            available=qutrub_available(),
            warnings=["empty verb"],
        )

    if not qutrub_available():
        return ConjugateResult(
            ok=False,
            verb=lemma,
            future_type=ft,
            table={},
            engine="qutrub-missing",
            available=False,
            warnings=[
                "حزمة libqutrub غير مثبتة — ثبّتها اختياريًا عبر contabo-arabya-nlp-deps.sh"
            ],
        )

    try:
        import libqutrub.conjugator

        table = libqutrub.conjugator.conjugate(
            lemma,
            ft,
            transitive=transitive,
            display_format="DICT",
        )
        if not isinstance(table, dict):
            return ConjugateResult(
                ok=False,
                verb=lemma,
                future_type=ft,
                table={},
                engine="qutrub:bad-shape",
                available=True,
                warnings=["unexpected conjugator output"],
            )
        # Convert nested tuples/lists to JSON-friendly structures
        clean: dict[str, Any] = {}
        for tense, forms in table.items():
            if isinstance(forms, dict):
                clean[str(tense)] = {str(k): str(v) for k, v in forms.items()}
            elif isinstance(forms, (list, tuple)):
                clean[str(tense)] = {
                    str(k): str(v) for k, v in forms
                }
            else:
                clean[str(tense)] = str(forms)
        return ConjugateResult(
            ok=True,
            verb=lemma,
            future_type=ft,
            table=clean,
            engine="libqutrub",
            available=True,
        )
    except Exception as exc:
        logger.exception("qutrub conjugate failed")
        return ConjugateResult(
            ok=False,
            verb=lemma,
            future_type=ft,
            table={},
            engine="qutrub:error",
            available=True,
            warnings=[str(exc)],
        )


def engines_snapshot() -> dict[str, Any]:
    return {
        "pyarabic": pyarabic_available(),
        "ghalatawi": ghalatawi_available(),
        "mishkal": mishkal_available(),
        "qutrub": qutrub_available(),
        "priority": [
            "pyarabic",
            "builtin-rules",
            "ghalatawi",
            "ollama-optional",
            "mishkal-optional",
            "qutrub-optional",
        ],
        "offlineOkWithoutOllama": True,
        "noteAr": (
            "الأولوية: PyArabic + قواعد (+ غلطاوي). "
            "Ollama اختياري. mishkal/qutrub اختياريان خلف API فقط."
        ),
    }
