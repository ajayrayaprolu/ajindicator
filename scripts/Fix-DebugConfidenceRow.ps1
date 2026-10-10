#=====================================================================
# Fix-DebugConfidenceRow.ps1
#
# "Score is 100 but no trade" - the Debug panel only shows the SCORE
# (TOTAL 85 (PROD > 60)). The authority does not gate on the score; it gates on
# CONFIDENCE, a different number (your e2e log: score 100, confidence 53.4 < 60
# -> WAIT). This adds one row under VOL / AUTH:
#
#   CONF | 53.4 | NEED | 60
#
# Display only. Edits: src\indicators\AJIndicator\debug\AJDebugBuilder.ts
# Safe to re-run (marker check, exact-one-match anchors, one-time backup).
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
    $bak = "$Path.bak-confrow"
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

Replace-Block -Path $file -Label "CONF row under VOL / AUTH" `
    -Marker 'AJ DISPLAY: CONF row' `
    -StartAnchor '"VOL",' -EndAnchor '),' -NewText @'
			"VOL",
			volumeText,
			"AUTH",
			authorityText
		),
		// AJ DISPLAY: CONF row - the authority gates on CONFIDENCE, a different number
		// from the score (TOTAL). Score 100 with confidence 53 < 60 means no trade.
		col(
			"CONF",
			String(Math.round((confidence.aiConfidence ?? 0) * 10) / 10),
			"NEED",
			String(AJRuntimeParameters.authorityConfidenceThreshold)
		),
'@

$f = (Read-Src $file).Text
Write-Host ""
if ($f.Contains('AJ DISPLAY: CONF row')) { Write-Host "VERIFIED: CONF row added" -ForegroundColor Green }
else { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext: npm run build, Ctrl+F5." -ForegroundColor Cyan
