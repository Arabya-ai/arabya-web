#!/usr/bin/env bash
# Shared helpers for Contabo deploy — sourced by contabo-deploy.sh

# True when the tree can run `next start` without immediate PM2 crash-loop.
contabo_tree_ready() {
  [[ -f node_modules/next/dist/bin/next ]] &&
    [[ -f node_modules/next/dist/compiled/babel/code-frame.js ]] &&
    [[ -f node_modules/use-intl/dist/esm/production/core.js ]] &&
    [[ -f .next/BUILD_ID ]]
}

# Restart only if healthy; otherwise leave stopped and print recovery.
contabo_safe_restart_web() {
  if contabo_tree_ready; then
    if pm2 describe arabya-web >/dev/null 2>&1; then
      pm2 restart arabya-web --update-env
    else
      NODE_ENV=production PORT=3000 pm2 start deploy/contabo/ecosystem.config.cjs
    fi
    return 0
  fi
  echo "ERROR: refusing to restart arabya-web — tree cannot run next start."
  echo "  next bin:     $([[ -f node_modules/next/dist/bin/next ]] && echo OK || echo MISSING)"
  echo "  next extract: $([[ -f node_modules/next/dist/compiled/babel/code-frame.js ]] && echo OK || echo MISSING)"
  echo "  use-intl:     $([[ -f node_modules/use-intl/dist/esm/production/core.js ]] && echo OK || echo MISSING)"
  echo "  .next/BUILD_ID: $([[ -f .next/BUILD_ID ]] && echo OK || echo MISSING)"
  echo "Recovery:"
  echo "  pm2 stop arabya-web"
  echo "  rm -rf node_modules ~/.npm/_cacache && npm cache clean --force"
  echo "  bash scripts/contabo-deploy.sh"
  pm2 stop arabya-web 2>/dev/null || true
  return 1
}
