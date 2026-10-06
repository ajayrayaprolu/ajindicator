#=====================================================================
# Fix-TelegramSafety.ps1      (run AFTER Fix-TelegramDedup.ps1)
#
# Patches src\services\TelegramNotifier.ts so it never announces HISTORY:
#
#   - A plan that is already active the first time this page sees the
#     contract (you just opened / refreshed the site) is recorded silently.
#     Only a plan that appears AFTER the notifier has seen the contract idle
#     (no signal) can be announced.
#   - A new plan is also ignored when the current price is already past its
#     stop loss / TP1, or has drifted more than 5% away from the entry.
#   - Ignored plans are remembered (planKey), so they can't be announced
#     later when executionAllowed flaps off and on again.
#   - window.setTimeout -> setTimeout, so the notifier also runs in Node
#     (needed by the e2e dry run).
#   - the payload now carries the option expiry (server de-duplicates on it).
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
    $bak = "$Path.bak-safety"
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

    $text = $src.Text.Replace($Old, $New.Replace("`n", $src.Nl))
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([string[]]($text -split "`r?`n"))
    $src.Lines = $lines
    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$svc = Join-Path $ProjectRoot "src\services\TelegramNotifier.ts"
if (-not (Test-Path $svc)) { throw "Not found: $svc - run Fix-TelegramAlerts.ps1 first." }

if (-not (Read-Src $svc).Text.Contains('function contractKey')) {
    throw "Run Fix-TelegramDedup.ps1 first (this patch builds on it)."
}

Write-Host "`n--- TelegramNotifier.ts ---"

Edit-Lines -Path $svc -Label "idleSeen set" `
    -Marker 'private idleSeen' `
    -Anchor 'private trades: Record<string, TradeRecord> = loadTrades();' -Mode After -NewText @'
    private idleSeen: Set<string> = new Set();
'@

Edit-Lines -Path $svc -Label "remember contracts seen idle (no signal)" `
    -Marker '// idle: no signal' `
    -Anchor 'if (!t.executionAllowed) {' -Mode Replace -NewText @'
        if (!t.executionAllowed) {
            this.idleSeen.add(contractKey(opt)); // idle: no signal
'@

Edit-Lines -Path $svc -Label "remember contracts seen idle (no valid plan)" `
    -Marker '// idle: no valid plan' `
    -Anchor 'if (!valid) {' -Mode Replace -NewText @'
        if (!valid) {
            this.idleSeen.add(contractKey(opt)); // idle: no valid plan
'@

Edit-Lines -Path $svc -Label "stale / page-load plans are recorded silently" `
    -Marker 'A plan that is already active the first time this page sees the' `
    -Anchor 'const key = contract + "|" + Date.now();' -Mode After -NewText @'

        // A plan that is already active the first time this page sees the
        // contract (page just loaded), or whose price is already past its
        // SL / TP1 or more than 5% away from the entry, is history - record
        // it silently (closed) so it is never announced, now or when
        // executionAllowed flaps off and on again.
        const priceNow = t.price;

        const stale =
            !this.idleSeen.has(contract) ||
            (
                priceNow != null &&
                Number.isFinite(priceNow) &&
                (
                    priceNow <= t.stopLoss ||
                    priceNow >= tp1 ||
                    Math.abs(priceNow - t.entry) / t.entry > 0.05
                )
            );
'@

Edit-Lines -Path $svc -Label "record closed when stale" `
    -Marker 'closed: stale,' `
    -Anchor 'closed: false,' -Mode Replace -NewText @'
            closed: stale,
'@

Edit-Lines -Path $svc -Label "fire() never announces closed/stale records" `
    -Marker 'closed/stale records never announce' `
    -Anchor 'rec.sent[stage] = true; // mark first so ticks never double-send' -Mode Before -NewText @'
        if (rec.closed) {
            return; // closed/stale records never announce
        }

'@

Replace-Text -Path $svc -Label "setTimeout works in Node + browser" `
    -Marker 'works in Node + browser' `
    -Old 'window.setTimeout(() => {' `
    -New 'setTimeout(() => { // works in Node + browser' `
    -Expected 1

Replace-Text -Path $svc -Label "payload carries expiry" `
    -Marker 'expiry: rec.opt.expiry' `
    -Old 'underlying: rec.opt.underlying,' `
    -New "underlying: rec.opt.underlying,`n                    expiry: rec.opt.expiry," `
    -Expected 2

$final = (Read-Src $svc).Text
$need = @('private idleSeen', '// idle: no signal', '// idle: no valid plan', 'A plan that is already active the first time this page sees the',
          'closed: stale,', 'closed/stale records never announce', 'works in Node + browser', 'expiry: rec.opt.expiry')
$missing = $need | Where-Object { -not $final.Contains($_) }

Write-Host ""
if (@($missing).Count -eq 0) { Write-Host "VERIFIED: safety patch is in place" -ForegroundColor Green }
else { Write-Warning ("Missing: " + ($missing -join ", ")) }

Write-Host "`nNext (from C:\AI-Institutional):  npx tsx scripts/telegram-dedup-test.ts   then   npm run build" -ForegroundColor Cyan
