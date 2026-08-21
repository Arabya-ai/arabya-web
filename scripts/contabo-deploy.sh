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

# Stash/reset BEFORE checkout — dirty package-lock.json (or any tracked file)
# otherwise aborts `git checkout` and fails GitHub Deploy Contabo + manual deploy.
if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard 2>/dev/null | head -1)" ]]; then
  echo "==> Local working-tree changes detected — stashing before checkout"
  git stash push -u -m "contabo-deploy-auto-$(date +%F-%H%M%S)" || true
fi

# If stash left package-lock dirty (rare), discard it — npm ci regenerates from lock on BRANCH.
if ! git diff --quiet -- package-lock.json 2>/dev/null || ! git diff --cached --quiet -- package-lock.json 2>/dev/null; then
  echo "==> Resetting dirty package-lock.json so checkout can proceed (npm ci will reinstall)"
  git checkout -- package-lock.json 2>/dev/null || true
  git reset HEAD -- package-lock.json 2>/dev/null || true
fi

git checkout "$BRANCH"

# Learning may have dirtied tracked seed file on older builds — backup + reset so pull can proceed.
LEARNED="data/lughawi/learned-corrections.json"
if [[ -f "$LEARNED" ]] && ! git diff --quiet -- "$LEARNED" 2>/dev/null; then
  BACKUP="/root/lughawi-learned-backup-$(date +%F-%H%M%S).json"
  echo "==> Local changes in $LEARNED — backing up to $BACKUP then resetting for pull"
  cp -a "$LEARNED" "$BACKUP"
  git checkout -- "$LEARNED"
fi

# Any other unexpected local edits after checkout: stash again (keep deploy unblocked)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "==> Stashing other local working-tree changes before pull"
  git stash push -u -m "contabo-deploy-auto-$(date +%F-%H%M%S)" || true
fi

git pull --ff-only origin "$BRANCH"

echo "==> Node version check (Contabo: Node 22 or 24)"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" != "22" && "$NODE_MAJOR" != "24" ]]; then
  echo "ERROR: Contabo builds require Node.js 22 or 24 (found $(node -v))."
  echo "Fix once (recommended Node 22):"
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
  echo "  apt-get install -y nodejs"
  echo "  node -v"
  exit 1
fi
if [[ "$NODE_MAJOR" == "24" ]]; then
  echo "WARN: Node 24 detected — Contabo build uses webpack hoist + serverMinification=false."
fi

echo "==> Install & build"
# Stop ALL Contabo Node apps before wiping node_modules — concurrent reads cause TAR_ENTRY_ERROR ENOENT.
if command -v pm2 >/dev/null 2>&1; then
  echo "==> Stopping PM2 apps during install (web + siblings)"
  pm2 stop arabya-web arabya-nlp lughawi-sidecar 2>/dev/null || true
fi

# shellcheck source=scripts/contabo-deploy-lib.sh
# shellcheck disable=SC1091
source "$APP_DIR/scripts/contabo-deploy-lib.sh"

# Disk headroom (npm extract fails cryptically when nearly full)
AVAIL_KB="$(df -Pk "$APP_DIR" | awk 'NR==2 {print $4}')"
if [[ -n "${AVAIL_KB:-}" && "$AVAIL_KB" -lt 1500000 ]]; then
  echo "WARN: low disk space (~${AVAIL_KB}KB free). Aim for ≥1.5GB free before npm ci."
fi

echo "==> Cleaning previous install artifacts"
# Keep a copy of the last good build so a failed build can restore the site
if [[ -d .next ]]; then
  rm -rf .next.prev-good
  mv .next .next.prev-good
  echo "==> Saved previous .next → .next.prev-good (restore if build fails)"
fi
rm -rf node_modules
# Stale npm cache / partial extracts → tar TAR_ENTRY_ERROR ENOENT on Contabo
npm cache clean --force >/dev/null 2>&1 || true

