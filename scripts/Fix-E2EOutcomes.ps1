#=====================================================================
# Fix-E2EOutcomes.ps1       (run after Fix-E2EDiagnostics.ps1 and Fix-E2ETelegramDryRun.ps1)
#
# 1) TRADE OUTCOMES - for every trade the test detects, look at the candles AFTER
#    the entry and report how it ended with the plan levels (same rule as the live
#    exit: stop loss first if one bar touches both):
#
#      bar  83 LONG   STOP  after 66 bars  -1.0R   TP1 reached first: no
#      bar 200 SHORT  TP3   after 17 bars  +3.0R   TP1 reached first: yes
#      SUMMARY: 5 trades | 2 TP3 | 3 STOP | 0 open | hit rate 40% | total +3.0R | avg +0.6R
#
#    This turns "our logic is too strict / others are better" into numbers: you can
#    compare the engine's trades (and any threshold change) by outcome, not feeling.
#    It ignores the new-day and 150-bar exits, so it is a slightly simplified view.
#
# 2) AJ_TG_SYMBOL - the Telegram dry run is skipped on spot candles. Set this to an
#    option name and the notifier previews its messages on the same candles:
#      $env:AJ_TG_SYMBOL = "NIFTY 13OCT 22500CE"
#    (only long-ladder trades produce alerts: SL below entry, TP above)
#
# Edits: scripts\aj-e2e-test.ts
# Safe to re-run (marker checks, exact-one-match anchors, one-time backup).
#=====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional"
)

$ErrorActionPreference = "Stop"

