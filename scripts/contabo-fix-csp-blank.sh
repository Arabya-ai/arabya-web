#!/usr/bin/env bash
# Hotfix blank white pages caused by CSP blocking inline scripts (Contabo).
# Run as root:
#   cd /var/www/arabya-web && bash scripts/contabo-fix-csp-blank.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
CFG="$APP_DIR/next.config.ts"
cd "$APP_DIR"

if [[ ! -f "$CFG" ]]; then
  echo "ERROR: missing $CFG"
  exit 1
fi

cp -a "$CFG" "$CFG.bak-csp-$(date +%Y%m%d%H%M%S)"

# Ensure script-src includes 'unsafe-inline' (idempotent)
if grep -q "script-src 'self' 'unsafe-inline'" "$CFG"; then
  echo "OK — CSP already has unsafe-inline"
else
  sed -i "s/script-src 'self' https:\\/\\/static.cloudflareinsights.com/script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:\\/\\/static.cloudflareinsights.com/" "$CFG"
fi

grep -n "script-src" "$CFG" | head -5

echo "==> Rebuild Next (required for headers())"
npm run build

echo "==> Restart arabya-web"
pm2 restart arabya-web --update-env || pm2 start deploy/contabo/ecosystem.config.cjs
pm2 save || true
sleep 3

echo "==> Verify CSP header contains unsafe-inline"
curl -sSI -H 'Host: www.arabya.org' http://127.0.0.1:3000/lughawi | tr -d '\r' | grep -i content-security-policy
echo
curl -sS -o /dev/null -w 'local_lughawi=%{http_code}\n' -H 'Host: www.arabya.org' http://127.0.0.1:3000/lughawi
curl -sS -o /dev/null -w 'public_lughawi=%{http_code}\n' https://www.arabya.org/lughawi
echo "Done. Hard-refresh browser: Ctrl+Shift+R"
