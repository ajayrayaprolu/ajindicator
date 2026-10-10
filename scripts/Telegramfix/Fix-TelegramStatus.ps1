#=====================================================================
# Fix-TelegramStatus.ps1
#
# Adds a live "what is the Telegram watcher seeing?" list to the Alerts
# panel, one line per option chart, refreshed every 2 seconds:
#
#   NIFTY 06OCT 22550PE - no signal | entry - | SL - | TP1 - | price 77.4 | 3s ago
#   NIFTY 06OCT 22550PE - ENTRY sent, targets hit 1/3 | entry 95.35 | SL 71.53 | TP1 131.07 | price 120 | 2s ago
#   NIFTY 06OCT 22500CE - signal ON (not announced) | entry 114.05 | SL 90.88 | TP1 148.81 | price 113.2 | 1s ago
#
# This is how you SEE whether the engine really feeds the notifier:
#   - entry / SL / TP1 showing "-" while a plan is on the dashboard means the
#     field names the notifier reads do not match your engine (tell me)
#   - "Ns ago" growing means that chart stopped updating
#   - "signal ON (not announced)" means the plan was already active when the
#     page loaded, or its price is already past SL/TP1 - by design not sent
#
# Edits: src\services\TelegramNotifier.ts, src\components\AlertsPanel.tsx
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
    $bak = "$Path.bak-status"
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

$svc   = Join-Path $ProjectRoot "src\services\TelegramNotifier.ts"
$panel = Join-Path $ProjectRoot "src\components\AlertsPanel.tsx"

foreach ($p in @($svc, $panel)) {
    if (-not (Test-Path $p)) { throw "Not found: $p (run the earlier Telegram scripts first)" }
}

if (-not (Read-Src $svc).Text.Contains('private idleSeen')) {
    throw "Run Fix-TelegramSafety.ps1 first (this patch builds on it)."
}

Write-Host "`n--- TelegramNotifier.ts ---"

Edit-Lines -Path $svc -Label "lastTick memory" `
    -Marker 'private lastTick' `
    -Anchor 'private idleSeen: Set<string> = new Set();' -Mode After -NewText @'
    private lastTick: Record<string, {
        executionAllowed: boolean;
        entry: number;
        stopLoss: number;
        tp1: number;
        price: number;
        at: number;
    }> = {};
'@

Edit-Lines -Path $svc -Label "getStatus() for the panel" `
    -Marker 'getStatus()' `
    -Anchor 'onTick(t: TelegramTick) {' -Mode Before -NewText @'
    // One line per option chart seen so far (shown in the Alerts panel).
    getStatus(): { symbol: string; line: string }[] {

        const num = (n: number) =>
            Number.isFinite(n) && n > 0 ? String(Number(n.toFixed(2))) : "-";

        return Object.keys(this.lastTick)
            .filter((symbol) => parseOptionSymbol(symbol) !== null)
            .sort()
            .map((symbol) => {

                const k = this.lastTick[symbol];
                const opt = parseOptionSymbol(symbol);

                const trade = opt
                    ? Object.values(this.trades).find(
                        (r) => r.contract === contractKey(opt) && !r.closed
                    )
                    : undefined;

                const hits = trade
                    ? (["t1", "t2", "t3"] as Stage[]).filter((s) => trade.sent[s]).length
                    : 0;

                const state = !this.isEnabled()
                    ? "Telegram switch is OFF"
                    : trade
                        ? "ENTRY sent, targets hit " + hits + "/3"
                        : k.executionAllowed
                            ? "signal ON (not announced)"
                            : "no signal";

                const ago = Math.max(0, Math.round((Date.now() - k.at) / 1000));

                return {
                    symbol,
                    line:
                        state +
                        " | entry " + num(k.entry) +
                        " | SL " + num(k.stopLoss) +
                        " | TP1 " + num(k.tp1) +
                        " | price " + num(k.price) +
                        " | " + ago + "s ago"
                };

            });

    }

'@

Edit-Lines -Path $svc -Label "record every tick" `
    -Marker 'this.lastTick[t.symbol]' `
    -Anchor 'onTick(t: TelegramTick) {' -Mode After -NewText @'

        this.lastTick[t.symbol] = {
            executionAllowed: t.executionAllowed,
            entry: t.entry,
            stopLoss: t.stopLoss,
            tp1: t.tps[0],
            price: t.price ?? NaN,
            at: Date.now()
        };
'@

Write-Host "`n--- AlertsPanel.tsx ---"

Edit-Lines -Path $panel -Label "panel: refresh every 2 seconds" `
    -Marker 'window.setInterval' `
    -Anchor 'const [tgStatus, setTgStatus] = useState("");' -Mode After -NewText @'

    useEffect(() => {
        const timer = window.setInterval(() => forceRender((n) => n + 1), 2000);
        return () => window.clearInterval(timer);
    }, []);
'@

Edit-Lines -Path $panel -Label "panel: read watcher status" `
    -Marker 'const tgWatch' `
    -Anchor 'const triggered: PriceAlert[] = AlertStore.getTriggered();' -Mode After -NewText @'
    const tgWatch = TelegramNotifier.getStatus();
'@

Edit-Lines -Path $panel -Label "panel: watcher list under the Telegram row" `
    -Marker 'Telegram watcher' `
    -Anchor '<div style={{ display: "flex", borderBottom: "1px solid #333", flexShrink: 0 }}>' -Mode Before -NewText @'
            <div
                style={{
                    padding: "4px 10px", borderBottom: "1px solid #333", flexShrink: 0,
                    fontSize: 10, color: "#888", maxHeight: 96, overflowY: "auto"
                }}
            >
                {tgWatch.length === 0 && (
                    <div>Telegram watcher: no option chart has reported yet (needs the AJ indicator on an option chart).</div>
                )}
                {tgWatch.map((s) => (
                    <div key={s.symbol}>
                        <span style={{ color: "#bbb" }}>{s.symbol}</span> - {s.line}
                    </div>
                ))}
            </div>
'@

$f1 = (Read-Src $svc).Text
$f2 = (Read-Src $panel).Text
$ok = $f1.Contains('private lastTick') -and $f1.Contains('getStatus()') -and $f1.Contains('this.lastTick[t.symbol]') -and
      $f2.Contains('window.setInterval') -and $f2.Contains('const tgWatch') -and $f2.Contains('Telegram watcher')

Write-Host ""
if ($ok) { Write-Host "VERIFIED: Telegram watcher list is in place" -ForegroundColor Green }
else     { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext: npm run build, hard-refresh (Ctrl+F5), open the bell panel." -ForegroundColor Cyan
