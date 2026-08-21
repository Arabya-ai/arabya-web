"""
Speech-to-text — prefer Hugging Face Inference (Whisper) to spare Contabo CPU/RAM.

Default model: openai/whisper-large-v3 (strong Arabic support).
Override: LUGHAWI_WHISPER_MODEL=MightyStudent/whisper-large-v3-arabic
"""

from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request
from typing import Any

DEFAULT_WHISPER = os.environ.get(
    "LUGHAWI_WHISPER_MODEL",
    "openai/whisper-large-v3",
)


def _hf_token() -> str:
    return (
        os.environ.get("LUGHAWI_HF_TOKEN", "").strip()
        or os.environ.get("HF_TOKEN", "").strip()
        or os.environ.get("HUGGING_FACE_HUB_TOKEN", "").strip()
    )


def transcribe_audio(
    *,
    audio_b64: str | None = None,
    audio_bytes: bytes | None = None,
    filename: str = "audio.webm",
) -> dict[str, Any]:
    token = _hf_token()
    if not token:
        return {
            "ok": False,
            "text": "",
            "engine": "whisper-unconfigured",
            "error": "أضف LUGHAWI_HF_TOKEN في .env لاستخدام Whisper عبر Hugging Face (موفّر لموارد Contabo).",
        }

    if audio_bytes is None:
        if not audio_b64:
            return {"ok": False, "text": "", "engine": "whisper", "error": "audio required"}
        try:
            audio_bytes = base64.b64decode(audio_b64)
        except Exception:
            return {"ok": False, "text": "", "engine": "whisper", "error": "invalid base64"}

    if len(audio_bytes) > 25_000_000:
        return {"ok": False, "text": "", "engine": "whisper", "error": "file too large (max 25MB)"}

    model = DEFAULT_WHISPER
    urls = [
        f"https://router.huggingface.co/hf-inference/models/{model}",
        f"https://api-inference.huggingface.co/models/{model}",
    ]
    # Guess content-type from filename
    lower = filename.lower()
    if lower.endswith(".wav"):
        ctype = "audio/wav"
    elif lower.endswith(".mp3"):
        ctype = "audio/mpeg"
    elif lower.endswith(".mp4") or lower.endswith(".m4a"):
        ctype = "audio/mp4"
    elif lower.endswith(".ogg"):
        ctype = "audio/ogg"
    else:
        ctype = "audio/webm"

    last_err = ""
    for url in urls:
        req = urllib.request.Request(
            url,
            data=audio_bytes,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": ctype,
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                raw = res.read().decode("utf-8", errors="replace")
            data = json.loads(raw)
            if isinstance(data, dict) and data.get("error"):
                last_err = str(data["error"])
                continue
            text = ""
            if isinstance(data, dict):
                text = str(data.get("text") or "")
            elif isinstance(data, list) and data and isinstance(data[0], dict):
                text = str(data[0].get("text") or "")
            return {
                "ok": True,
                "text": text.strip(),
                "engine": f"hf-whisper:{model}",
                "filename": filename,
            }
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:200]
            last_err = f"HTTP {e.code}: {body}"
            continue
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            continue

    return {
        "ok": False,
        "text": "",
        "engine": "whisper-failed",
        "error": last_err or "Whisper Inference failed",
    }
