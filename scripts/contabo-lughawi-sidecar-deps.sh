#!/usr/bin/env bash
# Optional Contabo: install Python NLP deps for Lughawi sidecar (CAMeL / CATT).
# Safe to re-run. Heavy packages may take several minutes; failures are non-fatal.
# Usage (root on Contabo):
#   cd /var/www/arabya-web && bash scripts/contabo-lughawi-sidecar-deps.sh
# Then:
#   bash scripts/contabo-lughawi-sidecar.sh
#   # ensure in .env: LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091
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

pip install -U pip wheel setuptools >/dev/null

echo "==> Core (always)"
pip install "fastapi==0.115.*" "uvicorn[standard]==0.32.*" 2>/dev/null || \
  pip install fastapi uvicorn || true

echo "==> CAMeL Tools (morph) — optional"
if pip install "camel-tools>=1.5.2"; then
  echo "OK camel-tools"
else
  echo "WARN: camel-tools install failed — sidecar keeps heuristic morph"
fi

echo "==> CATT (tashkeel) — optional"
if pip install "catt-tashkeel" 2>/dev/null || pip install catt 2>/dev/null; then
  echo "OK catt"
else
  echo "WARN: catt not installed — tashkeel stays passthrough / Next local"
fi

deactivate || true

# Prefer venv python for PM2
if [[ -x "$VENV/bin/python" ]]; then
  export LUGHAWI_SIDECAR_PYTHON="$VENV/bin/python"
  echo "Set LUGHAWI_SIDECAR_PYTHON=$LUGHAWI_SIDECAR_PYTHON for PM2 start"
fi

echo "==> Restart sidecar"
bash "$APP_DIR/scripts/contabo-lughawi-sidecar.sh" || true

echo "Done. Health: curl -s http://127.0.0.1:8091/health"
echo "Add to /var/www/arabya-web/.env if missing:"
echo "  LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091"
