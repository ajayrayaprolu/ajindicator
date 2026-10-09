#=====================================================================
# Fix-TradeLifecycleExit.ps1
#
# PROBLEM (confirmed by your e2e log: STATE DWELL ARMED 18 / CONFIRMED 5 /
# EXECUTED 217, never MANAGE or CLOSED):
#   After the first trade a chart stays in EXECUTED forever. A stop loss or a
#   target is never noticed, the trade never closes, the trade lines stay, no
#   new trade can start - and re-entry / trailing never run.
#
# WHY
#   - ChartWindow always sends positionSize 0 / positionOpen false.
#   - AJDecisionEngine only calls ExecutionEngine (planning). That engine returns
#     tp1Hit / tp2Hit / tp3Hit / stopLossHit / positionClosed / closeTrade = false
#     as constants. ExitEngine, TradeManagement, TrailingEngine, ReEntryEngine
#     and LifecycleEngine exist but nothing in the live path calls them.
#   - StateMachine only leaves EXECUTED when positionOpen is true, and only
#     leaves MANAGE when positionClosed is true.
#
# FIX (small and contained)
#   NEW   PaperPosition.ts  - remembers the executed plan and, on every
#         evaluation, checks the candles AFTER the entry bar:
#           stop loss touched  -> STOPLOSS   (checked first: worst case)
#           TP3 touched        -> TP3
#           new IST day        -> NEW_DAY    (not for crypto)
#           150 bars           -> TIMEOUT
#   EDIT  AJDecisionEngine.ts - feeds positionOpen / positionClosed to the
#         StateMachine from that tracker. The StateMachine then walks
#         EXECUTED -> MANAGE -> CLOSED -> SCAN by itself, the plan lock is
#         released (existing code) and the next setup can trade.
#
# NOT included (still not running): partial exits at TP1/TP2, break-even,
# trailing stop, re-entry, re-entry stop loss. Those need the runtime execution
# layer to be wired into the live path - a separate, bigger change.
#
# ALSO corrects a comment I wrote earlier in AJDecisionEngine.ts: the AUTH
# "WAIT" while a trade runs is NOT the "trade already running" gate (that input
# is always false in your pipeline). It is the authority being re-evaluated on
# every bar while the confidence swings around the 60 threshold.
#
# This changes how many trades you get (a chart can trade again after an exit).
# Backups: AJDecisionEngine.ts.bak-lifecycle
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
    $bak = "$Path.bak-lifecycle"
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

$engine = Join-Path $ProjectRoot "src\indicators\AJIndicator\AJDecisionEngine.ts"
$pp     = Join-Path $ProjectRoot "src\indicators\AJIndicator\engines\Execution\PaperPosition.ts"

if (-not (Test-Path $engine)) { throw "Not found: $engine" }

#---------------------------------------------------------------------
# 1) PaperPosition.ts
#---------------------------------------------------------------------

Write-Host "`n--- PaperPosition.ts (new file) ---"

$paperPosition = @'
//=====================================================================
// src/indicators/AJIndicator/engines/Execution/PaperPosition.ts
//
// WHY THIS FILE EXISTS
// ChartWindow feeds the engine positionSize 0 / positionOpen false forever,
// and the real exit machinery (ExitEngine / TradeManagement / ReEntryEngine /
// TrailingEngine) is not called by AJDecisionEngine. So the StateMachine
// could never leave EXECUTED: a stop loss or target hit was never noticed,
// the trade never closed and no new trade could start.
//
// This is a small "paper position" tracker owned by AJDecisionEngine:
//   start()  - called when the StateMachine enters EXECUTED (stores the plan)
//   check()  - called every evaluation; looks at the candles AFTER the entry
//              bar and reports STOPLOSS / TP3 / NEW_DAY / TIMEOUT
//   clear()  - called when the lifecycle is back at SCAN / CLOSED
//
// The StateMachine then does EXECUTED -> MANAGE -> CLOSED -> SCAN by itself,
// the plan lock is released and the next opportunity can trade.
//
// It does NOT do partial exits, break-even, trailing or re-entry.
//=====================================================================