npm_ci_ok=0
for attempt in 1 2; do
  echo "==> npm ci (attempt $attempt)"
  if npm ci --no-audit --no-fund; then
    # Contabo often prints tar ENOENT on next/dist yet exits 0 — verify next immediately.
    if [[ -f node_modules/next/dist/compiled/babel/code-frame.js ]] && \
       [[ -f node_modules/next/dist/lib/verify-typescript-setup.js ]]; then
      npm_ci_ok=1
      break
    fi
    echo "WARN: npm ci exited 0 but Next extract is incomplete (tar ENOENT on next/dist is common)."
  else
    echo "WARN: npm ci failed (attempt $attempt)"
  fi
  echo "==> Cleaning corrupted node_modules + npm cache before retry"
  rm -rf node_modules
  npm cache clean --force >/dev/null 2>&1 || true
  rm -rf "${NPM_CONFIG_CACHE:-$HOME/.npm}/_cacache" 2>/dev/null || true
  sleep 2
done
if [[ "$npm_ci_ok" -ne 1 ]]; then
  echo "ERROR: npm ci could not produce a complete Next.js install."
  echo "On the server run:"
  echo "  df -h /"
  echo "  pm2 stop arabya-web arabya-nlp lughawi-sidecar 2>/dev/null || true"
  echo "  rm -rf node_modules ~/.npm/_cacache"
  echo "  npm cache clean --force && npm ci"
  if [[ -d .next.prev-good ]]; then
    mv .next.prev-good .next
    echo "==> Restored .next.prev-good (site stays STOPPED until node_modules is healthy)"
  fi
  # Never pm2 restart on a broken node_modules — that causes crash-loop 503.
  pm2 stop arabya-web 2>/dev/null || true
  exit 1
fi
echo "==> Next.js package extract OK"

# Incomplete extracts: use-intl / next-intl missing production ESM (ENOENT core.js)
verify_intl() {
  [[ -f node_modules/use-intl/dist/esm/production/core.js ]] && \
  [[ -f node_modules/use-intl/dist/esm/production/index.js ]] && \
  [[ -d node_modules/next-intl ]]
}
if ! verify_intl; then
  echo "==> use-intl/next-intl incomplete after npm ci — reinstalling"
  USE_INTL_VER="$(node -p "try{require('./package-lock.json').packages['node_modules/use-intl'].version}catch(e){'4.13.4'}")"
  NEXT_INTL_VER="$(node -p "require('./package.json').dependencies['next-intl'].replace(/^[\\^~]/,'')")"
  npm install "use-intl@${USE_INTL_VER}" "next-intl@${NEXT_INTL_VER}" --no-save --include=optional || \
    npm install use-intl@4.13.4 next-intl@4.13.4 --no-save --include=optional || true
fi
if ! verify_intl; then
  echo "ERROR: node_modules/use-intl/dist/esm/production/core.js still missing."
  echo "Usually corrupted npm extract on Contabo. Run:"
  echo "  rm -rf node_modules ~/.npm/_cacache && npm cache clean --force && npm ci"
  if [[ -d .next.prev-good ]]; then
    mv .next.prev-good .next
    echo "==> Restored previous .next so the site can stay up"
    contabo_safe_restart_web || true
  fi
  exit 1
fi
echo "==> use-intl production ESM OK"
if [[ ! -f node_modules/sharp/package.json ]] || ! node -e "require('sharp')" >/dev/null 2>&1; then
  echo "==> Native modules incomplete — rebuilding sharp/sqlite/swc"
  npm rebuild sharp better-sqlite3 @swc/core unrs-resolver @parcel/watcher || true
fi

# Detect incomplete Next install (common Contabo failure modes)
if [[ ! -f node_modules/next/dist/lib/verify-typescript-setup.js ]] || \
   [[ ! -f node_modules/next/dist/compiled/babel/code-frame.js ]]; then
  echo "==> Next.js install looks incomplete — reinstalling next cleanly"
  NEXT_VER="$(node -p "require('./package.json').dependencies.next.replace(/^[\\^~]/,'')")"
  rm -rf node_modules/next
  npm install "next@${NEXT_VER}" --no-save --include=optional || \
    npm install "next@$(node -p "require('./package.json').dependencies.next")" --no-save --include=optional || true
fi
if [[ ! -f node_modules/next/dist/compiled/babel/code-frame.js ]]; then
  echo "ERROR: next/dist/compiled/babel/code-frame still missing after reinstall."
  echo "Do NOT delete package-lock.json. Repair with:"
  echo "  rm -rf node_modules ~/.npm/_cacache && npm cache clean --force && npm ci"
  if [[ -d .next.prev-good ]]; then
    rm -rf .next
    mv .next.prev-good .next
    echo "==> Restored .next.prev-good — bringing previous site back online"
    contabo_safe_restart_web || true
  fi
  exit 1
