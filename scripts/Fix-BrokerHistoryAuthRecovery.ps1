
$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$files = @(
    ".\server\fyers\history.js",
    ".\server\indstocks\history.js",
    ".\server\indstocks\token.js"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        throw "Required file not found: $file"
    }
}

$backupDir = Join-Path $root (
    "broker-auth-fix-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss")
)
New-Item -ItemType Directory -Path $backupDir | Out-Null

foreach ($file in $files) {
    $destination = Join-Path $backupDir (
        $file.Replace(".\", "").Replace("\", "__")
    )
    Copy-Item $file $destination
}

function Replace-Once {
    param(
        [string]$Content,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )

    $regex = [regex]::new(
        $Pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    $matches = $regex.Matches($Content)

    if ($matches.Count -ne 1) {
        throw "$Description`: expected exactly one match; found $($matches.Count). No further changes made."
    }

    return $regex.Replace($Content, $Replacement, 1)
}

# ------------------------------------------------------------
# 1. FYERS: stop attempting the disabled refresh endpoint from
#    a history request. Preserve normal history error handling.
# ------------------------------------------------------------

$fyersPath = ".\server\fyers\history.js"
$fyers = Get-Content $fyersPath -Raw

$fyers = Replace-Once $fyers `
    '(?m)^import \{\r?\n\s+refreshAccessToken\r?\n\} from "\./login\.js";\r?\n\r?\n' `
    '' `
    "FYERS refresh import"

$fyersBlock = @'
// REQUEST + AUTHORIZATION ERROR HANDLING
//--------------------------------------------------

    let response;

    try {
        response = await requestHistory(
            params,
            appId,
            accessToken
        );
    } catch (firstError) {
        const firstStatus = firstError?.response?.status;

        if (firstStatus === 401 || firstStatus === 403) {
            const sessionError = new Error(
                "[FYERS HISTORY] FYERS rejected the access token " +
                "(HTTP " + firstStatus + "). Complete the supported " +
                "interactive login via /api/fyers/login, then retry."
            );

            sessionError.fyersReason = "SESSION_EXPIRED";
            sessionError.cause = firstError;
            throw sessionError;
        }

        handleHistoryRequestError(
            firstError,
            params,
            rangeFrom,
            rangeTo
        );
    }

    //--------------------------------------------------
'@

$fyers = Replace-Once $fyers `
    '(?s)// REQUEST \+ ONE TOKEN REFRESH RETRY.*?(?=// VALIDATE RESPONSE)' `
    ($fyersBlock + "`r`n") `
    "FYERS history refresh/retry block"

Set-Content -Path $fyersPath -Value $fyers -Encoding utf8 -NoNewline

# ------------------------------------------------------------
# 2. INDSTOCKS: remove forced token generation from history
#    recovery. Authentication/token errors must not trigger a
#    shorter-range retry.
# ------------------------------------------------------------

$indHistoryPath = ".\server\indstocks\history.js"
$indHistory = Get-Content $indHistoryPath -Raw

$indHistory = Replace-Once $indHistory `
    '(?m)^import axios from "axios";\r?\nimport \{ getAccessToken, refreshToken \} from "\./token\.js";' `
    'import axios from "axios";' + "`r`n" + 'import { getAccessToken } from "./token.js";' `
    "IndStocks history token imports"

$recoveryBlock = @'
//======================================================
// LIVE FETCH WITH AUTHENTICATION ERROR PROPAGATION
//======================================================

async function fetchLiveCandlesWithRecovery(params) {
    // Do not generate a new token automatically here.
    // A failed session must be handled by the supported login flow.
    return fetchLiveCandles(params);
}

'@

$indHistory = Replace-Once $indHistory `
    '(?s)//={10,}\r?\n// LIVE FETCH WITH SESSION RECOVERY.*?(?=//={10,}\r?\n// HISTORY LOOKBACK)' `
    $recoveryBlock `
    "IndStocks automatic refresh recovery block"

# Preserve the failure so that an empty cache does not disguise it.
$indHistory = Replace-Once $indHistory `
    'let candles = \[\];' `
    "let candles = [];`r`n        let liveError = null;" `
    "IndStocks live error tracking"

$indHistory = Replace-Once $indHistory `
    'catch \(wideError\) \{\r?\n\s*console\.log\("\[INDSTOCKS HISTORY\] Wide window failed, retrying 24h:", wideError\?\.message\);\r?\n\s*\}' `
    @'
catch (wideError) {
            liveError = wideError;

            // Authentication and token-manager failures are not
            // date-range failures. Do not retry them with a shorter range.
            if (wideError?.indstocksReason) {
                throw wideError;
            }

            console.log(
                "[INDSTOCKS HISTORY] Wide window failed:",
                wideError?.message
            );
        }
'@ `
    "IndStocks wide-window error handling"

$indHistory = Replace-Once $indHistory `
    'catch \(error\) \{\r?\n\r?\n\s*console\.log\("\[INDSTOCKS HISTORY\] Live unavailable, checking cache\. Reason:", error\?\.message\);\r?\n\r?\n\s*\}' `
    @'
catch (error) {
        liveError = error;
        console.log(
            "[INDSTOCKS HISTORY] Live unavailable, checking cache. Reason:",
            error?.message
        );
    }
'@ `
    "IndStocks outer live error handling"

$indHistory = Replace-Once $indHistory `
    'console\.log\("\[INDSTOCKS HISTORY\] No live data and no cache available\."\);\r?\n\s*return \[\];' `
    @'
console.log("[INDSTOCKS HISTORY] No live data and no cache available.");

    if (liveError?.indstocksReason) {
        throw liveError;
    }

    return [];
'@ `
    "IndStocks empty-cache error propagation"

Set-Content -Path $indHistoryPath -Value $indHistory -Encoding utf8 -NoNewline

# ------------------------------------------------------------
# 3. INDSTOCKS: expose a bounded, sanitized provider error
#    message for HTTP failures such as the observed HTTP 400.
# ------------------------------------------------------------

$tokenPath = ".\server\indstocks\token.js"
$token = Get-Content $tokenPath -Raw

$token = Replace-Once $token `
    'if \(status < 200 \|\| status >= 300\) \{\r?\n\s*consecutiveFailures \+= 1;\r?\n\s*const wait = Math\.min\(BACKOFF_BASE_MS \* 2 \*\* \(consecutiveFailures - 1\), BACKOFF_MAX_MS\);\r?\n\s*enterCooldown\(wait, `HTTP \$\{status\}`\);\r?\n\s*console\.error\("\[INDSTOCKS TOKEN\] Unexpected HTTP status\.", \{ status \}\);\r?\n\s*const err = new Error\(`\[INDSTOCKS TOKEN\] Login failed with HTTP \$\{status\}\.`\);' `
    @'
if (status < 200 || status >= 300) {
        consecutiveFailures += 1;
        const wait = Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);

        const safeProviderMessage = [
            data?.message,
            data?.error_description,
            typeof data?.error === "string" ? data.error : null,
            data?.code
        ]
            .filter(value => typeof value === "string" || typeof value === "number")
            .map(value => String(value).replace(/\s+/g, " ").slice(0, 200))
            .join(" | ")
            .slice(0, 500);

        enterCooldown(
            wait,
            `HTTP ${status}${safeProviderMessage ? ": " + safeProviderMessage : ""}`
        );

        console.error("[INDSTOCKS TOKEN] Unexpected HTTP status.", {
            status,
            providerMessage: safeProviderMessage || "(no safe message returned)"
        });

        const err = new Error(
            `[INDSTOCKS TOKEN] Login failed with HTTP ${status}.` +
            (safeProviderMessage ? ` Provider: ${safeProviderMessage}` : "")
        );
'@ `
    "IndStocks HTTP error detail handling"

Set-Content -Path $tokenPath -Value $token -Encoding utf8 -NoNewline

Write-Host "`nPatch applied. Backups: $backupDir" -ForegroundColor Green

# ------------------------------------------------------------
# 4. Syntax validation
# ------------------------------------------------------------

foreach ($file in $files) {
    Write-Host "`nChecking $file" -ForegroundColor Cyan
    node --check $file

    if ($LASTEXITCODE -ne 0) {
        throw "Syntax check failed for $file. Restore from $backupDir before proceeding."
    }
}

Write-Host "`nAll three JavaScript syntax checks passed." -ForegroundColor Green
