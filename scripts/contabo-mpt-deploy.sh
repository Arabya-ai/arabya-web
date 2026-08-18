#!/usr/bin/env bash
# Start or restart MoneyPrinterTurbo beside Next.js on Contabo.
# Reads optional secrets from .env.production.local (never commit real keys):
#   MONEYPRINTER_API_URL=http://127.0.0.1:8080
#   MPT_DAHL_API_KEY=dahl_...
#   MPT_LLM_MODEL=MiniMaxAI/MiniMax-M2.7
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
MPT_DIR="$APP_DIR/services/money-printer-turbo"
ENV_FILE="$APP_DIR/.env.production.local"

if [[ ! -d "$MPT_DIR" ]]; then
  echo "==> MPT engine directory missing — skip"
  exit 0
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Ensure Next.js sees the engine URL (also set in ServerAvatar / PM2 env).
if [[ -n "${MONEYPRINTER_API_URL:-}" ]] && [[ -f "$ENV_FILE" ]]; then
  if ! grep -q '^MONEYPRINTER_API_URL=' "$ENV_FILE" 2>/dev/null; then
    printf '\nMONEYPRINTER_API_URL=%s\n' "$MONEYPRINTER_API_URL" >> "$ENV_FILE"
  fi
fi

if [[ -n "${MPT_DAHL_API_KEY:-}" ]] && [[ -f "$ENV_FILE" ]]; then
  if grep -q '^MPT_DAHL_API_KEY=' "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^MPT_DAHL_API_KEY=.*|MPT_DAHL_API_KEY=${MPT_DAHL_API_KEY}|" "$ENV_FILE"
  else
    printf 'MPT_DAHL_API_KEY=%s\n' "$MPT_DAHL_API_KEY" >> "$ENV_FILE"
  fi
fi

echo "==> MPT: ensure ffmpeg + Python venv"
apt-get install -y ffmpeg python3-venv python3-pip >/dev/null 2>&1 || true

cd "$MPT_DIR"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# Minimal deps for API (skip faster-whisper / streamlit on server)
.venv/bin/pip install -q -U pip
.venv/bin/pip install -q -r requirements.txt

if [[ ! -f config.toml ]]; then
  cp config.example.toml config.toml
fi

if [[ -n "${MPT_DAHL_API_KEY:-}" ]]; then
  echo "==> MPT: apply Dahl LLM settings from env"
  python3 - <<'PY'
import os
import re
from pathlib import Path

path = Path("config.toml")
text = path.read_text(encoding="utf-8")
key = os.environ["MPT_DAHL_API_KEY"].strip()
model = os.environ.get("MPT_LLM_MODEL", "MiniMaxAI/MiniMax-M2.7").strip()

def set_field(name: str, value: str, body: str) -> str:
    pattern = rf'^{re.escape(name)} = .*$'
    repl = f'{name} = "{value}"'
    if re.search(pattern, body, flags=re.M):
        return re.sub(pattern, repl, body, count=1, flags=re.M)
    return body

text = re.sub(r'^llm_provider = .*$', 'llm_provider = "openai"', text, count=1, flags=re.M)
text = set_field("openai_api_key", key, text)
text = set_field("openai_base_url", "https://inference.dahl.global/v1", text)
text = set_field("openai_model_name", model, text)
path.write_text(text, encoding="utf-8")
PY
fi

mkdir -p storage/local_videos storage/tasks

echo "==> MPT: PM2 arabya-mpt-api"
if pm2 describe arabya-mpt-api >/dev/null 2>&1; then
  pm2 restart arabya-mpt-api
else
  pm2 start .venv/bin/python --name arabya-mpt-api --cwd "$MPT_DIR" -- main.py
fi
pm2 save

sleep 2
curl -sf -o /dev/null http://127.0.0.1:8080/docs && echo "MPT API OK on :8080" || echo "WARN: MPT :8080 not responding yet"
