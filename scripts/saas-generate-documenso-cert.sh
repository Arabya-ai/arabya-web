#!/usr/bin/env bash
# Generate Documenso PKCS#12 signing certificate for arabya standalone SaaS.
# Run on Contabo BEFORE first `docker compose ... up` for Documenso.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/saas-data/documenso"
OUT_CERT="${OUT_DIR}/cert.p12"
ENV_FILE="${ROOT_DIR}/.env.saas"

mkdir -p "${OUT_DIR}"

PASS=""
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  PASS="$(grep -E '^DOCUMENSO_SIGNING_PASSPHRASE=' "${ENV_FILE}" | head -1 | cut -d= -f2- || true)"
fi
if [[ -z "${PASS}" && -f "${ROOT_DIR}/.env.saas-templates" ]]; then
  PASS="$(grep -E '^DOCUMENSO_SIGNING_PASSPHRASE=' "${ROOT_DIR}/.env.saas-templates" | head -1 | cut -d= -f2- || true)"
fi
if [[ -z "${PASS}" ]]; then
  PASS="$(openssl rand -hex 16)"
  echo "Generated DOCUMENSO_SIGNING_PASSPHRASE=${PASS}"
  echo "Put this value into .env.saas as DOCUMENSO_SIGNING_PASSPHRASE before starting Documenso."
fi

TMP_KEY="$(mktemp)"
TMP_CRT="$(mktemp)"
cleanup() { rm -f "${TMP_KEY}" "${TMP_CRT}"; }
trap cleanup EXIT

openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout "${TMP_KEY}" -out "${TMP_CRT}" \
  -subj "/CN=arabya-documenso/O=Arabya/C=SA"

openssl pkcs12 -export -out "${OUT_CERT}" \
  -inkey "${TMP_KEY}" -in "${TMP_CRT}" \
  -passout "pass:${PASS}"

chmod 600 "${OUT_CERT}"
echo "Wrote ${OUT_CERT}"
echo "Passphrase matches DOCUMENSO_SIGNING_PASSPHRASE in .env.saas (or printed above)."
