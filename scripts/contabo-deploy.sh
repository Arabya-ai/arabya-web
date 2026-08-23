#!/usr/bin/env bash
# Pull latest arabya-web on Contabo and restart PM2.
# Run on the server as root after first bootstrap:
#   cd /var/www/arabya-web && bash scripts/contabo-deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
BRANCH="${BRANCH:-main}"
DEPLOY_LOCK="${DEPLOY_LOCK:-/var/lock/arabya-contabo-deploy.lock}"

# Prevent two Deploy Contabo / manual deploys from racing (ENOENT / 503).
mkdir -p "$(dirname "$DEPLOY_LOCK")"
exec 9>"$DEPLOY_LOCK"
if ! flock -n 9; then
  echo "ERROR: another Contabo deploy holds $DEPLOY_LOCK — aborting to protect the live site."
  echo "Wait for the other deploy to finish, or: fuser -v $DEPLOY_LOCK"
  exit 1
fi
echo "==> Deploy lock acquired ($DEPLOY_LOCK)"

cd "$APP_DIR"

echo "==> Fetch $BRANCH"
git fetch origin "$BRANCH"

# Learning may have dirtied tracked seed file on older builds — backup + reset so pull can proceed.
LEARNED="data/lughawi/learned-corrections.json"
if [[ -f "$LEARNED" ]] && ! git diff --quiet -- "$LEARNED" 2>/dev/null; then
  BACKUP="/root/lughawi-learned-backup-$(date +%F-%H%M%S).json"
  echo "==> Local changes in $LEARNED — backing up to $BACKUP then resetting for pull"
  cp -a "$LEARNED" "$BACKUP"
  git checkout -- "$LEARNED"
fi

# Stash BEFORE checkout — Contabo often has dirty package-lock.json from failed/partial npm runs.
# (checkout would abort: "local changes would be overwritten")
if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  echo "==> Stashing local working-tree changes before checkout/pull"
  git stash push -u -m "contabo-deploy-auto-$(date +%F-%H%M%S)" || true
fi

git checkout "$BRANCH"
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
  # Contabo ENOTEMPTY: give handles time to release (2s was too short in owner logs)
  sleep 5
  sync || true
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

# Contabo often fails plain `rm -rf node_modules` (ENOTEMPTY). Move OUT of the app
# tree to /tmp first so npm never sees a half-deleted tree.
wipe_node_modules() {
  local target="${1:-node_modules}"
  [[ -e "$target" ]] || return 0
  local trash="/tmp/arabya-nm-wipe-$$-$(date +%s)-$RANDOM"
  chmod -R u+w "$target" 2>/dev/null || true
  if mv "$target" "$trash" 2>/dev/null; then
    ( rm -rf "$trash" >/dev/null 2>&1 & ) || true
    return 0
  fi
  # Fallback: in-place wipe
  rm -rf "$target" 2>/dev/null || true
  if [[ -e "$target" ]]; then
    echo "WARN: residual $target remains — renaming aside"
    mv "$target" "${target}.dead.$$" 2>/dev/null || return 1
    ( rm -rf "${target}.dead.$$" >/dev/null 2>&1 & ) || true
  fi
  return 0
}

# Preserve last *healthy* node_modules so a failed npm never leaves the site 503.
save_prev_good_node_modules() {
  rm -rf node_modules.prev-good
  if [[ -d node_modules ]] && \
     [[ -f node_modules/next/dist/compiled/babel/code-frame.js ]] && \
     [[ -f node_modules/next/dist/bin/next ]]; then
    echo "==> Saving healthy node_modules → node_modules.prev-good (emergency restore)"
    mv node_modules node_modules.prev-good
    return 0
  fi
  wipe_node_modules node_modules || true
}

restore_site_after_install_failure() {
  echo "==> EMERGENCY: restoring previous site so Contabo is not left on 503"
  wipe_node_modules node_modules || true
  if [[ -d node_modules.prev-good ]]; then
    mv node_modules.prev-good node_modules
    echo "==> Restored node_modules.prev-good"
  fi
  if [[ -d .next.prev-good ]]; then
    rm -rf .next
    mv .next.prev-good .next
    echo "==> Restored .next.prev-good"
  fi
  # Bring web (+ siblings) back even if this deploy failed
  contabo_safe_restart_web || true
  if [[ -f scripts/contabo-arabya-nlp.sh ]]; then
    bash scripts/contabo-arabya-nlp.sh || true
  fi
  if [[ -f scripts/contabo-lughawi-sidecar.sh ]]; then
    bash scripts/contabo-lughawi-sidecar.sh || true
  fi
  pm2 save || true
}

