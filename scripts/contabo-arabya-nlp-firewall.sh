#!/usr/bin/env bash
# Harden Contabo: keep Arabya NLP (:8092) off the public internet.
# Next.js talks to FastAPI only via http://127.0.0.1:8092 — no UFW allow needed.
#
# Run on the Contabo VPS as root:
#   cd /var/www/arabya-web && bash scripts/contabo-arabya-nlp-firewall.sh
#
# See: docs/platform/arabya-nlp-port-8092-ar.md
set -euo pipefail

PORT="${ARABYA_NLP_PORT:-8092}"

if ! command -v ufw >/dev/null 2>&1; then
  echo "WARN: ufw not installed — install with: apt-get install -y ufw"
  echo "Skipping UFW cleanup. Still bind FastAPI to 127.0.0.1 only."
  exit 0
fi

echo "==> Ensure TCP ${PORT} is NOT allowed from the public internet"
# Delete any prior allow rules (v4/v6). Ignore if missing.
ufw --force delete allow "${PORT}/tcp" 2>/dev/null || true
ufw --force delete allow "${PORT}" 2>/dev/null || true

echo "==> Reload UFW"
ufw reload || true

echo "==> Status (port ${PORT} must NOT appear as ALLOW Anywhere)"
ufw status numbered || ufw status || true

if ufw status 2>/dev/null | grep -E "^${PORT}(/tcp)?[[:space:]]+ALLOW"; then
  echo "WARN: ${PORT} still ALLOW in UFW — remove the rule manually: ufw status numbered"
  exit 1
fi

echo "OK — public inbound to ${PORT} is closed (Next uses 127.0.0.1 only)"
echo "Verify locally:"
echo "  curl -s http://127.0.0.1:${PORT}/health | python3 -m json.tool"
echo "From the internet, http://SERVER_IP:${PORT}/health must fail/timeout."
