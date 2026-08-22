#!/usr/bin/env bash
# Emergency Contabo recovery when the public site returns 503 / PM2 is broken.
# Typical symptoms:
#   - curl 127.0.0.1:3000 → connection refused
#   - https://www.arabya.org → 503
#   - pm2 restart arabya-web → "Process 0 not found"
#   - contabo-deploy.sh blocked by dirty git / failed mid-deploy
#
# Usage (as root on Contabo) — does NOT start/stop Ollama:
#   cd /var/www/arabya-web && bash scripts/contabo-recover-web.sh
#
# Fast path only (restore .next.prev-good + start PM2, skip full npm/build):
#   CONTABO_RECOVER_FULL=0 bash scripts/contabo-recover-web.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
BRANCH="${BRANCH:-main}"
cd "$APP_DIR"

if pgrep -af 'contabo-deploy\.sh' >/dev/null 2>&1; then
  echo "ERROR: contabo-deploy.sh is already running. Wait for it to finish, then re-run."
  pgrep -af 'contabo-deploy\.sh|npm (ci|install)|next build' || true
  exit 1
fi

echo "==> 1) Sync git to origin/${BRANCH}"
git fetch origin "$BRANCH"
git checkout "$BRANCH" || git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/${BRANCH}"
git rev-parse --short HEAD
git log -1 --oneline

echo "==> 2) Clear stale PM2 arabya-web entry (Process 0 not found)"
pm2 delete arabya-web >/dev/null 2>&1 || true

# Prefer a full healthy deploy when possible (uses ecosystem.config.cjs — never npx next).
if [[ "${CONTABO_RECOVER_FULL:-1}" == "1" ]]; then
  echo "==> 3) Full deploy (npm + build + start via contabo-deploy.sh)"
  bash "$APP_DIR/scripts/contabo-deploy.sh"
  exit $?
fi

echo "==> 3) Fast path — restore .next.prev-good if needed"
# shellcheck disable=SC1091
source "$APP_DIR/scripts/contabo-deploy-lib.sh"

if [[ ! -f .next/BUILD_ID && -d .next.prev-good ]]; then
  echo "==> Restoring .next from .next.prev-good"
  rm -rf .next
  mv .next.prev-good .next
fi

if contabo_tree_ready; then
  NODE_ENV=production PORT=3000 pm2 start deploy/contabo/ecosystem.config.cjs
  pm2 save || true
else
  echo "ERROR: tree not ready for next start — run full recover:"
  echo "  CONTABO_RECOVER_FULL=1 bash scripts/contabo-recover-web.sh"
  exit 1
fi

echo "==> 4) Health"
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null -H "Host: www.arabya.org" http://127.0.0.1:3000/; then
    echo "OK — localhost:3000 responds"
    curl -sS -o /dev/null -w "public / → %{http_code}\n" https://www.arabya.org/ || true
    pm2 status || true
    exit 0
  fi
  sleep 2
done
echo "ERROR: still no response on :3000 — pm2 logs arabya-web --lines 50"
pm2 logs arabya-web --lines 50 || true
exit 1
