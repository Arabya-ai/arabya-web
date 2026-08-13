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

echo "==> Restart PM2"
if pm2 describe arabya-web >/dev/null 2>&1; then
  pm2 restart arabya-web
else
  NODE_ENV=production PORT=3000 pm2 start node_modules/next/dist/bin/next --name arabya-web -- start -p 3000
fi
pm2 save

echo "==> Health check"
curl -sI http://127.0.0.1:3000 | head -8
echo "Deploy done."
