"""Minimal Google ADK pointer — lab only."""
from __future__ import annotations

import os
import sys

VENDOR = os.path.join(
    os.path.dirname(__file__), "..", "..", "vendor", "agent-ecosystem", "google-adk-python"
)
if not os.path.isdir(VENDOR):
    print("Run: bash scripts/install-agent-ecosystem.sh", file=sys.stderr)
    sys.exit(1)

if not os.environ.get("GOOGLE_API_KEY") and not os.environ.get("GEMINI_API_KEY"):
    print("Set GOOGLE_API_KEY or GEMINI_API_KEY for ADK lab demos (optional for prod).", file=sys.stderr)
    sys.exit(0)

print(f"Google ADK vendored at: {os.path.abspath(VENDOR)}")
print("See vendor/.../contributing/samples/ for full agents.")
