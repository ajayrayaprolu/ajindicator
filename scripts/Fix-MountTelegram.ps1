#=====================================================================
# Fix-MountTelegram.ps1
#
#   1) copies telegramRoute.js (from the folder this script is in) to
#        <ProjectRoot>\server\telegramRoute.js        (backs up an older copy)
#   2) patches <ProjectRoot>\server\index.js with exactly two lines:
#        import telegramRoute from "./telegramRoute.js";     (after the last import)
#        app.use("/api/telegram", telegramRoute);            (before the first app.use/get/post)
#   3) syntax-checks the patched text (node --check) BEFORE writing it; if the
#      check fails, index.js is left untouched. A .bak-telegram backup is kept.
#
# ESM servers only (import ...). If index.js uses require(), nothing is
# changed - send me server\index.js instead.
#
# Safe to re-run. Restart the server afterwards.
#=====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional"
)

$ErrorActionPreference = "Stop"

$serverDir = Join-Path $ProjectRoot "server"
$index     = Join-Path $serverDir "index.js"
$routeDst  = Join-Path $serverDir "telegramRoute.js"
$routeSrc  = Join-Path $PSScriptRoot "telegramRoute.js"

if (-not (Test-Path $index)) { throw "Not found: $index (use -ProjectRoot)" }

#---------------------------------------------------------------------
# 1) route file
#---------------------------------------------------------------------

Write-Host "`n--- server\telegramRoute.js ---"

if (Test-Path $routeSrc) {
    $same = (Test-Path $routeDst) -and ((Get-FileHash $routeSrc).Hash -eq (Get-FileHash $routeDst).Hash)
    if ($same) {
        Write-Host "SKIP  [route file] (already up to date)" -ForegroundColor DarkYellow
    }
    else {
        if ((Test-Path $routeDst) -and -not (Test-Path "$routeDst.bak-mount")) { Copy-Item $routeDst "$routeDst.bak-mount" }
        Copy-Item $routeSrc $routeDst -Force
        Write-Host "OK    [route file copied to server\telegramRoute.js]" -ForegroundColor Green
    }
}
elseif (Test-Path $routeDst) {
    Write-Host "SKIP  [route file] (no telegramRoute.js next to this script; keeping the one in server\)" -ForegroundColor DarkYellow
}
else {
    throw "telegramRoute.js not found next to this script ($PSScriptRoot) and not in server\."
}

#---------------------------------------------------------------------
# 2) mount it in server\index.js
#---------------------------------------------------------------------

Write-Host "`n--- server\index.js ---"

$bytes = [IO.File]::ReadAllBytes($index)
$bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$enc = New-Object System.Text.UTF8Encoding($bom)
$text = $enc.GetString($bytes)
if ($bom -and $text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
$nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

if ($text.Contains("telegramRoute")) {
    Write-Host "SKIP  [mount] (index.js already references telegramRoute)" -ForegroundColor DarkYellow
}
else {
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([string[]]($text -split "`r?`n"))

    $importPattern = '^\s*import\s+(?:[^;]*?\sfrom\s+)?[''"][^''"]+[''"];?\s*$'

    $lastImport = -1
    $appCreated = -1
    $firstMount = -1

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $l = $lines[$i]
        if ($l -match $importPattern) { $lastImport = $i }
        if ($appCreated -lt 0 -and $l -match '\bapp\s*=\s*express\s*\(') { $appCreated = $i }
        if ($firstMount -lt 0 -and $l -match '^\s*app\.(use|get|post|all)\s*\(') { $firstMount = $i }
    }

    if ($lastImport -lt 0) {
        Write-Warning "No single-line 'import ... from ...' found - looks like a CommonJS (require) server. index.js NOT changed. Send me server\index.js."
        return
    }
    if ($appCreated -lt 0) {
        Write-Warning "Could not find 'const app = express()' - index.js NOT changed. Send me server\index.js."
        return
    }
    if ($firstMount -lt 0 -or $firstMount -lt $appCreated) {
        Write-Warning "Could not find a safe place for app.use(...) after the app is created - index.js NOT changed. Send me server\index.js."
        return
    }

    $indent = ([regex]::Match($lines[$firstMount], '^\s*')).Value

    # insert the later line first so the earlier index stays valid
    $lines.Insert($firstMount, $indent + 'app.use("/api/telegram", telegramRoute);')
    $lines.Insert($lastImport + 1, 'import telegramRoute from "./telegramRoute.js";')

    $patched = ($lines -join $nl)

    # Syntax-check the PATCHED text before touching index.js. It is checked as a
    # temporary .mjs file because "node --check" on a .js file silently passes
    # ESM syntax errors when package.json has no "type": "module".
    $checked = $false
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $tmp = Join-Path ([IO.Path]::GetTempPath()) ("aj-mount-check-" + [guid]::NewGuid().ToString("N") + ".mjs")
        [IO.File]::WriteAllText($tmp, $patched, $enc)
        & node --check $tmp 2>&1 | Out-Null
        $checkExit = $LASTEXITCODE
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue

        if ($checkExit -ne 0) {
            Write-Warning "The patched index.js failed 'node --check' - index.js was NOT changed. Send me server\index.js."
            return
        }
        $checked = $true
    }

    $backup = "$index.bak-telegram"
    if (-not (Test-Path $backup)) { Copy-Item $index $backup }

    [IO.File]::WriteAllText($index, $patched, $enc)

    Write-Host "OK    [import added after line $($lastImport + 1)]" -ForegroundColor Green
    Write-Host "OK    [app.use(""/api/telegram"", telegramRoute) added before line $($firstMount + 2)]" -ForegroundColor Green
    if ($checked) { Write-Host "OK    [syntax check passed]" -ForegroundColor Green }
    else { Write-Host "NOTE  node was not found on PATH - syntax check skipped" -ForegroundColor Yellow }
}

#---------------------------------------------------------------------
# hints
#---------------------------------------------------------------------

$indexText = [IO.File]::ReadAllText($index)
if ($indexText -notmatch 'dotenv|--env-file|loadEnvFile') {
    Write-Host "`nNOTE  index.js does not mention dotenv. If /api/telegram answers 503 'not configured', your .env isn't being loaded:" -ForegroundColor Yellow
    Write-Host "      start the server with  node --env-file=.env server\index.js   (or add: import 'dotenv/config';)" -ForegroundColor Yellow
}

Write-Host "`nNext: RESTART the server, then  pwsh -File scripts\Test-TelegramLive.ps1" -ForegroundColor Cyan
