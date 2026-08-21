"""
Lughawi NLP sidecar — localhost only (default 127.0.0.1:8091).

Policy:
  Contabo = complete foundation (never stops if HF token dies).
  Hugging Face = optional acceleration when token works (spare RAM/CPU).
"""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engines.capabilities import probe  # noqa: E402
from engines.gec import gec_neural  # noqa: E402
from engines.morph import analyze_morph  # noqa: E402
from engines.rules_nlp import rules_nlp_edits  # noqa: E402
from engines.stt_whisper import transcribe_audio  # noqa: E402
from engines.tashkeel import tashkeel as run_tashkeel  # noqa: E402

HOST = "127.0.0.1"
PORT = 8091
VERSION = "0.4.1"


def _json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


def health_payload() -> dict[str, Any]:
    caps = probe()
    morph = "camel" if caps["camel"] else "heuristic"
    rules = []
    for key in ("pyarabic", "ghalatawi", "fareh", "stanza"):
        if caps.get(key):
            rules.append(key)
    rules.append("builtin")

    if caps.get("preferHf"):
        gec = "hf-then-contabo-local"
    elif caps.get("transformers"):
        gec = "contabo-local"
    else:
        gec = "rules-nlp"

    if caps.get("preferHf") and caps.get("fasterWhisper"):
        stt = "hf-then-contabo-local"
    elif caps.get("fasterWhisper"):
        stt = "contabo-local-whisper"
    elif caps.get("hfToken"):
        stt = "hf-only-until-local-installed"
    else:
        stt = "needs-local-or-hf"

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
            "stt": stt,
        },
        "policy": {
            "contaboFirstComplete": True,
            "hfOptionalAcceleration": True,
            "autoFallbackLocal": True,
            "noteAr": (
                "الأساس الكامل على Contabo (قواعد + نماذج محلية). "
                "إن وُجد LUGHAWI_HF_TOKEN يُجرَّب HF أولًا لتوفير الموارد، "
                "ومع أي فشل/نفاد رصيد يُرجع تلقائيًا للمحلي فلا يتوقف العمل."
            ),
        },
        "foundation": {
            "ruleBasedNlp": True,
            "stanza": caps["stanza"],
            "camel": caps["camel"],
            "pyarabic": caps["pyarabic"],
            "ghalatawi": caps["ghalatawi"],
            "fareh": caps["fareh"],
            "neuralGec": bool(caps.get("transformers") or caps.get("hfToken")),
            "localStt": bool(caps.get("fasterWhisper")),
            "preferHuggingFaceRemote": bool(caps.get("preferHf")),
            "noteAr": (
                "Contabo كامل أولًا. HF اختياري لتوفير الموارد مع رجوع محلي تلقائي."
            ),
        },
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
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
        if length > 30_000_000:
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

        if path == "/transcribe":
            audio_b64 = body.get("audioBase64") if isinstance(body.get("audioBase64"), str) else None
            filename = body.get("filename") if isinstance(body.get("filename"), str) else "audio.webm"
            self._send(200, transcribe_audio(audio_b64=audio_b64, filename=filename))
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
            base = rules_nlp_edits(text)
            neural = gec_neural(text)
            edits = list(base.get("edits") or [])
            # Prefer span-local rule edits; append neural whole-span only if useful
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
