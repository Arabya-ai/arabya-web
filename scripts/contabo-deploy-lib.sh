#!/usr/bin/env bash
# Shared helpers for Contabo deploy — sourced by contabo-deploy.sh

# True when the tree can run `next start` without immediate PM2 crash-loop.
contabo_tree_ready() {
  [[ -f node_modules/next/dist/bin/next ]] &&
    [[ -f node_modules/next/dist/compiled/babel/code-frame.js ]] &&
    [[ -f node_modules/use-intl/dist/esm/production/core.js ]] &&
    [[ -f .next/BUILD_ID ]]
}

# Contabo often fails plain `rm -rf` with ENOTEMPTY. Rename out of the way, then
# delete synchronously (never background — races with the next npm install).
contabo_wipe_path() {
  local target="${1:?path required}"
  [[ -e "$target" ]] || return 0
  local trash="${target}.wiping.$$.$RANDOM"
  if ! mv "$target" "$trash" 2>/dev/null; then
    chmod -R u+w "$target" 2>/dev/null || true
    rm -rf "$target" 2>/dev/null || true
    [[ -e "$target" ]] || return 0
    trash="${target}.wiping.$$.$RANDOM"
    mv "$target" "$trash" || return 1
  fi
  chmod -R u+w "$trash" 2>/dev/null || true
  rm -rf "$trash" 2>/dev/null || true
  if [[ -e "$trash" ]]; then
    find "$trash" -mindepth 1 -delete 2>/dev/null || true
    rm -rf "$trash" 2>/dev/null || true
  fi
  # Last resort: leave trash aside but ensure original path is gone
  if [[ -e "$trash" ]]; then
    echo "WARN: residual $trash left for later cleanup (path $target is clear for install)"
    ( sleep 30; rm -rf "$trash" >/dev/null 2>&1 ) &
  fi
  [[ ! -e "$target" ]]
}

contabo_wipe_node_modules() {
  contabo_wipe_path node_modules
}

# If current node_modules can run next, keep it as rollback; else wipe.
contabo_stash_good_node_modules() {
  if [[ -f node_modules/next/dist/bin/next ]] && \
     [[ -f node_modules/next/dist/compiled/babel/code-frame.js ]]; then
    echo "==> Saving healthy node_modules → node_modules.prev-good"
    contabo_wipe_path node_modules.prev-good || true
    mv node_modules node_modules.prev-good
    return 0
  fi
  contabo_wipe_node_modules || true
}

# Restore previous site after a failed install/build when possible.
contabo_rollback_install() {
  local reason="${1:-install/build failed}"
  echo "==> Rollback: $reason"
  if [[ -d node_modules.prev-good ]]; then
    contabo_wipe_node_modules || true
    mv node_modules.prev-good node_modules
    echo "==> Restored node_modules.prev-good"
  fi
  if [[ -d .next.prev-good ]]; then
    contabo_wipe_path .next || true
    mv .next.prev-good .next
    echo "==> Restored .next.prev-good"
  fi
  contabo_safe_restart_web || true
}

# Restart only if healthy; otherwise leave stopped and print recovery.
contabo_safe_restart_web() {
  if contabo_tree_ready; then
    if pm2 describe arabya-web >/dev/null 2>&1; then
      pm2 restart arabya-web --update-env
    else
      # NEVER `pm2 start arabya-web` (PM2 treats that as a script path).
      NODE_ENV=production PORT=3000 pm2 start deploy/contabo/ecosystem.config.cjs
    fi
    pm2 save >/dev/null 2>&1 || true
    return 0
  fi
  echo "ERROR: refusing to restart arabya-web — tree cannot run next start."
  echo "  next bin:     $([[ -f node_modules/next/dist/bin/next ]] && echo OK || echo MISSING)"
  echo "  next extract: $([[ -f node_modules/next/dist/compiled/babel/code-frame.js ]] && echo OK || echo MISSING)"
  echo "  use-intl:     $([[ -f node_modules/use-intl/dist/esm/production/core.js ]] && echo OK || echo MISSING)"
  echo "  .next/BUILD_ID: $([[ -f .next/BUILD_ID ]] && echo OK || echo MISSING)"
  echo "Recovery:"
  echo "  bash scripts/contabo-recover-web.sh"
  pm2 stop arabya-web 2>/dev/null || true
  return 1
}
