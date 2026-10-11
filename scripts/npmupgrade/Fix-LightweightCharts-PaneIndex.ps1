[CmdletBinding()]
param(
    [string]$SourceRoot = 'C:\AI-Institutional',
    [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) { Write-Host $Message -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Write-Fail([string]$Message) { Write-Host "ERROR: $Message" -ForegroundColor Red }

try {
    $root = [System.IO.Path]::GetFullPath($SourceRoot)
    $packageJson = Join-Path $root 'package.json'
    $chartFile = Join-Path $root 'src\charts\ChartEngine.tsx'

    if (-not (Test-Path -LiteralPath $packageJson -PathType Leaf)) {
        throw "package.json not found under source root: $root"
    }
    if (-not (Test-Path -LiteralPath $chartFile -PathType Leaf)) {
        throw "ChartEngine.tsx not found: $chartFile"
    }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue) -and -not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'npm was not found on PATH. Open PowerShell 7 in the Node.js environment and retry.'
    }

    Write-Info 'AJ Institutional Lightweight Charts API compatibility fix'
    Write-Host "Source: $root"

    if (-not $BuildOnly) {
        $content = [System.IO.File]::ReadAllText($chartFile)
        $oldExpression = 'rsiSeries.current.paneIndex()'
        $newExpression = 'rsiSeries.current.getPane().paneIndex()'

        $oldCount = ([regex]::Matches($content, [regex]::Escape($oldExpression))).Count
        $newCount = ([regex]::Matches($content, [regex]::Escape($newExpression))).Count

        if ($oldCount -eq 0 -and $newCount -gt 0) {
            Write-Ok 'The invalid series.paneIndex() call is already corrected.'
        }
        elseif ($oldCount -eq 1) {
            $backupRoot = Join-Path $env:USERPROFILE 'AJInstitutional-Source-Fix-Backups'
            $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
            $backupDir = Join-Path $backupRoot $stamp
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            $backupFile = Join-Path $backupDir 'ChartEngine.tsx.before-pane-index-fix.bak'
            [System.IO.File]::Copy($chartFile, $backupFile, $false)

            $updated = $content.Replace($oldExpression, $newExpression)
            $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
            [System.IO.File]::WriteAllText($chartFile, $updated, $utf8NoBom)
            Write-Ok "Updated series pane lookup in src\charts\ChartEngine.tsx. Backup: $backupFile"
            Write-Host 'Correction: ISeriesApi.getPane() returns a pane API; paneIndex() belongs to that pane API.'
        }
        elseif ($oldCount -gt 1) {
            throw "Found $oldCount occurrences of '$oldExpression'. No changes made because each call needs context-specific review."
        }
        else {
            throw "Expected code pattern was not found. No changes made. Search '$chartFile' for paneIndex and inspect the current source before patching."
        }
    }
    else {
        Write-Host 'Build-only mode: source file will not be changed.'
    }

    Write-Info "`n=== Production build validation ==="
    Push-Location $root
    try {
        & npm run build
        $buildExit = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($buildExit -ne 0) {
        Write-Fail "npm run build failed (exit $buildExit). The source patch is retained; inspect any additional compiler errors above."
        exit $buildExit
    }

    Write-Ok 'npm run build completed successfully.'
    Write-Host 'package.json and package-lock.json were not modified by this fix.'
    exit 0
}
catch {
    Write-Fail $_.Exception.Message
    exit 1
}
