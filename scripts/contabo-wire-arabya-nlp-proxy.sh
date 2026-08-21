#!/usr/bin/env bash
# Point Next.js (arabya-web) at Contabo arabya-nlp :8092 for /api/lughawi/proofread.
# Run as root on Contabo AFTER arabya-nlp is online:
#   cd /var/www/arabya-web && bash scripts/contabo-wire-arabya-nlp-proxy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
NLP_URL="${ARABYA_NLP_URL:-http://127.0.0.1:8092}"

cd "$APP_DIR"
touch "$ENV_FILE"

upsert() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

upsert "ARABYA_NLP_URL" "$NLP_URL"
upsert "ARABYA_NLP_PROOFREAD" "1"
# Keep FastAPI bind public-on-host but private to VPS loopback for Next
upsert "ARABYA_NLP_HOST" "0.0.0.0"
upsert "ARABYA_NLP_PORT" "8092"

echo "==> Env wired:"
grep -E '^(ARABYA_NLP_URL|ARABYA_NLP_PROOFREAD|ARABYA_NLP_HOST|ARABYA_NLP_PORT)=' "$ENV_FILE"

echo "==> Health (must be JSON, not HTML)"
curl -sS --max-time 10 "${NLP_URL}/health" | python3 -m json.tool | head -30

echo "==> Direct proofread smoke"
curl -sS --max-time 60 -X POST "${NLP_URL}/v1/proofread" \
  -H 'Content-Type: application/json' \
  -d '{"text":"انا ذهبت الى المدرسه","skip_llm":true}' \
  | python3 -m json.tool | head -40

echo "==> Restart Next so it picks up env"
if pm2 describe arabya-web >/dev/null 2>&1; then
  pm2 restart arabya-web --update-env
  pm2 save || true
else
  echo "WARN: arabya-web not in PM2 — start after deploy finishes"
fi

sleep 3
echo "==> Public proxy path (via Next, not :8092)"
curl -sS --max-time 30 -X POST "http://127.0.0.1:3000/api/lughawi/proofread" \
  -H 'Content-Type: application/json' \
  -d '{"text":"انا ذهبت الى المدرسه","useAi":false}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); stages=d.get("meta",{}).get("stages",[]); print("result=", d.get("result")); print("stages=", [(s.get("id"), s.get("note")) for s in stages])'

echo "OK — public users hit https://www.arabya.org/lughawi → /api/lughawi/proofread → ${NLP_URL}/v1/proofread"
echo "Do NOT open OLS/Nginx public route to :8092 (keeps DevOps API private)."
