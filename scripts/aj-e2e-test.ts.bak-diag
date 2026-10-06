/**
 * AJ v2 End-to-End Lifecycle CLI Test (v3 — file output + error stack trace)
 * Run:  npx tsx scripts/aj-e2e-test.ts
 *
 * ALL output is written to:  scripts/aj-e2e-output.txt
 * (and mirrored to the console). Share the FILE, not the console.
 *
 * v3 changes:
 *  - Output tee'd to scripts/aj-e2e-output.txt (fs.createWriteStream).
 *  - First 3 errors now print e.stack's first 5 frames, so the
 *    ".toUpperCase() of undefined" crash site is visible in one run.
 *  - RV-07E / debug traces are suppressed unless AJ_DEBUG=1.
 */
import * as fs from "fs";
import * as path from "path";
import * as httpMod from "http";
import * as httpsMod from "https";
import { AJRuntimeContextBuilder } from "../src/indicators/AJIndicator/AJRuntimeContextBuilder";
import { AJPayloadBuilder } from "../src/indicators/AJIndicator/AJPayloadBuilder";
import { AJDecisionEngine } from "../src/indicators/AJIndicator/AJDecisionEngine";
import type { RuntimeContext } from "../src/runtime/RuntimeContext";
import type { Candle } from "../src/types/Candle";

//--------------------------------------------------------------------
// LOG FILE TEE
//--------------------------------------------------------------------
const LOG_PATH = path.resolve(process.cwd(), "scripts", "aj-e2e-output.txt");
const logStream = fs.createWriteStream(LOG_PATH, { flags: "w" });

const origLog = console.log.bind(console);
const origWarn = console.warn.bind(console);
const origError = console.error.bind(console);

function tee(stream: (s: string) => void, args: any[]) {
    const line = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a) ?? String(a)))
        .join(" ");
    stream(line);
    logStream.write(line + "\n");
}

console.log = (...a: any[]) => tee(origLog, a);
console.warn = (...a: any[]) => tee(origWarn, a);
console.error = (...a: any[]) => tee(origError, a);

// Suppress internal debug tables (RV-07E etc.) unless AJ_DEBUG=1
if (process.env.AJ_DEBUG !== "1") {
    console.log = (...a: any[]) => {
        const s = a.map(String).join(" ");
        if (/RV-07E|TRACE|DEBUG/i.test(s)) return; // drop noisy engine traces
        origLog(...a);
        logStream.write(s + "\n");
    };
}

const SYMBOL = "NIFTY";
const TF = "5m";

// AJ ADD: LIVE mode — pull real candles from the running backend
// (same REST endpoints the chart uses). Run with:
//   npx tsx scripts/aj-e2e-test.ts live [datasource]
// datasource: fyers (default) | indstocks | aliceblue | zerodha
const LIVE = process.argv[2]?.toLowerCase() === "live";
const LIVE_SOURCE = (process.argv[3] ?? "fyers").toLowerCase();

// AJ FIX: fetch via https module fallback — global fetch needs
// Node 18+ and can fail on some TLS/proxy setups.
function httpGetJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith("http://")
            ? httpMod
            : httpsMod;
        const req = mod.get(url, { headers: { Accept: "application/json" }, timeout: 20000 }, (res: any) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                httpGetJson(res.headers.location).then(resolve, reject);
                return;
            }
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk: string) => (body += chunk));
            res.on("end", () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
                    return;
                }
                try { resolve(JSON.parse(body)); }
                catch (e: any) { reject(new Error("Bad JSON from server: " + e.message)); }
            });
        });
        req.on("timeout", () => req.destroy(new Error("Request timed out after 20s")));
        req.on("error", reject);
    });
}

async function loadLiveCandles(): Promise<Candle[]> {
    const base = process.env.AJ_API_BASE ?? "https://ajtrade.in";
    const url =
        LIVE_SOURCE === "fyers"
            ? `${base}/api/fyers/history?symbol=NIFTY&timeframe=${TF}`
            : LIVE_SOURCE === "indstocks"
                ? `${base}/api/indstocks/history?symbol=NIFTY&timeframe=${TF}`
                : LIVE_SOURCE === "zerodha"
                    ? `${base}/api/zerodha/history?symbol=NIFTY&timeframe=${TF}`
                    : `${base}/api/aliceblue/history?symbol=NIFTY&timeframe=${TF}`;

    console.log(`LIVE MODE: fetching NIFTY ${TF} from ${LIVE_SOURCE} (${url}) ...`);

    let data: any;
    try {
        // Try global fetch (Node 18+) first
        data = await (async () => {
            const res = await fetch(url as any);
            if (!res.ok) {
                throw new Error(`Live history request failed: HTTP ${res.status} — is the backend running at ${base}?`);
            }
            return res.json();
        })();
    } catch (fetchErr: any) {
        console.log(`global fetch failed (${String(fetchErr?.message ?? fetchErr).slice(0, 80)}) — retrying with https module ...`);
        data = await httpGetJson(url);
    }
    const raw: any[] =
        Array.isArray(data) ? data : Array.isArray(data?.candles) ? data.candles : [];

    if (raw.length === 0) {
        throw new Error("Live feed returned 0 candles — check backend feed status.");
    }

    // Normalize: each row is {time|timestamp, open, high, low, close, volume}
    const candles: Candle[] = raw
        .map((r: any) => {
            const t = Number(r.time ?? r.timestamp ?? r.t);
            const timeSec = t > 1e12 ? Math.floor(t / 1000) : t; // ms → s
            return {
                time: timeSec,
                open: Number(r.open),
                high: Number(r.high ?? r.h ?? r.open),
                low: Number(r.low ?? r.l ?? r.open),
                close: Number(r.close ?? r.c ?? r.close),
                volume: Number(r.volume ?? r.vol ?? r.v ?? 0)
            } as Candle;
        })
        .filter(c => Number.isFinite(c.time) && Number.isFinite(c.close))
        .sort((a, b) => a.time - b.time);

    const last = candles[candles.length - 1];
    console.log(`Loaded ${candles.length} live candles. Last close: ${last.close} at ${new Date(last.time * 1000).toISOString()}`);
    return candles;
}

