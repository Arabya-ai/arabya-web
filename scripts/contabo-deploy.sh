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

# Learning may have dirtied tracked seed file on older builds — backup + reset so pull can proceed.
LEARNED="data/lughawi/learned-corrections.json"
if [[ -f "$LEARNED" ]] && ! git diff --quiet -- "$LEARNED" 2>/dev/null; then
  BACKUP="/root/lughawi-learned-backup-$(date +%F-%H%M%S).json"
  echo "==> Local changes in $LEARNED — backing up to $BACKUP then resetting for pull"
  cp -a "$LEARNED" "$BACKUP"
  git checkout -- "$LEARNED"
fi

# Any other unexpected local edits: stash (keep deploy unblocked)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "==> Stashing other local working-tree changes before pull"
  git stash push -u -m "contabo-deploy-auto-$(date +%F-%H%M%S)" || true
fi

git pull --ff-only origin "$BRANCH"

echo "==> Install & build"
npm ci
npm run build

echo "==> Ensure Contabo databases & runtime stores"
if [[ -f scripts/contabo-ensure-dbs.sh ]]; then
  bash scripts/contabo-ensure-dbs.sh
else
  # Fallback for older trees
  if [[ "${ARABYA_USER_SYNC_ENABLED:-}" == "1" || "${ARABYA_USER_SYNC_ENABLED:-}" == "true" ]]; then
    echo "==> Ensure user SQLite DB"
    DB_PATH="${ARABYA_USER_DB_PATH:-/var/lib/arabya/user-data.sqlite}"
    mkdir -p "$(dirname "$DB_PATH")"
    ARABYA_USER_DB_PATH="$DB_PATH" npm run init-user-db
    IMPORT_DIR="${ARABYA_IMPORTED_BOOKS_DIR:-/var/lib/arabya/imported-books}"
    LIBRARY_DIR="${ARABYA_IMPORTED_LIBRARY_DIR:-/var/lib/arabya/imported-library}"
    mkdir -p "$IMPORT_DIR" "$IMPORT_DIR/irab-claims" "$LIBRARY_DIR"
  fi
fi

echo "==> MoneyPrinterTurbo engine"
if [[ -f scripts/contabo-mpt-deploy.sh ]]; then
  bash scripts/contabo-mpt-deploy.sh || echo "WARN: MPT deploy step failed — /studio/ai may show engine offline."
fi

echo "==> Lughawi Python sidecar (optional localhost NLP)"
if [[ -f scripts/contabo-lughawi-sidecar.sh ]]; then
  bash scripts/contabo-lughawi-sidecar.sh || echo "WARN: sidecar start skipped — local rules still work."
fi

echo "==> Restart PM2 arabya-web (after env keys are written)"
if pm2 describe arabya-web >/dev/null 2>&1; then
  pm2 restart arabya-web --update-env
else
  NODE_ENV=production PORT=3000 pm2 start node_modules/next/dist/bin/next --name arabya-web -- start -p 3000
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
