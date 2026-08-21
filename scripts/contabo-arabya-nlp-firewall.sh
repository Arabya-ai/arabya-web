#!/usr/bin/env bash
# Whitelist Contabo UFW TCP 8092 for Arabya NLP (FastAPI).
# Run on the Contabo VPS (PuTTY / SSH) as root or with sudo:
#   cd /var/www/arabya-web && bash scripts/contabo-arabya-nlp-firewall.sh
#
# Also add the matching ServerAvatar inbound rule — see:
#   docs/platform/arabya-nlp-port-8092-ar.md
set -euo pipefail

PORT="${ARABYA_NLP_PORT:-8092}"

if ! command -v ufw >/dev/null 2>&1; then
  echo "WARN: ufw not installed — install with: apt-get install -y ufw"
  echo "Skipping UFW rules. Still configure ServerAvatar firewall for TCP ${PORT}."
  exit 0
fi

echo "==> Allow TCP ${PORT} (Arabya NLP FastAPI)"
ufw allow "${PORT}/tcp" comment "arabya-nlp FastAPI" || ufw allow "${PORT}/tcp"
echo "==> Reload UFW"
ufw reload || true
echo "==> Status (look for ${PORT}/tcp ALLOW)"
ufw status numbered || ufw status || true

echo "OK — UFW allows ${PORT}/tcp"
echo "Next: restart arabya-nlp, then:"
echo "  curl -s http://127.0.0.1:${PORT}/health | python3 -m json.tool"
echo "Must be JSON — if you see HTML, ServerAvatar still owns the port."
