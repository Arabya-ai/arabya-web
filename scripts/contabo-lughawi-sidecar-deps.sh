#!/usr/bin/env bash
# Contabo: install Lughawi NLP foundation deps (PyArabic + Stanza + CAMeL).
# Optional: neural GEC (transformers) and CATT tashkeel.
# Safe to re-run. First Stanza model download may take several minutes.
#
# Usage (root on Contabo):
#   cd /var/www/arabya-web && bash scripts/contabo-lughawi-sidecar-deps.sh
# Then:
#   bash scripts/contabo-lughawi-sidecar.sh
#   # ensure in .env: LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091
#
# Optional flags:
#   LUGHAWI_INSTALL_GEC=1   → also install torch+transformers (heavy, ≥8GB RAM free)
#   LUGHAWI_INSTALL_CATT=1  → try CATT tashkeel package
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
SIDECAR_DIR="$APP_DIR/services/lughawi-sidecar"
VENV="$SIDECAR_DIR/.venv"

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

echo "==> Foundation requirements (PyArabic + CAMeL + Stanza)"
if [[ -f "$SIDECAR_DIR/requirements.txt" ]]; then
  pip install -r "$SIDECAR_DIR/requirements.txt"
else
  pip install "pyarabic>=0.6.15" "camel-tools>=1.5.2" "stanza>=1.8.2"
fi

echo "==> Prefetch Stanza Arabic models (tokenize+pos+lemma)"
python - <<'PY'
import stanza
try:
    stanza.download("ar", processors="tokenize,pos,lemma", verbose=True)
    print("OK stanza ar models")
except Exception as e:
    print("WARN stanza download:", e)
PY

echo "==> Prefetch CAMeL MLE disambiguator (if available)"
python - <<'PY'
try:
    from camel_tools.disambig.mle import MLEDisambiguator
    MLEDisambiguator.pretrained()
    print("OK camel MLE")
except Exception as e:
    print("WARN camel MLE:", type(e).__name__, e)
PY

if [[ "${LUGHAWI_INSTALL_CATT:-0}" == "1" ]]; then
  echo "==> CATT (tashkeel)"
  pip install "catt-tashkeel" 2>/dev/null || pip install catt 2>/dev/null || \
    echo "WARN: catt not installed"
fi

if [[ "${LUGHAWI_INSTALL_GEC:-0}" == "1" ]]; then
  echo "==> Neural GEC stack (torch CPU + transformers) — heavy"
  pip install "torch" "transformers>=4.40.0" "sentencepiece" "protobuf" || \
    echo "WARN: GEC packages failed"
  python - <<'PY'
import os
mid = os.environ.get("LUGHAWI_GEC_MODEL", "CAMeL-Lab/arabart-qalb14-gec-ged-13")
try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    AutoTokenizer.from_pretrained(mid)
    AutoModelForSeq2SeqLM.from_pretrained(mid)
    print("OK GEC model", mid)
except Exception as e:
    print("WARN GEC download:", type(e).__name__, e)
PY
fi

deactivate || true

if [[ -x "$VENV/bin/python" ]]; then
  export LUGHAWI_SIDECAR_PYTHON="$VENV/bin/python"
  echo "Set LUGHAWI_SIDECAR_PYTHON=$LUGHAWI_SIDECAR_PYTHON for PM2 start"
fi

echo "==> Restart sidecar"
bash "$APP_DIR/scripts/contabo-lughawi-sidecar.sh" || true

echo "Done. Health: curl -s http://127.0.0.1:8091/health | python3 -m json.tool"
echo "Add to /var/www/arabya-web/.env if missing:"
echo "  LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091"
echo
echo "Local LLM (Llama-class) — separate step when RAM ≥10GB free:"
echo "  LUGHAWI_OLLAMA_MODEL=llama3.1:8b bash scripts/contabo-ollama-setup.sh"
