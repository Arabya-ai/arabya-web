#!/usr/bin/env bash
# Ensure Contabo data stores for Arabya (SQLite users + Lughawi runtime files).
# Safe to re-run. Does NOT touch Git Quran JSON under /data.
# Usage (on Contabo as root):
#   cd /var/www/arabya-web && bash scripts/contabo-ensure-dbs.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
DB_PATH="${ARABYA_USER_DB_PATH:-/var/lib/arabya/user-data.sqlite}"
IMPORT_DIR="${ARABYA_IMPORTED_BOOKS_DIR:-/var/lib/arabya/imported-books}"
LIBRARY_DIR="${ARABYA_IMPORTED_LIBRARY_DIR:-/var/lib/arabya/imported-library}"
RUNTIME_DIR="${APP_DIR}/.data"

cd "$APP_DIR"

echo "==> Contabo data dirs"
mkdir -p "$(dirname "$DB_PATH")" "$IMPORT_DIR" "$IMPORT_DIR/irab-claims" "$LIBRARY_DIR" "$RUNTIME_DIR" /var/lib/arabya

echo "==> SQLite user DB (accounts / bookmarks / progress)"
ARABYA_USER_DB_PATH="$DB_PATH" npm run init-user-db

echo "==> Lughawi flywheel SQLite (crowd learning L2)"
FLYWHEEL_DB="${LUGHAWI_FLYWHEEL_DB:-/var/lib/arabya/lughawi-flywheel.sqlite}"
mkdir -p "$(dirname "$FLYWHEEL_DB")"
touch "$FLYWHEEL_DB" 2>/dev/null || true
chmod 640 "$FLYWHEEL_DB" 2>/dev/null || true

echo "==> Lughawi runtime files (learning / quota / credentials / admin pool)"
# Learning store creates the JSON on first write; ensure parent exists.
touch "$RUNTIME_DIR/.keep"
# Encrypted admin AI pool (UI-managed) — file created on first key save.
if [[ ! -f /var/lib/arabya/lughawi-admin-pool.json ]]; then
  echo '{"version":1,"slots":[]}' > /var/lib/arabya/lughawi-admin-pool.json
  chmod 640 /var/lib/arabya/lughawi-admin-pool.json 2>/dev/null || true
fi
# Optional empty seeds — stores create real files lazily.
: > "$RUNTIME_DIR/lughawi-learning.json.tmp" && rm -f "$RUNTIME_DIR/lughawi-learning.json.tmp"

echo "==> Arabya NLP SQLite (FastAPI analytics / agent audit)"
NLP_DB="${ARABYA_NLP_SQLITE_PATH:-/var/lib/arabya/arabya-nlp.sqlite}"
mkdir -p "$(dirname "$NLP_DB")" /tmp/arabya-nlp /var/log/arabya
# File is created on first FastAPI boot; ensure parent + log dir exist.
touch "$NLP_DB" 2>/dev/null || true
chmod 640 "$NLP_DB" 2>/dev/null || true

echo "==> Permissions"
chmod 750 /var/lib/arabya 2>/dev/null || true
chmod 640 "$DB_PATH" 2>/dev/null || true
chmod 750 "$RUNTIME_DIR" 2>/dev/null || true

echo "OK — user DB: $DB_PATH"
echo "OK — runtime: $RUNTIME_DIR"
echo "OK — lughawi flywheel: $FLYWHEEL_DB"
echo "OK — arabya-nlp DB path: $NLP_DB"
echo "Reminder: set ARABYA_USER_SYNC_ENABLED=1 and ARABYA_USER_DB_PATH=$DB_PATH in .env then: pm2 restart arabya-web --update-env"
