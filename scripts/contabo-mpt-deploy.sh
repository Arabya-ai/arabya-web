#!/usr/bin/env bash
# Start or restart MoneyPrinterTurbo beside Next.js on Contabo.
# Secrets live in .env.production.local or GitHub Production secrets (never Git):
#   MONEYPRINTER_API_URL=http://127.0.0.1:8080
#   MPT_DAHL_API_KEYS=dahl_new,dahl_old
#   MPT_DAHL_MODELS=MiniMaxAI/MiniMax-M2.7,moonshotai/Kimi-K2.6,deepseek-ai/DeepSeek-V4-Flash-0731
#   PEXELS_API_KEY=...   (stock footage API — same key as ayah studio backgrounds)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
MPT_DIR="$APP_DIR/services/money-printer-turbo"
ENV_FILE="$APP_DIR/.env.production.local"

if [[ ! -d "$MPT_DIR" ]]; then
  echo "==> MPT: engine directory missing — skip"
  exit 0
fi

echo "==> MPT: starting deploy hook"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

upsert_env() {
  local key="$1"
  local value="$2"
  [[ -n "$value" ]] || return 0
  [[ -f "$ENV_FILE" ]] || touch "$ENV_FILE"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

upsert_env "MONEYPRINTER_API_URL" "${MONEYPRINTER_API_URL:-http://127.0.0.1:8080}"
if [[ -n "${MPT_DAHL_API_KEYS:-}" ]]; then
  upsert_env "MPT_DAHL_API_KEYS" "$MPT_DAHL_API_KEYS"
elif [[ -n "${MPT_DAHL_API_KEY:-}" ]]; then
  upsert_env "MPT_DAHL_API_KEYS" "$MPT_DAHL_API_KEY"
fi
if [[ -n "${MPT_DAHL_MODELS:-}" ]]; then
  upsert_env "MPT_DAHL_MODELS" "$MPT_DAHL_MODELS"
fi
if [[ -n "${PEXELS_API_KEY:-}" ]]; then
  upsert_env "PEXELS_API_KEY" "$PEXELS_API_KEY"
fi
if [[ -n "${PEXELS_API_KEYS:-}" ]]; then
  upsert_env "PEXELS_API_KEYS" "$PEXELS_API_KEYS"
fi
if [[ -n "${PIXABAY_API_KEY:-}" ]]; then
  upsert_env "PIXABAY_API_KEY" "$PIXABAY_API_KEY"
fi
if [[ -n "${PIXABAY_API_KEYS:-}" ]]; then
  upsert_env "PIXABAY_API_KEYS" "$PIXABAY_API_KEYS"
fi

echo "==> MPT: ensure ffmpeg + Python venv"
apt-get install -y ffmpeg python3-venv python3-pip >/dev/null 2>&1 || true

cd "$MPT_DIR"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -U pip
.venv/bin/pip install -q -r requirements.txt

if [[ ! -f config.toml ]]; then
  cp config.example.toml config.toml
fi

KEYS="${MPT_DAHL_API_KEYS:-${MPT_DAHL_API_KEY:-}}"
MODELS="${MPT_DAHL_MODELS:-MiniMaxAI/MiniMax-M2.7,moonshotai/Kimi-K2.6,deepseek-ai/DeepSeek-V4-Flash-0731}"
PEXELS_KEYS="${MPT_PEXELS_API_KEYS:-${MPT_PEXELS_API_KEY:-${PEXELS_API_KEYS:-${PEXELS_API_KEY:-}}}}"
PIXABAY_KEYS="${MPT_PIXABAY_API_KEYS:-${MPT_PIXABAY_API_KEY:-${PIXABAY_API_KEYS:-${PIXABAY_API_KEY:-}}}}"
if [[ -z "$KEYS" ]]; then
  echo "==> MPT: no Dahl keys in env — keeping existing config.toml (do not commit keys)"
fi
if [[ -z "$PEXELS_KEYS" ]]; then
  echo "==> MPT: no Pexels keys in env — stock API generation needs PEXELS_API_KEY on the server"
fi

if [[ -n "$KEYS" || -n "$PEXELS_KEYS" || -n "$PIXABAY_KEYS" ]]; then
  echo "==> MPT: apply LLM/stock API keys from env (not Git)"
  export MPT_KEYS="$KEYS"
  export MPT_MODELS="$MODELS"
  export MPT_PEXELS_KEYS="$PEXELS_KEYS"
  export MPT_PIXABAY_KEYS="$PIXABAY_KEYS"
  python3 - <<'PY'
import os
import re
from pathlib import Path

path = Path("config.toml")
text = path.read_text(encoding="utf-8")
keys = os.environ.get("MPT_KEYS", "").strip()
models = os.environ.get("MPT_MODELS", "").strip()
pexels = os.environ.get("MPT_PEXELS_KEYS", "").strip()
pixabay = os.environ.get("MPT_PIXABAY_KEYS", "").strip()
primary_model = models.split(",")[0].strip() if models else ""

def set_field(name: str, value: str, body: str) -> str:
    pattern = rf'^{re.escape(name)} = .*$'
    repl = f'{name} = "{value}"'
    if re.search(pattern, body, flags=re.M):
        return re.sub(pattern, repl, body, count=1, flags=re.M)
    return f'{repl}\n' + body

def toml_str_list(raw: str) -> str:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    inner = ", ".join('"' + p.replace("\\", "\\\\").replace('"', '\\"') + '"' for p in parts)
    return f"[{inner}]"

def set_list_field(name: str, raw: str, body: str) -> str:
    if not raw.strip():
        return body
    pattern = rf'^{re.escape(name)} = .*$'
    repl = f"{name} = {toml_str_list(raw)}"
    if re.search(pattern, body, flags=re.M):
        return re.sub(pattern, repl, body, count=1, flags=re.M)
    return f"{repl}\n" + body

if keys:
    text = re.sub(r'^llm_provider = .*$', 'llm_provider = "openai"', text, count=1, flags=re.M)
    text = set_field("openai_api_key", keys, text)
    text = set_field("openai_base_url", "https://inference.dahl.global/v1", text)
    if primary_model:
        text = set_field("openai_model_name", primary_model, text)
    text = set_field("dahl_api_keys", keys, text)
    if models:
        text = set_field("dahl_models", models, text)
text = re.sub(r'^video_source = .*$', 'video_source = "pexels"', text, count=1, flags=re.M)
text = set_list_field("pexels_api_keys", pexels, text)
text = set_list_field("pixabay_api_keys", pixabay, text)
path.write_text(text, encoding="utf-8")
PY
fi

mkdir -p storage/local_videos storage/tasks

echo "==> MPT: PM2 arabya-mpt-api"
if pm2 describe arabya-mpt-api >/dev/null 2>&1; then
  pm2 restart arabya-mpt-api --update-env
else
  pm2 start .venv/bin/python --name arabya-mpt-api --cwd "$MPT_DIR" -- main.py
fi
pm2 save

sleep 3
ok=0
for i in $(seq 1 15); do
  if curl -sf -o /dev/null http://127.0.0.1:8080/docs; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" -eq 1 ]]; then
  echo "MPT API OK on :8080"
else
  echo "WARN: MPT :8080 not responding — check: pm2 logs arabya-mpt-api --lines 40"
fi
