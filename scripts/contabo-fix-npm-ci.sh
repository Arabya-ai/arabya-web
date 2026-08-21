#!/usr/bin/env bash
# Contabo: repair incomplete npm ci / missing next extract, then bring site back.
# Symptoms: 503, :3000 refused, "npm ci could not produce a complete Next.js install"
#
#   cd /var/www/arabya-web && bash scripts/contabo-fix-npm-ci.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
cd "$APP_DIR"

echo "==> Disk"
df -h / | sed -n '1,2p'
AVAIL_KB="$(df -Pk / | awk 'NR==2 {print $4}')"
if [[ -n "${AVAIL_KB:-}" && "$AVAIL_KB" -lt 1500000 ]]; then
  echo "WARN: low disk (<1.5GB). Flushing PM2 logs…"
  pm2 flush >/dev/null 2>&1 || true
  journalctl --vacuum-size=80M >/dev/null 2>&1 || true
  df -h / | sed -n '1,2p'
fi

echo "==> Stop apps that touch node_modules"
pm2 stop all >/dev/null 2>&1 || true
pm2 delete arabya-web >/dev/null 2>&1 || true

echo "==> Clean install tree"
rm -rf node_modules
rm -rf "${NPM_CONFIG_CACHE:-$HOME/.npm}/_cacache"
npm cache clean --force >/dev/null 2>&1 || true

echo "==> npm ci"
npm ci --no-audit --no-fund || true

NEXT_VER="$(node -p "require('./package.json').dependencies.next.replace(/^[\\^~]/,'')")"
if [[ ! -f node_modules/next/dist/compiled/babel/code-frame.js ]]; then
  echo "==> Salvage incomplete Next extract → npm install next@${NEXT_VER}"
  rm -rf node_modules/next
  npm install "next@${NEXT_VER}" --no-save --include=optional
fi

if [[ ! -f node_modules/next/dist/compiled/babel/code-frame.js ]] || \
   [[ ! -f node_modules/next/dist/bin/next ]]; then
  echo "ERROR: Next still incomplete after salvage."
  echo "Check: df -h /   and npm log under ~/.npm/_logs/"
  exit 1
fi
echo "==> Next OK"

# use-intl salvage (common companion failure)
if [[ ! -f node_modules/use-intl/dist/esm/production/core.js ]]; then
  USE_INTL_VER="$(node -p "try{require('./package-lock.json').packages['node_modules/use-intl'].version}catch(e){'4.13.4'}")"
  NEXT_INTL_VER="$(node -p "require('./package.json').dependencies['next-intl'].replace(/^[\\^~]/,'')")"
  npm install "use-intl@${USE_INTL_VER}" "next-intl@${NEXT_INTL_VER}" --no-save --include=optional || true
fi

echo "==> Ensure .next build"
if [[ ! -f .next/BUILD_ID && -d .next.prev-good ]]; then
  echo "==> Restoring .next.prev-good"
  rm -rf .next
  mv .next.prev-good .next
fi
if [[ ! -f .next/BUILD_ID ]]; then
  echo "==> No BUILD_ID — running npm run build (takes several minutes)"
  npm run build
fi

# shellcheck source=scripts/contabo-deploy-lib.sh
# shellcheck disable=SC1091
source "$APP_DIR/scripts/contabo-deploy-lib.sh"
if ! contabo_safe_restart_web; then
  echo "ERROR: could not start arabya-web"
  exit 1
fi

if [[ -f scripts/contabo-arabya-nlp.sh ]]; then
  bash scripts/contabo-arabya-nlp.sh || true
fi
if [[ -f scripts/contabo-lughawi-sidecar.sh ]]; then
  bash scripts/contabo-lughawi-sidecar.sh || true
fi
pm2 save

echo "==> Health"
for i in $(seq 1 30); do
  if curl -sf -o /dev/null -H "Host: www.arabya.org" http://127.0.0.1:3000/; then
    echo "OK localhost:3000"
    curl -sS -o /dev/null -w "public → %{http_code}\n" https://www.arabya.org/ || true
    pm2 status || true
    exit 0
  fi
  sleep 2
done
echo "ERROR: :3000 still down — pm2 logs arabya-web --lines 60"
pm2 logs arabya-web --lines 60 || true
exit 1
