"""Tashkeel via CATT when installed; else honest passthrough."""

from __future__ import annotations

from typing import Any


def tashkeel(text: str, level: str) -> dict[str, Any]:
    try:
        # Best-effort: different package names exist in the wild.
        try:
            from catt import diacritize  # type: ignore
        except Exception:
            from catt_tashkeel import diacritize  # type: ignore

        out = diacritize(text)
        if isinstance(out, dict):
            diac = str(out.get("text") or out.get("diacritized") or text)
        else:
            diac = str(out)
        return {
            "ok": True,
            "text": diac,
            "engine": "catt",
            "level": level,
        }
    except Exception:
        return {
            "ok": True,
            "text": text,
            "engine": "sidecar-tashkeel-passthrough",
            "level": level,
            "warning": "CATT غير مثبت — أعد النص كما هو. ثبّت CATT على Contabo للتشكيل العصبي.",
        }