# Install into /tmp then swap — avoids Contabo ENOTEMPTY during in-tree npm cleanup.
npm_install_atomic() {
  local mode="${1:-install}" # install | ci
  local work="/tmp/arabya-npm-build-$$-$(date +%s)"
  mkdir -p "$work"
  cp -a package.json package-lock.json "$work/"
  # Keep npm overrides/resolutions path stable if present
  [[ -f .npmrc ]] && cp -a .npmrc "$work/" || true

  echo "==> Atomic npm ${mode} in $work (then swap into app tree)"
  (
    cd "$work"
    npm cache clean --force >/dev/null 2>&1 || true
    if [[ "$mode" == "ci" ]]; then
      npm ci --no-audit --no-fund
    else
      npm install --no-audit --no-fund
    fi
  ) || {
    rm -rf "$work"
    return 1
  }

  if [[ ! -f "$work/node_modules/next/dist/compiled/babel/code-frame.js" ]] || \
     [[ ! -f "$work/node_modules/next/dist/lib/verify-typescript-setup.js" ]]; then
    echo "WARN: atomic npm ${mode} produced incomplete Next extract"
    rm -rf "$work"
    return 1
  fi

  wipe_node_modules node_modules || true
  # Ensure destination empty
  [[ -e node_modules ]] && wipe_node_modules node_modules
  mv "$work/node_modules" "$APP_DIR/node_modules"
  rm -rf "$work"
  echo "==> Atomic npm ${mode} swapped into place"
  return 0
}

save_prev_good_node_modules
# Stale npm cache / partial extracts → tar TAR_ENTRY_ERROR ENOENT on Contabo
npm cache clean --force >/dev/null 2>&1 || true

npm_ci_ok=0
# Node 24 npm is stricter about optional platform entries in package-lock → prefer install.
if [[ "$NODE_MAJOR" == "24" ]]; then
  echo "==> Node 24 detected — atomic npm install (skips npm ci lock strictness)"
  if npm_install_atomic install; then
    npm_ci_ok=1
    echo "==> npm install OK"
  else
    echo "WARN: atomic npm install incomplete on Node 24 — will try npm ci then install again"
  fi
fi

# Prefer a single npm ci attempt — Contabo lock/optional mismatches fail fast.
if [[ "$npm_ci_ok" -ne 1 ]]; then
  echo "==> npm ci (attempt 1, atomic)"
  if npm_install_atomic ci; then
    npm_ci_ok=1
    echo "==> npm ci OK"
  else
    echo "WARN: npm ci failed — skipping second ci (go straight to npm install)"
  fi
fi

# Fall back to npm install so Contabo can recover instead of leaving the site stopped.
if [[ "$npm_ci_ok" -ne 1 ]]; then
  echo "==> Atomic npm install fallback (lock sync / optional platforms / ENOTEMPTY)"
  rm -rf "${NPM_CONFIG_CACHE:-$HOME/.npm}/_cacache" 2>/dev/null || true
  if npm_install_atomic install; then
    npm_ci_ok=1
    echo "==> npm install fallback OK"
  else
    echo "WARN: npm install fallback also failed or Next extract incomplete"
  fi
fi

if [[ "$npm_ci_ok" -ne 1 ]]; then
  echo "ERROR: could not produce a complete Next.js install (npm ci + npm install fallback)."
  echo "On the server run the recovery block:"
  echo "  cd /var/www/arabya-web"
  echo "  pm2 stop arabya-web arabya-nlp lughawi-sidecar 2>/dev/null || true"
  echo "  sleep 5"
  echo "  mv node_modules /tmp/arabya-nm-dead-\$\$ 2>/dev/null; rm -rf /tmp/arabya-nm-dead-\$\$ &"
  echo "  npm cache clean --force && npm install --no-audit --no-fund && npm run build"
  echo "  pm2 start deploy/contabo/ecosystem.config.cjs"
  restore_site_after_install_failure
  exit 1
fi
# Drop prev-good modules in background after successful install (free disk)
if [[ -d node_modules.prev-good ]]; then
  trash_pg="/tmp/arabya-nm-prev-good-$$"
  mv node_modules.prev-good "$trash_pg" 2>/dev/null || true
  ( rm -rf "$trash_pg" >/dev/null 2>&1 & ) || true
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
# Next.js on Contabo talks to NLP via 127.0.0.1 — raise guest cap + leave loopback uncapped in code.
if grep -q '^ARABYA_NLP_RATE_LIMIT_REQUESTS=' "$APP_DIR/.env" 2>/dev/null; then
  # Bump legacy 5/hour installs that broke Lughawi after a few proofreads
  cur="$(grep '^ARABYA_NLP_RATE_LIMIT_REQUESTS=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)"
  if [[ "${cur}" =~ ^[0-9]+$ ]] && [[ "${cur}" -lt 60 ]]; then
    sed -i 's/^ARABYA_NLP_RATE_LIMIT_REQUESTS=.*/ARABYA_NLP_RATE_LIMIT_REQUESTS=120/' "$APP_DIR/.env"
  fi
else
  echo 'ARABYA_NLP_RATE_LIMIT_REQUESTS=120' >> "$APP_DIR/.env"
