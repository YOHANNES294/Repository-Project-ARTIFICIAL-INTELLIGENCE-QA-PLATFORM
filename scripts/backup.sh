#!/usr/bin/env bash
set -euo pipefail

# Automated PostgreSQL Backup Script for Artificial Intelligence QA Platform
BACKUP_DIR="${1:-./backups}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-ai_qa_platform}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/ai_qa_backup_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "=========================================================="
echo " [BACKUP] Artificial Intelligence QA Platform Database"
echo " Target Host: ${DB_HOST}:${DB_PORT} | Database: ${DB_NAME}"
echo " Output File: ${BACKUP_FILE}"
echo "=========================================================="

if command -v pg_dump >/dev/null 2>&1; then
  echo "[BACKUP] Executing native pg_dump..."
  pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -F c -b -f "${BACKUP_FILE}" "${DB_NAME}"
elif docker ps --format '{{.Names}}' | grep -q "ai_qa_postgres"; then
  echo "[BACKUP] Native pg_dump not found. Executing pg_dump via Docker container..."
  docker exec -t ai_qa_postgres pg_dump -U "${DB_USER}" -F c -b "${DB_NAME}" > "${BACKUP_FILE}"
else
  echo "[BACKUP:ERROR] Neither pg_dump nor running Docker container ai_qa_postgres found." >&2
  exit 1
fi

echo "[BACKUP] Computing SHA-256 integrity checksum..."
sha256sum "${BACKUP_FILE}" | awk '{print $1}' > "${CHECKSUM_FILE}"
echo "[BACKUP] SHA-256: $(cat "${CHECKSUM_FILE}")"

echo "[BACKUP] Applying retention policy (pruning older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "ai_qa_backup_*.dump*" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[BACKUP:SUCCESS] Backup completed successfully."
echo "=========================================================="
