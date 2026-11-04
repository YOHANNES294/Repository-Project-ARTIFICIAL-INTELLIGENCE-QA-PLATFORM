<#
.SYNOPSIS
  Automated PostgreSQL Backup Script for Artificial Intelligence QA Platform.
.DESCRIPTION
  Performs compressed pg_dump backup with timestamping, SHA-256 checksum calculation,
  and retention policy cleanup.
#>

param (
    [string]$BackupDir = "backups",
    [string]$DbHost = $env:POSTGRES_HOST,
    [string]$DbPort = $env:POSTGRES_PORT,
    [string]$DbUser = $env:POSTGRES_USER,
    [string]$DbName = $env:POSTGRES_DB,
    [int]$RetentionDays = 14
)

if (-not $DbHost) { $DbHost = "localhost" }
if (-not $DbPort) { $DbPort = "5432" }
if (-not $DbUser) { $DbUser = "postgres" }
if (-not $DbName) { $DbName = "ai_qa_platform" }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TargetDir = Join-Path $PSScriptRoot "..\$BackupDir"
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$BackupFile = Join-Path $TargetDir "ai_qa_backup_$Timestamp.dump"
$ChecksumFile = "$BackupFile.sha256"

Write-Host "=========================================================="
Write-Host " [BACKUP] Artificial Intelligence QA Platform Database"
Write-Host " Target Host: ${DbHost}:${DbPort} | Database: $DbName"
Write-Host " Output File: $BackupFile"
Write-Host "=========================================================="

# Check for pg_dump availability
$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $pgDump -and (Test-Path "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe")) {
    $env:PATH = "C:\Program Files\PostgreSQL\16\bin;$env:PATH"
    $pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
}

if ($pgDump) {
    Write-Host "[BACKUP] Executing native pg_dump..."
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -F c -b -v -f $BackupFile $DbName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[BACKUP:ERROR] pg_dump failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} else {
    Write-Host "[BACKUP] pg_dump binary not found locally. Using Docker container ai_qa_postgres..."
    docker exec -t ai_qa_postgres pg_dump -U $DbUser -F c -b $DbName > $BackupFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[BACKUP:ERROR] Docker pg_dump failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Generate SHA-256 checksum
Write-Host "[BACKUP] Computing SHA-256 integrity checksum..."
$hash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
Set-Content -Path $ChecksumFile -Value $hash
Write-Host "[BACKUP] SHA-256: $hash"

# Apply retention policy
Write-Host "[BACKUP] Applying retention policy (keeping last $RetentionDays days)..."
$LimitDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $TargetDir -Filter "ai_qa_backup_*.dump*" | Where-Object { $_.CreationTime -lt $LimitDate } | Remove-Item -Force

Write-Host "[BACKUP:SUCCESS] Backup completed successfully."
Write-Host "=========================================================="
