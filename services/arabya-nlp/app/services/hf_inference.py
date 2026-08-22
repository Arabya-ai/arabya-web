"""
Hugging Face chat Inference — optional MoA proposers/judge.

Contabo-first: missing token or network errors return soft-fail dicts.
Never raise to the proofread API caller.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("arabya_nlp.hf_inference")

# OpenAI-compatible router (current HF path) + legacy fallback.
_CHAT_URLS = (
    "https://router.huggingface.co/v1/chat/completions",
    "https://api-inference.huggingface.co/v1/chat/completions",
)


def resolve_hf_token() -> str:
    return (
        os.environ.get("LUGHAWI_HF_TOKEN", "").strip()
        or os.environ.get("ARABYA_NLP_HF_TOKEN", "").strip()
        or os.environ.get("HF_TOKEN", "").strip()
        or os.environ.get("HUGGING_FACE_HUB_TOKEN", "").strip()
    )


def hf_chat_completion(
    *,
    model: str,
    system: str,
    user: str,
    token: str | None = None,
    max_tokens: int = 1024,
    timeout_s: float = 4.0,
    temperature: float = 0.2,
) -> dict[str, Any]:
    """
    Single chat completion. Returns:
      {ok: True, content: str, model: str, ms: int}
      {ok: False, error: str, model: str, ms: int}
    """
    import time

    t0 = time.monotonic()
    auth = (token or resolve_hf_token()).strip()
    if not auth:
        return {
            "ok": False,
            "error": "hf-token-missing",
            "model": model,
            "ms": 0,
            "content": "",
        }
    if not model.strip():
        return {
            "ok": False,
            "error": "hf-model-empty",
            "model": model,
            "ms": 0,
            "content": "",
        }

    body = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        },
        ensure_ascii=False,
    ).encode("utf-8")

    last_err = "hf-unreachable"
    for url in _CHAT_URLS:
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {auth}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "arabya-nlp-moa/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
            data = json.loads(raw) if raw else {}
            choices = data.get("choices") if isinstance(data, dict) else None
            content = ""
            if isinstance(choices, list) and choices:
                msg = choices[0].get("message") if isinstance(choices[0], dict) else None
                if isinstance(msg, dict):
                    content = str(msg.get("content") or "")
            ms = int((time.monotonic() - t0) * 1000)
            if not content.strip():
                return {
                    "ok": False,
                    "error": "hf-empty-content",
                    "model": model,
                    "ms": ms,
                    "content": "",
                }
            return {
                "ok": True,
                "content": content.strip(),
                "model": model,
                "ms": ms,
            }
        except urllib.error.HTTPError as exc:
            try:
                detail = exc.read().decode("utf-8", errors="replace")[:240]
            except Exception:
                detail = ""
            last_err = f"hf-http-{exc.code}:{detail or exc.reason}"
            logger.info("HF chat %s failed: %s", model, last_err)
            # 404 / retired model — try next URL once; otherwise stop
            if exc.code in {401, 403}:
                break
        except Exception as exc:  # noqa: BLE001 — soft fail path
            last_err = f"hf-error:{type(exc).__name__}:{exc}"
            logger.info("HF chat %s error: %s", model, last_err)

    return {
        "ok": False,
        "error": last_err,
        "model": model,
        "ms": int((time.monotonic() - t0) * 1000),
        "content": "",
    }
