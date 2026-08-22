#!/usr/bin/env bash
# Create optional Python venv for OpenAI Agents + Google ADK demos.
set -euo pipefail

LAB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$LAB/../.." && pwd)"
VENV="$LAB/.venv"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found — skipping agent-lab venv"
  exit 0
fi

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"
pip install -q --upgrade pip
pip install -q -r "$LAB/requirements.txt"

echo "agent-lab venv ready: source $VENV/bin/activate"
