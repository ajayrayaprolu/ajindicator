/**
 * AJ v2 End-to-End Lifecycle CLI Test
 * Run:  npx tsx scripts/aj-e2e-test.ts
 * (or add "test:e2e": "tsx scripts/aj-e2e-test.ts" to package.json scripts, then: npm run test:e2e)
 *
 * Drives candles bar-by-bar through the REAL production pipeline:
 *   AJRuntimeContextBuilder.build -> AJPayloadBuilder.build -> AJDecisionEngine.evaluate
 * and prints: lifecycle state, score breakdown, confidence, authority gates,
 * NO_TRADE reasons, AJ Advisory summary, and trades.
 */
import { AJRuntimeContextBuilder } from "../src/indicators/AJIndicator/AJRuntimeContextBuilder";
import { AJPayloadBuilder } from "../src/indicators/AJIndicator/AJPayloadBuilder";
import { AJDecisionEngine } from "../src/indicators/AJIndicator/AJDecisionEngine";
import type { RuntimeContext } from "../src/runtime/RuntimeContext";
import type { Candle } from "../src/types/Candle";

const SYMBOL = "NIFTY-TEST";
const TF = "5m";

function makeCandles(scenario: "trend" | "reversal" | "chop", n = 260): Candle[] {
    const out: Candle[] = [];
    let price = 22450;
    let t = Date.now() - n * 5 * 60 * 1000;
    for (let i = 0; i < n; i++) {
        let drift = 0, noise = (Math.sin(i * 1.7) + Math.cos(i * 0.6)) * 4;
        if (scenario === "trend")    drift = i > 60 ? (i > 180 ? 2.2 : 3.5) : 0.4;   // rally w/ pullback
        if (scenario === "reversal") drift = i < 130 ? 2.5 : i < 200 ? -3.2 : -1.5;  // up then CHOCH down
        if (scenario === "chop")     drift = Math.sin(i / 9) * 2.2;                  // range
        const open = price;
        const close = price + drift + noise;
        const high = Math.max(open, close) + Math.abs(noise) * 0.6 + 1;
        const low  = Math.min(open, close) - Math.abs(noise) * 0.6 - 1;
        const vol  = 100000 + Math.abs(drift) * 8000 + Math.abs(noise) * 500;
        out.push({ time: t, open, high, low, close, volume: vol } as any);
        price = close;
        t += 5 * 60 * 1000;
    }
    return out;
}

function runScenario(name: string, candles: Candle[]) {
    console.log("\n" + "=".repeat(78));
    console.log(` SCENARIO: ${name}  (${candles.length} bars)`);
    console.log("=".repeat(78));
    console.log("BAR  STATE      MODE            SCORE  CONF  AUTH   REASON");
    console.log("-".repeat(78));

    const trades: any[] = [];
    let prevState = "";
    // warmup: only evaluate from bar 60 so indicators have history
    for (let i = 60; i < candles.length; i++) {
        const slice = candles.slice(0, i + 1);
        const cur = slice[slice.length - 1];
        const prev = slice[slice.length - 2];

        const runtime: RuntimeContext = {
            chartId: "CLI-" + name, symbol: SYMBOL, timeframe: TF, datasource: "cli",
            candles: slice, current: cur, previous: prev,
            barIndex: i, timestamp: cur.time,
            open: cur.open, high: cur.high, low: cur.low, close: cur.close, volume: cur.volume ?? 0,
            tradeDirection: 0, entryPrice: 0, stopLoss: 0, slPrice: 0,
            takeProfit1: 0, takeProfit2: 0, takeProfit3: 0, tp1: 0, tp2: 0, tp3: 0,
            currentPrice: cur.close, positionSize: 0, positionOpen: false, inPosition: false,
        } as any;

        try {
            const ajRuntime: any = AJRuntimeContextBuilder.build(runtime);
            const payload: any = AJPayloadBuilder.build(runtime, ajRuntime);
            const result: any = new AJDecisionEngine().evaluate(payload);

            const state = result?.lifecycleState ?? "SCAN";
            const score = Math.round(result?.tradeScore ?? ajRuntime?.tradeScore ?? 0);
            const conf = Math.round(result?.confidence ?? ajRuntime?.executionConfidence ?? 0);
            const auth = result?.executionAllowed ? "PASS" : "WAIT";
            const reason =
                result?.authority?.rejectionReasons?.[0] ??
                result?.authority?.reason ??
                ajRuntime?.noTradeReason ??
                (result?.executionAllowed ? "TRADE" : "-");
            const mode = (result?.tradeMode ?? ajRuntime?.tradeEngineMode ?? "?").toString().slice(0, 14);

            if (state !== prevState) {
                console.log(`${String(i).padStart(4)} ${state.padEnd(10)} ${mode.padEnd(15)} ${String(score).padEnd(6)} ${String(conf).padEnd(5)} ${auth.padEnd(6)} ${reason}`);
                prevState = state;
            } else if (i === candles.length - 1 || (result?.executionAllowed)) {
                console.log(`${String(i).padStart(4)} ${state.padEnd(10)} ${mode.padEnd(15)} ${String(score).padEnd(6)} ${String(conf).padEnd(5)} ${auth.padEnd(6)} ${reason}`);
            }

            if (result?.executionAllowed && result?.entryPrice) {
                trades.push({ bar: i, dir: result.direction, entry: result.entryPrice,
                    sl: result.stopLoss, tp1: result.tp1, tp2: result.tp2, tp3: result.tp3,
                    score, conf, state });
            }
        } catch (e: any) {
            console.log(`${String(i).padStart(4)} ERROR: ${e?.message ?? e}`);
            break;
        }
    }

    console.log("-".repeat(78));
    if (trades.length === 0) {
        console.log("RESULT: NO TRADES in this scenario.");
        console.log("Next check: the last printed row's REASON is the gate that blocked.");
    } else {
        console.log(`RESULT: ${trades.length} trade(s) detected:`);
        for (const t of trades)
            console.log(`  bar ${t.bar} ${t.dir > 0 ? "LONG (CE)" : "SHORT (PE)"} entry=${t.entry?.toFixed(2)} SL=${t.sl?.toFixed(2)} TP1=${t.tp1?.toFixed(2)} TP2=${t.tp2?.toFixed(2)} (score=${t.score} conf=${t.conf} state=${t.state})`);
    }
}

runScenario("TREND+PULLBACK", makeCandles("trend"));
runScenario("REVERSAL(CHOCH)", makeCandles("reversal"));
runScenario("CHOPPY-RANGE", makeCandles("chop"));
console.log("\nDone. If TREND/REVERSAL produce no trades, copy the last REASON shown —");
console.log("that is the exact gate to trace next (confidence vs authority vs risk).");