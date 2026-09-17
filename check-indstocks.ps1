# check-indstocks.ps1  — IndStocks edge/auth diagnostic
#
# Default run is READ-ONLY: env check, TOTP encode check, clock skew,
# DNS/IP, edge reachability, and session file status. No login attempt.
#
# Add -AttemptLogin to also run node .\indstocks-login.mjs as the final
# step. Only do this if everything above looks clean AND you have not
# attempted a login in the last few minutes — each attempt counts
# against IndStocks' own lockout counter, independent of anything this
# script does.
#
# Usage:
#   .\check-indstocks.ps1                  # diagnostics only, safe to run anytime
#   .\check-indstocks.ps1 -AttemptLogin    # diagnostics + one real login attempt

param(
    [switch]$AttemptLogin
)

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "IndStocks Diagnostic"

function Line { Write-Host ("-" * 60) -ForegroundColor DarkGray }
function Head($t) { Line; Write-Host $t -ForegroundColor Cyan; Line }

$BASE = "https://api.indstocks.com"
$UA_BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

Head "1. ENVIRONMENT"
$envFile = ".\.env"
if (Test-Path $envFile) {
    $cfg = @{}
    Get-Content $envFile | Where-Object { $_ -match "^\s*INDSTOCKS_" } | ForEach-Object {
        $k,$v = $_ -split "=",2
        $cfg[$k.Trim()] = $v.Trim()
    }
    foreach ($k in $cfg.Keys) {
        $val = $cfg[$k]
        $masked = if ($val.Length -gt 3) { $val.Substring(0,2) + ("*" * ($val.Length-2)) } else { "***" }
        Write-Host ("  {0,-28} = {1}  (len {2})" -f $k, $masked, $val.Length)
    }
} else { Write-Host "  .env NOT FOUND" -ForegroundColor Red }

Head "2. TOTP ENCODE CHECK (local only - no network call)"
# Confirms .env's secret decodes and produces a well-formed 6-digit code.
# This does NOT confirm the secret is still valid on IndStocks' server -
# only that the local value isn't corrupted/truncated. A wrong-but-
# well-formed secret will still pass this check and fail at login.
try {
    $totpScript = @'
require("dotenv").config();
const speakeasy = require("speakeasy");
const secret = process.env.INDSTOCKS_TOTP_SECRET;
if (!secret) {
    console.log("  NO SECRET SET in .env");
    process.exit(1);
}
const code = speakeasy.totp({ secret, encoding: "base32" });
const wellFormed = /^\d{6}$/.test(code);
console.log("  Secret length :", secret.length);
console.log("  Generated code:", code);
console.log("  Well-formed   :", wellFormed ? "yes" : "NO - check secret/encoding");
'@
    $totpScript | Out-File -Encoding ascii ".\_indstocks_totp_check.js"
    node .\_indstocks_totp_check.js
    Remove-Item ".\_indstocks_totp_check.js" -ErrorAction SilentlyContinue
} catch {
    Write-Host "  Could not run TOTP check: $_" -ForegroundColor Yellow
}

Head "3. CLOCK SKEW (TOTP depends on this)"
try {
    $hdrDate = (Invoke-WebRequest -Uri "https://www.google.com" -Method Head -UseBasicParsing -TimeoutSec 10).Headers["Date"]
    $net = [datetime]::Parse($hdrDate).ToUniversalTime()
    $local = (Get-Date).ToUniversalTime()
    $skew = [math]::Round(($local - $net).TotalSeconds,1)
    Write-Host ("  Local UTC : {0}" -f $local)
    Write-Host ("  Net   UTC : {0}" -f $net)
    if ([math]::Abs($skew) -gt 30) {
        Write-Host ("  SKEW {0}s  -> TOTP WILL FAIL. Run: w32tm /resync" -f $skew) -ForegroundColor Red
    } else {
        Write-Host ("  SKEW {0}s  -> OK" -f $skew) -ForegroundColor Green
    }
} catch { Write-Host "  Could not check clock: $_" -ForegroundColor Yellow }

Head "4. DNS + PUBLIC IP"
try {
    Resolve-DnsName api.indstocks.com -Type A -ErrorAction Stop |
        Where-Object { $_.IPAddress } |
        ForEach-Object { Write-Host ("  api.indstocks.com -> {0}" -f $_.IPAddress) }
} catch { Write-Host "  DNS FAILED: $_" -ForegroundColor Red }
try {
    $myip = (Invoke-RestMethod "https://api.ipify.org?format=json" -TimeoutSec 10).ip
    Write-Host ("  Your public IP    -> {0}" -f $myip)
    Write-Host ("  (If IndStocks' Static IP allowlist is enabled, confirm this matches what's saved there.)")
} catch { Write-Host "  Could not fetch public IP" -ForegroundColor Yellow }

