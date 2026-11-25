#!/usr/bin/env bash
# WorkSphere Production Database Backup Script
# Assessment 14 - Production Deployment & Disaster Recovery

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/worksphere}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/worksphere_db_${TIMESTAMP}.sql.gz"
DB_NAME="${POSTGRES_DB:-worksphere_db}"
DB_USER="${POSTGRES_USER:-worksphere}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "${BACKUP_DIR}"

echo "📦 [BACKUP] Starting PostgreSQL backup for ${DB_NAME} at ${TIMESTAMP}..."

PGPASSWORD="${POSTGRES_PASSWORD:-worksphere_password}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F p | gzip > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [BACKUP SUCCESS] Backup archive written to ${BACKUP_FILE} (${FILE_SIZE})"

# Retention policy: Delete backups older than 14 days
find "${BACKUP_DIR}" -type f -name "worksphere_db_*.sql.gz" -mtime +14 -delete
echo "🧹 [RETENTION] Cleaned up backups older than 14 days"