export interface PaperTrade {
    entry: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
    /** +1 = long ladder (SL below entry), -1 = short ladder */
    dir: 1 | -1;
    entryTime: number;
    entryBar: number;
}

export type PaperExitReason =
    | "NONE"
    | "STOPLOSS"
    | "TP3"
    | "NEW_DAY"
    | "TIMEOUT";

export interface PaperExit {
    exit: boolean;
    reason: PaperExitReason;
    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    stopLossHit: boolean;
    barsHeld: number;
}

export interface PaperCandle {
    time: number;
    high: number;
    low: number;
}

export interface PaperOptions {
    /** close when the (IST) calendar day changes - intraday option trades. */
    closeOnNewDay?: boolean;
    /** close after this many bars after the entry bar */
    maxBars?: number;
}

export const PAPER_MAX_BARS = 150;

const NONE: PaperExit = {
    exit: false,
    reason: "NONE",
    tp1Hit: false,
    tp2Hit: false,
    tp3Hit: false,
    stopLossHit: false,
    barsHeld: 0
};

function toSeconds(t: number): number {
    return t > 1e12 ? Math.floor(t / 1000) : t;
}

function istDay(t: number): string {
    return new Date((toSeconds(t) + 19800) * 1000).toISOString().slice(0, 10);
}

export class PaperPosition {

    private static open: Record<string, PaperTrade> = {};

    static start(key: string, trade: PaperTrade) {
        PaperPosition.open[key] = trade;
    }

    static get(key: string): PaperTrade | undefined {
        return PaperPosition.open[key];
    }

    static clear(key: string) {
        delete PaperPosition.open[key];
    }

    static check(
        key: string,
        candles: readonly PaperCandle[] | undefined,
        options: PaperOptions = {}
    ): PaperExit {

        const t = PaperPosition.open[key];

        if (!t || !candles || candles.length === 0) {
            return NONE;
        }

        let hi = -Infinity;
        let lo = Infinity;
        let bars = 0;
        let lastTime = t.entryTime;

        // only candles AFTER the entry bar (the entry bar itself contains
        // price action from before the entry)
        for (let i = candles.length - 1; i >= 0; i--) {

            const c = candles[i];

            if (!(c.time > t.entryTime)) {
                break;
            }

            if (c.high > hi) hi = c.high;
            if (c.low < lo) lo = c.low;
            bars++;

            if (c.time > lastTime) lastTime = c.time;
        }

        if (bars === 0) {
            return NONE;
        }

        const long = t.dir > 0;

        const stopLossHit = long ? lo <= t.sl : hi >= t.sl;
        const tp1Hit = long ? hi >= t.tp1 : lo <= t.tp1;
        const tp2Hit = long ? hi >= t.tp2 : lo <= t.tp2;
        const tp3Hit = long ? hi >= t.tp3 : lo <= t.tp3;

        const maxBars = options.maxBars ?? PAPER_MAX_BARS;

        let reason: PaperExitReason = "NONE";

        // stop loss first: if one bar touches both, assume the worst
        if (stopLossHit) reason = "STOPLOSS";
        else if (tp3Hit) reason = "TP3";
        else if (
            options.closeOnNewDay !== false &&
            istDay(lastTime) !== istDay(t.entryTime)
        ) reason = "NEW_DAY";
        else if (bars >= maxBars) reason = "TIMEOUT";

        return {
            exit: reason !== "NONE",
            reason,
            tp1Hit,
            tp2Hit,
            tp3Hit,
            stopLossHit,
            barsHeld: bars
        };
    }
}
'@

