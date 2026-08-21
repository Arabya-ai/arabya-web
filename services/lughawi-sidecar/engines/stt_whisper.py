"""
Speech-to-text — Contabo-complete with optional HF acceleration.

Policy:
1) Contabo local faster-whisper must work without HF token.
2) If token present and LUGHAWI_PREFER_HF≠0 → try HF first (spare CPU).
3) On HF fail/quota → automatic local Contabo fallback.
"""

from __future__ import annotations

import base64
import json
import os
import tempfile
import urllib.error
import urllib.request
from typing import Any

DEFAULT_WHISPER_HF = os.environ.get(
    "LUGHAWI_WHISPER_MODEL",
    "openai/whisper-large-v3",
)
# faster-whisper size: tiny/base/small/medium/large-v3
LOCAL_WHISPER_SIZE = os.environ.get("LUGHAWI_WHISPER_LOCAL_SIZE", "medium")

_local_model = None
_local_failed = False


def _hf_token() -> str:
    return (
        os.environ.get("LUGHAWI_HF_TOKEN", "").strip()
        or os.environ.get("HF_TOKEN", "").strip()
        or os.environ.get("HUGGING_FACE_HUB_TOKEN", "").strip()
    )


def _prefer_hf() -> bool:
    flag = os.environ.get("LUGHAWI_PREFER_HF", "1").strip().lower()
    if flag in {"0", "false", "no", "off"}:
        return False
    return bool(_hf_token())


def _allow_local_stt() -> bool:
    flag = os.environ.get("LUGHAWI_STT_LOCAL", "1").strip().lower()
    return flag not in {"0", "false", "no", "off"}


def _decode_audio(
    audio_b64: str | None,
    audio_bytes: bytes | None,
) -> tuple[bytes | None, str | None]:
    if audio_bytes is not None:
        return audio_bytes, None
    if not audio_b64:
        return None, "audio required"
    try:
        return base64.b64decode(audio_b64), None
    except Exception:
        return None, "invalid base64"


def _guess_suffix(filename: str) -> str:
    lower = filename.lower()
    for ext in (".wav", ".mp3", ".m4a", ".ogg", ".webm", ".mp4"):
        if lower.endswith(ext):
            return ext
    return ".webm"


def _content_type(filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".wav"):
        return "audio/wav"
    if lower.endswith(".mp3"):
        return "audio/mpeg"
    if lower.endswith(".mp4") or lower.endswith(".m4a"):
        return "audio/mp4"
    if lower.endswith(".ogg"):
        return "audio/ogg"
    return "audio/webm"


def _transcribe_hf(audio_bytes: bytes, filename: str) -> dict[str, Any] | None:
    if not _prefer_hf():
        return None
    token = _hf_token()
    if not token:
        return None
    model = DEFAULT_WHISPER_HF
    urls = [
        f"https://router.huggingface.co/hf-inference/models/{model}",
        f"https://api-inference.huggingface.co/models/{model}",
    ]
    ctype = _content_type(filename)
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
        "engine": "hf-whisper-failed",
        "error": last_err or "HF Whisper failed — trying Contabo local",
        "filename": filename,
    }


def _get_local_whisper():  # type: ignore[no-untyped-def]
    global _local_model, _local_failed
    if not _allow_local_stt():
        return None
    if _local_failed:
        return None
    if _local_model is not None:
        return _local_model
    try:
        from faster_whisper import WhisperModel

        # int8 on CPU — Contabo-friendly
        _local_model = WhisperModel(
            LOCAL_WHISPER_SIZE,
            device="cpu",
            compute_type=os.environ.get("LUGHAWI_WHISPER_COMPUTE", "int8"),
        )
        return _local_model
    except Exception:
        _local_failed = True
        return None


def _transcribe_local(audio_bytes: bytes, filename: str) -> dict[str, Any]:
    model = _get_local_whisper()
    if model is None:
        return {
            "ok": False,
            "text": "",
            "engine": "whisper-local-unloaded",
            "error": (
                "Whisper المحلي غير مثبّت. شغّل: bash scripts/contabo-lughawi-sidecar-deps.sh "
                "أو أضف LUGHAWI_HF_TOKEN كتسريع اختياري."
            ),
            "filename": filename,
        }
    suffix = _guess_suffix(filename)
    path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            path = tmp.name
        segments, _info = model.transcribe(path, language="ar", beam_size=1)
        parts = [seg.text.strip() for seg in segments if getattr(seg, "text", None)]
        text = " ".join(p for p in parts if p).strip()
        return {
            "ok": True,
            "text": text,
            "engine": f"contabo-local-whisper:{LOCAL_WHISPER_SIZE}",
            "filename": filename,
        }
    except Exception as e:
        return {
            "ok": False,
            "text": "",
            "engine": "whisper-local-error",
            "error": f"{type(e).__name__}: {e}",
            "filename": filename,
        }
    finally:
        if path:
            try:
                os.unlink(path)
            except Exception:
                pass


def transcribe_audio(
    *,
    audio_b64: str | None = None,
    audio_bytes: bytes | None = None,
    filename: str = "audio.webm",
) -> dict[str, Any]:
    data, err = _decode_audio(audio_b64, audio_bytes)
    if err or data is None:
        return {"ok": False, "text": "", "engine": "whisper", "error": err or "audio required"}
    if len(data) > 25_000_000:
        return {"ok": False, "text": "", "engine": "whisper", "error": "file too large (max 25MB)"}

    # 1) Optional HF acceleration
    remote = _transcribe_hf(data, filename)
    if remote is not None and remote.get("ok"):
        return remote

    # 2) Contabo local foundation
    local = _transcribe_local(data, filename)
    if local.get("ok"):
        if remote is not None and remote.get("error"):
            local = {
                **local,
                "warning": str(remote.get("error")),
            }
        return local

    # Both failed
    parts = []
    if remote is not None and remote.get("error"):
        parts.append(str(remote["error"]))
    if local.get("error"):
        parts.append(str(local["error"]))
    return {
        "ok": False,
        "text": "",
        "engine": "whisper-unavailable",
        "error": " · ".join(parts) or "لا يتوفر Whisper (لا HF ولا محلي)",
        "filename": filename,
    }


def local_stt_ready() -> bool:
    return _get_local_whisper() is not None
