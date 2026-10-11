[CmdletBinding()]
param(
    [string]$SourcePath = 'C:\AI-Institutional',
    [ValidateSet('latest', 'newest', 'greatest', 'minor', 'patch')]
    [string]$Target = 'latest',
    [switch]$SkipNcu,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Phase([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Native([string]$FilePath, [string[]]$Arguments, [string]$FailureMessage) {
    & $FilePath @Arguments
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        throw "$FailureMessage (exit code $code)"
    }
}

function Test-BetterSqlite3 {
    param([string]$NodePath)
    $smokeTest = 'const Database = require("better-sqlite3"); const db = new Database(":memory:"); const row = db.prepare("SELECT 1 AS ok").get(); if (row.ok !== 1) process.exit(2); db.close(); console.log("better-sqlite3 native binding: PASS");'
    & $NodePath -e $smokeTest
    return ($LASTEXITCODE -eq 0)
}

$SourcePath = [System.IO.Path]::GetFullPath($SourcePath)
$packageJsonPath = Join-Path $SourcePath 'package.json'
$lockPath = Join-Path $SourcePath 'package-lock.json'
$nodeModulesPath = Join-Path $SourcePath 'node_modules'

if (-not (Test-Path -LiteralPath $SourcePath -PathType Container)) {
    throw "Source directory not found: $SourcePath"
}
if (-not (Test-Path -LiteralPath $packageJsonPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $lockPath -PathType Leaf)) {
    throw "SourcePath must contain both package.json and package-lock.json: $SourcePath"
}
if (-not (Test-Path -LiteralPath $nodeModulesPath -PathType Container)) {
    throw "node_modules is missing at $nodeModulesPath. This script expects the existing working source installation, not a clean deployment folder."
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$npmCommand = Get-Command npm.cmd -ErrorAction Stop
$npxCommand = Get-Command npx.cmd -ErrorAction Stop
$nodePath = $nodeCommand.Source
$npmPath = $npmCommand.Source
$npxPath = $npxCommand.Source

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $env:USERPROFILE 'AJInstitutional-NpmUpgrade-Backups'
$backupDir = Join-Path $backupRoot $stamp
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$logPath = Join-Path $backupDir 'upgrade.log'
Start-Transcript -Path $logPath -Force | Out-Null

$originalLocation = Get-Location
$originalSqliteVersion = $null
$sqliteBindingSource = Join-Path $nodeModulesPath 'better-sqlite3\build\Release\better_sqlite3.node'
$sqliteBindingBackup = Join-Path $backupDir 'better_sqlite3.node'
$haveSqliteBindingBackup = $false
$startedNcu = $false

try {
    Write-Host 'AJ Institutional source dependency upgrade' -ForegroundColor Green
    Write-Host "Source: $SourcePath"
    Write-Host "Backup: $backupDir"
    Write-Host "Node: $(& $nodePath --version)"
    Write-Host "npm: $(& $npmPath --version)"
    Write-Host "Target: $Target"
    Write-Host ''
    Write-Host 'WARNING: this updates dependencies in the source repository and may include major-version changes.' -ForegroundColor Yellow
    Write-Host 'It does not stop running application processes. Do not run this against the live source while relying on an uninterrupted session.' -ForegroundColor Yellow
    Write-Host 'npm install will use --legacy-peer-deps to get past the known TypeScript 7 / typescript-eslint peer-range conflict.'
    Write-Host 'It will also use --ignore-scripts to prevent npm from trying to compile better-sqlite3 with node-gyp / Visual Studio.'
    Write-Host 'The existing better-sqlite3 native binding is saved and checked before and after the upgrade.'

    $answer = Read-Host 'Type UPGRADE to continue, anything else cancels'
    if ($answer -cne 'UPGRADE') {
        Write-Host 'Cancelled. No package files were changed.' -ForegroundColor Yellow
        return
    }

    Copy-Item -LiteralPath $packageJsonPath -Destination (Join-Path $backupDir 'package.json')
    Copy-Item -LiteralPath $lockPath -Destination (Join-Path $backupDir 'package-lock.json')

    # package-lock.json v2/v3 commonly contains packages[''] for the root package.
    # ConvertFrom-Json requires -AsHashtable for JSON objects with an empty property name.
    $lockBefore = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json -AsHashtable
    $sqlitePackageBefore = $lockBefore['packages']['node_modules/better-sqlite3']
    if ($null -ne $sqlitePackageBefore) {
        $originalSqliteVersion = [string]$sqlitePackageBefore['version']
    }

    if (-not (Test-BetterSqlite3 -NodePath $nodePath)) {
        throw 'The existing source better-sqlite3 binding failed its baseline smoke test. No upgrades were attempted.'
    }

    if (Test-Path -LiteralPath $sqliteBindingSource -PathType Leaf) {
        Copy-Item -LiteralPath $sqliteBindingSource -Destination $sqliteBindingBackup -Force
        $haveSqliteBindingBackup = $true
    }
    else {
        Write-Warning "Native binding file not found at the standard path: $sqliteBindingSource. The baseline require test passed, but no file-level recovery copy was made."
    }

    Set-Location $SourcePath

    if (-not $SkipNcu) {
        Write-Phase "Upgrade package.json version ranges with npm-check-updates ($Target)"
        # Mark before invocation: ncu could update package.json and then fail.
        $startedNcu = $true
        Invoke-Native -FilePath $npxPath -Arguments @('--yes', 'npm-check-updates@latest', '-u', '--target', $Target, '--reject', 'better-sqlite3') -FailureMessage 'npm-check-updates failed'
    }
    else {
        Write-Host 'Skipping npm-check-updates; using the current package.json version ranges.'
    }

    Write-Phase 'Install exact dependency graph from the updated manifest'
    Write-Host 'Running: npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund'
    Invoke-Native -FilePath $npmPath -Arguments @('install', '--legacy-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund') -FailureMessage 'npm install failed'

    Write-Phase 'Verify SQLite native binding'
    if (-not (Test-BetterSqlite3 -NodePath $nodePath)) {
        $lockAfter = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json -AsHashtable
        $newSqliteVersion = $null
        $sqlitePackageAfter = $lockAfter['packages']['node_modules/better-sqlite3']
        if ($null -ne $sqlitePackageAfter) {
            $newSqliteVersion = [string]$sqlitePackageAfter['version']
        }

        if ($haveSqliteBindingBackup -and $originalSqliteVersion -and $newSqliteVersion -eq $originalSqliteVersion) {
            Write-Warning 'SQLite binding smoke test failed. The locked better-sqlite3 version is unchanged; restoring the pre-upgrade native binding and retrying.'
            $sqliteBindingDir = Split-Path -Parent $sqliteBindingSource
            New-Item -ItemType Directory -Path $sqliteBindingDir -Force | Out-Null
            Copy-Item -LiteralPath $sqliteBindingBackup -Destination $sqliteBindingSource -Force
            if (-not (Test-BetterSqlite3 -NodePath $nodePath)) {
                throw 'better-sqlite3 still fails after restoring the original native binding.'
            }
        }
        else {
            throw "better-sqlite3 failed after install and the old binding could not safely be restored. Original version: $originalSqliteVersion; new version: $newSqliteVersion."
        }
    }

    if (-not $SkipBuild) {
        Write-Phase 'Production build validation'
        Invoke-Native -FilePath $npmPath -Arguments @('run', 'build') -FailureMessage 'npm run build failed'
    }
    else {
        Write-Host 'Production build skipped by -SkipBuild.' -ForegroundColor Yellow
    }

    Write-Phase 'Upgrade completed'
    Write-Host "PASS: package.json and package-lock.json updated in $SourcePath" -ForegroundColor Green
    Write-Host "Backup directory: $backupDir"
    Write-Host "Log: $logPath"
    Write-Host 'No npm install lifecycle scripts were run. The production build and better-sqlite3 smoke test were used as validation.'
}
catch {
    Write-Host ''
    Write-Host "UPGRADE FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Backup files are retained at: $backupDir" -ForegroundColor Yellow
    Write-Host 'No automatic manifest rollback was performed because package.json/package-lock rollback alone would not restore node_modules.' -ForegroundColor Yellow
    if ($startedNcu) {
        Write-Host 'The source package.json may now contain newer ranges. Compare it with the backup before retrying.' -ForegroundColor Yellow
    }
    exit 1
}
finally {
    Set-Location $originalLocation
    try { Stop-Transcript | Out-Null } catch {}
}
