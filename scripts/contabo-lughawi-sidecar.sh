#!/usr/bin/env bash
# Optional Contabo helper: run Lughawi Python sidecar under PM2 (localhost only).
# Usage: bash scripts/contabo-lughawi-sidecar.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
SIDECAR_DIR="$APP_DIR/services/lughawi-sidecar"
PORT="${LUGHAWI_SIDECAR_PORT:-8091}"
PY="${LUGHAWI_SIDECAR_PYTHON:-}"
if [[ -z "$PY" && -x "$SIDECAR_DIR/.venv/bin/python" ]]; then
  PY="$SIDECAR_DIR/.venv/bin/python"
fi
if [[ -z "$PY" ]]; then
  PY="$(command -v python3 || true)"
fi

cd "$APP_DIR"

if [[ -z "$PY" ]]; then
  echo "WARN: python3 missing — skip sidecar"
  exit 0
fi

mkdir -p "$SIDECAR_DIR"

if pm2 describe lughawi-sidecar >/dev/null 2>&1; then
  pm2 delete lughawi-sidecar >/dev/null 2>&1 || true
fi

pm2 start "$PY" --name lughawi-sidecar --interpreter none -- \
  "$SIDECAR_DIR/app.py"

pm2 save || true
echo "OK — sidecar on 127.0.0.1:${PORT} via $PY"
echo "Ensure .env has: LUGHAWI_SIDECAR_URL=http://127.0.0.1:${PORT}"
