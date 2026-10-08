#=====================================================================
# Fix-AuthorityDebugText.ps1      (run AFTER Fix-AuthorityDisplay.ps1)
#
# Why the AUTH row did not change after Fix-AuthorityDisplay.ps1:
# the Debug panel does NOT read authorityResult.authorityText. It reads the
# pipeline-trace message, and AJDecisionEngine writes that trace message BEFORE
# the lifecycle state is known - so it keeps the old "SELL APPROVED" / "WAIT".
#
# This patch makes AJDebugBuilder prefer the engine's final authorityText (the
# corrected one) and fall back to the old trace message only when it is missing:
#   - the AUTH row in the Debug panel
#   - authorityStatus (the status line next to the AI / SMC statuses)
#
# Display only. In every normal case the two texts are identical ("WAIT",
# "BUY APPROVED", "SELL APPROVED"); they only differ where Fix-AuthorityDisplay
# deliberately changes the label.
#
# Edits: src\indicators\AJIndicator\debug\AJDebugBuilder.ts
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
    $bak = "$Path.bak-authdebug"
    if (-not (Test-Path $bak)) { Copy-Item $Path $bak }
    [IO.File]::WriteAllText($Path, ($Src.Lines -join $Src.Nl), $Src.Enc)
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

$file = Join-Path $ProjectRoot "src\indicators\AJIndicator\debug\AJDebugBuilder.ts"
if (-not (Test-Path $file)) { throw "Not found: $file" }

Write-Host "`n--- AJDebugBuilder.ts ---"

Replace-Block -Path $file -Label "AUTH row uses the engine's final authorityText" `
    -Marker 'AJ DISPLAY: AUTH row' `
    -StartAnchor 'const authorityText =' -EndAnchor ');' -NewText @'
		// AJ DISPLAY: AUTH row - prefer the engine's FINAL authorityText (corrected by
		// AJDecisionEngine after the pipeline trace was written); fall back to the old chain.
		const authorityText =
			(
				typeof (authority as any)?.authorityText === "string" &&
				(authority as any).authorityText !== ""
					? (authority as any).authorityText
					: undefined
			)
			??
			((pipelineTrace as any)?.authority?.message)
			??
			(
				authority.executionAllowed
					? "PASS"
					: topRejectionReason
			);
'@

Replace-Block -Path $file -Label "authorityStatus uses the engine's final authorityText" `
    -Marker 'AJ DISPLAY: authorityStatus' `
    -StartAnchor 'authorityStatus:' -EndAnchor '?? blockReason,' -NewText @'
			// AJ DISPLAY: authorityStatus - same rule as the AUTH row
			authorityStatus:
				(
					typeof (authority as any)?.authorityText === "string" &&
					(authority as any).authorityText !== ""
						? (authority as any).authorityText
						: undefined
				)
				?? ((pipelineTrace as any)?.authority?.message)
				?? blockReason,
'@

$f = (Read-Src $file).Text
Write-Host ""
if ($f.Contains('AJ DISPLAY: AUTH row') -and $f.Contains('AJ DISPLAY: authorityStatus')) {
    Write-Host "VERIFIED: Debug panel AUTH row now follows the corrected text" -ForegroundColor Green
}
else {
    Write-Warning "Something is missing - send me the output above."
}

Write-Host "`nNext: npm run build, Ctrl+F5, check the AUTH row." -ForegroundColor Cyan
