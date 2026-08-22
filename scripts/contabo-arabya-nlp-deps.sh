#!/usr/bin/env bash
# Install Contabo-local deps for Arabya NLP FastAPI.
# Required: PyArabic + Ghalatawi (+ FastAPI stack from requirements.txt)
# Optional (never fail the script): mishkal (tashkeel), libqutrub (conjugation)
#
# Usage (on Contabo as root or deploy user):
#   cd /var/www/arabya-web && bash scripts/contabo-arabya-nlp-deps.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
NLP_DIR="$APP_DIR/services/arabya-nlp"
VENV="$NLP_DIR/.venv"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

cd "$APP_DIR"
mkdir -p /var/lib/arabya /var/log/arabya /tmp/arabya-nlp
mkdir -p "$NLP_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 missing"
  exit 1
fi

python3 -m venv "$VENV"
# shellcheck disable=SC1091
source "$VENV/bin/activate"
pip install --upgrade pip wheel
pip install -r "$NLP_DIR/requirements.txt"

# Optional Arabic engines — missing packages must NOT break Contabo deploy / PM2.
echo "==> Optional: mishkal (تشكيل) + libqutrub (تصريف)"
if pip install --no-cache-dir "mishkal>=0.4" "libqutrub>=1.2" ; then
  echo "OK — mishkal + libqutrub installed"
else
  echo "WARN: optional mishkal/libqutrub install failed — proofread rules still work; /v1/tashkeel and /v1/conjugate return available=false"
fi

# Prove imports (soft)
python - <<'PY' || true
import sys
ok = True
for name, mod in [
    ("pyarabic", "pyarabic"),
    ("ghalatawi", "ghalatawi"),
    ("mishkal", "mishkal.tashkeel"),
    ("libqutrub", "libqutrub.conjugator"),
]:
    try:
        __import__(mod)
        print(f"  ✓ {name}")
    except Exception as e:
        ok = False
        print(f"  ✗ {name}: {e}")
sys.exit(0)
PY

# Ensure ffmpeg exists (STT layer)
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "WARN: ffmpeg not found — install with: apt-get install -y ffmpeg"
fi

# Seed env defaults (never overwrite existing secrets)
touch "$ENV_FILE"
grep -q '^ARABYA_NLP_DATABASE_URL=' "$ENV_FILE" 2>/dev/null || \
  echo 'ARABYA_NLP_DATABASE_URL=sqlite:////var/lib/arabya/arabya-nlp.sqlite' >> "$ENV_FILE"
grep -q '^ARABYA_NLP_OLLAMA_BASE_URL=' "$ENV_FILE" 2>/dev/null || \
  echo 'ARABYA_NLP_OLLAMA_BASE_URL=http://127.0.0.1:11434' >> "$ENV_FILE"
# Localhost bind only (Next reaches NLP via 127.0.0.1 — do not reopen 0.0.0.0)
if grep -q '^ARABYA_NLP_HOST=' "$ENV_FILE" 2>/dev/null; then
  sed -i 's/^ARABYA_NLP_HOST=.*/ARABYA_NLP_HOST=127.0.0.1/' "$ENV_FILE"
else
  echo 'ARABYA_NLP_HOST=127.0.0.1' >> "$ENV_FILE"
fi
grep -q '^ARABYA_NLP_PORT=' "$ENV_FILE" 2>/dev/null || \
  echo 'ARABYA_NLP_PORT=8092' >> "$ENV_FILE"
grep -q '^ARABYA_NLP_DEVOPS_AUTO_EXECUTE=' "$ENV_FILE" 2>/dev/null || \
  echo 'ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0' >> "$ENV_FILE"
grep -q '^ARABYA_NLP_URL=' "$ENV_FILE" 2>/dev/null || \
  echo 'ARABYA_NLP_URL=http://127.0.0.1:8092' >> "$ENV_FILE"
grep -q '^ARABYA_NLP_PROOFREAD=' "$ENV_FILE" 2>/dev/null || \
  echo 'ARABYA_NLP_PROOFREAD=1' >> "$ENV_FILE"

export ARABYA_NLP_PYTHON="$VENV/bin/python"
echo "OK — venv at $VENV"
bash "$APP_DIR/scripts/contabo-arabya-nlp.sh" || true
