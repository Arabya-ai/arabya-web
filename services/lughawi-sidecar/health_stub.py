"""Minimal health stub — expand when Contabo Python env is ready."""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        if self.path in ("/health", "/"):
            body = json.dumps({"ok": True, "service": "lughawi-sidecar", "version": "0.0.1"})
            raw = body.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, fmt, *args):  # noqa: A003
        return


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8091), Handler).serve_forever()
