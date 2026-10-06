#=====================================================================
# Fix-TelegramTestButton.ps1
#
# The Test button in the Alerts panel only said "failed - check server setup".
# After this patch it says WHY, for example:
#
#   sent ✓
#   failed: HTTP 404 (route not mounted - restart the server)
#   failed: HTTP 503 - Telegram is not configured on the server (.env not loaded?)
#   failed: HTTP 502 (server not reachable - is it running?)
#   failed: HTTP 502 - Telegram rejected the message        <- bad token / chat id
#   failed: could not reach the server
#
# Edits: src\services\TelegramNotifier.ts (one new method)
#        src\components\AlertsPanel.tsx   (Test button uses it)
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
    $bak = "$Path.bak-testbtn"
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

$svc   = Join-Path $ProjectRoot "src\services\TelegramNotifier.ts"
$panel = Join-Path $ProjectRoot "src\components\AlertsPanel.tsx"

foreach ($p in @($svc, $panel)) {
    if (-not (Test-Path $p)) { throw "Not found: $p (run Fix-TelegramAlerts.ps1 first)" }
}

Write-Host "`n--- TelegramNotifier.ts ---"

Edit-Lines -Path $svc -Label "testDetailed() - explains why the test failed" `
    -Marker 'testDetailed' `
    -Anchor 'onTick(t: TelegramTick) {' -Mode Before -NewText @'
    // Same request as sendTest(), but returns a short reason for the Test button.
    async testDetailed(): Promise<string> {

        try {

            const response = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "TEST" })
            });

            if (response.ok) {
                return "sent \u2713";
            }

            let detail = "";

            try {
                const body = await response.json();
                detail = body?.error ? " - " + String(body.error) : "";
            } catch {
                // no JSON body: the reply came from a proxy, not from our route
            }

            let hint = "";

            if (response.status === 404) {
                hint = " (route not mounted - restart the server)";
            } else if (response.status === 502 && detail === "") {
                hint = " (server not reachable - is it running?)";
            }

            return "failed: HTTP " + response.status + detail + hint;

        } catch {

            return "failed: could not reach the server";

        }

    }

'@

Write-Host "`n--- AlertsPanel.tsx ---"

Replace-Block -Path $panel -Label "Test button shows the reason" `
    -Marker 'testDetailed()' `
    -StartAnchor 'const ok = await TelegramNotifier.sendTest();' `
    -EndAnchor 'setTgStatus(ok ? "sent \u2713" : "failed - check server setup");' -NewText @'
                        setTgStatus(await TelegramNotifier.testDetailed());
'@

$f1 = (Read-Src $svc).Text
$f2 = (Read-Src $panel).Text
$ok = $f1.Contains('async testDetailed()') -and $f2.Contains('TelegramNotifier.testDetailed()')

Write-Host ""
if ($ok) { Write-Host "VERIFIED: Test button now explains failures" -ForegroundColor Green }
else     { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext: npm run build, hard-refresh (Ctrl+F5), click Test." -ForegroundColor Cyan
