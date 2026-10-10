#=====================================================================
# Get-TelegramChatId.ps1
#
# Finds the id of your Telegram CHANNEL (or group) so alerts can be posted
# there instead of your private chat with the bot.
#
# Before running:
#   1) the bot must be an ADMINISTRATOR of the channel with "Post Messages"
#   2) post ANY message in the channel yourself (so Telegram has something to report)
#
# Run (copy exactly):
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Get-TelegramChatId.ps1
#
# It reads TELEGRAM_BOT_TOKEN from C:\AI-Institutional\.env and never prints it.
# Output example:
#   -1002345678901   channel   My Trade Alerts   (@MyTradeAlerts)
#   7657754602       private   You
#
# Then use the id of the "channel" line:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Set-TelegramChat.ps1 -ChatId -1002345678901
#
# (A PUBLIC channel can also use its @username directly: -ChatId @MyTradeAlerts)
#=====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional",
    [string]$ApiBase = "https://api.telegram.org"
)

$ErrorActionPreference = "Stop"

$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) { throw "Not found: $envFile" }

$token = $null
foreach ($line in [IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^\s*TELEGRAM_BOT_TOKEN\s*=\s*([^\s#]+)') {
        $token = $Matches[1].Trim('"', "'")
        break
    }
}

if (-not $token) { throw "TELEGRAM_BOT_TOKEN is not set in $envFile" }

try {
    $result = Invoke-RestMethod -Uri "$ApiBase/bot$token/getUpdates?limit=100&allowed_updates=%5B%22message%22%2C%22channel_post%22%2C%22my_chat_member%22%5D"
}
catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) { throw "Telegram says the bot token is not valid (HTTP 401). Check TELEGRAM_BOT_TOKEN in .env." }
    if ($status -eq 409) { throw "Telegram says a webhook is set for this bot (HTTP 409), so getUpdates is blocked." }
    throw "Could not reach Telegram (HTTP $status)."
}

if (-not $result.ok) { throw "Telegram returned an error: $($result.description)" }

$chats = @{}

foreach ($update in $result.result) {
    $chat = $null
    if ($update.channel_post)       { $chat = $update.channel_post.chat }
    elseif ($update.message)        { $chat = $update.message.chat }
    elseif ($update.my_chat_member) { $chat = $update.my_chat_member.chat }

    if ($chat -and -not $chats.ContainsKey([string]$chat.id)) {
        $chats[[string]$chat.id] = $chat
    }
}

if ($chats.Count -eq 0) {
    Write-Host ""
    Write-Host "Telegram has nothing to report yet." -ForegroundColor Yellow
    Write-Host "1) Make sure the bot is an administrator of the channel (Post Messages ON)."
    Write-Host "2) Post any message IN THE CHANNEL, then run this script again."
    return
}

Write-Host ""
Write-Host "Chats this bot can see:" -ForegroundColor Cyan
Write-Host ""

foreach ($chat in $chats.Values | Sort-Object { $_.type }) {
    $name = if ($chat.title) { $chat.title } elseif ($chat.first_name) { $chat.first_name } else { "" }
    $user = if ($chat.username) { "(@$($chat.username))" } else { "" }
    Write-Host ("{0,-18} {1,-11} {2} {3}" -f $chat.id, $chat.type, $name, $user)
}

Write-Host ""
Write-Host "Use the id on the 'channel' line (it starts with -100)." -ForegroundColor Green
Write-Host "Then run:  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Set-TelegramChat.ps1 -ChatId <that id>"
