# Artificial Intelligence QA Platform
## Database Backup & Disaster Recovery Runbook

**Document Version:** 1.0.0  
**Target Audience:** SREs, Database Administrators (DBAs), Platform Engineers  
**Target Database:** PostgreSQL 15 / 16  
**Last Updated:** November 3, 2026  

---

## 1. Backup & Recovery Objectives

| Metric | Target SLA | Strategy |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 1 hour** | Hourly snapshot / WAL archiving + Daily full encrypted database dumps. |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Automated pg_restore script with pre-verified SHA-256 integrity checks. |
| **Retention Policy** | **14 Days Local, 90 Days Off-Site** | Automated script rotation; S3 Glacier lifecycle rules for cold archive. |
| **Integrity Assurance** | **100% Cryptographically Verified** | SHA-256 checksum generated with every backup and verified prior to restore. |

---

## 2. Automated Backup Scripts

The repository ships with automated backup utilities for both Windows/PowerShell and Linux/Bash environments.

### 2.1 Execution via npm / pnpm scripts
```bash
# Execute standard backup (creates timestamped, compressed dump in backups/ with SHA-256)
pnpm backup

# Verify backup integrity and schema completeness
pnpm verify:backup
```

### 2.2 Linux / POSIX Automation (`scripts/backup.sh`)
```bash
#!/usr/bin/env bash
# Runs via cron: 0 2 * * * /opt/ai-qa-platform/scripts/backup.sh
set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/ai_qa_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# 1. Execute pg_dump with gzip compression
pg_dump "$DATABASE_URL" --format=c --no-owner --no-privileges | gzip -9 > "$FILENAME"

# 2. Compute SHA-256 checksum for tamper detection
sha256sum "$FILENAME" > "${FILENAME}.sha256"

# 3. Prune backups older than 14 days
find "$BACKUP_DIR" -type f -name "ai_qa_backup_*.sql.gz*" -mtime +14 -delete
```

### 2.3 Off-Site Replication (AWS S3 Example)
After generating the local backup and checksum, replicate to off-site cloud storage:
```bash
aws s3 cp ./backups/ "s3://prod-ai-qa-backups/daily/" \
  --recursive \
  --exclude "*" \
  --include "ai_qa_backup_${TIMESTAMP}.sql.gz*" \
  --sse aws:kms
```

---

## 3. Disaster Recovery & Restoration Procedures

### Step 1: Pre-Restoration Integrity Verification
Before running any restoration against a database, cryptographically verify the dump file has not been altered, corrupted, or truncated:

```bash
# Verify checksum matches
sha256sum -c backups/ai_qa_backup_20261103_230000.sql.gz.sha256
# Expected output: ai_qa_backup_20261103_230000.sql.gz: OK
```

### Step 2: Database Restoration
To restore into a clean or disaster-recovery PostgreSQL instance:

```bash
# Option A: Using the PowerShell restore script
.\scripts\restore.ps1 -DumpFile .\backups\ai_qa_backup_20261103_230000.sql.gz

# Option B: Manual bash restoration
gunzip -c backups/ai_qa_backup_20261103_230000.sql.gz | pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -d "$DATABASE_URL"
```

### Step 3: Automated Post-Restore Verification (`scripts/verify-backup.ts`)
Run the schema completeness verification script to ensure all 21 primary Prisma models and foreign keys are intact:

```bash
node --experimental-strip-types scripts/verify-backup.ts
```

Output should confirm:
```
[Verify-Backup] Verified 21/21 core domain models exist in Prisma schema.
[Verify-Backup] SHA-256 integrity validation passed.
[Verify-Backup] Status: BACKUP AND RECOVERY VERIFICATION SUCCEEDED!
```

---

## 4. Disaster Recovery Scenarios & Playbooks

### Scenario A: Accidental Table Drop or Data Corruption
1. **Freeze Traffic:** Place the API in maintenance mode or scale replicas to 0 to prevent further writes.
2. **Provision Temporary Database:** Spin up a new database instance (`ai_qa_recovery`).
3. **Restore Latest Clean Backup:** Restore the most recent valid backup file into `ai_qa_recovery`.
4. **Data Extraction:** Export the missing/corrupted rows from `ai_qa_recovery` and re-insert into the primary production database.
5. **Resume Traffic:** Scale API replicas back to normal.

### Scenario B: Catastrophic Cloud Availability Zone (AZ) Outage
1. **Activate Secondary Region:** Spin up the Docker Compose or Kubernetes cluster in the DR region (e.g. `us-west-2` if `us-east-1` is down).
2. **Download Off-Site Backup:** Pull the latest backup and SHA-256 signature from the cross-region replicated S3 bucket.
3. **Restore Database:** Execute `./scripts/restore.sh` pointing to the new regional RDS instance.
4. **Run Migrations:** Run `pnpm prisma:migrate:deploy` to verify pending migrations.
5. **Update DNS / Ingress:** Point Cloudflare / Route53 DNS to the new DR ingress IP.

---

## 5. Routine DR Drill Schedule

To guarantee that backups remain actionable:
- **Weekly Automated Test:** A scheduled CI job downloads the latest production backup into an ephemeral test container and runs `scripts/verify-backup.ts`.
- **Quarterly Tabletop Drill:** The infrastructure team simulates total region loss and validates RTO under 30 minutes.
