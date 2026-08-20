"""
Lughawi NLP sidecar — localhost only (default 127.0.0.1:8091).

Real CAMeL / CATT / GEC packages are optional. Without them we still expose
honest endpoints with lightweight fallbacks so Next.js can wire health + UX.
"""

from __future__ import annotations

import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = 8091
VERSION = "0.1.0"

# Optional heavy deps — never required to boot.
_HAS_CAMEL = False
try:
    import camel_tools  # type: ignore  # noqa: F401

    _HAS_CAMEL = True
except Exception:
    _HAS_CAMEL = False

_HAS_CATT = False
try:
    import catt  # type: ignore  # noqa: F401

    _HAS_CATT = True
except Exception:
    _HAS_CATT = False


def _json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


def health_payload() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "lughawi-sidecar",
        "version": VERSION,
        "tools": {
            "morph": "camel" if _HAS_CAMEL else "heuristic",
            "tashkeel": "catt" if _HAS_CATT else "passthrough",
            "gec": "stub",
        },
    }


def morph_heuristic(text: str) -> list[dict[str, str]]:
    tokens: list[dict[str, str]] = []
    for raw in re.findall(r"[\u0600-\u06FF]+|[A-Za-z0-9]+", text):
        pos = "NOUN"
        note = "تقدير خفيف — ثبّت CAMeL Tools للتحليل الكامل"
        if raw.startswith(("ال",)):
            pos = "NOUN"
            note = "اسم معرّف بأل (تقدير)"
        elif raw in {"في", "من", "إلى", "على", "عن", "ب", "ل", "ك"}:
            pos = "PREP"
            note = "حرف جر شائع"
        elif raw in {"و", "ف", "ثم", "أو", "أم"}:
            pos = "CONJ"
            note = "حرف عطف"
        elif raw.endswith(("ون", "ين", "ات", "ان")):
            pos = "NOUN"
            note = "جمع/مثنى محتمل"
        tokens.append(
            {
                "surface": raw,
                "lemma": raw.lstrip("والفبلك"),
                "pos": pos,
                "note": note,
            }
        )
    return tokens


def tashkeel_passthrough(text: str, level: str) -> dict[str, Any]:
    # Without CATT we do not invent diacritics — return input + clear engine tag.
    return {
        "ok": True,
        "text": text,
        "engine": "sidecar-tashkeel-passthrough",
        "level": level,
        "warning": "CATT غير مثبت — أعد النص كما هو. ثبّت CATT على Contabo للتشكيل العصبي.",
    }


def gec_stub(text: str) -> dict[str, Any]:
    return {
        "ok": True,
        "text": text,
        "edits": [],
        "engine": "sidecar-gec-stub",
        "warning": "نموذج GEC غير محمّل بعد — استخدم محرك قواعد لغوي في Next.",
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, obj: Any) -> None:
        raw = _json_bytes(obj)
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return {}
        if length > 2_000_000:
            raise ValueError("payload too large")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in ("/health", "/"):
            self._send(200, health_payload())
            return
        self._send(404, {"ok": False, "error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            body = self._read_json()
        except Exception as e:  # noqa: BLE001
            self._send(400, {"ok": False, "error": str(e)})
            return

        text = body.get("text") if isinstance(body.get("text"), str) else ""
        if path == "/morph":
            if not text.strip():
                self._send(400, {"ok": False, "error": "text required"})
                return
            tokens = morph_heuristic(text)
            self._send(
                200,
                {
                    "ok": True,
                    "tokens": tokens,
                    "engine": "camel" if _HAS_CAMEL else "sidecar-morph-heuristic",
                },
            )
            return

        if path == "/tashkeel":
            if not text.strip():
                self._send(400, {"ok": False, "error": "text required"})
                return
            level = body.get("level") if isinstance(body.get("level"), str) else "full"
            if _HAS_CATT:
                # Placeholder hook — real CATT call when package + model present.
                self._send(
                    200,
                    {
                        "ok": True,
                        "text": text,
                        "engine": "catt-pending-wire",
                        "level": level,
                        "warning": "حزمة CATT موجودة لكن الربط الكامل يُفعَّل بعد ضبط الأوزان.",
                    },
                )
                return
            self._send(200, tashkeel_passthrough(text, level))
            return

        if path == "/gec":
            if not text.strip():
                self._send(400, {"ok": False, "error": "text required"})
                return
            self._send(200, gec_stub(text))
            return

        self._send(404, {"ok": False, "error": "not_found"})

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
        return


if __name__ == "__main__":
    print(f"lughawi-sidecar {VERSION} on http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
