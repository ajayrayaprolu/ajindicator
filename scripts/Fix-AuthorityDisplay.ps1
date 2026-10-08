#=====================================================================
# Fix-AuthorityDisplay.ps1
#
# TWO confusing AUTH labels in the Debug panel / advisory:
#
# 1) "SELL APPROVED" on a PE chart.
#    The authority takes its direction from the INDEX bias (bearish = -1) and
#    prints SELL. But on an option chart you always BUY the contract (PE when
#    the index is bearish, CE when it is bullish) and the trade ladder is
#    always built as a buy-side ladder. Fix: on CE/PE charts an approval is
#    always shown as "BUY APPROVED".
#
# 2) "AUTH WAIT" while LIFE says EXECUTED.
#    ExecutionAuthority has a mandatory gate "no trade already running". The
#    moment a trade is open that gate fails every bar, so the authority says
#    WAIT for the whole life of the trade - by design, it answers "may a NEW
#    trade open?". Fix: while the lifecycle is EXECUTED or MANAGE, a WAIT is
#    shown as "BUY APPROVED" (or SELL APPROVED on a non-option chart that is
#    short) - the approval that opened the trade still stands.
#
# DISPLAY ONLY: only the text field authorityText is changed. authorityDecision,
# executionAllowed, authorityApproved, rejection reasons, the state machine, the
# execution engine, markers and Telegram alerts are all untouched.
#
# Edits: src\indicators\AJIndicator\AJDecisionEngine.ts (one insertion)
# Safe to re-run (marker check, exact-one-match anchor, one-time backup).
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
    $bak = "$Path.bak-authdisplay"
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

$file = Join-Path $ProjectRoot "src\indicators\AJIndicator\AJDecisionEngine.ts"
if (-not (Test-Path $file)) { throw "Not found: $file" }

Write-Host "`n--- AJDecisionEngine.ts ---"

Edit-Lines -Path $file -Label "AUTH text: BUY on option charts, approved while a trade is running" `
    -Marker 'AJ DISPLAY: AUTH label' `
    -Anchor 'const tradeDirection =' -Mode Before -NewText @'
		//--------------------------------------------------
		// AJ DISPLAY: AUTH label (text only - authorityDecision / executionAllowed unchanged)
		//
		// 1) Option charts are always BOUGHT (CE or PE), so an approval is
		//    shown as BUY APPROVED even when the INDEX bias is bearish.
		// 2) ExecutionAuthority answers "may a NEW trade open?", so it says
		//    WAIT for as long as a trade is running (mandatory gate
		//    "trade already running"). While the lifecycle is EXECUTED or
		//    MANAGE the approval that opened the trade still stands, so show it.
		//--------------------------------------------------
		const authTradeActive =
			stateResult.engineState === "EXECUTED" ||
			stateResult.engineState === "MANAGE";

		const authCurrentText =
			String((authorityResult as any).authorityText ?? "");

		if (execIsOptionChart && /APPROVED$/.test(authCurrentText)) {
			(authorityResult as any).authorityText = "BUY APPROVED";
		}
		else if (authTradeActive && authCurrentText === "WAIT") {
			(authorityResult as any).authorityText =
				(execIsOptionChart || execDirection > 0)
					? "BUY APPROVED"
					: "SELL APPROVED";
		}

'@

$f = (Read-Src $file).Text
Write-Host ""
if ($f.Contains('AJ DISPLAY: AUTH label')) { Write-Host "VERIFIED: AUTH display fix is in place" -ForegroundColor Green }
else { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext: npm run build, Ctrl+F5, look at the AUTH row of the Debug panel." -ForegroundColor Cyan
Write-Host "If AUTH still shows SELL APPROVED / WAIT, the Debug panel builds that text elsewhere:" -ForegroundColor Yellow
Write-Host "upload src\indicators\AJIndicator\debug\AJDebugBuilder.ts and I will patch it there." -ForegroundColor Yellow
