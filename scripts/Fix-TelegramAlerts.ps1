#=====================================================================
# Fix-TelegramAlerts.ps1   (FRONTEND half - needs telegramRoute.js on the server)
#
#   NEW   src\services\TelegramNotifier.ts
#   EDIT  src\charts\ChartEngine.tsx          (import + one effect)
#   EDIT  src\components\AlertsPanel.tsx      (Telegram on/off + Test button)
#
# Messages are sent ONLY for option charts (symbol like "NIFTY 06OCT 22550PE"):
#   1) when AJ suggests a trade  -> Entry / Target / Stop Loss message
#   2) when price reaches TP1/TP2/TP3 -> "Target ... Done" message
#
# Safe to re-run: marker checks, exact-one-match anchors, one-time backup.
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
    $bak = "$Path.bak-telegram"
    if (-not (Test-Path $bak)) { Copy-Item $Path $bak }
    [IO.File]::WriteAllText($Path, ($Src.Lines -join $Src.Nl), $Src.Enc)
}

function Edit-Lines {
    param(
        [string]$Path,
        [string]$Label,
        [string]$Marker,
        [string]$Anchor,
        [ValidateSet("After", "Before", "Replace")][string]$Mode,
        [string]$NewText
    )

    $src = Read-Src $Path

    if ($src.Text.Contains($Marker)) {
        Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow
        return
    }

    $hits = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq $Anchor) { $hits += $i }
    }

    if ($hits.Count -ne 1) {
        Write-Warning "[$Label] anchor matched $($hits.Count) times (need exactly 1) - skipped"
        return
    }

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

