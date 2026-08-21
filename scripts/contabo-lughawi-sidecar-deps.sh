#!/usr/bin/env bash
# Contabo: install Lughawi NLP deps — PyArabic, Ghalatawi, Stanza, CAMeL (+ Fareh data vendored).
# Prefer Hugging Face Inference for Alnnahwi GEC + Whisper (set LUGHAWI_HF_TOKEN) to spare RAM.
#
# Usage (root):
#   cd /var/www/arabya-web && bash scripts/contabo-lughawi-sidecar-deps.sh
#
# Optional:
#   LUGHAWI_INSTALL_GEC=1   → local torch+transformers (heavy; usually avoid — use HF token instead)
#   LUGHAWI_INSTALL_CATT=1  → CATT tashkeel
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
SIDECAR_DIR="$APP_DIR/services/lughawi-sidecar"
VENV="$SIDECAR_DIR/.venv"
ENV_FILE="$APP_DIR/.env"

cd "$APP_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 required"
  exit 1
fi

echo "==> Sidecar venv at $VENV"
python3 -m venv "$VENV" 2>/dev/null || true
# shellcheck disable=SC1091
source "$VENV/bin/activate"

pip install -U pip wheel setuptools >/dev/null 2>&1 || pip install -U pip wheel setuptools

echo "==> Foundation: PyArabic + Ghalatawi + CAMeL + Stanza"
if [[ -f "$SIDECAR_DIR/requirements.txt" ]]; then
  pip install -r "$SIDECAR_DIR/requirements.txt"
else
  pip install "pyarabic>=0.6.15" "ghalatawi>=0.3" "camel-tools>=1.5.2" "stanza>=1.8.2"
fi

echo "==> Prefetch Stanza Arabic models"
python - <<'PY'
import stanza
try:
    stanza.download("ar", processors="tokenize,pos,lemma", verbose=True)
    print("OK stanza ar models")
except Exception as e:
    print("WARN stanza download:", e)
PY

echo "==> Prefetch CAMeL morphology DB + MLE (fixes missing morphology.db)"
python - <<'PY'
import subprocess, sys
# camel_data CLI ships with camel-tools
for args in (
    ["camel_data", "-i", "morphology-db-msa-r13"],
    ["camel_data", "-i", "disambig-mle-msa"],
    ["camel_data", "light"],
):
    try:
        subprocess.check_call(args)
        print("OK", " ".join(args))
        break
    except Exception as e:
        print("try failed", args, "→", type(e).__name__)
else:
    print("WARN: camel_data install incomplete — morph stays heuristic/analyzer")

try:
    from camel_tools.disambig.mle import MLEDisambiguator
    MLEDisambiguator.pretrained()
    print("OK camel MLE pretrained")
except Exception as e:
    print("WARN camel MLE:", type(e).__name__, e)
PY

if [[ "${LUGHAWI_INSTALL_CATT:-0}" == "1" ]]; then
  echo "==> CATT (tashkeel)"
  pip install "catt-tashkeel" 2>/dev/null || pip install catt 2>/dev/null || \
    echo "WARN: catt not installed"
fi

if [[ "${LUGHAWI_INSTALL_GEC:-0}" == "1" ]]; then
  echo "==> LOCAL neural GEC (heavy) — prefer LUGHAWI_HF_TOKEN instead"
  pip install "torch" "transformers>=4.40.0" "sentencepiece" "protobuf" || \
    echo "WARN: GEC packages failed"
fi

deactivate || true

# Ensure Next can reach the sidecar + document HF preference
touch "$ENV_FILE"
grep -q '^LUGHAWI_SIDECAR_URL=' "$ENV_FILE" 2>/dev/null || \
  echo 'LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091' >> "$ENV_FILE"
if ! grep -q '^LUGHAWI_HF_TOKEN=' "$ENV_FILE" 2>/dev/null; then
  echo "# LUGHAWI_HF_TOKEN=hf_xxx   # مجاني من huggingface.co/settings/tokens — Alnnahwi GEC + Whisper عن بُعد" >> "$ENV_FILE"
fi

if [[ -x "$VENV/bin/python" ]]; then
  export LUGHAWI_SIDECAR_PYTHON="$VENV/bin/python"
  echo "Set LUGHAWI_SIDECAR_PYTHON=$LUGHAWI_SIDECAR_PYTHON"
fi

echo "==> Restart sidecar"
bash "$APP_DIR/scripts/contabo-lughawi-sidecar.sh" || true

echo "Done. Health: curl -s http://127.0.0.1:8091/health | python3 -m json.tool"
echo "Then: pm2 restart arabya-web --update-env"
echo
echo "موصى به لتقليل حمل السيرفر — أضف توكن Hugging Face في .env:"
echo "  LUGHAWI_HF_TOKEN=hf_..."
echo "ثم: pm2 restart lughawi-sidecar arabya-web --update-env"
