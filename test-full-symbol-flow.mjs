// test-full-symbol-flow.mjs
//
// Run with:  npx tsx test-full-symbol-flow.mjs
// Requires:  npm run server   (must be running in another terminal)
//
// Tests, per feed (FYERS, IndStocks), without opening the browser:
//   Phase 1: search bar — indices (NIFTY, SENSEX, BANKNIFTY)
//   Phase 2: search bar — equity (RELIANCE)
//   Phase 3: search bar — options (RELIANCE PE)
//   Phase 4: chart resolution — index history loads (NIFTY, SENSEX)
//   Phase 5: Option Focus recommendation → format → chart resolves it
//
// NOT covered here (needs AJDecisionEngine.ts / wherever snapshot.option
// is populated, not yet shared): "no re-recommendation when chart is
// already an option". That's a debug-snapshot-population bug, not
// something this HTTP/module-level script can exercise.

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // local self-signed cert only

import { OptionRecommendationEngine } from "./src/indicators/AJIndicator/options/OptionRecommendationEngine.ts";

const BASE = "https://localhost:3001";

let pass = 0;
let fail = 0;

function ok(label, detail = "") {
    pass++;
    console.log(`  PASS  ${label}${detail ? "  —  " + detail : ""}`);
}

function bad(label, detail = "") {
    fail++;
    console.log(`  FAIL  ${label}${detail ? "  —  " + detail : ""}`);
}

async function getJSON(path) {
    const res = await fetch(`${BASE}${path}`);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, json, text };
}

function section(title) {
    console.log(`\n=== ${title} ===`);
}

//======================================================
// PHASE 1 — SEARCH: INDICES
//======================================================

section("PHASE 1: Search bar — indices (NIFTY, SENSEX, BANKNIFTY)");

for (const feed of ["fyers", "indstocks"]) {
    for (const query of ["NIFTY", "SENSEX", "BANKNIFTY"]) {
        const { status, json } = await getJSON(`/api/${feed}/symbols/search?q=${query}`);
        const results = json?.results ?? [];
        const label = `${feed}: search "${query}"`;
        if (status !== 200) {
            bad(label, `HTTP ${status}`);
            continue;
        }
        if (results.length === 0) {
            bad(label, "0 results");
            continue;
        }
        const hasCleanMatch = results.some(r => {
            const name = String(r.displayName ?? r.symbol ?? "").toUpperCase();
            return !/^[A-Z]+_\d+/.test(name);
        });
        if (hasCleanMatch) {
            ok(label, `${results.length} result(s), e.g. "${results[0].displayName ?? results[0].symbol}"`);
        } else {
            bad(label, `${results.length} result(s) but none look like a clean display name — first: ${JSON.stringify(results[0])}`);
        }
    }
}

//======================================================
// PHASE 2 — SEARCH: EQUITY
//======================================================

section("PHASE 2: Search bar — equity (RELIANCE)");

for (const feed of ["fyers", "indstocks"]) {
    const { status, json } = await getJSON(`/api/${feed}/symbols/search?q=RELIANCE`);
    const results = json?.results ?? [];
    const label = `${feed}: search "RELIANCE"`;
    if (status === 200 && results.length > 0) {
        ok(label, `${results.length} result(s), e.g. "${results[0].displayName ?? results[0].symbol}"`);
    } else {
        bad(label, `HTTP ${status}, ${results.length} result(s)`);
    }
}

//======================================================
// PHASE 3 — SEARCH: OPTIONS
//======================================================

section("PHASE 3: Search bar — options (RELIANCE PE)");

{
    const { status, json } = await getJSON(`/api/fyers/options/search?underlying=RELIANCE&type=PE`);
    const results = json?.results ?? [];
    if (status === 200 && results.length > 0) {
        ok("fyers: options search RELIANCE PE", `${results.length} result(s), e.g. strike ${results[0].strike} exp ${results[0].expiry}`);
    } else {
        bad("fyers: options search RELIANCE PE", `HTTP ${status}, ${results.length} result(s)`);
    }
}

{
    const { status, json } = await getJSON(`/api/indstocks/options/search?underlying=RELIANCE&limit=100`);
    const results = json?.results ?? [];
    const peResults = results.filter(r => String(r.optionType ?? "").toUpperCase() === "PE");
    if (status === 200 && peResults.length > 0) {
        ok("indstocks: options search RELIANCE PE", `${peResults.length} PE result(s), e.g. strike ${peResults[0].strike} exp ${peResults[0].expiry}`);
    } else {
        bad("indstocks: options search RELIANCE PE", `HTTP ${status}, ${results.length} total / ${peResults.length} PE`);
    }
}

//======================================================
// PHASE 4 — CHART RESOLUTION: INDEX HISTORY
//======================================================