fi
if [[ ! -f node_modules/sharp/package.json ]]; then
  echo "ERROR: sharp still missing after rebuild. Check npm version / allowScripts on Contabo."
  if [[ -d .next.prev-good ]]; then
    rm -rf .next
    mv .next.prev-good .next
    echo "==> Restored .next.prev-good"
    contabo_safe_restart_web || true
  fi
  exit 1
fi

# Guard: webpack must load (real WebpackError lives on .webpack after init)
if ! node -e "
  const w = require('next/dist/compiled/webpack/webpack');
  if (typeof w.init === 'function') w.init();
  if (typeof w.webpack?.WebpackError !== 'function') process.exit(2);
" >/dev/null 2>&1; then
  echo "==> Compiled webpack broken — reinstalling next cleanly"
  NEXT_VER="$(node -p "require('./package.json').dependencies.next.replace(/^[\\^~]/,'')")"
  rm -rf node_modules/next
  npm install "next@${NEXT_VER}" --no-save --include=optional
  if ! node -e "
    const w = require('next/dist/compiled/webpack/webpack');
    if (typeof w.init === 'function') w.init();
    if (typeof w.webpack?.WebpackError !== 'function') process.exit(2);
  "; then
    echo "ERROR: next/dist/compiled/webpack still broken after reinstall."
    echo "Confirm Node is 22.x, then: rm -rf node_modules .next && npm ci && npm run build"
    if [[ -d .next.prev-good ]]; then
      rm -rf .next
      mv .next.prev-good .next
      echo "==> Restored .next.prev-good"
    fi
    contabo_safe_restart_web || true
    exit 1
  fi
fi

# Hoist WebpackError is handled in next.config.ts (same Node process as the build).

echo "==> Building (webpack, Node $(node -v))"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
# Contabo stays on Next 15.5.x for now (no --webpack flag). Next 16 Turbopack default is not used.
if ! NEXT_TELEMETRY_DISABLED=1 npm run build; then
  echo "ERROR: next build failed."
  if [[ -d .next.prev-good ]]; then
    rm -rf .next
    mv .next.prev-good .next
    echo "==> Restored .next.prev-good — restarting previous working build"
    contabo_safe_restart_web || true
  fi
  echo "Common Contabo cause: incomplete npm extract. Retry:"
  echo "  rm -rf node_modules ~/.npm/_cacache && npm cache clean --force"
  echo "  bash scripts/contabo-deploy.sh"
  exit 1
fi
# Keep .next.prev-good until health check proves the new process is up.

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


echo "==> Lughawi Python sidecar (optional localhost NLP)"
# Ensure Next can reach sidecar (production bug: sidecar online but unreachable from app)
touch "$APP_DIR/.env"
grep -q '^LUGHAWI_SIDECAR_URL=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091' >> "$APP_DIR/.env"
if [[ -f scripts/contabo-lughawi-sidecar.sh ]]; then
  bash scripts/contabo-lughawi-sidecar.sh || echo "WARN: sidecar start skipped — local rules still work."
fi

echo "==> Arabya NLP FastAPI platform (:8092) — Next.js proxies via ARABYA_NLP_URL"
grep -q '^ARABYA_NLP_DATABASE_URL=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'ARABYA_NLP_DATABASE_URL=sqlite:////var/lib/arabya/arabya-nlp.sqlite' >> "$APP_DIR/.env"
grep -q '^ARABYA_NLP_URL=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'ARABYA_NLP_URL=http://127.0.0.1:8092' >> "$APP_DIR/.env"
grep -q '^ARABYA_NLP_PROOFREAD=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'ARABYA_NLP_PROOFREAD=1' >> "$APP_DIR/.env"
# CRITICAL safety: keep DevOps auto-execute disabled unless an operator sets it intentionally later
if grep -q '^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=' "$APP_DIR/.env" 2>/dev/null; then
  sed -i 's/^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=.*/ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0/' "$APP_DIR/.env"
