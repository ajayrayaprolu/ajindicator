#=====================================================================
# Fix-MountTelegram.ps1
#
# Purpose:
#   1) Verifies the canonical Telegram route exists at:
#        <ProjectRoot>\server\telegram\telegramRoute.js
#
#   2) Patches <ProjectRoot>\server\index.js with:
#        import telegramRoute from "./telegram/telegramRoute.js";
#        app.use("/api/telegram", telegramRoute);
#
#   3) Syntax-checks the patched text with node --check BEFORE writing.
#
#   4) Keeps a .bak-telegram backup of index.js.
#
# Current architecture:
#
#   src\services\TelegramNotifier.ts
#             |
#             | POST /api/telegram/signal
#             v
#   server\index.js
#             |
#             | import telegramRoute from "./telegram/telegramRoute.js";
#             | app.use("/api/telegram", telegramRoute);
#             v
#   server\telegram\telegramRoute.js
#
# ESM servers only.
#=====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional"
)

$ErrorActionPreference = "Stop"

$serverDir = Join-Path $ProjectRoot "server"
$index     = Join-Path $serverDir "index.js"
$telegramDir = Join-Path $serverDir "telegram"
$route     = Join-Path $telegramDir "telegramRoute.js"

if (-not (Test-Path $index)) {
    throw "Not found: $index (use -ProjectRoot)"
}

#---------------------------------------------------------------------
# 1) Verify canonical Telegram route
#---------------------------------------------------------------------

Write-Host "`n--- server\telegram\telegramRoute.js ---"

if (-not (Test-Path $telegramDir)) {
    throw "Telegram directory not found: $telegramDir"
}

if (-not (Test-Path $route)) {
    throw "Telegram route not found: $route"
}

Write-Host "OK    [route file exists at server\telegram\telegramRoute.js]" -ForegroundColor Green

#---------------------------------------------------------------------
# 2) Read server\index.js
#---------------------------------------------------------------------

Write-Host "`n--- server\index.js ---"

$bytes = [IO.File]::ReadAllBytes($index)

$bom = (
    $bytes.Length -ge 3 -and
    $bytes[0] -eq 0xEF -and
    $bytes[1] -eq 0xBB -and
    $bytes[2] -eq 0xBF
)

$enc = New-Object System.Text.UTF8Encoding($bom)

$text = $enc.GetString($bytes)

if ($bom -and $text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) {
    $text = $text.Substring(1)
}

$nl = if ($text.Contains("`r`n")) {
    "`r`n"
}
else {
    "`n"
}

#---------------------------------------------------------------------
# 3) Normalize Telegram import
#
# Correct:
#   import telegramRoute from "./telegram/telegramRoute.js";
#
# Old / incorrect:
#   import telegramRoute from "./telegramRoute.js";
#---------------------------------------------------------------------

$correctImport = 'import telegramRoute from "./telegram/telegramRoute.js";'

$telegramImportPattern =
    '^\s*import\s+telegramRoute\s+from\s+["''][^"'']*telegramRoute\.js["''];?\s*$'

$lines = New-Object 'System.Collections.Generic.List[string]'
$lines.AddRange([string[]]($text -split "`r?`n"))

$importLine = -1
$mountLine = -1
$lastImport = -1
$appCreated = -1
$firstMount = -1

$importPattern =
    '^\s*import\s+(?:[^;]*?\sfrom\s+)?[''"][^''"]+[''"];?\s*$'

for ($i = 0; $i -lt $lines.Count; $i++) {

    $l = $lines[$i]

    if ($l -match $importPattern) {
        $lastImport = $i
    }

    if ($l -match $telegramImportPattern) {
        $importLine = $i
    }

    if ($appCreated -lt 0 -and
        $l -match '\bapp\s*=\s*express\s*\(') {
        $appCreated = $i
    }

    if ($mountLine -lt 0 -and
        $l -match '^\s*app\.use\s*\(\s*["'']/api/telegram["'']\s*,\s*telegramRoute\s*\)\s*;?\s*$') {
        $mountLine = $i
    }

    if ($firstMount -lt 0 -and
        $l -match '^\s*app\.(use|get|post|all)\s*\(') {
        $firstMount = $i
    }
}

#---------------------------------------------------------------------
# 4) Fix / add Telegram import
#---------------------------------------------------------------------

if ($importLine -ge 0) {

    if ($lines[$importLine].Trim() -ne $correctImport) {

        Write-Host "FIX   [incorrect telegramRoute import found]" -ForegroundColor Yellow

        $indent = ([regex]::Match($lines[$importLine], '^\s*')).Value

        $lines[$importLine] = $indent + $correctImport
    }
    else {
        Write-Host "OK    [correct telegramRoute import already present]" -ForegroundColor Green
    }

}
else {

    if ($lastImport -lt 0) {
        Write-Warning "No single-line ESM import statements found. index.js NOT changed."
        Write-Warning "Send me server\index.js if this is unexpected."
        return
    }

    Write-Host "ADD   [correct telegramRoute import]" -ForegroundColor Yellow

    $lines.Insert(
        $lastImport + 1,
        $correctImport
    )

    # Account for inserted import.
    if ($firstMount -ge $lastImport + 1) {
        $firstMount++
    }
}

#---------------------------------------------------------------------
# 5) Ensure app.use("/api/telegram", telegramRoute)
#---------------------------------------------------------------------

# Re-scan after possible import insertion.

