#!/usr/bin/env bash
# Option A — Contabo operational activation for Arabya NLP (FastAPI :8092).
# Safe to re-run. Does NOT enable DevOps auto-execute.
#
# Steps (authorized):
#   1) deps:   bash scripts/contabo-arabya-nlp-deps.sh
#   2) model:  ollama pull llama3.1:8b
#   3) PM2:    arabya-nlp on 127.0.0.1:8092
#   4) verify: curl http://127.0.0.1:8092/health
#
# Usage (on Contabo):
#   cd /var/www/arabya-web && bash scripts/contabo-arabya-nlp-activate.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
PORT="${ARABYA_NLP_PORT:-8092}"
LOG_DIR="${APP_DIR}/.data"
mkdir -p "$LOG_DIR" /var/lib/arabya /var/log/arabya /tmp/arabya-nlp
ACTIVATE_LOG="$LOG_DIR/arabya-nlp-activate.log"

exec > >(tee -a "$ACTIVATE_LOG") 2>&1

echo "======== Arabya NLP Option A activate $(date -u +%Y-%m-%dT%H:%M:%SZ) ========"
cd "$APP_DIR"

echo "==> Ensure ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0 (hard safety)"
touch "$ENV_FILE"
if grep -q '^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=' "$ENV_FILE" 2>/dev/null; then
  sed -i 's/^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=.*/ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0/' "$ENV_FILE"
else
  echo 'ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0' >> "$ENV_FILE"
fi
# Confirm (print value only for this key)
grep '^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=' "$ENV_FILE" || true

echo "==> Step 1/4 — dependencies (venv + PyArabic/Ghalatawi/faster-whisper)"
bash "$APP_DIR/scripts/contabo-arabya-nlp-deps.sh"

echo "==> Step 2/4 — Ollama model llama3.1:8b"
if command -v ollama >/dev/null 2>&1; then
  # Start daemon if needed (ignore failure if already running / systemd-managed)
  (ollama serve >/dev/null 2>&1 &) || true
  sleep 2
  ollama pull llama3.1:8b
  ollama list || true
else
  echo "WARN: ollama binary missing — run: bash scripts/contabo-ollama-setup.sh"
  if [[ -f "$APP_DIR/scripts/contabo-ollama-setup.sh" ]]; then
    bash "$APP_DIR/scripts/contabo-ollama-setup.sh" || true
    if command -v ollama >/dev/null 2>&1; then
      ollama pull llama3.1:8b || true
    fi
  fi
fi

echo "==> Step 3/4 — PM2 process arabya-nlp"
# deps script already starts PM2; re-run start to guarantee process + env reload
bash "$APP_DIR/scripts/contabo-arabya-nlp.sh"
pm2 describe arabya-nlp || true
pm2 save || true

echo "==> Step 4/4 — health check"
sleep 2
HEALTH_JSON="$(curl -sS --max-time 20 "http://127.0.0.1:${PORT}/health" || true)"
if [[ -z "$HEALTH_JSON" ]]; then
  echo "ERROR: empty health response from 127.0.0.1:${PORT}"
  pm2 logs arabya-nlp --lines 40 --nostream || true
  exit 1
fi

echo "----- HEALTH JSON BEGIN -----"
echo "$HEALTH_JSON"
echo "----- HEALTH JSON END -----"

# Pretty-print when python is available
if command -v python3 >/dev/null 2>&1; then
  echo "$HEALTH_JSON" | python3 -m json.tool || true
fi

# Safety re-assert
grep '^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=' "$ENV_FILE" || true
echo "OK — Option A complete. Log: $ACTIVATE_LOG"
