#!/usr/bin/env bash
# Start Arabya standalone SaaS stack (Umami / Chatwoot / Cal.com / Documenso).
# Contabo only — does not touch PM2 Next.js.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.standalone-saas.yml"
ENV_FILE=".env.saas"

if [[ ! -f "${ENV_FILE}" ]]; then
  if [[ -f .env.saas-templates ]]; then
    cp .env.saas-templates "${ENV_FILE}"
    echo "Created ${ENV_FILE} from .env.saas-templates"
  else
    echo "Missing ${ENV_FILE} and .env.saas-templates" >&2
    exit 1
  fi
fi

if [[ ! -f saas-data/documenso/cert.p12 ]]; then
  bash scripts/saas-generate-documenso-cert.sh
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed on this host." >&2
  exit 1
fi

echo "Pulling images (first run can take several minutes)..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull

echo "Starting arabya-standalone-saas..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

echo
echo "Waiting 20s for healthchecks to settle..."
sleep 20

echo
echo "=== Container status ==="
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

echo
echo "=== Port probes (expect HTTP responses, not connection refused) ==="
for port in 13000 14000 15000 16000; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 "http://127.0.0.1:${port}/" || echo fail)"
  echo "  :${port} -> ${code}"
done

echo
echo "Chatwoot web command runs db:chatwoot_prepare automatically before Puma."
echo "First UI visit: http://127.0.0.1:14000/installation/onboarding (SSH tunnel or Nginx)."
echo
echo "Done. Core arabya.org (PM2) is unchanged."
echo "Contabo layout: keep this stack under /var/www/arabya-saas (isolated from PM2 checkout)."
