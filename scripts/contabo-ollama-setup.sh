#!/usr/bin/env bash
# Install Ollama on Contabo and pull a small default model for Lughawi Auto fallback.
# Usage (root on Contabo):
#   bash /var/www/arabya-web/scripts/contabo-ollama-setup.sh
set -euo pipefail

MODEL="${LUGHAWI_OLLAMA_MODEL:-llama3.2}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "==> Installing Ollama"
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "==> Enable service"
systemctl enable --now ollama 2>/dev/null || true

echo "==> Pull model: $MODEL (needs disk + RAM)"
ollama pull "$MODEL"

echo "==> Smoke test"
curl -sf http://127.0.0.1:11434/api/tags >/dev/null && echo "Ollama API OK"

ENV_FILE="${APP_DIR:-/var/www/arabya-web}/.env"
if [[ -f "$ENV_FILE" ]]; then
  grep -q 'LUGHAWI_OLLAMA_BASE_URL' "$ENV_FILE" || \
    echo 'LUGHAWI_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1' >> "$ENV_FILE"
  grep -q 'LUGHAWI_OLLAMA_MODEL' "$ENV_FILE" || \
    echo "LUGHAWI_OLLAMA_MODEL=$MODEL" >> "$ENV_FILE"
  grep -q 'LUGHAWI_OLLAMA_API_KEY' "$ENV_FILE" || \
    echo 'LUGHAWI_OLLAMA_API_KEY=ollama' >> "$ENV_FILE"
  echo "==> Appended Ollama lines to $ENV_FILE (if missing)"
fi

echo "Done. Restart web: pm2 restart arabya-web --update-env"
echo "Then open /lughawi → settings and confirm local pool is listed."
