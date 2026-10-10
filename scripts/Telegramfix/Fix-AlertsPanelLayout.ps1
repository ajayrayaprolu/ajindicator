#=====================================================================
# Fix-AlertsPanelLayout.ps1
#
# The Alerts panel (Active / Triggered tabs) was pushed out of view by the
# Telegram watcher list. After this patch:
#   - the Telegram part is ONE line (checkbox + Test + Details button)
#   - the per-chart watcher list is hidden until you click "Details"
#   - the Active / Triggered tabs and the alert list start right below it
#
# Edits: src\components\AlertsPanel.tsx only.
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
    $bak = "$Path.bak-layout"
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

$panel = Join-Path $ProjectRoot "src\components\AlertsPanel.tsx"
if (-not (Test-Path $panel)) { throw "Not found: $panel" }

if (-not (Read-Src $panel).Text.Contains('const tgWatch')) {
    throw "Run Fix-TelegramStatus.ps1 first (this patch builds on it)."
}

Write-Host "`n--- AlertsPanel.tsx ---"

Edit-Lines -Path $panel -Label "state: details open/closed (closed by default)" `
    -Marker 'setTgOpen' `
    -Anchor 'const [tgStatus, setTgStatus] = useState("");' -Mode After -NewText @'
    const [tgOpen, setTgOpen] = useState(false);
'@

Edit-Lines -Path $panel -Label "Details button in the Telegram row" `
    -Marker 'Hide details' `
    -Anchor '<span style={{ color: "#888" }}>{tgStatus}</span>' -Mode Before -NewText @'
                <button
                    onClick={() => setTgOpen((open) => !open)}
                    style={{
                        background: "transparent", border: "1px solid #333", color: "#999",
                        borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "2px 8px"
                    }}
                >
                    {tgOpen ? "Hide details" : "Details"}
                </button>
'@

Edit-Lines -Path $panel -Label "watcher list only visible when Details is open" `
    -Marker 'display: tgOpen' `
    -Anchor 'fontSize: 10, color: "#888", maxHeight: 96, overflowY: "auto"' -Mode Replace -NewText @'
                    fontSize: 10, color: "#888", maxHeight: 96, overflowY: "auto",
                    display: tgOpen ? "block" : "none"
'@

Edit-Lines -Path $panel -Label "Telegram row wraps on a narrow panel" `
    -Marker 'flexWrap: "wrap"' `
    -Anchor 'display: "flex", alignItems: "center", gap: 8,' -Mode Replace -NewText @'
                    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
'@

$f = (Read-Src $panel).Text
Write-Host ""
if ($f.Contains('setTgOpen') -and $f.Contains('Hide details') -and $f.Contains('display: tgOpen') -and $f.Contains('flexWrap: "wrap"')) {
    Write-Host "VERIFIED: compact Telegram row in place" -ForegroundColor Green
}
else {
    Write-Warning "Something is missing - send me the output above."
}

Write-Host "`nNext: npm run build, then Ctrl+F5." -ForegroundColor Cyan
