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

$hasLookback = $text.Contains("const LOOKBACK_DAYS")
$hasWide     = $text.Contains("wideFromMs")

if ($hasLookback -and $hasWide) {
    Write-Host "Already fully patched (LOOKBACK_DAYS and wideFromMs exist). Nothing to do."
    exit 0
}

# ------------------------------------------------------------
# EDIT A: add LOOKBACK_DAYS just above the PUBLIC ENTRY POINT banner
# ------------------------------------------------------------
$patternA = '(?m)^//=+\n// PUBLIC ENTRY POINT\n'

if (-not $hasLookback) {

$countA = ([regex]::Matches($text, $patternA)).Count
if ($countA -ne 1) {
    throw "Edit A: expected 1 match for the PUBLIC ENTRY POINT banner, found $countA. File not modified."
}

$insertA = @'
//======================================================
// HISTORY LOOKBACK (days) PER RESOLUTION
//
// Wider windows give the chart enough candles. If the wide
// request fails or returns nothing, getIndstocksHistory falls
// back to the old 24 hour window.
//======================================================

const LOOKBACK_DAYS = {
    "1minute": 3,
    "5minute": 5,
    "15minute": 10,
    "30minute": 20,
    "60minute": 40,
    "day": 365
};

'@
$insertA = $insertA -replace "`r`n", "`n"

$evalA = [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $insertA + $m.Value }
$text = [regex]::Replace($text, $patternA, $evalA)
Write-Host "APPLY: Edit A (LOOKBACK_DAYS)"

} else {
    Write-Host "SKIP:  Edit A (LOOKBACK_DAYS already present)"
}

# ------------------------------------------------------------
# EDIT B: wide window first, 24h window as fallback
# ------------------------------------------------------------
$patternB = '    const now = Date\.now\(\);\n    const fromMs = from \?\? \(now - 24 \* 60 \* 60 \* 1000\);\n    const toMs = to \?\? now;\n[ \t]*\n    try \{\n[ \t]*\n        const candles = await fetchLiveCandles\(\{\n            exchange: exch,\n            securityId: secId,\n            resolution,\n            fromMs,\n            toMs\n        \}\);\n'

if (-not $hasWide) {

$countB = ([regex]::Matches($text, $patternB)).Count
if ($countB -ne 1) {
    throw "Edit B: expected 1 match for the fetch block, found $countB. File not modified."
}

$replaceB = @'
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const toMs = to ?? now;
    const narrowFromMs = from ?? (now - DAY_MS);
    const wideFromMs = from ?? (now - (LOOKBACK_DAYS[resolution] ?? 1) * DAY_MS);

    try {

        let candles = [];

        try {

            candles = await fetchLiveCandles({
                exchange: exch,
                securityId: secId,
                resolution,
                fromMs: wideFromMs,
                toMs
            });

        } catch (wideError) {

            if (wideError?.indstocksReason === "SESSION_EXPIRED") {
                throw wideError;
            }

            console.log("[INDSTOCKS HISTORY] Wide window failed, retrying 24h:", wideError?.message);

        }

        if (candles.length === 0 && wideFromMs !== narrowFromMs) {

            candles = await fetchLiveCandles({
                exchange: exch,
                securityId: secId,
                resolution,
                fromMs: narrowFromMs,
                toMs
            });

        }
'@
$replaceB = $replaceB -replace "`r`n", "`n"
$replaceB = $replaceB + "`n"

$evalB = [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replaceB }
$text = [regex]::Replace($text, $patternB, $evalB)
Write-Host "APPLY: Edit B (wide window + 24h fallback)"

} else {
    Write-Host "SKIP:  Edit B (wideFromMs already present)"
}

# ------------------------------------------------------------
# Write back (backup first, keep original line endings)
# ------------------------------------------------------------
Copy-Item -LiteralPath $full -Destination ($full + ".bak") -Force

if ($hadCrlf) {
    $text = $text -replace "`n", "`r`n"
}

[System.IO.File]::WriteAllText($full, $text, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Patched OK: $full"
Write-Host "Backup: $full.bak"
