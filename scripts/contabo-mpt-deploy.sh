#!/usr/bin/env bash
# Start or restart MoneyPrinterTurbo beside Next.js on Contabo.
# Secrets live in .env.production.local or GitHub Production secrets (never Git):
#   MONEYPRINTER_API_URL=http://127.0.0.1:8080
#   MPT_DAHL_API_KEYS=dahl_new,dahl_old
#   MPT_DAHL_MODELS=MiniMaxAI/MiniMax-M2.7,moonshotai/Kimi-K2.6,deepseek-ai/DeepSeek-V4-Flash-0731
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
if [[ -z "$KEYS" ]]; then
  echo "==> MPT: no Dahl keys in env — keeping existing config.toml (do not commit keys)"
fi

if [[ -n "$KEYS" ]]; then
  echo "==> MPT: apply Dahl LLM routing (keys + models)"
  export MPT_KEYS="$KEYS"
  export MPT_MODELS="$MODELS"
  python3 - <<'PY'
import os
import re
from pathlib import Path

path = Path("config.toml")
text = path.read_text(encoding="utf-8")
keys = os.environ["MPT_KEYS"].strip()
models = os.environ["MPT_MODELS"].strip()
primary_model = models.split(",")[0].strip()

def set_field(name: str, value: str, body: str) -> str:
    pattern = rf'^{re.escape(name)} = .*$'
    repl = f'{name} = "{value}"'
    if re.search(pattern, body, flags=re.M):
        return re.sub(pattern, repl, body, count=1, flags=re.M)
    return f'{repl}\n' + body

text = re.sub(r'^llm_provider = .*$', 'llm_provider = "openai"', text, count=1, flags=re.M)
text = set_field("openai_api_key", keys, text)
text = set_field("openai_base_url", "https://inference.dahl.global/v1", text)
text = set_field("openai_model_name", primary_model, text)
text = set_field("dahl_api_keys", keys, text)
text = set_field("dahl_models", models, text)
path.write_text(text, encoding="utf-8")
PY
fi

STOCK_PEXELS="${PEXELS_API_KEYS:-${PEXELS_API_KEY:-${MPT_PEXELS_API_KEY:-}}}"
STOCK_PIXABAY="${PIXABAY_API_KEYS:-${PIXABAY_API_KEY:-${MPT_PIXABAY_API_KEY:-}}}"
if [[ -n "$STOCK_PEXELS" || -n "$STOCK_PIXABAY" ]]; then
  echo "==> MPT: apply stock footage keys from env"
  export MPT_PEXELS_KEYS="$STOCK_PEXELS"
  export MPT_PIXABAY_KEYS="$STOCK_PIXABAY"
  python3 - <<'PY'
import json
import os
import re
from pathlib import Path

path = Path("config.toml")
text = path.read_text(encoding="utf-8")

def set_list(name: str, csv: str, body: str) -> str:
    items = [part.strip() for part in csv.split(",") if part.strip()]
    if not items:
        return body
    rendered = ", ".join(json.dumps(item) for item in items)
    repl = f"{name} = [{rendered}]"
    pattern = rf"^{re.escape(name)} = .*$"
    if re.search(pattern, body, flags=re.M):
        return re.sub(pattern, repl, body, count=1, flags=re.M)
    return f"{repl}\n" + body

text = set_list("pexels_api_keys", os.environ.get("MPT_PEXELS_KEYS", ""), text)
text = set_list("pixabay_api_keys", os.environ.get("MPT_PIXABAY_KEYS", ""), text)
path.write_text(text, encoding="utf-8")
PY
else
  echo "==> MPT: no Pexels/Pixabay keys in env — stock downloads stay unconfigured"
fi

mkdir -p storage/local_videos storage/tasks
# Numbered engine test stills become a frozen "1/2/3" slideshow — never seed them as B-roll.
find storage/local_videos -maxdepth 1 -type f \( \
  -name '[0-9]*.png' -o -name '*.png.mp4' -o -name '*.jpg.mp4' -o -name '*.jpeg.mp4' \
\) -delete 2>/dev/null || true

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
