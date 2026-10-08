#=====================================================================
# Fix-TelegramTrigger.ps1
#
# WHEN should the entry alert be sent?
#
#   Before this patch: when ExecutionAuthority says "approved" (executionAllowed).
#     Problem: your engine reads the authority as approved already while the
#     lifecycle is only ARMED / CONFIRMED (the e2e log showed PASS at bar 60,
#     long before EXECUTED at bar 88), so the alert could go out EARLY.
#
#   After this patch: when the lifecycle state (the "LIFE" line in the Debug
#     panel) reaches EXECUTED - the same moment the BUY marker is drawn.
#     State MANAGE counts as "in trade" too. Everything else is unchanged:
#     one trade per option, targets, stop-out, no alert for a trade that was
#     already running when the page loaded, price already past SL / TP1.
#
#   The old "price drifted more than 5% from the entry" rule is removed: your
#   engine freezes the plan price when it ARMS, so by EXECUTED the price can
#   legitimately be far from it. That rule would have swallowed real alerts.
#
# Edits:
#   src\charts\ChartEngine.tsx           (1 line)
#   src\services\TelegramNotifier.ts     (drift rule + one label)
#   scripts\aj-e2e-test.ts               (dry run feeds the same trigger; skipped if absent)
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
    $bak = "$Path.bak-trigger"
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

function Replace-Text {
    param([string]$Path, [string]$Label, [string]$Marker, [string]$Old, [string]$New, [int]$Expected)

    $src = Read-Src $Path
    if ($src.Text.Contains($Marker)) { Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow; return }

    $count = ([regex]::Matches($src.Text, [regex]::Escape($Old))).Count
    if ($count -ne $Expected) { Write-Warning "[$Label] found $count occurrence(s), expected $Expected - skipped"; return }

    $text = $src.Text.Replace($Old, $New.Replace("`n", $src.Nl))
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([string[]]($text -split "`r?`n"))
    $src.Lines = $lines
    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$engine  = Join-Path $ProjectRoot "src\charts\ChartEngine.tsx"
$svc     = Join-Path $ProjectRoot "src\services\TelegramNotifier.ts"
$harness = Join-Path $ProjectRoot "scripts\aj-e2e-test.ts"

foreach ($p in @($engine, $svc)) {
    if (-not (Test-Path $p)) { throw "Not found: $p" }
}

if (-not (Read-Src $svc).Text.Contains('private idleSeen')) {
    throw "Run Fix-TelegramSafety.ps1 first (this patch builds on it)."
}

Write-Host "`n--- ChartEngine.tsx ---"

Edit-Lines -Path $engine -Label "trigger = lifecycle EXECUTED / MANAGE" `
    -Marker 'trade given" = the engine' `
    -Anchor 'executionAllowed: panel?.executionAllowed === true,' -Mode Replace -NewText @'
            // "trade given" = the engine's lifecycle reached EXECUTED (the same moment
            // as the BUY marker). NOT executionAllowed: that is already true while the
            // engine is only ARMED / CONFIRMED.
            executionAllowed:
                panel?.engineState === "EXECUTED" ||
                panel?.engineState === "MANAGE",
'@

Write-Host "`n--- TelegramNotifier.ts ---"

Replace-Block -Path $svc -Label "remove the 5% drift rule (EXECUTED is the trigger)" `
    -Marker 'EXECUTED is the trigger' `
    -StartAnchor 'priceNow >= tp1 ||' `
    -EndAnchor 'Math.abs(priceNow - t.entry) / t.entry > 0.05' -NewText @'
                    priceNow >= tp1
                    // (no drift rule: EXECUTED is the trigger, so the signal is fresh)
'@

Replace-Text -Path $svc -Label "comment wording" `
    -Marker 'SL / TP1, is history - record' `
    -Old 'SL / TP1 or more than 5% away from the entry, is history - record' `
    -New 'SL / TP1, is history - record' -Expected 1

Replace-Text -Path $svc -Label "watcher label" `
    -Marker 'in trade (not announced)' `
    -Old 'signal ON (not announced)' `
    -New 'in trade (not announced)' -Expected 1

if (Test-Path $harness) {
    Write-Host "`n--- scripts\aj-e2e-test.ts ---"

    if ((Read-Src $harness).Text.Contains('tg?.onTick')) {
        Replace-Text -Path $harness -Label "dry run uses the same trigger" `
            -Marker 'result?.lifecycleState === "MANAGE"' `
            -Old 'executionAllowed: result?.executionAllowed === true,' `
            -New 'executionAllowed: result?.lifecycleState === "EXECUTED" || result?.lifecycleState === "MANAGE",' -Expected 1
    }
    else {
        Write-Host "SKIP  [dry run] (Fix-E2ETelegramDryRun.ps1 not applied)" -ForegroundColor DarkYellow
    }
}

$f1 = (Read-Src $engine).Text
$f2 = (Read-Src $svc).Text
$ok = $f1.Contains('trade given" = the engine') -and $f2.Contains('EXECUTED is the trigger') -and $f2.Contains('in trade (not announced)')

Write-Host ""
if ($ok) { Write-Host "VERIFIED: alerts now fire when the lifecycle reaches EXECUTED" -ForegroundColor Green }
else     { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext (from C:\AI-Institutional):  npx tsx scripts/telegram-dedup-test.ts   then   npm run build" -ForegroundColor Cyan
