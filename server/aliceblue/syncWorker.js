//======================================================
// server/aliceblue/syncWorker.js
//
// Background sync worker for the AliceBlue candle store.
//
// This is the piece that makes getAliceBlueHistory() safe
// to be store-only: it periodically walks every key that
// has ever been successfully cached (listTrackedKeys(),
// from history.js — literally just a directory scan, no
// separate registry to maintain) and refreshes it via
// fetchAndCacheLive(), the same low-level fetch primitive
// the request path uses.
//
// Nothing here ever touches an index symbol or an
// unsupported exchange (BSE/BCD/BFO) — those never make
// it into the cache directory in the first place, since
// they never succeed on the request-path cold start that
// seeds a key. So there is nothing to filter out; the
// worklist is self-limiting by construction.
//
// Scheduling:
//   - Intraday resolutions (1/5/15/30/60) only sync while
//     the NSE cash/derivatives market is open, on a short
//     interval.
//   - Daily ("D") resolution syncs once after market close
//     (and once on startup, in case the process was down
//     at close time).
//   - Outside market hours, intraday keys are simply left
//     alone — whatever was last synced during the session
//     stays as-is, which is exactly what a closed market
//     looks like anyway.
//
// Wiring: call startAliceBlueSync() once from your server
// bootstrap (index.js / start-server.js), after the
// AliceBlue session/login flow is available. It returns a
// stop() function.
//======================================================

import {
    fetchAndCacheLive,
    listTrackedKeys
} from "./history.js";

//======================================================
// MARKET HOURS (IST, NSE cash/derivatives segment)
//
// NOTE: this does not account for exchange holidays —
// on a holiday it will just get LIVE_UNAVAILABLE /
// 0-rows from AliceBlue for every attempt and quietly
// skip the write, same as any other closed-market miss.
// Good enough for "don't hammer the broker at 2am"; not
// a substitute for a real holiday calendar if that ever
// matters.
//======================================================

const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function istNow() {
    const utcMs = Date.now();
    return new Date(utcMs + IST_OFFSET_MINUTES * 60 * 1000);
}

export function isMarketOpen() {

    const ist = istNow();

    const day = ist.getUTCDay(); // 0 = Sun ... 6 = Sat (safe: we built istNow with a fixed UTC offset)

    if (day === 0 || day === 6) {
        return false;
    }

    const minutesSinceMidnight = ist.getUTCHours() * 60 + ist.getUTCMinutes();

    const marketOpen = 9 * 60 + 15;   // 09:15
    const marketClose = 15 * 60 + 30; // 15:30

    return minutesSinceMidnight >= marketOpen && minutesSinceMidnight <= marketClose;
}

function isAfterMarketClose() {

    const ist = istNow();
    const day = ist.getUTCDay();

    if (day === 0 || day === 6) {
        return true;
    }

    const minutesSinceMidnight = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    const marketClose = 15 * 60 + 30;

    return minutesSinceMidnight > marketClose;
}

//======================================================
// CONFIG — tune without touching the loop logic.
//======================================================

const INTRADAY_SYNC_INTERVAL_MS = 90 * 1000;      // every 90s during market hours
const DAILY_SYNC_INTERVAL_MS = 30 * 60 * 1000;     // check for EOD sync every 30 min
const REQUEST_SPACING_MS = 350;                    // gap between broker calls in a batch, so a 40-symbol watchlist doesn't fire 40 requests at once
const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;     // how far back each refresh asks for

let lastDailySyncDateKey = null; // "YYYY-MM-DD" (IST) of the last completed EOD sync

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

//======================================================
// ONE SYNC PASS
//======================================================

