#=====================================================================
# Test-TelegramLive.ps1
#
#   pwsh -File scripts\Test-TelegramLive.ps1                  # safe checks only, sends NOTHING
#   pwsh -File scripts\Test-TelegramLive.ps1 -Send            # also sends 3 sample messages
#   pwsh -File scripts\Test-TelegramLive.ps1 -Send -BaseUrl http://localhost:3001
#   pwsh -File scripts\Test-TelegramLive.ps1 -Send -Strike 22600   # fresh sample (see note below)
#
# NOTE: the server blocks repeats, so the SAME sample ENTRY is only delivered once per
# 15 minutes and the same sample TARGET once per 6 hours. Running -Send again sooner
# shows only the "connected" message. Use a different -Strike to get a fresh set.
#
# Safe checks (no Telegram message):
#   - is /api/telegram/signal mounted?          (404 = not mounted / not restarted)
#   - is the server .env loaded?                (503 = token/chat id missing)
#   - does it reject garbage?                   (400 expected)
#
# -Send posts, in order: TEST, ENTRY, TARGET 1, and then ENTRY again to prove
# the server swallows duplicates. The ENTRY/TARGET samples look like a real
# trade (NIFTY 22550 PE) - only use -Send on a channel you control.
#=====================================================================

[CmdletBinding()]
param(
    [string]$BaseUrl = "https://ajtrade.in",
    [int]$Strike = 22550,
    [switch]$Send
)

$ErrorActionPreference = "Stop"
$url = "$BaseUrl/api/telegram/signal"

function Post-Json([hashtable]$Body) {
    $r = Invoke-WebRequest -Uri $url -Method Post -ContentType "application/json" `
        -Body ($Body | ConvertTo-Json -Compress) -SkipHttpErrorCheck
    $parsed = $null
    try { $parsed = $r.Content | ConvertFrom-Json } catch { }
    return [pscustomobject]@{ Status = [int]$r.StatusCode; Json = $parsed; Raw = $r.Content }
}

function Show([string]$Name, [bool]$Pass, [string]$Detail) {
    $tag = if ($Pass) { "PASS" } else { "FAIL" }
    $color = if ($Pass) { "Green" } else { "Red" }
    Write-Host ("{0}  {1}  -> {2}" -f $tag, $Name, $Detail) -ForegroundColor $color
}

Write-Host "Endpoint: $url`n"

# 1) garbage payload: proves route + env without sending anything
$bad = Post-Json @{ type = "BAD" }

switch ($bad.Status) {
    400 { Show "route mounted and server env loaded" $true "HTTP 400 Invalid payload (expected)" }
    404 { Show "route mounted" $false "HTTP 404 - Fix-MountTelegram.ps1 not run, or the server was not restarted" }
    503 { Show "server env loaded" $false "HTTP 503 - TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not visible to the server process (.env not loaded?)" }
    default { Show "route reachable" $false "HTTP $($bad.Status): $($bad.Raw)" }
}

if ($bad.Status -ne 400) { Write-Host "`nFix the above first."; return }

if (-not $Send) {
    Write-Host "`nSafe checks passed. Re-run with -Send to deliver the sample messages."
    return
}

Write-Host "`n--- sending samples to your Telegram chat ---"

# 2) TEST
$t = Post-Json @{ type = "TEST" }
Show "TEST message" ($t.Status -eq 200 -and $t.Json.ok) "HTTP $($t.Status) $($t.Raw)"

# 3) ENTRY
$entry = @{
    type = "ENTRY"; underlying = "NIFTY"; expiry = "06OCT"; strike = $Strike; optionType = "PE"
    entry = 95.35; stopLoss = 71.53; target = 131.07
}
$e1 = Post-Json $entry
if ($e1.Json.deduped) {
    Write-Host "SKIP  ENTRY message  -> the server already sent this sample recently (it blocks repeats for 15 min). Add -Strike 22600 for a fresh one." -ForegroundColor Yellow
}
else {
    Show "ENTRY message" ($e1.Status -eq 200 -and $e1.Json.ok) "HTTP $($e1.Status) $($e1.Raw)"
}

# 4) TARGET 1
$tg = Post-Json @{
    type = "TARGET"; underlying = "NIFTY"; expiry = "06OCT"; strike = $Strike; optionType = "PE"
    target = 131.07; targetIndex = 1
}
if ($tg.Json.deduped) {
    Write-Host "SKIP  TARGET message -> the server already sent this sample recently (it blocks repeats for 6 hours). Add -Strike 22600 for a fresh one." -ForegroundColor Yellow
}
else {
    Show "TARGET message" ($tg.Status -eq 200 -and $tg.Json.ok) "HTTP $($tg.Status) $($tg.Raw)"
}

# 5) duplicate ENTRY must be swallowed by the server
$e2 = Post-Json $entry
Show "duplicate ENTRY is swallowed (no 2nd Telegram message)" ($e2.Status -eq 200 -and $e2.Json.deduped -eq $true) "HTTP $($e2.Status) $($e2.Raw)"

Write-Host "`nCheck Telegram: a fresh run delivers 3 messages (connected, entry, target)."
Write-Host "If you only got 'connected', the entry/target samples were skipped as repeats - run again with -Strike 22600."
Write-Host "If the server was already running an older telegramRoute.js, 'deduped' will be missing - restart it after Fix-MountTelegram.ps1."