function makeCandles(scenario: "trend" | "reversal" | "chop", n = 260): Candle[] {
    const out: Candle[] = [];
    let price = 22450;
    let t = Date.now() - n * 5 * 60 * 1000;
    for (let i = 0; i < n; i++) {
        let drift = 0, noise = (Math.sin(i * 1.7) + Math.cos(i * 0.6)) * 4;
        if (scenario === "trend")    drift = i > 60 ? (i > 180 ? 2.2 : 3.5) : 0.4;
        if (scenario === "reversal") drift = i < 130 ? 2.5 : i < 200 ? -3.2 : -1.5;
        if (scenario === "chop")     drift = Math.sin(i / 9) * 2.2;
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

function firstFrames(e: any, n = 5): string {
    const stack: string = e?.stack ?? "";
    return stack
        .split("\n")
        .slice(1, 1 + n)
        .map((l: string) => l.trim())
        .join(" | ");
}

function runScenario(name: string, candles: Candle[]) {
    console.log("\n" + "=".repeat(78));
    console.log(` SCENARIO: ${name}  (${candles.length} bars)`);
    console.log("=".repeat(78));
    console.log("BAR  STATE      MODE            SCORE  CONF  AUTH   REASON");
    console.log("-".repeat(78));

    const trades: any[] = [];
    let prevState = "";
    let errCount = 0;
    let printedErrs = 0;

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
            const mode = String(result?.tradeMode ?? ajRuntime?.tradeEngineMode ?? "?").slice(0, 14);

            if (state !== prevState || i % 20 === 0 || i === candles.length - 1 || result?.executionAllowed) {
                console.log(`${String(i).padStart(4)} ${String(state).padEnd(10)} ${mode.padEnd(15)} ${String(score).padEnd(6)} ${String(conf).padEnd(5)} ${auth.padEnd(6)} ${String(reason).slice(0, 40)}`);
                prevState = state;
            }

            // AJ FIX: count only NEW executions. While a position is
            // held, every bar re-reports the same locked plan — log a
            // trade only when we transition into EXECUTED/MANAGE from
            // SCAN/ARMED/CONFIRMED (or a direction change forces a
            // fresh plan).
            const inExec = state === "EXECUTED" || state === "MANAGE";
            if (result?.executionAllowed && result?.entryPrice && inExec) {
                const last = trades[trades.length - 1];
                const samePlan =
                    last &&
                    last.entry === result.entryPrice &&
                    last.dir === result.direction;
                if (!samePlan) {
                    trades.push({ bar: i, dir: result.direction, entry: result.entryPrice,
                        sl: result.stopLoss, tp1: result.tp1, tp2: result.tp2, tp3: result.tp3,
                        score, conf, state,
                        recommendation: result?.confidenceBreakdown?.recommendation ?? result?.recommendation,
                        authority: result?.authority });
                }
            }
			
        } catch (e: any) {
            errCount++;
            if (printedErrs < 3) {
                printedErrs++;
                console.log(`${String(i).padStart(4)} ERROR: ${String(e?.message ?? e).slice(0, 120)}`);
                console.log(`        STACK: ${firstFrames(e)}`);
            } else if (i % 40 === 0) {
                console.log(`${String(i).padStart(4)} ERROR: ${String(e?.message ?? e).slice(0, 120)}`);
            }
            continue;
        }
    }

    console.log("-".repeat(78));
    if (errCount > 0) console.log(`(skipped ${errCount} bars due to errors)`);
    if (trades.length === 0) {
        console.log("RESULT: NO TRADES in this scenario.");
        console.log("Next check: the last printed row's REASON is the gate that blocked.");
    } else {
        console.log(`RESULT: ${trades.length} trade(s) detected:`);
        for (const t of trades)
            console.log(`  bar ${t.bar} ${t.dir > 0 ? "LONG (CE)" : "SHORT (PE)"} entry=${t.entry?.toFixed(2)} SL=${t.sl?.toFixed(2)} TP1=${t.tp1?.toFixed(2)} TP2=${t.tp2?.toFixed(2)} (score=${t.score} conf=${t.conf} state=${t.state})`);
    }
}

(async () => {
    console.log(`AJ v2 E2E TEST — ${new Date().toISOString()}`);
    console.log(`Log file: ${LOG_PATH}`);

    if (LIVE) {
        //--------------------------------------------------
        // LIVE MODE: real candles through the same pipeline
        //--------------------------------------------------
        try {
            const live = await loadLiveCandles();
            runScenario("LIVE:" + LIVE_SOURCE.toUpperCase(), live);
        } catch (e: any) {
            console.log("LIVE MODE FAILED: " + String(e?.message ?? e));
            console.log("Fallback: run without 'live' for synthetic scenarios.");
        }
    } else {
        runScenario("TREND+PULLBACK", makeCandles("trend"));
        runScenario("REVERSAL(CHOCH)", makeCandles("reversal"));
        runScenario("CHOPPY-RANGE", makeCandles("chop"));
    }

    console.log("\nDone. Full output saved to scripts/aj-e2e-output.txt");
    logStream.end();
})();
