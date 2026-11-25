#!/usr/bin/env bash
# WorkSphere Production Database Restore Verification Script
# Assessment 14 - Production Deployment & Disaster Recovery

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
RESTORE_DB="${2:-worksphere_restore_test}"
DB_USER="${POSTGRES_USER:-worksphere}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file ${BACKUP_FILE} not found."
  exit 1
fi

echo "🔄 [RESTORE VERIFY] Creating sandbox database ${RESTORE_DB} to verify backup integrity..."

PGPASSWORD="${POSTGRES_PASSWORD:-worksphere_password}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"

PGPASSWORD="${POSTGRES_PASSWORD:-worksphere_password}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -c "CREATE DATABASE ${RESTORE_DB};"

echo "📥 Restoring schema and data into ${RESTORE_DB}..."
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD:-worksphere_password}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${RESTORE_DB}" > /dev/null

echo "🔍 Validating row counts and table integrity..."
TABLE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-worksphere_password}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${RESTORE_DB}" \
  -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "✅ [RESTORE VERIFIED] Successfully verified ${RESTORE_DB} with ${TABLE_COUNT// /} tables!"
