#=====================================================================
# Fix-AuthorityReasonOrder.ps1
#
# WHY did the panel say "AUTHORITY: Weak trend" ?
#
# ExecutionAuthority.ts runs ~25 informational checks (Weak trend, No valid
# FVG, Liquidity sweep missing, CHOCH conflict, MTF conflict ...). They are
# only COUNTED and listed - none of them blocks a trade. A trade is blocked
# ONLY by the mandatory gates at the very end:
#
#   no trade direction | AI recommendation WAIT or confidence below the
#   threshold | risk score below the threshold | trend not aligned with the
#   direction | session not allowed | a trade already running | AI core /
#   AI+SMC core not qualified | advanced-crypto not ready
#
# Those blocking reasons were added at the END of the list, while the dashboard
# and the e2e test print the FIRST reason - so they always showed
# "Weak trend", which blocks nothing.
#
# This patch moves the blocking reasons to the FRONT of rejectionReasons.
# It changes WHICH reason is shown first. It does NOT change when a trade is
# approved or rejected.
#
# Edits: src\indicators\AJIndicator\engines\Authority\ExecutionAuthority.ts
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
    $bak = "$Path.bak-reasons"
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

$file = Join-Path $ProjectRoot "src\indicators\AJIndicator\engines\Authority\ExecutionAuthority.ts"
if (-not (Test-Path $file)) { throw "Not found: $file" }

Write-Host "`n--- ExecutionAuthority.ts ---"

Edit-Lines -Path $file -Label "remember how many informational reasons exist" `
    -Marker 'informationalReasonCount' `
    -Anchor 'mandatoryGatesPassed;' -Mode After -NewText @'

		// AJ DIAG: everything pushed so far is informational (never blocks a trade).
		const informationalReasonCount = rejectionReasons.length;
'@

Edit-Lines -Path $file -Label "blocking reasons first" `
    -Marker 'blockingReasons' `
    -Anchor 'AJLoggingGate.group("[RV-15 AUTHORITY GATE]");' -Mode Before -NewText @'
		// AJ DIAG: put the reasons that really BLOCK the trade (mandatory gates) first,
		// so the dashboard / e2e REASON shows the true blocker instead of "Weak trend".
		// Display order only - approval logic above is untouched.
		const blockingReasons = rejectionReasons.splice(informationalReasonCount);
		rejectionReasons.unshift(...blockingReasons);

'@

$f = (Read-Src $file).Text
Write-Host ""
if ($f.Contains('informationalReasonCount') -and $f.Contains('blockingReasons')) {
    Write-Host "VERIFIED: blocking reasons now come first" -ForegroundColor Green
}
else {
    Write-Warning "Something is missing - send me the output above."
}

Write-Host "`nNext: npm run build." -ForegroundColor Cyan