async function syncKeys(keys, label) {

    if (keys.length === 0) {
        console.log(`[ALICEBLUE SYNC] ${label}: 0 tracked key(s) — nothing to refresh (this is normal right after a store wipe, or before anything's ever been charted).`);
        return { attempted: 0, refreshed: 0, failed: 0 };
    }

    let refreshed = 0;
    let failed = 0;

    console.log(`[ALICEBLUE SYNC] ${label}: refreshing ${keys.length} key(s)...`);

    for (const { exchange, token, resolution } of keys) {

        const now = Date.now();

        try {

            const result =
                await fetchAndCacheLive({
                    exch: exchange,
                    instrumentToken: token,
                    resolution,
                    fromMs: now - HISTORY_WINDOW_MS,
                    toMs: now
                });

            if (result && result.length > 0) {
                refreshed += 1;
            } else {
                failed += 1;
            }

        } catch (error) {

            failed += 1;

            // SESSION_EXPIRED is the one case worth logging loudly —
            // it means every key in this pass (and the next, and the
            // next) will fail until someone re-logs in.
            if (error?.aliceBlueReason === "SESSION_EXPIRED") {

                console.warn(
                    "[ALICEBLUE SYNC] Session expired — pausing this pass. Re-login required."
                );

                break;
            }

            console.warn(
                `[ALICEBLUE SYNC] Failed to refresh ${exchange}_${token}_${resolution}:`,
                error?.message ?? error
            );
        }

        await sleep(REQUEST_SPACING_MS);
    }

    console.log(
        `[ALICEBLUE SYNC] ${label}: done. refreshed=${refreshed} failed=${failed} of ${keys.length}`
    );

    return { attempted: keys.length, refreshed, failed };
}

//======================================================
// INTRADAY TICK
//======================================================

async function runIntradaySync() {

    if (!isMarketOpen()) {
        console.log("[ALICEBLUE SYNC] intraday: market closed, skipping this pass.");
        return;
    }

    const keys =
        listTrackedKeys()
            .filter((k) => k.resolution !== "D");

    await syncKeys(keys, "intraday");
}

//======================================================
// DAILY (EOD) TICK — runs once per day, after close.
// Also fires once immediately on startup if today's EOD
// sync hasn't happened yet (covers "process was restarted
// after close but before the next intraday session").
//======================================================

function todayIstDateKey() {
    const ist = istNow();
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
}

async function runDailySyncIfDue() {

    if (!isAfterMarketClose()) {
        console.log("[ALICEBLUE SYNC] daily (EOD): before market close, skipping this pass.");
        return;
    }

    const todayKey = todayIstDateKey();

    if (lastDailySyncDateKey === todayKey) {
        console.log("[ALICEBLUE SYNC] daily (EOD): already ran today, skipping this pass.");
        return; // already done today
    }

    const keys =
        listTrackedKeys()
            .filter((k) => k.resolution === "D");

    await syncKeys(keys, "daily (EOD)");

    lastDailySyncDateKey = todayKey;
}

//======================================================
// PUBLIC ENTRY POINT
//======================================================

export function startAliceBlueSync() {

    console.log("[ALICEBLUE SYNC] Worker starting.");

    let stopped = false;

    // Run once immediately on boot (covers "chart already
    // has stale data from before a restart"), then settle
    // into interval-based scheduling.
    runIntradaySync().catch((e) => console.warn("[ALICEBLUE SYNC] Initial intraday pass failed:", e?.message ?? e));
    runDailySyncIfDue().catch((e) => console.warn("[ALICEBLUE SYNC] Initial daily pass failed:", e?.message ?? e));

    const intradayTimer = setInterval(() => {
        if (stopped) return;
        runIntradaySync().catch((e) => console.warn("[ALICEBLUE SYNC] Intraday pass failed:", e?.message ?? e));
    }, INTRADAY_SYNC_INTERVAL_MS);

    const dailyTimer = setInterval(() => {
        if (stopped) return;
        runDailySyncIfDue().catch((e) => console.warn("[ALICEBLUE SYNC] Daily pass failed:", e?.message ?? e));
    }, DAILY_SYNC_INTERVAL_MS);

    return function stop() {
        stopped = true;
        clearInterval(intradayTimer);
        clearInterval(dailyTimer);
        console.log("[ALICEBLUE SYNC] Worker stopped.");
    };
}

export default {
    startAliceBlueSync
};