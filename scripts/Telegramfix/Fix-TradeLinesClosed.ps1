#=====================================================================
# Fix-TradeLinesClosed.ps1      (small polish, run after Fix-TradeLifecycleExit.ps1)
#
# TradeLevelRenderer draws ENTRY / SL / TP lines when
#     the lifecycle is EXECUTED or MANAGE   (a trade is running), or
#     the authority passes right now        (a trade is about to start).
#
# Before the lifecycle fix a chart stayed in EXECUTED forever, so the lines never
# went away. With the fix they disappear as soon as the state is CLOSED / SCAN.
# The one gap: in the single CLOSED cycle the authority can be "passing" for the
# next setup, which would draw the finished trade's lines once more.
#
# This adds one early return: state CLOSED -> no lines. Nothing else changes.
#
# Edits: src\charts\TradeLevelRenderer.ts
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
    $bak = "$Path.bak-closedlines"
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

$file = Join-Path $ProjectRoot "src\charts\TradeLevelRenderer.ts"
if (-not (Test-Path $file)) { throw "Not found: $file" }

Write-Host "`n--- TradeLevelRenderer.ts ---"

Edit-Lines -Path $file -Label "no lines once the lifecycle is CLOSED" `
    -Marker 'AJ: trade is over' `
    -Anchor 'const tradeActive =' -Mode Before -NewText @'
        // AJ: trade is over once the lifecycle says CLOSED - never draw its lines
        if (stateStr === "CLOSED") {
            return {
                levels: []
            };
        }

'@

$f = (Read-Src $file).Text
Write-Host ""
if ($f.Contains('AJ: trade is over')) { Write-Host "VERIFIED: closed trades no longer draw lines" -ForegroundColor Green }
else { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext: npm run build, Ctrl+F5." -ForegroundColor Cyan