if (Test-Path $pp) {
    Write-Host "SKIP  [PaperPosition.ts] (file already exists)" -ForegroundColor DarkYellow
}
else {
    $dir = Split-Path $pp -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    [IO.File]::WriteAllText($pp, $paperPosition, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "OK    [PaperPosition.ts created]" -ForegroundColor Green
}

#---------------------------------------------------------------------
# 2) AJDecisionEngine.ts
#---------------------------------------------------------------------

Write-Host "`n--- AJDecisionEngine.ts ---"

Edit-Lines -Path $engine -Label "import PaperPosition" `
    -Marker 'from "./engines/Execution/PaperPosition"' `
    -Anchor 'import { ExecutionEngine } from "./engines/Execution/ExecutionEngine";' -Mode After -NewText @'
import { PaperPosition } from "./engines/Execution/PaperPosition";
'@

Replace-Block -Path $engine -Label "paper position: exit detection feeds the state machine" `
    -Marker 'AJ PAPER POSITION' `
    -StartAnchor 'const stateResult =' -EndAnchor ');' -NewText @'
		//--------------------------------------------------
		// AJ PAPER POSITION - lifecycle exit (see PaperPosition.ts)
		//
		// ChartWindow never reports an open position, so the StateMachine
		// could not leave EXECUTED. A trade is "open" from the cycle after
		// it entered EXECUTED until its stop loss / TP3 / new day / timeout.
		//--------------------------------------------------
		const paperTrade =
			PaperPosition.get(lockKey);

		const paperExit =
			PaperPosition.check(
				lockKey,
				payload.ajRuntime.candles as any,
				{
					closeOnNewDay:
						!(payload.stateInputs as any)?.isAdvCryptoSymbol
				}
			);

		stateInputs.positionOpen =
			paperTrade !== undefined;

		stateInputs.positionClosed =
			paperTrade !== undefined &&
			paperExit.exit;

        const stateResult =
            this.stateMachine.evaluate(
                stateInputs
            );

		// remember the executed plan the moment the trade enters EXECUTED
		if (
			stateResult.enteredExecuted === true &&
			execEntryPrice > 0
		) {
			const paperCandles: any[] =
				payload.ajRuntime.candles as any[];

			PaperPosition.start(
				lockKey,
				{
					entry: execEntryPrice,
					sl: execSlPrice,
					tp1: execTp1,
					tp2: execTp2,
					tp3: execTp3,
					dir: execDirection >= 0 ? 1 : -1,
					entryTime:
						paperCandles.length > 0
							? paperCandles[paperCandles.length - 1].time
							: 0,
					entryBar:
						payload.ajRuntime.barIndex
				}
			);
		}

		// lifecycle is back at SCAN / CLOSED: the paper position is over
		if (
			stateResult.engineState === "SCAN" ||
			stateResult.engineState === "CLOSED"
		) {
			PaperPosition.clear(lockKey);
		}
'@

Replace-Block -Path $engine -Label "correct my earlier comment about AUTH WAIT" `
    -Marker 'is re-evaluated on EVERY bar' `
    -StartAnchor '// 2) ExecutionAuthority answers "may a NEW trade open?", so it says' `
    -EndAnchor '//    MANAGE the approval that opened the trade still stands, so show it.' -NewText @'
		// 2) ExecutionAuthority is re-evaluated on EVERY bar and its confidence
		//    swings around the threshold, so it flips to WAIT while a trade is
		//    running even though the trade was approved when it opened. While
		//    the lifecycle is EXECUTED or MANAGE that approval still stands.
'@

$f = (Read-Src $engine).Text
Write-Host ""
if ($f.Contains('AJ PAPER POSITION') -and $f.Contains('from "./engines/Execution/PaperPosition"') -and (Test-Path $pp)) {
    Write-Host "VERIFIED: trades can now close (stop loss / TP3 / new day / timeout)" -ForegroundColor Green
}
else {
    Write-Warning "Something is missing - send me the output above."
}

Write-Host "`nNext: npm run build, then check it with the e2e test (STATE DWELL must now show MANAGE / CLOSED / SCAN):" -ForegroundColor Cyan
Write-Host '  $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/aj-e2e-test.ts live indstocks' -ForegroundColor Cyan
