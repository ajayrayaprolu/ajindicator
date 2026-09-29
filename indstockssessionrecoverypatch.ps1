param(
    [string]$Path = ".\server\indstocks\history.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path  (pass the correct path with -Path)"
}

$full = (Resolve-Path -LiteralPath $Path).Path
$raw  = [System.IO.File]::ReadAllText($full)
$hadCrlf = $raw.Contains("`r`n")
$text = $raw -replace "`r`n", "`n"

if ($text.Contains("fetchLiveCandlesWithRecovery")) {
    Write-Host "Already patched (fetchLiveCandlesWithRecovery exists). Nothing to do."
    exit 0
}

if (-not $text.Contains("LOOKBACK_DAYS")) {
    throw "This file does not have the LOOKBACK_DAYS / wideFromMs patch yet. Run historypatch.ps1 first."
}

# ------------------------------------------------------------
# EDIT 1: import refreshToken alongside getAccessToken
# ------------------------------------------------------------
$old1 = 'import { getAccessToken } from "./token.js";' + "`n"
$new1 = 'import { getAccessToken, refreshToken } from "./token.js";' + "`n"

$count1 = ([regex]::Matches($text, [regex]::Escape($old1))).Count
if ($count1 -ne 1) {
    throw "Edit 1: expected 1 match for the token.js import, found $count1. File not modified."
}
$text = $text.Replace($old1, $new1)
Write-Host "APPLY: Edit 1 (import refreshToken)"

# ------------------------------------------------------------
# EDIT 2: insert fetchLiveCandlesWithRecovery after fetchLiveCandles
# ------------------------------------------------------------
$anchor2 = @'
        .filter(c =>
            Number.isFinite(c.time) &&
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close)
        )
        .sort((a, b) => a.time - b.time);

}
'@
$anchor2 = $anchor2 -replace "`r`n", "`n"

$wrapper2 = @'

//======================================================
// LIVE FETCH WITH SESSION RECOVERY
//
// IndStocks appears to invalidate a previously issued
// token whenever a new one is generated for the same
// client id/MPIN (this project and OpenAlgo currently
// share that client id). getAccessToken()'s own cache
// can therefore believe a token is still valid for hours
// while IndStocks has already killed it server-side.
//
// On a 401/403 (SESSION_EXPIRED), force one token refresh
// and retry the request exactly once before giving up.
//======================================================

async function fetchLiveCandlesWithRecovery(params) {

    try {

        return await fetchLiveCandles(params);

    } catch (error) {

        if (error?.indstocksReason !== "SESSION_EXPIRED") {
            throw error;
        }

        console.warn(
            "[INDSTOCKS HISTORY] Session expired mid-request - refreshing token and retrying once."
        );

        await refreshToken();

        return await fetchLiveCandles(params);

    }

}
'@
$wrapper2 = $wrapper2 -replace "`r`n", "`n"

$count2 = ([regex]::Matches($text, [regex]::Escape($anchor2))).Count
if ($count2 -ne 1) {
    throw "Edit 2: expected 1 match for the end of fetchLiveCandles, found $count2. File not modified."
}
$text = $text.Replace($anchor2, $anchor2 + $wrapper2)
Write-Host "APPLY: Edit 2 (add fetchLiveCandlesWithRecovery)"

# ------------------------------------------------------------
# EDIT 3: use the recovery wrapper, drop the SESSION_EXPIRED
# re-throws so an expired/evicted token falls back to cache
# instead of hard-failing the chart.
# ------------------------------------------------------------
$pattern3 = '    const now = Date\.now\(\);\n    const DAY_MS = 24 \* 60 \* 60 \* 1000;\n    const toMs = to \?\? now;\n    const narrowFromMs = from \?\? \(now - DAY_MS\);\n    const wideFromMs = from \?\? \(now - \(LOOKBACK_DAYS\[resolution\] \?\? 1\) \* DAY_MS\);\n\n    try \{\n\n        let candles = \[\];\n\n        try \{\n\n            candles = await fetchLiveCandles\(\{\n                exchange: exch,\n                securityId: secId,\n                resolution,\n                fromMs: wideFromMs,\n                toMs\n            \}\);\n\n        \} catch \(wideError\) \{\n\n            if \(wideError\?\.indstocksReason === "SESSION_EXPIRED"\) \{\n                throw wideError;\n            \}\n\n            console\.log\("\[INDSTOCKS HISTORY\] Wide window failed, retrying 24h:", wideError\?\.message\);\n\n        \}\n\n        if \(candles\.length === 0 && wideFromMs !== narrowFromMs\) \{\n\n            candles = await fetchLiveCandles\(\{\n                exchange: exch,\n                securityId: secId,\n                resolution,\n                fromMs: narrowFromMs,\n                toMs\n            \}\);\n\n        \}\n\n        if \(candles\.length > 0\) \{\n            writeCache\(key, candles\);\n            console\.log\("\[INDSTOCKS HISTORY\] LIVE candles:", candles\.length\);\n            return candles;\n        \}\n\n        console\.log\("\[INDSTOCKS HISTORY\] Live returned 0 rows, checking cache\.\.\."\);\n\n    \} catch \(error\) \{\n\n        if \(error\?\.indstocksReason === "SESSION_EXPIRED"\) \{\n            throw error;\n        \}\n\n        console\.log\("\[INDSTOCKS HISTORY\] Live unavailable, checking cache\. Reason:", error\?\.message\);\n\n    \}\n'

$count3 = ([regex]::Matches($text, $pattern3)).Count
if ($count3 -ne 1) {
    throw "Edit 3: expected 1 match for the fetch/try/catch region, found $count3. File not modified."
}

$replace3 = @'
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const toMs = to ?? now;
    const narrowFromMs = from ?? (now - DAY_MS);
    const wideFromMs = from ?? (now - (LOOKBACK_DAYS[resolution] ?? 1) * DAY_MS);

    try {

        let candles = [];

        try {

            candles = await fetchLiveCandlesWithRecovery({
                exchange: exch,
                securityId: secId,
                resolution,
                fromMs: wideFromMs,
                toMs
            });

        } catch (wideError) {

            console.log("[INDSTOCKS HISTORY] Wide window failed, retrying 24h:", wideError?.message);

        }

        if (candles.length === 0 && wideFromMs !== narrowFromMs) {

            candles = await fetchLiveCandlesWithRecovery({
                exchange: exch,
                securityId: secId,
                resolution,
                fromMs: narrowFromMs,
                toMs
            });

        }

        if (candles.length > 0) {
            writeCache(key, candles);
            console.log("[INDSTOCKS HISTORY] LIVE candles:", candles.length);
            return candles;
        }

        console.log("[INDSTOCKS HISTORY] Live returned 0 rows, checking cache...");

    } catch (error) {

        console.log("[INDSTOCKS HISTORY] Live unavailable, checking cache. Reason:", error?.message);

    }
'@
$replace3 = $replace3 -replace "`r`n", "`n"
$replace3 = $replace3 + "`n"

$evalC = [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replace3 }
$text = [regex]::Replace($text, $pattern3, $evalC)
Write-Host "APPLY: Edit 3 (use recovery wrapper, drop hard SESSION_EXPIRED throw)"

# ------------------------------------------------------------
# Write back
# ------------------------------------------------------------
Copy-Item -LiteralPath $full -Destination ($full + ".bak3") -Force

if ($hadCrlf) {
    $text = $text -replace "`n", "`r`n"
}

[System.IO.File]::WriteAllText($full, $text, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Patched OK: $full"
Write-Host "Backup: $full.bak3"
