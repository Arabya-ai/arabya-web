"""Dahl Inference: rotate API keys and models when quota or auth fails."""

from __future__ import annotations

import re
from typing import Iterable

from loguru import logger
from openai import OpenAI
from openai.types.chat import ChatCompletion

DAHL_DEFAULT_BASE = "https://inference.dahl.global/v1"
DAHL_DEFAULT_MODELS = (
    "MiniMaxAI/MiniMax-M2.7",
    "moonshotai/Kimi-K2.6",
    "deepseek-ai/DeepSeek-V4-Flash-0731",
)

_EXHAUSTED_MARKERS = (
    "402",
    "exhausted",
    "available tokens",
    "payment required",
    "quota",
    "insufficient",
)
_AUTH_MARKERS = (
    "401",
    "invalid api token",
    "invalid api key",
    "missing api token",
    "expired api token",
)


def is_dahl_base_url(base_url: str | None) -> bool:
    return "inference.dahl.global" in (base_url or "").lower()


def parse_csv_values(raw: str | None) -> list[str]:
    if not raw:
        return []
    parts = re.split(r"[,;\n]+", str(raw))
    return [part.strip() for part in parts if part.strip()]


def dahl_keys_from_config(app_config: dict) -> list[str]:
    keys = parse_csv_values(app_config.get("dahl_api_keys"))
    if not keys:
        keys = parse_csv_values(app_config.get("openai_api_key"))
    # de-dupe while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def dahl_models_from_config(app_config: dict, primary_model: str) -> list[str]:
    models = parse_csv_values(app_config.get("dahl_models"))
    if primary_model and primary_model not in models:
        models.insert(0, primary_model)
    if not models:
        models = list(DAHL_DEFAULT_MODELS)
    seen: set[str] = set()
    out: list[str] = []
    for model in models:
        if model in seen:
            continue
        seen.add(model)
        out.append(model)
    return out


def _should_rotate(error: Exception) -> bool:
    message = str(error).lower()
    return any(marker in message for marker in _EXHAUSTED_MARKERS + _AUTH_MARKERS)


def dahl_chat_completion(
    *,
    prompt: str,
    api_keys: Iterable[str],
    models: Iterable[str],
    base_url: str,
    extract_text,
) -> str:
    keys = [key for key in api_keys if key]
    model_list = [model for model in models if model]
    if not keys:
        raise ValueError("dahl: no API keys configured")
    if not model_list:
        raise ValueError("dahl: no models configured")

    errors: list[str] = []
    for key_index, api_key in enumerate(keys):
        client = OpenAI(api_key=api_key, base_url=base_url)
        for model_index, model_name in enumerate(model_list):
            try:
                logger.info(
                    f"dahl chat: key={key_index + 1}/{len(keys)} model={model_name}"
                )
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                )
                if not isinstance(response, ChatCompletion):
                    raise ValueError(f"dahl: invalid response type for {model_name}")
                return extract_text(response, "dahl")
            except Exception as exc:
                note = f"key {key_index + 1} model {model_name}: {exc}"
                errors.append(note)
                logger.warning(f"dahl attempt failed — {note}")
                if not _should_rotate(exc):
                    raise
                continue

    joined = " | ".join(errors[-6:])
    raise RuntimeError(f"dahl: all keys/models failed — {joined}")
