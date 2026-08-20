"""
Lughawi NLP sidecar — localhost only (default 127.0.0.1:8091).

Foundation stack (install via scripts/contabo-lughawi-sidecar-deps.sh):
  - PyArabic + Stanford Stanza + CAMeL Tools  → rule-based / morph NLP
  - Optional HF AraBART GEC                   → contextual grammar
  - Optional CATT                             → neural tashkeel

Without heavy packages the service still boots with honest fallbacks.
"""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

# Allow `python app.py` from this directory
sys.path.insert(0, str(Path(__file__).resolve().parent))

from engines.capabilities import probe  # noqa: E402
from engines.gec import gec_neural  # noqa: E402
from engines.morph import analyze_morph  # noqa: E402
from engines.rules_nlp import rules_nlp_edits  # noqa: E402
from engines.tashkeel import tashkeel as run_tashkeel  # noqa: E402

HOST = "127.0.0.1"
PORT = 8091
VERSION = "0.3.0"


def _json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


def health_payload() -> dict[str, Any]:
    caps = probe()
    morph = "camel" if caps["camel"] else "heuristic"
    rules = []
    if caps["pyarabic"]:
        rules.append("pyarabic")
    if caps["stanza"]:
        rules.append("stanza")
    rules.append("builtin")
    gec = "arabart" if caps["transformers"] else "rules-nlp"
    return {
        "ok": True,
        "service": "lughawi-sidecar",
        "version": VERSION,
        "capabilities": caps,
        "tools": {
            "morph": morph,
            "rules_nlp": "+".join(rules),
            "tashkeel": "catt" if caps["catt"] else "passthrough",
            "gec": gec,
        },
        "foundation": {
            "ruleBasedNlp": True,
            "stanza": caps["stanza"],
            "camel": caps["camel"],
            "pyarabic": caps["pyarabic"],
            "neuralGec": caps["transformers"],
            "noteAr": (
                "الأساس: قواعد NLP (Stanza/PyArabic/CAMeL) + GEC اختياري. "
                "النماذج اللغوية المحلية عبر Ollama على Contabo منفصلة."
            ),
        },
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:  # quieter PM2 logs
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

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
        self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            body = self._read_json()
        except Exception as e:
            self._send(400, {"ok": False, "error": str(e)})
            return

        text = body.get("text") if isinstance(body.get("text"), str) else ""
        if path != "/health" and not text.strip():
            self._send(400, {"ok": False, "error": "text required"})
            return

        if path == "/morph":
            tokens, engine = analyze_morph(text)
            self._send(200, {"ok": True, "tokens": tokens, "engine": engine})
            return

        if path == "/tashkeel":
            level = body.get("level") if isinstance(body.get("level"), str) else "full"
            self._send(200, run_tashkeel(text, level))
            return

        if path == "/rules-nlp":
            self._send(200, rules_nlp_edits(text))
            return

        if path == "/gec":
            # Foundation: always run rule-based NLP; neural GEC merges on top when loaded.
            base = rules_nlp_edits(text)
            neural = gec_neural(text)
            edits = list(base.get("edits") or [])
            # Prefer span-local rule edits; only append neural if it produced something
            # and rules found nothing spanning the whole text.
            for e in neural.get("edits") or []:
                edits.append(e)
            engines = [base.get("engine"), neural.get("engine")]
            self._send(
                200,
                {
                    "ok": True,
                    "text": text,
                    "edits": edits,
                    "engine": "+".join(str(x) for x in engines if x),
                    "warning": neural.get("warning"),
                    "tokens": base.get("tokens") or [],
                },
            )
            return

        self._send(404, {"ok": False, "error": "not found"})


def main() -> None:
    httpd = HTTPServer((HOST, PORT), Handler)
    print(f"lughawi-sidecar {VERSION} on http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
