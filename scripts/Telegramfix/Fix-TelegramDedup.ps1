#=====================================================================
# Fix-TelegramDedup.ps1
#
# Patches src\services\TelegramNotifier.ts so there is ONE live trade per
# option contract. Before: the dedupe key included entry/SL/TP1, so the
# IndStocks chart and the Fyers chart of the same option (slightly
# different prices) each sent an ENTRY message. After: the second feed is
# ignored while the first trade is open, and a plan that already traded
# and closed is never re-sent.
#
# Verify afterwards:  npx tsx scripts/telegram-dedup-test.ts
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
    $bak = "$Path.bak-dedup"
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

function Replace-Block {
    param([string]$Path, [string]$Label, [string]$Marker, [string]$StartAnchor, [string]$EndAnchor, [string]$NewText)

    $src = Read-Src $Path
    if ($src.Text.Contains($Marker)) { Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow; return }

    $starts = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) { if ($src.Lines[$i].Trim() -eq $StartAnchor) { $starts += $i } }
    if ($starts.Count -ne 1) { Write-Warning "[$Label] start anchor matched $($starts.Count) times (need exactly 1) - skipped"; return }

    $s = $starts[0]; $e = -1
    for ($i = $s + 1; $i -lt $src.Lines.Count; $i++) { if ($src.Lines[$i].Trim() -eq $EndAnchor) { $e = $i; break } }
    if ($e -lt 0) { Write-Warning "[$Label] end anchor not found - skipped"; return }

    $new = [string[]]($NewText.Trim("`r", "`n") -split "`r?`n")
    $src.Lines.RemoveRange($s, $e - $s + 1)
    $src.Lines.InsertRange($s, $new)
    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$svc = Join-Path $ProjectRoot "src\services\TelegramNotifier.ts"
if (-not (Test-Path $svc)) { throw "Not found: $svc - run Fix-TelegramAlerts.ps1 first." }

Write-Host "`n--- TelegramNotifier.ts ---"

Edit-Lines -Path $svc -Label "TradeRecord: contract + planKey fields" `
    -Marker 'planKey: string;' `
    -Anchor 'opt: OptionParts;' -Mode After -NewText @'
    contract: string;
    planKey: string;
'@

Edit-Lines -Path $svc -Label "contractKey helper" `
    -Marker 'function contractKey' `
    -Anchor 'function loadTrades(): Record<string, TradeRecord> {' -Mode Before -NewText @'
function contractKey(o: OptionParts): string {
    return [o.underlying, o.expiry, o.strike, o.optionType].join("|");
}

'@

Edit-Lines -Path $svc -Label "open-trade lookup by contract (not by chart symbol string)" `
    -Marker 'r.contract === contractKey(opt) && !r.closed' `
    -Anchor '.filter((r) => r.symbol === t.symbol && !r.closed)' -Mode Replace -NewText @'
            .filter((r) => r.contract === contractKey(opt) && !r.closed)
'@

Replace-Block -Path $svc -Label "one live trade per contract" `
    -Marker 'one live trade per contract (also' `
    -StartAnchor 'const key = [' -EndAnchor '}' -NewText @'
        const contract = contractKey(opt);

        const planKey = [t.entry, t.stopLoss, tp1].join("|");

        const history =
            Object.values(this.trades)
                .filter((r) => r.contract === contract);

        // one live trade per contract (also stops the IndStocks chart and
        // the Fyers chart of the same option from each sending an entry)
        if (history.some((r) => !r.closed)) {
            return;
        }

        // the same locked plan already traded and closed - don't re-send it
        if (history.some((r) => r.planKey === planKey)) {
            return;
        }

        const key = contract + "|" + Date.now();
'@

Edit-Lines -Path $svc -Label "record: store contract + planKey" `
    -Marker 'contract,' `
    -Anchor 'opt,' -Mode After -NewText @'
            contract,
            planKey,
'@

$final = (Read-Src $svc).Text
$ok = $final.Contains('function contractKey') -and $final.Contains('planKey: string;') -and
      $final.Contains('one live trade per contract (also') -and $final.Contains('r.contract === contractKey(opt) && !r.closed')

Write-Host ""
if ($ok) { Write-Host "VERIFIED: dedupe patch is in place" -ForegroundColor Green }
else     { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext:  npx tsx scripts/telegram-dedup-test.ts   then   npm run build" -ForegroundColor Cyan
