"""
Layer 2 — Speech-to-text engine (audio/video → 16kHz WAV → faster-whisper → Layer 1).

100% Contabo-local: FFmpeg on host + faster-whisper CPU/GPU.
"""

from __future__ import annotations

import logging
import os
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models import TranscriptionJob
from app.pipeline.proofreader import count_words, proofread_text
from app.schemas import TranscribeResponse
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.audio")

ALLOWED_SUFFIXES = {".mp4", ".mov", ".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac"}

_whisper_model = None
_whisper_failed = False


def _purge(path: str | None) -> None:
    if not path:
        return
    try:
        os.unlink(path)
    except FileNotFoundError:
        pass
    except OSError as exc:
        logger.warning("Failed to purge temp file %s: %s", path, exc)


def extract_to_16k_wav(
    source_path: str,
    *,
    settings: Settings | None = None,
) -> tuple[str | None, float, str | None]:
    """
    Extract/downsample to mono 16kHz WAV under Contabo /tmp.
    Returns (wav_path, duration_seconds, error).
    """
    settings = settings or get_settings()
    Path(settings.tmp_dir).mkdir(parents=True, exist_ok=True)
    out_path = str(Path(settings.tmp_dir) / f"stt-{uuid.uuid4().hex}.wav")

    cmd = [
        settings.ffmpeg_binary,
        "-y",
        "-i",
        source_path,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        out_path,
    ]
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
            shell=False,
        )
    except FileNotFoundError:
        return None, 0.0, "ffmpeg not found on Contabo host"
    except subprocess.TimeoutExpired:
        _purge(out_path)
        return None, 0.0, "ffmpeg timeout"

    if completed.returncode != 0 or not Path(out_path).is_file():
        _purge(out_path)
        err = (completed.stderr or completed.stdout or "ffmpeg failed")[:500]
        return None, 0.0, err

    duration = _probe_duration(out_path, settings.ffmpeg_binary)
    return out_path, duration, None


def _probe_duration(wav_path: str, ffmpeg_bin: str) -> float:
    # Prefer ffprobe if present; else estimate from file size (PCM 16k mono 16-bit)
    try:
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                wav_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
            shell=False,
        )
        if probe.returncode == 0 and probe.stdout.strip():
            return max(float(probe.stdout.strip()), 0.0)
    except Exception:
        pass
    try:
        size = Path(wav_path).stat().st_size
        # 16000 samples/s * 2 bytes
        return max(size / 32000.0, 0.0)
    except OSError:
        return 0.0


def _get_whisper(settings: Settings):  # type: ignore[no-untyped-def]
    global _whisper_model, _whisper_failed
    if _whisper_failed:
        return None
    if _whisper_model is not None:
        return _whisper_model
    try:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        return _whisper_model
    except Exception as exc:
        logger.warning("faster-whisper load failed: %s", exc)
        _whisper_failed = True
        return None


def transcribe_wav(wav_path: str, *, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    model = _get_whisper(settings)
    if model is None:
        return {
            "ok": False,
            "text": "",
            "engine": "whisper-unloaded",
            "error": (
                "faster-whisper غير مثبّت. شغّل: "
                "bash scripts/contabo-arabya-nlp-deps.sh"
            ),
        }
    try:
        segments, _info = model.transcribe(
            wav_path,
            language=settings.whisper_language,
            beam_size=1,
        )
        parts = [seg.text.strip() for seg in segments if getattr(seg, "text", None)]
        text = " ".join(p for p in parts if p).strip()
        return {
            "ok": True,
            "text": text,
            "engine": f"faster-whisper:{settings.whisper_model_size}:{settings.whisper_device}",
        }
    except Exception as exc:
        return {
            "ok": False,
            "text": "",
            "engine": "whisper-error",
            "error": f"{type(exc).__name__}: {exc}",
        }


async def process_media_bytes(
    data: bytes,
    filename: str,
    *,
    db: Session | None = None,
    client_ip: str | None = None,
    settings: Settings | None = None,
    skip_llm: bool = False,
) -> TranscribeResponse:
    settings = settings or get_settings()
    warnings: list[str] = []

    if len(data) > settings.max_upload_bytes:
        return TranscribeResponse(
            ok=False,
            filename=filename,
            duration_seconds=0.0,
            raw_transcript="",
            proofread_text="",
            stt_engine="",
            word_count=0,
            warnings=[f"file too large (max {settings.max_upload_bytes} bytes)"],
        )

    suffix = Path(filename).suffix.lower() or ".bin"
    if suffix not in ALLOWED_SUFFIXES:
        return TranscribeResponse(
            ok=False,
            filename=filename,
            duration_seconds=0.0,
            raw_transcript="",
            proofread_text="",
            stt_engine="",
            word_count=0,
            warnings=[f"unsupported media type: {suffix}"],
        )

    Path(settings.tmp_dir).mkdir(parents=True, exist_ok=True)
    src_path: str | None = None
    wav_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            prefix="upload-",
            dir=settings.tmp_dir,
            delete=False,
        ) as tmp:
            tmp.write(data)
            src_path = tmp.name

        wav_path, duration, err = extract_to_16k_wav(src_path, settings=settings)
        if err or not wav_path:
            return TranscribeResponse(
                ok=False,
                filename=filename,
                duration_seconds=0.0,
                raw_transcript="",
                proofread_text="",
                stt_engine="ffmpeg",
                word_count=0,
                warnings=[err or "ffmpeg failed"],
            )

        stt = transcribe_wav(wav_path, settings=settings)
        if not stt.get("ok"):
            return TranscribeResponse(
                ok=False,
                filename=filename,
                duration_seconds=duration,
                raw_transcript="",
                proofread_text="",
                stt_engine=str(stt.get("engine") or ""),
                word_count=0,
                warnings=[str(stt.get("error") or "transcription failed")],
            )

        raw_text = str(stt.get("text") or "").strip()
        proof = await proofread_text(
            raw_text or " ",
            db=db,
            client_ip=client_ip,
            settings=settings,
            skip_llm=skip_llm or not raw_text,
        )
        if not raw_text:
            warnings.append("empty transcript")

        if db is not None:
            job = TranscriptionJob(
                client_ip=client_ip,
                filename=filename[:512],
                duration_seconds=duration,
                raw_transcript=raw_text,
                proofread_text=proof.corrected if raw_text else "",
                stt_engine=str(stt.get("engine") or ""),
                word_count=count_words(raw_text),
            )
            db.add(job)
            try:
                db.commit()
            except Exception:
                db.rollback()
                logger.exception("Failed to persist transcription job")

        return TranscribeResponse(
            ok=True,
            filename=filename,
            duration_seconds=duration,
            raw_transcript=raw_text,
            proofread_text=proof.corrected if raw_text else "",
            stt_engine=str(stt.get("engine") or ""),
            word_count=count_words(raw_text),
            proofread=proof if raw_text else None,
            warnings=warnings + list(proof.warnings),
        )
    finally:
        _purge(src_path)
        _purge(wav_path)
