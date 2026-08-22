#!/usr/bin/env bash
# Gate A — Contabo hardening: .env permissions + close public :8092 + localhost NLP bind.
# Safe to re-run. Does NOT rotate secrets or touch Ollama/UFW ports other than 8092.
# Usage:
#   cd /var/www/arabya-web && bash scripts/contabo-gate-a-harden.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
cd "$APP_DIR"

echo "==> Gate A: .env permissions (600)"
chmod 600 .env .env.local .env.production.local 2>/dev/null || chmod 600 .env

echo "==> Gate A: UFW — no public 8092"
bash scripts/contabo-arabya-nlp-firewall.sh

echo "==> Gate A: localhost NLP bind in .env"
if grep -q '^ARABYA_NLP_HOST=' .env; then
  sed -i 's/^ARABYA_NLP_HOST=.*/ARABYA_NLP_HOST=127.0.0.1/' .env
else
  echo 'ARABYA_NLP_HOST=127.0.0.1' >> .env
fi
if grep -q '^ARABYA_NLP_URL=' .env; then
  sed -i 's|^ARABYA_NLP_URL=.*|ARABYA_NLP_URL=http://127.0.0.1:8092|' .env
else
  echo 'ARABYA_NLP_URL=http://127.0.0.1:8092' >> .env
fi

echo "==> Gate A: restart arabya-nlp only"
bash scripts/contabo-arabya-nlp.sh
pm2 save || true

echo "==> Verify"
ls -la .env .env.local .env.production.local 2>/dev/null | awk '{print $1, $NF}' || ls -la .env
ss -tlnp | grep 8092 || true
curl -s -m 8 http://127.0.0.1:8092/health | head -c 120 || true
echo
echo "OK — Gate A applied. Public :8092 must stay closed; lughawi via Next only."
