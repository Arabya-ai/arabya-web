"""Minimal OpenAI Agents SDK handoff demo — lab only."""
from __future__ import annotations

import os
import sys

VENDOR = os.path.join(
    os.path.dirname(__file__), "..", "..", "vendor", "agent-ecosystem", "openai-agents-python"
)
if not os.path.isdir(VENDOR):
    print("Run: bash scripts/install-agent-ecosystem.sh", file=sys.stderr)
    sys.exit(1)

if not os.environ.get("OPENAI_API_KEY"):
    print("Set OPENAI_API_KEY for this lab demo (optional for Arabya prod).", file=sys.stderr)
    sys.exit(0)

print(f"OpenAI Agents SDK vendored at: {os.path.abspath(VENDOR)}")
print("See vendor/.../examples/handoffs/ for full patterns.")
