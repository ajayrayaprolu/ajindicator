#=====================================================================
# Fix-E2EDiagnostics.ps1
#
# Surgical additions to scripts\aj-e2e-test.ts (nothing existing is rewritten):
#
#   1) 4th argument = symbol, so the test can run on an OPTION chart
#        npx tsx scripts/aj-e2e-test.ts live indstocks "NIFTY 06OCT 22550PE"
#      (default stays NIFTY spot)
#   2) STATE DWELL    - how many bars were spent in each lifecycle state
#   3) PLAN SANITY    - LONG needs SL < entry < TP1, SHORT the opposite, and
#                       how many DISTINCT entry prices the "trades" had
#   4) DIAG lines     - the shape of the engine result (printed once) and the
#                       full authority verdict on bars that scored >= 75 but
#                       were NOT allowed to execute (every 5th bar)
#
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
    $bak = "$Path.bak-diag"
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

function Replace-Text {
    param([string]$Path, [string]$Label, [string]$Marker, [string]$Old, [string]$New, [int]$Expected)

    $src = Read-Src $Path
    if ($src.Text.Contains($Marker)) { Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow; return }

    $count = ([regex]::Matches($src.Text, [regex]::Escape($Old))).Count
    if ($count -ne $Expected) { Write-Warning "[$Label] found $count occurrence(s), expected $Expected - skipped"; return }

    $text = $src.Text.Replace($Old, $New)
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([string[]]($text -split "`r?`n"))
    $src.Lines = $lines
    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$test = Join-Path $ProjectRoot "scripts\aj-e2e-test.ts"
if (-not (Test-Path $test)) { throw "Not found: $test  (use -ProjectRoot)" }

Write-Host "`n--- scripts\aj-e2e-test.ts ---"

# 1) symbol argument
Edit-Lines -Path $test -Label "symbol from 4th argument" `
    -Marker 'process.argv[4]' `
    -Anchor 'const SYMBOL = "NIFTY";' -Mode Replace -NewText @'
const SYMBOL = process.argv[4] ?? "NIFTY"; // AJ DIAG: optional 4th arg, e.g. "NIFTY 06OCT 22550PE"
'@

Replace-Text -Path $test -Label "history URLs use SYMBOL" `
    -Marker 'encodeURIComponent(SYMBOL)' `
    -Old 'symbol=NIFTY&timeframe=' `
    -New 'symbol=${encodeURIComponent(SYMBOL)}&timeframe=' `
    -Expected 4

# 2) state dwell counters
Edit-Lines -Path $test -Label "dwell counters" `
    -Marker 'stateBars: Record' `
    -Anchor 'let prevState = "";' -Mode After -NewText @'
    const stateBars: Record<string, number> = {};
    let diagKeysPrinted = false;
'@

Edit-Lines -Path $test -Label "count bars per state" `
    -Marker 'stateBars[state]' `
    -Anchor 'const state = result?.lifecycleState ?? "SCAN";' -Mode After -NewText @'
            stateBars[state] = (stateBars[state] ?? 0) + 1;
'@

# 3) diagnostics on blocked bars (console.warn so the RV-07E/TRACE/DEBUG filter can't drop them)
Edit-Lines -Path $test -Label "DIAG: result shape + blocked-bar authority dump" `
    -Marker 'DIAG result keys' `
    -Anchor 'const mode = String(result?.tradeMode ?? ajRuntime?.tradeEngineMode ?? "?").slice(0, 14);' -Mode After -NewText @'

            // AJ DIAG: once, show the shape of the engine result
            if (!diagKeysPrinted) {
                diagKeysPrinted = true;
                console.warn("     DIAG result keys: " + Object.keys(result ?? {}).join(","));
                console.warn("     DIAG authority keys: " + Object.keys(result?.authority ?? {}).join(","));
            }

            // AJ DIAG: scored >= 75 but NOT allowed -> dump the authority verdict
            if (!result?.executionAllowed && score >= 75 && i % 5 === 0) {
                let dump = "[unserializable]";
                try { dump = JSON.stringify(result?.authority ?? {}).slice(0, 700); } catch { /* circular */ }
                console.warn("     DIAG blocked bar " + i + " (score " + score + ", conf " + conf + "): " + dump);
            }
'@

# 4) summary lines
Edit-Lines -Path $test -Label "STATE DWELL summary" `
    -Marker 'STATE DWELL' `
    -Anchor 'if (errCount > 0) console.log(`(skipped ${errCount} bars due to errors)`);' -Mode After -NewText @'
    console.log("STATE DWELL (bars): " + JSON.stringify(stateBars));
'@

Edit-Lines -Path $test -Label "PLAN SANITY summary" `
    -Marker 'PLAN SANITY' `
    -Anchor 'console.log(`RESULT: ${trades.length} trade(s) detected:`);' -Mode After -NewText @'
        console.log("PLAN SANITY (LONG needs SL < entry < TP1; SHORT needs SL > entry > TP1):");
        for (const t of trades) {
            const ok = t.dir > 0
                ? t.sl < t.entry && t.tp1 > t.entry
                : t.sl > t.entry && t.tp1 < t.entry;
            console.log(`  bar ${t.bar} ${t.dir > 0 ? "LONG" : "SHORT"} -> ${ok ? "OK" : "BAD (SL/TP on the wrong side for this direction)"}`);
        }
        console.log(`Distinct entry prices: ${new Set(trades.map((x: any) => x.entry)).size} of ${trades.length} trade(s)`);
'@

$final = (Read-Src $test).Text
$need = @('process.argv[4]', 'encodeURIComponent(SYMBOL)', 'stateBars: Record', 'DIAG result keys', 'STATE DWELL', 'PLAN SANITY')
$missing = $need | Where-Object { -not $final.Contains($_) }

Write-Host ""
if (@($missing).Count -eq 0) { Write-Host "VERIFIED: diagnostics are in place" -ForegroundColor Green }
else { Write-Warning ("Missing: " + ($missing -join ", ")) }

Write-Host "`nRun (from C:\AI-Institutional):" -ForegroundColor Cyan
Write-Host '  $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/aj-e2e-test.ts live indstocks' -ForegroundColor Cyan
Write-Host '  $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/aj-e2e-test.ts live indstocks "NIFTY 06OCT 22550PE"' -ForegroundColor Cyan
