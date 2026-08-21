"""Local Ollama HTTP client (Contabo host only — 127.0.0.1)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.ollama")


class OllamaClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def is_up(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(self.settings.ollama_tags_url)
                return res.status_code == 200
        except Exception:
            return False

    def is_up_sync(self) -> bool:
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(self.settings.ollama_tags_url)
                return res.status_code == 200
        except Exception:
            return False

    async def generate(
        self,
        *,
        model: str,
        prompt: str,
        system: str | None = None,
        format_json: bool = True,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 2048},
        }
        if system:
            payload["system"] = system
        if format_json:
            payload["format"] = "json"

        timeout = timeout if timeout is not None else self.settings.ollama_timeout_seconds
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(self.settings.ollama_generate_url, json=payload)
                res.raise_for_status()
                data = res.json()
        except Exception as exc:
            logger.warning("Ollama generate failed: %s", exc)
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}", "response": ""}

        raw = str(data.get("response") or "")
        return {"ok": True, "response": raw, "raw": data, "model": model}

    def generate_sync(
        self,
        *,
        model: str,
        prompt: str,
        system: str | None = None,
        format_json: bool = True,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 1536},
        }
        if system:
            payload["system"] = system
        if format_json:
            payload["format"] = "json"
        timeout = timeout if timeout is not None else self.settings.ollama_devops_timeout_seconds
        try:
            with httpx.Client(timeout=timeout) as client:
                res = client.post(self.settings.ollama_generate_url, json=payload)
                res.raise_for_status()
                data = res.json()
        except Exception as exc:
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}", "response": ""}
        return {"ok": True, "response": str(data.get("response") or ""), "raw": data, "model": model}


def parse_json_object(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if not text:
        return None
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        try:
            obj = json.loads(match.group(0))
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            return None
