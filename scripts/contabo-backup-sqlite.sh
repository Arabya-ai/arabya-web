#!/usr/bin/env bash
# Compressed SQLite backups with WAL-safe checkpoint (Contabo).
# Usage (root on VPS):
#   cd /var/www/arabya-web && bash scripts/contabo-backup-sqlite.sh
# Optional cron (daily 03:15):
#   15 3 * * * cd /var/www/arabya-web && bash scripts/contabo-backup-sqlite.sh >> /var/log/arabya/backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
BACKUP_DIR="${ARABYA_BACKUP_DIR:-/var/lib/arabya/backups}"
RETAIN_DAYS="${ARABYA_BACKUP_RETAIN_DAYS:-14}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"

USER_DB="${ARABYA_USER_DB_PATH:-/var/lib/arabya/user-data.sqlite}"
NLP_DB="${ARABYA_NLP_SQLITE_PATH:-/var/lib/arabya/arabya-nlp.sqlite}"

mkdir -p "$BACKUP_DIR" /var/log/arabya
chmod 750 "$BACKUP_DIR" 2>/dev/null || true

backup_one() {
  local src="$1"
  local label="$2"
  if [[ ! -f "$src" ]]; then
    echo "SKIP — missing $label: $src"
    return 0
  fi
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "WARN — sqlite3 missing; plain copy for $label"
    cp -a "$src" "$BACKUP_DIR/${label}-${STAMP}.sqlite"
    gzip -f "$BACKUP_DIR/${label}-${STAMP}.sqlite"
    echo "OK — $BACKUP_DIR/${label}-${STAMP}.sqlite.gz"
    return 0
  fi
  local dest="$BACKUP_DIR/${label}-${STAMP}.sqlite"
  sqlite3 "$src" ".backup '${dest}'"
  gzip -f "$dest"
  echo "OK — ${dest}.gz"
}

echo "==> Arabya SQLite backup ($STAMP)"
backup_one "$USER_DB" "user-data"
backup_one "$NLP_DB" "arabya-nlp"

echo "==> Prune backups older than ${RETAIN_DAYS} days"
find "$BACKUP_DIR" -type f -name '*.sqlite.gz' -mtime "+${RETAIN_DAYS}" -delete 2>/dev/null || true

echo "Done — backups in $BACKUP_DIR"
