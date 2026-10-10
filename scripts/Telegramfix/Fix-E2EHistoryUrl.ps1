#=====================================================================
# Fix-E2EHistoryUrl.ps1
#
# The option-symbol history request built by the e2e test returned HTTP 502
# (the chart probably sends extra parameters for options). This adds ONE
# escape hatch to scripts\aj-e2e-test.ts: if the environment variable
# AJ_HISTORY_URL is set, that exact URL is used instead of the built one.
#
# How to get the URL: open ajtrade.in, F12 -> Network, filter "history",
# click the option chart's request, right-click -> Copy -> Copy URL. Then:
#
#   $env:AJ_HISTORY_URL = "<pasted url>"
#   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/aj-e2e-test.ts live indstocks "NIFTY 06OCT 22550PE"
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
    $bak = "$Path.bak-histurl"
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
if (-not (Test-Path $test)) { throw "Not found: $test (use -ProjectRoot)" }

Write-Host "`n--- scripts\aj-e2e-test.ts ---"

Edit-Lines -Path $test -Label "url becomes reassignable" `
    -Marker 'let url =' `
    -Anchor 'const url =' -Mode Replace -NewText @'
    let url =
'@

Edit-Lines -Path $test -Label "AJ_HISTORY_URL override" `
    -Marker 'AJ_HISTORY_URL' `
    -Anchor 'console.log(`LIVE MODE: fetching NIFTY ${TF} from ${LIVE_SOURCE} (${url}) ...`);' -Mode Before -NewText @'
    if (process.env.AJ_HISTORY_URL) {
        url = process.env.AJ_HISTORY_URL; // AJ: exact URL copied from the browser's Network tab
    }

'@

$final = (Read-Src $test).Text
if ($final.Contains('let url =') -and $final.Contains('AJ_HISTORY_URL')) {
    Write-Host "`nVERIFIED: AJ_HISTORY_URL override is in place" -ForegroundColor Green
}
else {
    Write-Warning "Something is missing - send me the output above."
}
