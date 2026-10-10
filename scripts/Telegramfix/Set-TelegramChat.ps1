#=====================================================================
# Set-TelegramChat.ps1
#
# One command that:
#   1) sets TELEGRAM_CHAT_ID in C:\AI-Institutional\.env  (nothing else in .env is touched,
#      and no secret is printed)
#   2) "touches" server\index.js so nodemon restarts the server with the new .env
#   3) waits 10 seconds and runs Test-TelegramLive.ps1 -Send
#
# Use it like this (copy exactly):
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Set-TelegramChat.ps1 -ChatId 7657754602
#
# Add -NoTest to skip step 3.
#=====================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ChatId,
    [string]$ProjectRoot = "C:\AI-Institutional",
    [switch]$NoTest
)

$ErrorActionPreference = "Stop"

if ($ChatId -notmatch '^-?\d+$' -and $ChatId -notmatch '^@\w+$') {
    throw "ChatId must be a number like 7657754602 (or -1001234567890 for a channel, or @channelname). You gave: $ChatId"
}

$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) { throw "Not found: $envFile" }

# --- read .env keeping its encoding and line endings -------------------
$bytes = [IO.File]::ReadAllBytes($envFile)
$bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$enc = New-Object System.Text.UTF8Encoding($bom)
$text = $enc.GetString($bytes)
if ($bom -and $text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
$nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

$pattern = '(?m)^[ \t]*TELEGRAM_CHAT_ID[ \t]*=[^\r\n]*'
$found = [regex]::Matches($text, $pattern)

Write-Host ""
if ($found.Count -gt 0) {
    Write-Host "Before: $($found[0].Value.Trim())"
}
else {
    Write-Host "Before: (TELEGRAM_CHAT_ID was not in .env)"
}

$backup = "$envFile.bak-chatid"
if (-not (Test-Path $backup)) { Copy-Item $envFile $backup }

$newLine = "TELEGRAM_CHAT_ID=$ChatId"

if ($found.Count -eq 1) {
    $text = [regex]::Replace($text, $pattern, $newLine)
}
elseif ($found.Count -eq 0) {
    if (-not $text.EndsWith("`n")) { $text += $nl }
    $text += $newLine + $nl
}
else {
    throw "TELEGRAM_CHAT_ID appears $($found.Count) times in .env - remove the duplicates first."
}

[IO.File]::WriteAllText($envFile, $text, $enc)

Write-Host "After:  $newLine" -ForegroundColor Green

if (-not (Select-String -Path $envFile -Pattern '^[ \t]*TELEGRAM_BOT_TOKEN[ \t]*=\s*\S' -Quiet)) {
    Write-Warning "TELEGRAM_BOT_TOKEN has no value in .env - the server cannot send anything without it."
}

# --- make nodemon restart the server -----------------------------------
$index = Join-Path $ProjectRoot "server\index.js"
if (Test-Path $index) {
    (Get-Item $index).LastWriteTime = Get-Date
    Write-Host "Touched server\index.js so nodemon restarts the server."
}

if ($NoTest) { return }

Write-Host "Waiting 10 seconds for the server to restart..."
Start-Sleep -Seconds 10

& (Join-Path $PSScriptRoot "Test-TelegramLive.ps1") -Send

Write-Host ""
Write-Host "If the test still says 'chat not found' or the old value, the server did not restart:" -ForegroundColor Yellow
Write-Host "  find the window where your server prints its logs, press Ctrl+C, and start it again the same way." -ForegroundColor Yellow
