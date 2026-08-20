"""Detect optional NLP packages without crashing boot."""

from __future__ import annotations

from typing import Any


def probe() -> dict[str, Any]:
    has_pyarabic = False
    try:
        import pyarabic.araby  # noqa: F401

        has_pyarabic = True
    except Exception:
        pass

    has_camel = False
    try:
        import camel_tools  # noqa: F401

        has_camel = True
    except Exception:
        pass

    has_stanza = False
    try:
        import stanza  # noqa: F401

        has_stanza = True
    except Exception:
        pass

    has_catt = False
    try:
        import catt  # noqa: F401

        has_catt = True
    except Exception:
        try:
            import catt_tashkeel  # noqa: F401

            has_catt = True
        except Exception:
            pass

    has_transformers = False
    try:
        import transformers  # noqa: F401

        has_transformers = True
    except Exception:
        pass

    return {
        "pyarabic": has_pyarabic,
        "camel": has_camel,
        "stanza": has_stanza,
        "catt": has_catt,
        "transformers": has_transformers,
    }
