#!/usr/bin/env bash
# Stop / remove Arabya standalone SaaS containers (keeps named volumes by default).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.standalone-saas.yml"
ENV_FILE=".env.saas"

if [[ ! -f "${ENV_FILE}" ]]; then
  ENV_FILE=".env.saas-templates"
fi

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down
echo "Stopped. Named volumes retained (data kept)."
echo "To wipe DBs as well: docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} down -v"
