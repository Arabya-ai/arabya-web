#!/usr/bin/env bash
# Copy upstream skills listed in vendor/agent-ecosystem/manifest.json into Cursor paths.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/scripts/sync-agent-skills.mjs"
