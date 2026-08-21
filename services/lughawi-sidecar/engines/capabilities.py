"""Detect optional NLP packages without crashing boot."""

from __future__ import annotations

import os
from typing import Any


def probe() -> dict[str, Any]:
    has_pyarabic = False
    try:
        import pyarabic.araby  # noqa: F401

        has_pyarabic = True
    except Exception:
        pass

    has_ghalatawi = False
    try:
        from ghalatawi.autocorrector import AutoCorrector  # noqa: F401

        has_ghalatawi = True
    except Exception:
        pass

    has_fareh = False
    try:
        from engines.fareh_rules import available as fareh_available

        has_fareh = fareh_available()
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

    has_faster_whisper = False
    try:
        import faster_whisper  # noqa: F401

        has_faster_whisper = True
    except Exception:
        pass

    has_hf_token = bool(
        os.environ.get("LUGHAWI_HF_TOKEN", "").strip()
        or os.environ.get("HF_TOKEN", "").strip()
        or os.environ.get("HUGGING_FACE_HUB_TOKEN", "").strip()
    )
    prefer_hf = os.environ.get("LUGHAWI_PREFER_HF", "1").strip().lower() not in {
        "0",
        "false",
        "no",
        "off",
    }

    return {
        "pyarabic": has_pyarabic,
        "ghalatawi": has_ghalatawi,
        "fareh": has_fareh,
        "camel": has_camel,
        "stanza": has_stanza,
        "catt": has_catt,
        "transformers": has_transformers,
        "fasterWhisper": has_faster_whisper,
        "hfToken": has_hf_token,
        "preferHf": prefer_hf and has_hf_token,
        "contaboComplete": True,
    }
