#!/usr/bin/env bash
# Emergency platform restart on Contabo — PM2 only (no npx next, no Ollama).
# Usage:
#   cd /var/www/arabya-web && bash scripts/restart-platform.sh
# Optional: restart web only
#   bash scripts/restart-platform.sh web
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
TARGET="${1:-all}"

cd "$APP_DIR"

smoke() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 12 -H 'Host: www.arabya.org' "http://127.0.0.1:3000${path}" || echo 000)"
  echo "  $path → HTTP $code"
  [[ "$code" == "200" ]]
}

restart_web() {
  echo "==> pm2 restart arabya-web --update-env"
  pm2 restart arabya-web --update-env
}

restart_nlp() {
  echo "==> arabya-nlp (localhost :8092)"
  bash scripts/contabo-arabya-nlp.sh
}

restart_sidecar() {
  if [[ -f scripts/contabo-lughawi-sidecar.sh ]]; then
    echo "==> lughawi-sidecar"
    bash scripts/contabo-lughawi-sidecar.sh
  fi
}

case "$TARGET" in
  web)
    restart_web
    ;;
  nlp)
    restart_nlp
    ;;
  sidecar)
    restart_sidecar
    ;;
  all)
    restart_nlp
    restart_sidecar
    restart_web
    ;;
  *)
    echo "Usage: $0 [all|web|nlp|sidecar]"
    exit 2
    ;;
esac

pm2 save || true
echo "==> pm2 status"
pm2 status || true

echo "==> smoke (local)"
smoke "/" || true
smoke "/lughawi" || true
smoke "/mushaf/1" || true

echo "OK — restart complete ($TARGET)"
