<#
.SYNOPSIS
  Database Restore Script for Artificial Intelligence QA Platform.
.DESCRIPTION
  Verifies SHA-256 checksum and executes pg_restore into target database.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$TargetDb = $env:POSTGRES_DB,
    [string]$DbHost = $env:POSTGRES_HOST,
    [string]$DbPort = $env:POSTGRES_PORT,
    [string]$DbUser = $env:POSTGRES_USER,
    [switch]$Force
)

if (-not $TargetDb) { $TargetDb = "ai_qa_platform_restore_test" }
if (-not $DbHost) { $DbHost = "localhost" }
if (-not $DbPort) { $DbPort = "5432" }
if (-not $DbUser) { $DbUser = "postgres" }

if (-not (Test-Path $BackupFile)) {
    Write-Error "[RESTORE:ERROR] Backup file not found: $BackupFile"
    exit 1
}

$ChecksumFile = "$BackupFile.sha256"
if (Test-Path $ChecksumFile) {
    Write-Host "[RESTORE] Verifying SHA-256 checksum..."
    $expected = (Get-Content $ChecksumFile).Trim()
    $actual = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
    if ($expected -ne $actual) {
        Write-Error "[RESTORE:SECURITY] Checksum mismatch! Expected: $expected, Actual: $actual. Aborting restore."
        exit 1
    }
    Write-Host "[RESTORE:VERIFIED] Checksum matched: $actual"
} else {
    Write-Warning "[RESTORE:WARN] No .sha256 checksum file found. Proceeding with caution..."
}

Write-Host "=========================================================="
Write-Host " [RESTORE] Restoring Database"
Write-Host " Source File: $BackupFile"
Write-Host " Target DB:   $TargetDb on ${DbHost}:${DbPort}"
Write-Host "=========================================================="

$pgRestore = Get-Command "pg_restore" -ErrorAction SilentlyContinue
if (-not $pgRestore -and (Test-Path "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe")) {
    $env:PATH = "C:\Program Files\PostgreSQL\16\bin;$env:PATH"
    $pgRestore = Get-Command "pg_restore" -ErrorAction SilentlyContinue
}

if ($pgRestore) {
    Write-Host "[RESTORE] Executing pg_restore..."
    & pg_restore -h $DbHost -p $DbPort -U $DbUser -d $TargetDb --clean --if-exists -v $BackupFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[RESTORE:ERROR] pg_restore failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} else {
    Write-Host "[RESTORE] Using Docker container ai_qa_postgres for pg_restore..."
    cat $BackupFile | docker exec -i ai_qa_postgres pg_restore -U $DbUser -d $TargetDb --clean --if-exists
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[RESTORE:ERROR] Docker pg_restore failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

Write-Host "[RESTORE:SUCCESS] Database restored successfully into $TargetDb."
Write-Host "=========================================================="
