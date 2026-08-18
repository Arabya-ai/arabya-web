#!/usr/bin/env bash
# Pull latest arabya-web on Contabo and restart PM2.
# Run on the server as root after first bootstrap:
#   cd /var/www/arabya-web && bash scripts/contabo-deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

echo "==> Fetch $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Install & build"
npm ci
npm run build

if [[ "${ARABYA_USER_SYNC_ENABLED:-}" == "1" || "${ARABYA_USER_SYNC_ENABLED:-}" == "true" ]]; then
  echo "==> Ensure user SQLite DB"
  DB_PATH="${ARABYA_USER_DB_PATH:-/var/lib/arabya/user-data.sqlite}"
  mkdir -p "$(dirname "$DB_PATH")"
  ARABYA_USER_DB_PATH="$DB_PATH" npm run init-user-db
fi

echo "==> Restart PM2"
if pm2 describe arabya-web >/dev/null 2>&1; then
  pm2 restart arabya-web --update-env
else
  NODE_ENV=production PORT=3000 pm2 start node_modules/next/dist/bin/next --name arabya-web -- start -p 3000
fi

if [[ -f scripts/contabo-mpt-deploy.sh ]]; then
  bash scripts/contabo-mpt-deploy.sh || echo "WARN: MPT deploy step failed — /studio/ai may show engine offline."
fi

pm2 save

echo "==> Health check (both domains via Host header)"
health_ok=0
for i in $(seq 1 45); do
  if curl -sf -o /dev/null -H "Host: www.arabya.org" http://127.0.0.1:3000/; then
    health_ok=1
    break
  fi
  sleep 2
done
if [[ "$health_ok" -ne 1 ]]; then
  echo "WARN: localhost:3000 not ready within 90s — site may still be starting."
  echo "      Check: pm2 logs arabya-web --lines 30"
  pm2 status || true
else
  curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000 | head -5 || true
  curl -sI -H "Host: www.arabyaai.com" http://127.0.0.1:3000 | head -5 || true
fi
echo "Deploy done. Ensure Nginx serves www.arabya.org and www.arabyaai.com — see deploy/contabo/nginx-dual-domain.conf"
