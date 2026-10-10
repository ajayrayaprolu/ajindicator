#=====================================================================
# Fix-PaperLadderDirection.ps1      (run after Fix-TradeLifecycleExit.ps1)
#
# BUG in my lifecycle fix, found in your e2e log (bar 342):
#   The trade was labelled LONG but its plan was a SHORT ladder (SL 22243 ABOVE
#   the entry 22203, TPs below). The direction flag had flipped between the moment
#   the plan was locked (ARMED) and EXECUTED. The tracker took the ladder direction
#   from the flag, so it saw "price below SL" immediately and closed the trade two
#   bars later (342 EXECUTED -> 343 MANAGE -> 344 CLOSED) - a false stop-out.
#
# FIX: the ladder direction now comes from the PLAN itself
#      (TP1 above the entry = long, below = short).
#
# Edits: src\indicators\AJIndicator\AJDecisionEngine.ts (one line)
# Safe to re-run (marker check, exact-one-match, one-time backup).
#=====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional"
)

$ErrorActionPreference = "Stop"

$file = Join-Path $ProjectRoot "src\indicators\AJIndicator\AJDecisionEngine.ts"
if (-not (Test-Path $file)) { throw "Not found: $file" }

$bytes = [IO.File]::ReadAllBytes($file)
$bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$enc = New-Object System.Text.UTF8Encoding($bom)
$text = $enc.GetString($bytes)
if ($bom -and $text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
$nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

Write-Host "`n--- AJDecisionEngine.ts ---"

if ($text.Contains('ladder direction comes from the PLAN')) {
    Write-Host "SKIP  [ladder direction] (already applied)" -ForegroundColor DarkYellow
    return
}

if (-not $text.Contains('AJ PAPER POSITION')) {
    throw "Run Fix-TradeLifecycleExit.ps1 first."
}

$old = 'dir: execDirection >= 0 ? 1 : -1,'
$count = ([regex]::Matches($text, [regex]::Escape($old))).Count

if ($count -ne 1) {
    Write-Warning "[ladder direction] found $count occurrence(s), expected 1 - skipped"
    return
}

$indent = [regex]::Match($text, '(?m)^([ \t]*)' + [regex]::Escape($old)).Groups[1].Value
$new = ("// ladder direction comes from the PLAN (TP above entry = long),`n" +
        $indent + "// not from the direction flag, which can flip after the plan was locked`n" +
        $indent + "dir: execTp1 >= execEntryPrice ? 1 : -1,").Replace("`n", $nl)

$bak = "$file.bak-ladderdir"
if (-not (Test-Path $bak)) { Copy-Item $file $bak }

[IO.File]::WriteAllText($file, $text.Replace($old, $new), $enc)
Write-Host "OK    [ladder direction now comes from the plan]" -ForegroundColor Green
Write-Host "`nNext: npm run build, then re-run the e2e test." -ForegroundColor Cyan
