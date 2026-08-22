#!/usr/bin/env bash
# Install / refresh the ten-repo agent ecosystem for Arabya + Cursor.
# Usage: bash scripts/install-agent-ecosystem.sh [--no-submodule]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$ROOT/vendor/agent-ecosystem"
MANIFEST="$VENDOR/manifest.json"

cd "$ROOT"

echo "==> Arabya agent ecosystem install"

if [[ "${1:-}" != "--no-submodule" ]]; then
  echo "==> Initializing git submodules (shallow)..."
  git submodule sync --recursive
  git submodule update --init --depth 1 --recursive vendor/agent-ecosystem
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: missing $MANIFEST" >&2
  exit 1
fi

echo "==> Syncing Cursor skills from manifest..."
bash "$ROOT/scripts/sync-agent-skills.sh"

echo "==> Ensuring Cursor plugin marketplace..."
mkdir -p "$ROOT/.cursor/plugins"
bash "$ROOT/scripts/sync-cursor-plugins-marketplace.sh"

echo "==> Agent lab Python venv (optional)..."
if [[ -f "$ROOT/services/agent-lab/setup-venv.sh" ]]; then
  bash "$ROOT/services/agent-lab/setup-venv.sh" || echo "WARN: agent-lab venv skipped (python3/venv missing?)"
fi

echo ""
echo "Done. Next steps in Cursor:"
echo "  1. Reload window (or reopen project)"
echo "  2. /plugin marketplace add .cursor/plugins"
echo "  3. Install: cursor-team-kit, orchestrate, playwright, github"
echo "  4. Skills live under .cursor/skills/ and .agents/skills/"
echo "  5. Read .cursor/skills/arabya-agent-ecosystem/SKILL.md for routing"