Head "5. EDGE PROBE - root endpoint only (safe - not the login route)"
$r1 = curl.exe -s -o NUL -D - -w "`nHTTP_CODE:%{http_code}`n" --max-time 20 "$BASE/" 2>&1 | Out-String
Write-Host $r1
$code1 = if ($r1 -match "HTTP_CODE:(\d+)") { $matches[1] } else { "ERR" }

$body = curl.exe -s --max-time 20 -H "User-Agent: $UA_BROWSER" "$BASE/" 2>&1 | Out-String
$isChallenge = ($body -match "Just a moment" -or $body -match "_cf_chl_opt" -or $body -match "cf-browser-verification")

Head "6. SESSION FILE STATUS (no network call)"
$sessionPath = ".\server\indstocks\data\session.json"
if (Test-Path $sessionPath) {
    try {
        $session = Get-Content $sessionPath -Raw | ConvertFrom-Json
        $expiresAt = [datetime]$session.expiresAt
        $remaining = $expiresAt - (Get-Date).ToUniversalTime()
        Write-Host ("  Session file exists. Expires: {0}" -f $session.expiresAt)
        if ($remaining.TotalMinutes -gt 5) {
            Write-Host ("  {0:N0} minutes remaining -> cached session is valid, no login needed." -f $remaining.TotalMinutes) -ForegroundColor Green
        } else {
            Write-Host "  Expiring soon or already expired -> next server start (or -AttemptLogin) will refresh it." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Session file exists but could not be parsed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  No session.json yet -> a login has not succeeded, or refreshToken() cleared it." -ForegroundColor Yellow
}

Head "VERDICT"
Write-Host ("  root endpoint HTTP : {0}" -f $code1)
if ($isChallenge) {
    Write-Host "  >> Cloudflare managed challenge is active on api.indstocks.com." -ForegroundColor Red
    Write-Host "     Do NOT attempt login right now - wait and re-run diagnostics only." -ForegroundColor Red
} elseif ($code1 -match "^(200|400|401|403|404)$") {
    Write-Host "  >> Edge is reachable. Any login failure will be an auth-layer issue, not Cloudflare." -ForegroundColor Green
} else {
    Write-Host "  >> Inconclusive. Paste the full output above." -ForegroundColor Yellow
}

if (-not $AttemptLogin) {
    Line
    Write-Host "Diagnostics only - no login attempted." -ForegroundColor Cyan
    Write-Host "If everything above looks clean and you genuinely need a fresh token," -ForegroundColor Cyan
    Write-Host "re-run with -AttemptLogin. Do this AT MOST ONCE per lockout window -" -ForegroundColor Cyan
    Write-Host "repeated attempts extend IndStocks' own 15-minute lock." -ForegroundColor Cyan
    Line
    exit 0
}

Head "7. LOGIN ATTEMPT (-AttemptLogin was passed - this hits the live API)"
Write-Host "  Waiting 60s first, in case a prior attempt is still cooling down..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

$stillRunning = Get-Process node -ErrorAction SilentlyContinue
if ($stillRunning) {
    Write-Host "  A node process is already running - stop the server before a manual login attempt." -ForegroundColor Red
    Write-Host "  Run: Get-Process node | Stop-Process -Force" -ForegroundColor Red
    exit 1
}

$loginScriptPath = ".\_indstocks_login_temp.mjs"

$loginScript = @'
import "dotenv/config";
import { refreshToken, getTokenStatus } from "./server/indstocks/token.js";

try {
    await refreshToken();
    console.log("\nSUCCESS\n", getTokenStatus());
} catch (e) {
    console.error("\nFAILED:", e.indstocksReason ?? "UNKNOWN", "-", e.message);
    console.error(getTokenStatus());
    process.exit(1);
}
'@

$loginScript | Out-File -Encoding utf8 $loginScriptPath

try {
    node $loginScriptPath
} finally {
    # Always clean up, whether the login succeeded or failed.
    Remove-Item $loginScriptPath -ErrorAction SilentlyContinue
}

Line
Write-Host "If this failed with 'Too many failed attempts', STOP." -ForegroundColor Red
Write-Host "Do not re-run -AttemptLogin. Wait for the exact time it reported, then try once more." -ForegroundColor Red
Line


