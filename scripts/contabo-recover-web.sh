#!/usr/bin/env bash
# Emergency Contabo recovery when Deploy Contabo leaves arabya-web stopped (public 503).
# Run on the VPS as root:
#   cd /var/www/arabya-web && bash scripts/contabo-recover-web.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
cd "$APP_DIR"

# shellcheck disable=SC1091
source "$APP_DIR/scripts/contabo-deploy-lib.sh"

echo "==> Contabo recover-web (stop apps, clean install, build if needed, PM2)"

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop arabya-web arabya-nlp lughawi-sidecar 2>/dev/null || true
fi

# Do not race a still-running GitHub Deploy Contabo
if pgrep -af 'contabo-deploy\.sh|npm (ci|install)' >/dev/null 2>&1; then
  echo "ERROR: another npm/deploy is still running. Wait until it finishes, then re-run."
  pgrep -af 'contabo-deploy\.sh|npm (ci|install)|next build' || true
  exit 1
fi

git fetch origin main
git reset --hard origin/main

contabo_wipe_node_modules || true
npm cache clean --force >/dev/null 2>&1 || true
rm -rf "${NPM_CONFIG_CACHE:-$HOME/.npm}/_cacache" 2>/dev/null || true
npm config set maxsockets 2 >/dev/null 2>&1 || true

echo "==> npm install (may take several minutes)"
npm install --no-audit --no-fund --dangerously-allow-all-scripts

if [[ ! -f node_modules/next/dist/bin/next ]]; then
  echo "ERROR: next binary still missing after npm install"
  exit 1
fi

node -e "console.log('next=', require('next/package.json').version)"

if [[ ! -f .next/BUILD_ID ]] && [[ -f .next.prev-good/BUILD_ID ]]; then
  echo "==> Restoring .next.prev-good"
  contabo_wipe_path .next || true
  mv .next.prev-good .next
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "==> No BUILD_ID — running production build"
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
  NEXT_TELEMETRY_DISABLED=1 npm run build
fi

if [[ -f scripts/contabo-ensure-dbs.sh ]]; then
  bash scripts/contabo-ensure-dbs.sh || true
fi

pm2 delete arabya-web 2>/dev/null || true
NODE_ENV=production PORT=3000 pm2 start deploy/contabo/ecosystem.config.cjs
pm2 save || true

sleep 2
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3000/ || echo 000)"
echo "==> localhost:3000 → HTTP $code"
if [[ "$code" != "200" && "$code" != "301" && "$code" != "302" && "$code" != "308" ]]; then
  echo "ERROR: local health check failed. See: pm2 logs arabya-web --lines 40"
  exit 1
fi

pub="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 https://www.arabya.org/ || echo 000)"
echo "==> https://www.arabya.org/ → HTTP $pub"
echo "DONE"