function New-SrcFile([string]$Path, [string]$Content, [string]$Label) {
    if (Test-Path $Path) {
        Write-Host "SKIP  [$Label] (file already exists)" -ForegroundColor DarkYellow
        return
    }
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    [IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$engine = Join-Path $ProjectRoot "src\charts\ChartEngine.tsx"
$panel  = Join-Path $ProjectRoot "src\components\AlertsPanel.tsx"
$svc    = Join-Path $ProjectRoot "src\services\TelegramNotifier.ts"

foreach ($p in @($engine, $panel)) {
    if (-not (Test-Path $p)) { throw "Not found: $p  (run the earlier alert scripts first / use -ProjectRoot)" }
}

#=====================================================================
# NEW: TelegramNotifier.ts
#=====================================================================

Write-Host "`n--- New file ---"

$notifier = @'
//=====================================
// src/services/TelegramNotifier.ts
//=====================================
//
// Decides WHEN to send a Telegram message; the server
// (telegramRoute.js) owns the bot token and the message text.
//
// Option charts only: the chart symbol must look like
// "NIFTY 06OCT 22550PE" (the canonical option format).
//
//   ENTRY  - first time a valid trade (SL < entry < TP1) is suggested
//   TARGET - when the option's last candle high reaches TP1 / TP2 / TP3
//
// Sent-state is kept in localStorage, so a page refresh or a second
// chart on the same option never repeats a message.
//=====================================

const ENDPOINT = "/api/telegram/signal";
const ENABLED_KEY = "ajTelegramEnabled";
const TRADES_KEY = "ajTelegramTrades";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30000;
const TRADE_TTL_MS = 2 * 24 * 60 * 60 * 1000;

type Stage = "entry" | "t1" | "t2" | "t3";

export interface OptionParts {
    underlying: string;
    expiry: string;
    strike: number;
    optionType: "CE" | "PE";
}

export interface TelegramTick {
    symbol: string;
    entry: number;
    stopLoss: number;
    tps: number[];
    executionAllowed: boolean;
    price: number | null;
    high: number | null;
    low: number | null;
}

interface TradeRecord {
    symbol: string;
    opt: OptionParts;
    entry: number;
    stopLoss: number;
    tps: number[];
    createdAt: number;
    closed: boolean;
    sent: Record<Stage, boolean>;
    fails: Record<Stage, number>;
}

export function parseOptionSymbol(symbol: string): OptionParts | null {

    const m = /^([A-Z0-9&-]+)\s+(\d{1,2}[A-Z]{3})\s+(\d+(?:\.\d+)?)\s*(CE|PE)$/.exec(
        String(symbol ?? "").trim().toUpperCase()
    );

    if (!m) {
        return null;
    }

    return {
        underlying: m[1],
        expiry: m[2],
        strike: Number(m[3]),
        optionType: m[4] as "CE" | "PE"
    };
}

function loadTrades(): Record<string, TradeRecord> {
    try {
        const raw = window.localStorage.getItem(TRADES_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const now = Date.now();
        const kept: Record<string, TradeRecord> = {};

        Object.keys(parsed ?? {}).forEach((key) => {
            if (now - Number(parsed[key]?.createdAt ?? 0) < TRADE_TTL_MS) {
                kept[key] = parsed[key];
            }
        });

        return kept;
    } catch {
        return {};
    }
}

class TelegramNotifierImpl {

    private trades: Record<string, TradeRecord> = loadTrades();

    isEnabled(): boolean {
        try {
            return window.localStorage.getItem(ENABLED_KEY) !== "0";
        } catch {
            return true;
        }
    }

    setEnabled(enabled: boolean) {
        try {
            window.localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
        } catch {
            // ignore
        }
    }

    async sendTest(): Promise<boolean> {
        return this.post({ type: "TEST" });
    }

    onTick(t: TelegramTick) {

        if (!this.isEnabled()) {
            return;
        }

        const opt = parseOptionSymbol(t.symbol);

        if (!opt) {
            return; // not an option chart
        }

        //--------------------------------------------------
        // A) existing trades on this chart's option:
        //    deliver entry (if it failed), then target hits
        //--------------------------------------------------

        const hi = Math.max(
            t.high ?? -Infinity,
            t.price ?? -Infinity
        );

        const lo = Math.min(
            t.low ?? Infinity,
            t.price ?? Infinity
        );

        Object.values(this.trades)
            .filter((r) => r.symbol === t.symbol && !r.closed)
            .forEach((rec) => {

                if (!rec.sent.entry) {
                    this.fire(rec, "entry");
                    return;
                }

                if (lo <= rec.stopLoss) {
                    rec.closed = true; // stopped out - no more target messages
                    this.save();
                    return;
                }

                (["t1", "t2", "t3"] as Stage[]).forEach((stage, i) => {

                    const target = rec.tps[i];

                    if (
                        target > 0 &&
                        !rec.sent[stage] &&
                        hi >= target
                    ) {
                        this.fire(rec, stage);
                    }

                });

                if (rec.sent.t3) {
                    rec.closed = true;
                    this.save();
                }

            });

        //--------------------------------------------------
        // B) new trade suggested?
        //--------------------------------------------------

        if (!t.executionAllowed) {
            return;
        }

        const tp1 = t.tps[0];

        const valid =
            t.entry > 0 &&
            t.stopLoss > 0 &&
            tp1 > 0 &&
            t.stopLoss < t.entry &&
            t.entry < tp1;

        if (!valid) {
            return;
        }

        const key = [
            opt.underlying, opt.expiry, opt.strike, opt.optionType,
            t.entry, t.stopLoss, tp1
        ].join("|");

        if (this.trades[key]) {
            return;
        }

        const rec: TradeRecord = {
            symbol: t.symbol,
            opt,
            entry: t.entry,
            stopLoss: t.stopLoss,
            tps: t.tps.map((v) => (Number.isFinite(v) ? v : 0)),
            createdAt: Date.now(),
            closed: false,
            sent: { entry: false, t1: false, t2: false, t3: false },
            fails: { entry: 0, t1: 0, t2: 0, t3: 0 }
        };

        this.trades[key] = rec;

        this.fire(rec, "entry");
    }

    private fire(rec: TradeRecord, stage: Stage) {

        rec.sent[stage] = true; // mark first so ticks never double-send
        this.save();

        const index = stage === "entry" ? 1 : Number(stage.slice(1));

        const payload =
            stage === "entry"
                ? {
                    type: "ENTRY",
                    underlying: rec.opt.underlying,
                    strike: rec.opt.strike,
                    optionType: rec.opt.optionType,
                    entry: rec.entry,
                    stopLoss: rec.stopLoss,
                    target: rec.tps[0]
                }
                : {
                    type: "TARGET",
                    underlying: rec.opt.underlying,
                    strike: rec.opt.strike,
                    optionType: rec.opt.optionType,
                    target: rec.tps[index - 1],
                    targetIndex: index
                };

        void this.post(payload).then((ok) => {

            if (ok) {
                return;
            }

            rec.fails[stage] += 1;

            if (rec.fails[stage] < MAX_RETRIES) {
                window.setTimeout(() => {
                    rec.sent[stage] = false;
                    this.save();
                }, RETRY_DELAY_MS);
            }

        });
    }

    private async post(payload: Record<string, unknown>): Promise<boolean> {
        try {
            const response = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    private save() {
        try {
            window.localStorage.setItem(TRADES_KEY, JSON.stringify(this.trades));
        } catch {
            // localStorage unavailable - in-memory state still works this session
        }
    }
}

export const TelegramNotifier = new TelegramNotifierImpl();
'@

New-SrcFile -Path $svc -Content $notifier -Label "new src\services\TelegramNotifier.ts"

#=====================================================================
# ChartEngine.tsx
#=====================================================================

Write-Host "`n--- ChartEngine.tsx ---"

Edit-Lines -Path $engine -Label "import TelegramNotifier" `
    -Marker 'from "../services/TelegramNotifier"' `
    -Anchor 'import { AlertStore } from "../store/AlertStore";' -Mode After -NewText @'
import { TelegramNotifier } from "../services/TelegramNotifier";
'@

Edit-Lines -Path $engine -Label "telegram effect (trade suggested / target hit)" `
    -Marker 'TELEGRAM: trade-suggested' `
    -Anchor '}, [latestClose, symbol]);' -Mode After -NewText @'

    //--------------------------------------------------
    // TELEGRAM: trade-suggested / target-hit messages
    // (option charts only - TelegramNotifier ignores the rest)
    //--------------------------------------------------

    useEffect(() => {

        if (!indicators.ajindicator) {
            return;
        }

        const panel = hostResult?.runtimePanel;

        const last =
            candles.length > 0
                ? candles[candles.length - 1]
                : null;

        TelegramNotifier.onTick({
            symbol,
            entry: Number(panel?.entryPrice),
            stopLoss: Number(panel?.stopLoss),
            tps: [
                Number(panel?.tp1),
                Number(panel?.tp2),
                Number(panel?.tp3)
            ],
            executionAllowed: panel?.executionAllowed === true,
            price: latestClose,
            high: last ? Number(last.high) : null,
            low: last ? Number(last.low) : null
        });

    }, [hostResult, candles, latestClose, symbol, indicators.ajindicator]);
'@

#=====================================================================
# AlertsPanel.tsx : on/off + test button
#=====================================================================

Write-Host "`n--- AlertsPanel.tsx ---"

Edit-Lines -Path $panel -Label "panel: import TelegramNotifier" `
    -Marker 'from "../services/TelegramNotifier"' `
    -Anchor 'import { AlertStore, type PriceAlert } from "../store/AlertStore";' -Mode After -NewText @'
import { TelegramNotifier } from "../services/TelegramNotifier";
'@

Edit-Lines -Path $panel -Label "panel: telegram state" `
    -Marker 'setTgOn' `
    -Anchor 'const [tick, forceRender] = useState(0);' -Mode After -NewText @'
    const [tgOn, setTgOn] = useState(TelegramNotifier.isEnabled());
    const [tgStatus, setTgStatus] = useState("");
'@

Edit-Lines -Path $panel -Label "panel: telegram row (toggle + test)" `
    -Marker 'Telegram trade alerts' `
    -Anchor '<div style={{ display: "flex", borderBottom: "1px solid #333", flexShrink: 0 }}>' -Mode Before -NewText @'
            <div
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", borderBottom: "1px solid #333",
                    flexShrink: 0, fontSize: 11
                }}
            >
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#bbb" }}>
                    <input
                        type="checkbox"
                        checked={tgOn}
                        onChange={(e) => {
                            TelegramNotifier.setEnabled(e.target.checked);
                            setTgOn(e.target.checked);
                        }}
                    />
                    Telegram trade alerts
                </label>
                <button
                    onClick={async () => {
                        setTgStatus("sending...");
                        const ok = await TelegramNotifier.sendTest();
                        setTgStatus(ok ? "sent \u2713" : "failed - check server setup");
                    }}
                    style={{
                        background: "transparent", border: "1px solid #333", color: "#999",
                        borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "2px 8px"
                    }}
                >
                    Test
                </button>
                <span style={{ color: "#888" }}>{tgStatus}</span>
            </div>
'@

$f1 = (Read-Src $engine).Text
$f2 = (Read-Src $panel).Text
$ok = $f1.Contains('TELEGRAM: trade-suggested') -and $f1.Contains('from "../services/TelegramNotifier"') -and
      $f2.Contains('Telegram trade alerts') -and $f2.Contains('setTgOn') -and (Test-Path $svc)

Write-Host ""
if ($ok) { Write-Host "VERIFIED: frontend pieces are in place" -ForegroundColor Green }
else     { Write-Warning "Something is missing - send me the output above." }

Write-Host "`nNext: add telegramRoute.js + .env on the SERVER (see chat), then npm run build." -ForegroundColor Cyan
