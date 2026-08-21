#!/usr/bin/env bash
# Contabo: install COMPLETE Lughawi NLP stack locally (never depends on HF token).
# Optional HF token accelerates GEC/Whisper to spare RAM — auto-fallback to local.
#
# Usage (root):
#   cd /var/www/arabya-web && bash scripts/contabo-lughawi-sidecar-deps.sh
#
# Skip heavy local neural (not recommended): LUGHAWI_SKIP_LOCAL_NEURAL=1
# Extra: LUGHAWI_INSTALL_CATT=1
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

echo "==> Contabo-complete: rules + local neural packages"
if [[ -f "$SIDECAR_DIR/requirements.txt" ]]; then
  if [[ "${LUGHAWI_SKIP_LOCAL_NEURAL:-0}" == "1" ]]; then
    pip install "pyarabic>=0.6.15" "ghalatawi>=0.3" "camel-tools>=1.5.2" "stanza>=1.8.2"
  else
    pip install -r "$SIDECAR_DIR/requirements.txt"
  fi
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

echo "==> Prefetch CAMeL morphology DB + MLE (use 'light' — includes both)"
python - <<'PY'
import subprocess

# IMPORTANT: do NOT stop after morphology-db alone — MLE needs camel_data -i light
# (or the disambig package). Order: light first, then explicit packages as backup.
cmds = [
    ["camel_data", "-i", "light"],
    ["camel_data", "-i", "morphology-db-msa-r13"],
    ["camel_data", "-i", "disambig-mle-calima-msa-r13"],
    ["camel_data", "-i", "disambig-mle-msa"],
]
ok_any = False
for args in cmds:
    try:
        subprocess.check_call(args)
        print("OK", " ".join(args))
        ok_any = True
        # Keep going so MLE package is present even if light partially existed
        if args[-1] == "light":
            break
    except Exception as e:
        print("try failed", args, "→", type(e).__name__, e)

if not ok_any:
    print("WARN: camel_data incomplete")

try:
    from camel_tools.disambig.mle import MLEDisambiguator
    MLEDisambiguator.pretrained()
    print("OK camel MLE pretrained")
except Exception as e:
    print("WARN camel MLE:", type(e).__name__, e)
    # Last resort: analyzer-only morph still works in sidecar
PY

if [[ "${LUGHAWI_SKIP_LOCAL_NEURAL:-0}" != "1" ]]; then
  echo "==> Prefetch Alnnahwi GEC weights on Contabo (foundation — no HF token needed at runtime)"
  python - <<'PY'
import os
mid = os.environ.get("LUGHAWI_GEC_MODEL", "alnnahwi/gemma-3-1b-arabic-gec-v1")
try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    AutoTokenizer.from_pretrained(mid)
    AutoModelForCausalLM.from_pretrained(mid)
    print("OK local GEC", mid)
except Exception as e:
    # Gemma may need AutoModelForCausalLM or different class — try generic
    try:
        from transformers import AutoModel
        AutoModel.from_pretrained(mid)
        print("OK local GEC (AutoModel)", mid)
    except Exception as e2:
        print("WARN GEC download:", type(e).__name__, e, "|", type(e2).__name__, e2)
PY

  echo "==> Prefetch faster-whisper local model (default: medium)"
  python - <<'PY'
import os
size = os.environ.get("LUGHAWI_WHISPER_LOCAL_SIZE", "medium")
try:
    from faster_whisper import WhisperModel
    WhisperModel(size, device="cpu", compute_type="int8")
    print("OK local whisper", size)
except Exception as e:
    print("WARN whisper download:", type(e).__name__, e)
PY
fi

if [[ "${LUGHAWI_INSTALL_CATT:-0}" == "1" ]]; then
  echo "==> CATT (tashkeel)"
  pip install "catt-tashkeel" 2>/dev/null || pip install catt 2>/dev/null || \
    echo "WARN: catt not installed"
fi

deactivate || true

touch "$ENV_FILE"
grep -q '^LUGHAWI_SIDECAR_URL=' "$ENV_FILE" 2>/dev/null || \
  echo 'LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091' >> "$ENV_FILE"
# Contabo-complete defaults
grep -q '^LUGHAWI_GEC_LOCAL=' "$ENV_FILE" 2>/dev/null || \
  echo 'LUGHAWI_GEC_LOCAL=1' >> "$ENV_FILE"
grep -q '^LUGHAWI_STT_LOCAL=' "$ENV_FILE" 2>/dev/null || \
  echo 'LUGHAWI_STT_LOCAL=1' >> "$ENV_FILE"
grep -q '^LUGHAWI_PREFER_HF=' "$ENV_FILE" 2>/dev/null || \
  echo 'LUGHAWI_PREFER_HF=1' >> "$ENV_FILE"
if ! grep -q '^LUGHAWI_HF_TOKEN=' "$ENV_FILE" 2>/dev/null; then
  echo "# LUGHAWI_HF_TOKEN=hf_xxx  # اختياري: تسريع HF مع رجوع تلقائي لـ Contabo" >> "$ENV_FILE"
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
echo "السياسة: Contabo كامل دائمًا. HF اختياري لتوفير الموارد (LUGHAWI_HF_TOKEN)."
echo "عند نفاد التوكن أو تعطيل النموذج — الرجوع المحلي تلقائي ولن يتوقف العمل."
