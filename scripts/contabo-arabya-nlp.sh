#!/usr/bin/env bash
# Start Arabya NLP FastAPI under PM2 on Contabo (bind 0.0.0.0:8092 by default).
# Usage: bash scripts/contabo-arabya-nlp.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
NLP_DIR="$APP_DIR/services/arabya-nlp"
PORT="${ARABYA_NLP_PORT:-8092}"
PY="${ARABYA_NLP_PYTHON:-}"

if [[ -z "$PY" && -x "$NLP_DIR/.venv/bin/python" ]]; then
  PY="$NLP_DIR/.venv/bin/python"
fi
if [[ -z "$PY" ]]; then
  PY="$(command -v python3 || true)"
fi

cd "$APP_DIR"

if [[ -z "$PY" ]]; then
  echo "WARN: python3 missing — skip arabya-nlp"
  exit 0
fi

if [[ ! -f "$NLP_DIR/main.py" ]]; then
  echo "WARN: $NLP_DIR/main.py missing — skip"
  exit 0
fi

mkdir -p /var/lib/arabya /var/log/arabya /tmp/arabya-nlp

if pm2 describe arabya-nlp >/dev/null 2>&1; then
  pm2 delete arabya-nlp >/dev/null 2>&1 || true
fi

# Load Contabo .env into process if present
if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env" || true
  set +a
fi

# Ensure bind host is set before PM2 start (settings read ARABYA_NLP_HOST)
export ARABYA_NLP_HOST="${ARABYA_NLP_HOST:-0.0.0.0}"
export ARABYA_NLP_PORT="${ARABYA_NLP_PORT:-8092}"
PORT="$ARABYA_NLP_PORT"

pm2 start "$PY" --name arabya-nlp --interpreter none --cwd "$NLP_DIR" -- \
  "$NLP_DIR/main.py"

pm2 save || true
echo "OK — arabya-nlp on ${ARABYA_NLP_HOST}:${PORT} via $PY"
echo "Health: curl -s http://127.0.0.1:${PORT}/health"
echo "Dashboard: http://127.0.0.1:${PORT}/dashboard"
