#!/usr/bin/env bash
# Optional Contabo helper: run Lughawi Python sidecar under PM2 (localhost only).
# Usage: bash scripts/contabo-lughawi-sidecar.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
SIDECAR_DIR="$APP_DIR/services/lughawi-sidecar"
PORT="${LUGHAWI_SIDECAR_PORT:-8091}"

cd "$APP_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "WARN: python3 missing — skip sidecar"
  exit 0
fi

mkdir -p "$SIDECAR_DIR"

if pm2 describe lughawi-sidecar >/dev/null 2>&1; then
  pm2 restart lughawi-sidecar --update-env
else
  pm2 start python3 --name lughawi-sidecar --interpreter none -- \
    "$SIDECAR_DIR/app.py"
fi

pm2 save || true
echo "OK — sidecar on 127.0.0.1:${PORT} (set LUGHAWI_SIDECAR_URL=http://127.0.0.1:${PORT})"