$mountLine = -1
$appCreated = -1
$firstMount = -1

for ($i = 0; $i -lt $lines.Count; $i++) {

    $l = $lines[$i]

    if ($appCreated -lt 0 -and
        $l -match '\bapp\s*=\s*express\s*\(') {
        $appCreated = $i
    }

    if ($mountLine -lt 0 -and
        $l -match '^\s*app\.use\s*\(\s*["'']/api/telegram["'']\s*,\s*telegramRoute\s*\)\s*;?\s*$') {
        $mountLine = $i
    }

    if ($firstMount -lt 0 -and
        $l -match '^\s*app\.(use|get|post|all)\s*\(') {
        $firstMount = $i
    }
}

if ($mountLine -ge 0) {

    Write-Host "OK    [app.use(""/api/telegram"", telegramRoute) already present]" -ForegroundColor Green

}
else {

    if ($appCreated -lt 0) {
        Write-Warning "Could not find 'const app = express()'. index.js NOT changed."
        Write-Warning "Send me server\index.js."
        return
    }

    if ($firstMount -lt 0 -or $firstMount -lt $appCreated) {
        Write-Warning "Could not find a safe location for app.use(...). index.js NOT changed."
        Write-Warning "Send me server\index.js."
        return
    }

    $indent = ([regex]::Match($lines[$firstMount], '^\s*')).Value

    Write-Host "ADD   [app.use(""/api/telegram"", telegramRoute)]" -ForegroundColor Yellow

    $lines.Insert(
        $firstMount,
        $indent + 'app.use("/api/telegram", telegramRoute);'
    )
}

#---------------------------------------------------------------------
# 6) Build patched text
#---------------------------------------------------------------------

$patched = ($lines -join $nl)

#---------------------------------------------------------------------
# 7) Syntax check BEFORE writing
#---------------------------------------------------------------------

$checked = $false

if (Get-Command node -ErrorAction SilentlyContinue) {

    $tmp = Join-Path `
        ([IO.Path]::GetTempPath()) `
        ("aj-mount-check-" + [guid]::NewGuid().ToString("N") + ".mjs")

    try {

        [IO.File]::WriteAllText(
            $tmp,
            $patched,
            $enc
        )

        & node --check $tmp 2>&1 | Out-Null

        $checkExit = $LASTEXITCODE

    }
    finally {

        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }

    if ($checkExit -ne 0) {

        Write-Warning "The patched index.js failed 'node --check'."
        Write-Warning "index.js was NOT changed."

        return
    }

    $checked = $true

    Write-Host "OK    [syntax check passed]" -ForegroundColor Green
}
else {

    Write-Host "NOTE  node was not found on PATH - syntax check skipped" `
        -ForegroundColor Yellow
}

#---------------------------------------------------------------------
# 8) Backup index.js before writing
#---------------------------------------------------------------------

$backup = "$index.bak-telegram"

if (-not (Test-Path $backup)) {

    Copy-Item `
        $index `
        $backup

    Write-Host "OK    [backup created: index.js.bak-telegram]" `
        -ForegroundColor Green
}

#---------------------------------------------------------------------
# 9) Write patched index.js
#---------------------------------------------------------------------

[IO.File]::WriteAllText(
    $index,
    $patched,
    $enc
)

Write-Host "OK    [server\index.js updated]" -ForegroundColor Green

#---------------------------------------------------------------------
# 10) Final validation
#---------------------------------------------------------------------

$indexText = [IO.File]::ReadAllText($index)

if ($indexText -match 'import telegramRoute from "./telegram/telegramRoute\.js";') {

    Write-Host "OK    [correct Telegram import verified]" `
        -ForegroundColor Green
}
else {

    throw "Final validation failed: Telegram import not found."
}

if ($indexText -match 'app\.use\("/api/telegram", telegramRoute\);') {

    Write-Host "OK    [Telegram route mount verified]" `
        -ForegroundColor Green
}
else {

    throw "Final validation failed: Telegram route mount not found."
}

if ($indexText -match 'import telegramRoute from "./telegramRoute\.js";') {

    Write-Warning "WARNING: old Telegram import still exists."
}

if (Test-Path (Join-Path $serverDir "telegramRoute.js")) {

    Write-Warning "WARNING: old server\telegramRoute.js still exists."
    Write-Warning "It should be removed after confirming the new structure works."
}

#---------------------------------------------------------------------
# 11) Environment hint
#---------------------------------------------------------------------

if ($indexText -notmatch 'dotenv|--env-file|loadEnvFile') {

    Write-Host "`nNOTE  index.js does not mention dotenv." `
        -ForegroundColor Yellow

    Write-Host "      If /api/telegram answers 503 'not configured', start with:" `
        -ForegroundColor Yellow

    Write-Host "      node --env-file=.env server\index.js" `
        -ForegroundColor Yellow

    Write-Host "      or add: import 'dotenv/config';" `
        -ForegroundColor Yellow
}

Write-Host "`nTelegram route architecture is now:" -ForegroundColor Cyan
Write-Host "  src\services\TelegramNotifier.ts"
Write-Host "          -> POST /api/telegram/signal"
Write-Host "  server\index.js"
Write-Host "          -> server\telegram\telegramRoute.js"

Write-Host "`nNext: restart the server, then run:" -ForegroundColor Cyan
Write-Host "  pwsh -File scripts\Test-TelegramLive.ps1"