section("PHASE 4: Chart resolution — index history loads");

for (const feed of ["fyers", "indstocks"]) {
    for (const symbol of ["NIFTY", "SENSEX"]) {
        const { status, json } = await getJSON(`/api/${feed}/history?symbol=${symbol}&timeframe=5m`);
        const candles = Array.isArray(json) ? json : (json?.candles ?? json?.data ?? []);
        const label = `${feed}: history "${symbol}"`;
        if (status === 200 && Array.isArray(candles) && candles.length > 0) {
            ok(label, `${candles.length} candle(s)`);
        } else {
            bad(label, `HTTP ${status}, ${Array.isArray(candles) ? candles.length : "not an array"} candles — ${JSON.stringify(json).slice(0, 150)}`);
        }
    }
}

//======================================================
// PHASE 5 — OPTION FOCUS: RECOMMENDATION FORMAT + RESOLUTION
//======================================================

section("PHASE 5: Option Focus recommendation format + resolves on chart");

const recCases = [
    { label: "NIFTY CE", underlying: "NSE_40000001", spot: 23350, direction: 1 },
    { label: "SENSEX PE", underlying: "BSE_40000006", spot: 74300, direction: -1 }
];

const MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function isoToDisplayExpiry(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    return `${m[3]}${MONTH_ABBR[Number(m[2]) - 1]}`;
}

for (const c of recCases) {

    const rec = OptionRecommendationEngine.build(c.underlying, c.spot, c.direction);
    const underlyingClean = /^[A-Z]+_\d+$/.test(rec.underlying) ? null : rec.underlying;

    console.log(`\n  -- ${c.label} --`);
    console.log(`  recommendation.underlying: ${rec.underlying}`);
    console.log(`  recommendation.expiry (ISO): ${rec.expiry}`);
    console.log(`  recommendation.strike: ${rec.strike}   optionType: ${rec.optionType}`);

    if (underlyingClean) {
        ok(`${c.label}: underlying is clean`, rec.underlying);
    } else {
        bad(`${c.label}: underlying is clean`, `still raw key: ${rec.underlying}`);
        continue;
    }

    // ---- IndStocks: single-step, needs "DDMMM" display expiry in the string ----
    const indstocksSymbol = `${rec.underlying} ${isoToDisplayExpiry(rec.expiry)} ${rec.strike} ${rec.optionType}`;
    console.log(`  IndStocks canonical string: ${indstocksSymbol}`);
    {
        const { status, json } = await getJSON(`/api/indstocks/history?symbol=${encodeURIComponent(indstocksSymbol)}&timeframe=5m`);
        const candles = Array.isArray(json) ? json : (json?.candles ?? json?.data ?? []);
        if (status === 200 && Array.isArray(candles)) {
            ok(`${c.label}: IndStocks resolves + history`, `${candles.length} candle(s)`);
        } else {
            bad(`${c.label}: IndStocks resolves + history`, `HTTP ${status} — ${JSON.stringify(json).slice(0, 150)}`);
        }
    }

    // ---- FYERS: two-step — resolve native symbol first, ISO expiry ----
    {
        const { status: resolveStatus, json: resolveJson } = await getJSON(
            `/api/fyers/options/resolve?underlying=${rec.underlying}&expiry=${rec.expiry}&strike=${rec.strike}&type=${rec.optionType}`
        );
        const nativeSymbol = resolveJson?.symbolTicker ?? resolveJson?.symbol ?? resolveJson?.result?.symbolTicker ?? resolveJson?.result?.symbol;

        if (resolveStatus === 200 && nativeSymbol) {
            ok(`${c.label}: FYERS resolve`, nativeSymbol);

            const { status: histStatus, json: histJson } = await getJSON(
                `/api/fyers/history?symbol=${encodeURIComponent(nativeSymbol)}&timeframe=5m`
            );
            const candles = Array.isArray(histJson) ? histJson : (histJson?.candles ?? histJson?.data ?? []);
            if (histStatus === 200 && Array.isArray(candles)) {
                ok(`${c.label}: FYERS history`, `${candles.length} candle(s)`);
            } else {
                bad(`${c.label}: FYERS history`, `HTTP ${histStatus} — ${JSON.stringify(histJson).slice(0, 150)}`);
            }
        } else {
            bad(`${c.label}: FYERS resolve`, `HTTP ${resolveStatus} — ${JSON.stringify(resolveJson).slice(0, 150)}`);
        }
    }
}

//======================================================
// SUMMARY
//======================================================

console.log(`\n=========================`);
console.log(`  TOTAL: ${pass} passed, ${fail} failed`);
console.log(`=========================`);

if (fail > 0) process.exitCode = 1;