fi
grep -q '^ARABYA_NLP_RATE_LIMIT_WINDOW=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'ARABYA_NLP_RATE_LIMIT_WINDOW=3600' >> "$APP_DIR/.env"
# CRITICAL safety: keep DevOps auto-execute disabled unless an operator sets it intentionally later
if grep -q '^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=' "$APP_DIR/.env" 2>/dev/null; then
  sed -i 's/^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=.*/ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0/' "$APP_DIR/.env"
else
  echo 'ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0' >> "$APP_DIR/.env"
fi
# L3 MoA — enabled when HF token is in /admin/ops (soft-skip if missing)
grep -q '^LUGHAWI_MOA=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'LUGHAWI_MOA=1' >> "$APP_DIR/.env"
grep -q '^ARABYA_NLP_MOA=' "$APP_DIR/.env" 2>/dev/null || \
  echo 'ARABYA_NLP_MOA=1' >> "$APP_DIR/.env"
# Prefer enabling when venv is present (owner already activated Option A).
NLP_VENV_OK=0
if [[ -x "$APP_DIR/services/arabya-nlp/.venv/bin/python" && -f "$APP_DIR/services/arabya-nlp/main.py" ]]; then
  NLP_VENV_OK=1
fi
# Auto-bootstrap NLP deps once when missing (PyArabic + optional mishkal/qutrub).
# Set CONTABO_NLP_DEPS=0 to skip; CONTABO_NLP_DEPS=force to reinstall every deploy.
if [[ "${CONTABO_ENABLE_NLP:-}" == "0" || "${CONTABO_ENABLE_NLP:-}" == "false" ]]; then
  echo "==> CONTABO_ENABLE_NLP=0 — leaving arabya-nlp as-is (not force-stopped)."
elif [[ -f scripts/contabo-arabya-nlp-deps.sh ]] && {
  [[ "${CONTABO_NLP_DEPS:-}" == "force" ]] || \
  [[ "${CONTABO_NLP_DEPS:-1}" != "0" && "$NLP_VENV_OK" != "1" ]]
}; then
  echo "==> Installing / repairing arabya-nlp venv (PyArabic + optional mishkal/qutrub)"
  bash scripts/contabo-arabya-nlp-deps.sh || echo "WARN: arabya-nlp-deps failed — web still deploys"
  if [[ -x "$APP_DIR/services/arabya-nlp/.venv/bin/python" ]]; then
    NLP_VENV_OK=1
  fi
elif [[ "${CONTABO_ENABLE_NLP:-1}" == "1" || "${CONTABO_ENABLE_NLP:-}" == "true" || "$NLP_VENV_OK" == "1" ]]; then
  if [[ "$NLP_VENV_OK" == "1" && -f scripts/contabo-arabya-nlp.sh ]]; then
    bash scripts/contabo-arabya-nlp.sh || echo "WARN: arabya-nlp PM2 restart skipped"
  elif [[ -f scripts/contabo-arabya-nlp-activate.sh ]]; then
    echo "WARN: arabya-nlp venv missing — run once: bash scripts/contabo-arabya-nlp-deps.sh"
  else
    echo "WARN: arabya-nlp scripts missing"
  fi
else
  echo "==> Skipping arabya-nlp start (no venv). Local/sidecar proofread still works."
fi
# Ensure PM2 process is up when venv exists (deps script already starts it; restart is idempotent).
if [[ "$NLP_VENV_OK" == "1" && -f scripts/contabo-arabya-nlp.sh && "${CONTABO_ENABLE_NLP:-1}" != "0" ]]; then
  bash scripts/contabo-arabya-nlp.sh || true
fi

echo "==> Super-admin allowlist (CRM gate — Contabo .env)"
count_admin_emails() {
  local line="$1"
  line="${line#ARABYA_ADMIN_EMAILS=}"
  line="${line#\"}"; line="${line%\"}"
  line="${line#\'}"; line="${line%\'}"
  if [[ -z "${line// /}" ]]; then echo 0; return; fi
  # comma/semicolon/whitespace separated
  echo "$line" | tr ',;' ' ' | awk '{for(i=1;i<=NF;i++) if($i!="") c++} END{print c+0}'
}
for envfile in .env.production.local .env.local .env; do
  if [[ -f "$APP_DIR/$envfile" ]]; then
    admins_line="$(grep -E '^ARABYA_ADMIN_EMAILS=' "$APP_DIR/$envfile" 2>/dev/null | tail -1 || true)"
    if [[ -n "$admins_line" ]]; then
      n="$(count_admin_emails "$admins_line")"
      echo "    $envfile: ARABYA_ADMIN_EMAILS → $n email(s)"
    fi
  fi
done
echo "    CRM /admin requires every super-admin email in Contabo ARABYA_ADMIN_EMAILS (Worker secret alone is not enough)."

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
