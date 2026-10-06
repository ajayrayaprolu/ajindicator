#=====================================================================
# Fix-E2ETelegramDryRun.ps1     (run AFTER Fix-E2EDiagnostics.ps1 and Fix-TelegramSafety.ps1)
#
# Adds a Telegram DRY RUN to scripts\aj-e2e-test.ts. On every bar the REAL
# src\services\TelegramNotifier.ts receives the same fields ChartEngine reads
# from runtimePanel (entry, SL, TP1-3, executionAllowed) plus the bar's
# price/high/low. Its calls to /api/telegram are intercepted, so NOTHING is
# sent to Telegram - the run just prints every message it WOULD have sent:
#
#      TELEGRAM >> bar 88 {"type":"ENTRY","underlying":"NIFTY",...}
#
# Run it on an OPTION symbol (the notifier ignores spot charts):
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
    $bak = "$Path.bak-tgdry"
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

if (-not (Read-Src $test).Text.Contains('DIAG result keys')) {
    throw "Run Fix-E2EDiagnostics.ps1 first (this patch builds on it)."
}

Write-Host "`n--- scripts\aj-e2e-test.ts ---"

Edit-Lines -Path $test -Label "telegram dry-run helper" `
    -Marker 'initTelegramDryRun' `
    -Anchor 'const SYMBOL = process.argv[4] ?? "NIFTY"; // AJ DIAG: optional 4th arg, e.g. "NIFTY 06OCT 22550PE"' -Mode After -NewText @'

// AJ TG: Telegram dry-run. The REAL TelegramNotifier runs on every bar's engine
// result; its fetch("/api/telegram/...") is intercepted, so NOTHING is sent.
const TG_SENT: any[] = [];
let tg: any = null;
let tgBar = 0;

async function initTelegramDryRun() {
    const realFetch = globalThis.fetch.bind(globalThis);
    (globalThis as any).fetch = async (url: any, init?: any) => {
        if (String(url).startsWith("/api/telegram")) {
            const payload = JSON.parse(init.body);
            TG_SENT.push({ bar: tgBar, ...payload });
            console.log(`     TELEGRAM >> bar ${tgBar} ${JSON.stringify(payload)}`);
            return { ok: true } as any;
        }
        return realFetch(url, init);
    };
    const mod = await import("../src/services/TelegramNotifier");
    tg = mod.TelegramNotifier;
}
'@

Edit-Lines -Path $test -Label "init dry-run before the scenarios" `
    -Marker 'await initTelegramDryRun();' `
    -Anchor 'console.log(`Log file: ${LOG_PATH}`);' -Mode After -NewText @'
    await initTelegramDryRun();
'@

Edit-Lines -Path $test -Label "feed every bar to the notifier" `
    -Marker 'tg?.onTick' `
    -Anchor 'const auth = result?.executionAllowed ? "PASS" : "WAIT";' -Mode After -NewText @'

            // AJ TG: same fields ChartEngine reads from runtimePanel
            tgBar = i;
            tg?.onTick({
                symbol: SYMBOL,
                entry: Number(result?.entryPrice),
                stopLoss: Number(result?.stopLoss),
                tps: [Number(result?.tp1), Number(result?.tp2), Number(result?.tp3)],
                executionAllowed: result?.executionAllowed === true,
                price: cur.close,
                high: cur.high,
                low: cur.low
            });
'@

Edit-Lines -Path $test -Label "dry-run summary" `
    -Marker 'TELEGRAM DRY-RUN:' `
    -Anchor 'console.log("STATE DWELL (bars): " + JSON.stringify(stateBars));' -Mode After -NewText @'
    console.log(`TELEGRAM DRY-RUN: ${TG_SENT.length} message(s) would have been sent for this run`);
    if (!/(CE|PE)$/i.test(SYMBOL)) {
        console.log("(spot symbol: Telegram only fires on option charts - pass one as the 4th argument)");
    }
'@

$final = (Read-Src $test).Text
$need = @('initTelegramDryRun', 'await initTelegramDryRun();', 'tg?.onTick', 'TELEGRAM DRY-RUN:')
$missing = $need | Where-Object { -not $final.Contains($_) }

Write-Host ""
if (@($missing).Count -eq 0) { Write-Host "VERIFIED: Telegram dry-run is in place" -ForegroundColor Green }
else { Write-Warning ("Missing: " + ($missing -join ", ")) }

Write-Host "`nRun from C:\AI-Institutional:" -ForegroundColor Cyan
Write-Host '  $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/aj-e2e-test.ts live indstocks "NIFTY 06OCT 22550PE"' -ForegroundColor Cyan