else
  echo 'ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0' >> "$APP_DIR/.env"
fi
# Prefer enabling when venv is present (owner already activated Option A).
NLP_VENV_OK=0
if [[ -x "$APP_DIR/services/arabya-nlp/.venv/bin/python" && -f "$APP_DIR/services/arabya-nlp/main.py" ]]; then
  NLP_VENV_OK=1
fi
if [[ "${CONTABO_ENABLE_NLP:-}" == "0" || "${CONTABO_ENABLE_NLP:-}" == "false" ]]; then
  echo "==> CONTABO_ENABLE_NLP=0 — leaving arabya-nlp as-is (not force-stopped)."
elif [[ "${CONTABO_ENABLE_NLP:-1}" == "1" || "${CONTABO_ENABLE_NLP:-}" == "true" || "$NLP_VENV_OK" == "1" ]]; then
  if [[ "$NLP_VENV_OK" == "1" && -f scripts/contabo-arabya-nlp.sh ]]; then
    bash scripts/contabo-arabya-nlp.sh || echo "WARN: arabya-nlp PM2 restart skipped"
  elif [[ -f scripts/contabo-arabya-nlp-activate.sh ]]; then
    echo "WARN: arabya-nlp venv missing — run once: bash scripts/contabo-arabya-nlp-activate.sh"
  else
    echo "WARN: arabya-nlp scripts missing"
  fi
else
  echo "==> Skipping arabya-nlp start (no venv). Local/sidecar proofread still works."
fi

echo "==> Restart PM2 arabya-web (only if tree can run next start)"
if ! contabo_safe_restart_web; then
  echo "ERROR: deploy aborted — arabya-web left stopped to avoid crash-loop 503."
  exit 1
fi

# Optional: restart sidecar after web is healthy (stopped during install)
if [[ -f scripts/contabo-lughawi-sidecar.sh ]]; then
  bash scripts/contabo-lughawi-sidecar.sh || true
fi

pm2 save

echo "==> Health check (localhost + SEO endpoints)"
health_ok=0
for i in $(seq 1 45); do
  if curl -sf -o /dev/null -H "Host: www.arabya.org" http://127.0.0.1:3000/; then
    health_ok=1
    break
  fi
  sleep 2
done
if [[ "$health_ok" -ne 1 ]]; then
  echo "ERROR: localhost:3000 not ready within 90s."
  echo "      Check: pm2 logs arabya-web --lines 40"
  if [[ -d .next.prev-good ]]; then
    echo "==> Rolling back to .next.prev-good"
    pm2 stop arabya-web || true
    rm -rf .next
    mv .next.prev-good .next
    contabo_safe_restart_web || true
  fi
  pm2 status || true
  exit 1
fi

# Extended smoke (audit C-02): robots, sitemap, mushaf must not 5xx after deploy
smoke_fail=0
for path in "/" "/robots.txt" "/sitemap.xml" "/mushaf/1" "/about"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: www.arabya.org" "http://127.0.0.1:3000${path}" || echo 000)"
  echo "  smoke ${path} → ${code}"
  if [[ "$code" != 200 && "$code" != 301 && "$code" != 302 && "$code" != 308 ]]; then
    smoke_fail=1
  fi
done
if [[ "$smoke_fail" -eq 1 ]]; then
  echo "ERROR: post-deploy smoke failed (non-2xx/3xx on public routes)."
  if [[ -d .next.prev-good ]]; then
    echo "==> Rolling back to .next.prev-good"
    pm2 stop arabya-web || true
    rm -rf .next
    mv .next.prev-good .next
    contabo_safe_restart_web || true
  fi
  exit 1
fi

# Record published commit for incident matching (audit C-01)
if command -v git >/dev/null 2>&1; then
  echo "==> Published commit: $(git rev-parse HEAD) ($(git rev-parse --short HEAD))"
fi

rm -rf .next.prev-good
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000 | head -5 || true
curl -sI -H "Host: www.arabyaai.com" http://127.0.0.1:3000 | head -5 || true
echo "Deploy done. Ensure LiteSpeed serves www.arabya.org — see deploy/contabo/nginx-dual-domain.conf (reference)"
echo "NOTE: app lives at /var/www/arabya-web (PM2). ServerAvatar public_html is NOT the Next.js app."
