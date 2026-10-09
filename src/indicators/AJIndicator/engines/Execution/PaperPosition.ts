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