function Read-Src([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $enc = New-Object System.Text.UTF8Encoding($bom)
    $text = $enc.GetString($bytes)
    if ($bom -and $text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
    $nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([string[]]($text -split "`r?`n"))
    return [pscustomobject]@{ Text = $text; Lines = $lines; Nl = $nl; Enc = $enc }
}

function Write-Src([string]$Path, $Src) {
    $bak = "$Path.bak-outcomes"
    if (-not (Test-Path $bak)) { Copy-Item $Path $bak }
    [IO.File]::WriteAllText($Path, ($Src.Lines -join $Src.Nl), $Src.Enc)
}

function Edit-Lines {
    param([string]$Path, [string]$Label, [string]$Marker, [string]$Anchor,
          [ValidateSet("After", "Before", "Replace")][string]$Mode, [string]$NewText)

    $src = Read-Src $Path
    if ($src.Text.Contains($Marker)) { Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow; return }

    $hits = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) { if ($src.Lines[$i].Trim() -eq $Anchor) { $hits += $i } }
    if ($hits.Count -ne 1) { Write-Warning "[$Label] anchor matched $($hits.Count) times (need exactly 1) - skipped"; return }

    $idx = $hits[0]
    $new = [string[]]($NewText.Trim("`r", "`n") -split "`r?`n")
    switch ($Mode) {
        "After"   { $src.Lines.InsertRange($idx + 1, $new) }
        "Before"  { $src.Lines.InsertRange($idx, $new) }
        "Replace" { $src.Lines.RemoveAt($idx); $src.Lines.InsertRange($idx, $new) }
    }
    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$test = Join-Path $ProjectRoot "scripts\aj-e2e-test.ts"
if (-not (Test-Path $test)) { throw "Not found: $test" }

if (-not (Read-Src $test).Text.Contains('PLAN SANITY')) {
    throw "Run Fix-E2EDiagnostics.ps1 first (this patch builds on it)."
}

Write-Host "`n--- scripts\aj-e2e-test.ts ---"

Edit-Lines -Path $test -Label "evaluateOutcomes() helper" `
    -Marker 'function evaluateOutcomes' `
    -Anchor 'function runScenario(name: string, candles: Candle[]) {' -Mode Before -NewText @'
// AJ OUTCOMES: how did each detected trade end with its plan levels?
// (stop loss first when one bar touches both; ignores the new-day / 150-bar exits)
function evaluateOutcomes(trades: any[], candles: Candle[]) {

    console.log("TRADE OUTCOMES (plan SL / TP1-TP3, stop first when one bar touches both):");

    let stops = 0, targets = 0, open = 0, totalR = 0, tp1First = 0;

    for (const t of trades) {

        const long = t.tp1 >= t.entry;
        const risk = Math.abs(t.entry - t.sl);

        let outcome = "OPEN";
        let r = 0;
        let bars = 0;
        let reachedTp1 = false;

        if (risk > 0) {
            for (let k = t.bar + 1; k < candles.length; k++) {

                const c = candles[k];
                bars++;

                const stopHit = long ? c.low <= t.sl : c.high >= t.sl;
                const tp1Hit = long ? c.high >= t.tp1 : c.low <= t.tp1;
                const tp3Hit = long ? c.high >= t.tp3 : c.low <= t.tp3;

                if (tp1Hit) reachedTp1 = true;

                if (stopHit) { outcome = "STOP"; r = -1; break; }
                if (tp3Hit) { outcome = "TP3"; r = Math.abs(t.tp3 - t.entry) / risk; break; }
            }
        }

        if (outcome === "STOP") stops++;
        else if (outcome === "TP3") targets++;
        else open++;

        if (reachedTp1) tp1First++;
        totalR += r;

        console.log(
            `  bar ${String(t.bar).padStart(3)} ${long ? "LONG " : "SHORT"} ${outcome.padEnd(5)} ` +
            `after ${String(bars).padStart(3)} bars ${(r >= 0 ? "+" : "") + r.toFixed(1)}R   ` +
            `TP1 reached: ${reachedTp1 ? "yes" : "no"}`
        );
    }

    const closed = stops + targets;

    console.log(
        `  SUMMARY: ${trades.length} trade(s) | ${targets} reached TP3 | ${stops} stopped | ${open} still open | ` +
        `TP1 reached in ${tp1First} | ` +
        `hit rate ${closed ? Math.round((targets / closed) * 100) : 0}% | ` +
        `total ${(totalR >= 0 ? "+" : "") + totalR.toFixed(1)}R | ` +
        `avg ${(closed ? (totalR / closed) : 0).toFixed(2)}R per closed trade`
    );
}

'@

Edit-Lines -Path $test -Label "print outcomes after the trade list" `
    -Marker 'evaluateOutcomes(trades, candles)' `
    -Anchor 'console.log(`Distinct entry prices: ${new Set(trades.map((x: any) => x.entry)).size} of ${trades.length} trade(s)`);' -Mode After -NewText @'
        evaluateOutcomes(trades, candles);
'@

Edit-Lines -Path $test -Label "AJ_TG_SYMBOL for the Telegram preview" `
    -Marker 'AJ_TG_SYMBOL' `
    -Anchor 'symbol: SYMBOL,' -Mode Replace -NewText @'
                symbol: process.env.AJ_TG_SYMBOL ?? SYMBOL, // AJ: e.g. "NIFTY 13OCT 22500CE" previews Telegram on spot candles
'@

$f = (Read-Src $test).Text
Write-Host ""
if ($f.Contains('function evaluateOutcomes') -and $f.Contains('evaluateOutcomes(trades, candles)') -and $f.Contains('AJ_TG_SYMBOL')) {
    Write-Host "VERIFIED: outcome statistics are in place" -ForegroundColor Green
}
else {
    Write-Warning "Something is missing - send me the output above."
}

Write-Host "`nRun (from C:\AI-Institutional):" -ForegroundColor Cyan
Write-Host '  $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/aj-e2e-test.ts live indstocks' -ForegroundColor Cyan
Write-Host '  # Telegram preview on the same candles:' -ForegroundColor Cyan
Write-Host '  $env:AJ_TG_SYMBOL = "NIFTY 13OCT 22500CE"; npx tsx scripts/aj-e2e-test.ts live indstocks' -ForegroundColor Cyan
