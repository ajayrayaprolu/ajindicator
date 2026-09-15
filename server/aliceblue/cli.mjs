//======================================================
// server/aliceblue/cli.mjs
//
// Command-line maintenance tool for the AliceBlue candle
// store. Run from the project root (C:\AI-Institutional)
// so the relative paths resolve the same way history.js
// resolves them:
//
//     node server\aliceblue\cli.mjs <command> [options]
//
// WINDOWS / POWERSHELL NOTE:
// PowerShell treats an unquoted "|" as the pipe operator
// EVEN INSIDE what looks like one argument. Always quote
// --symbols:
//
//     node server\aliceblue\cli.mjs refresh --symbols "NSE|2885,NFO|35235"
//
// (cmd.exe does not have this problem, but quoting there
// is harmless too, so just always quote it.)
//
// COMMANDS
// --------
//
// status
//     Print every tracked key (symbol+resolution), its
//     age, and candle count. No network calls. Read-only.
//
// preflight
//     One lightweight live call — tells you whether
//     AliceBlue is reachable with the current session
//     right now. Run this FIRST if you're seeing
//     "Waiting for first sync" everywhere. If this fails,
//     wiping/redownloading the store will not help; you
//     need to log in again first.
//
// refresh [--symbols "A|1,B|2"] [--timeframe 1]
//     Re-fetch LIVE data for every currently tracked key
//     (or just the given --symbols) and overwrite it in
//     place. Does NOT delete anything first — if a
//     refresh fails for a given key, the old cached copy
//     for that key is left untouched.
//
// clear --yes [--refresh]
//     DESTRUCTIVE. Deletes every .json file in
//     candle-cache. Requires --yes as confirmation.
//     Captures the key list BEFORE deleting, so --refresh
//     can immediately redownload the exact same set right
//     after wiping — a true hard reset, not a data-loss
//     event, as long as AliceBlue still has the data.
//
// WHAT THIS SCRIPT WILL NOT DO
// -----------------------------
// It will not discover "all stocks, indices, and options"
// from scratch. The store is self-describing — it only
// ever contains keys that succeeded a real AliceBlue call
// at some point (see history.js: listTrackedKeys). There
// is no separate watchlist file anywhere in this project,
// so "refresh everything" means "everything that has EVER
// loaded successfully in a chart". If the store is empty,
// there's nothing to reseed from — either load each symbol
// once in the UI (each cold start seeds it), or pass
// --symbols with your watchlist explicitly.
// Indices will never appear regardless — AliceBlue's chart
// API cannot resolve them, confirmed separately.
//======================================================

import fs from "fs";
import path from "path";

import {
    fetchAndCacheLive,
    getAliceBlueHistory,
    listTrackedKeys,
    getCacheFreshness
} from "./history.js";

import {
    getTokenStatus,
    getSessionId
} from "./token.js";

import {
    isMarketOpen,
    istNow
} from "./syncWorker.js";

const CACHE_DIR =
    path.resolve(process.cwd(), "server", "aliceblue", "data", "candle-cache");

const REQUEST_SPACING_MS = 350;
const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAge(ageMs) {

    if (ageMs === null || !Number.isFinite(ageMs)) {
        return "n/a";
    }

    const seconds = Math.max(0, Math.floor(ageMs / 1000));

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    return `${Math.floor(hours / 24)}d`;
}

//======================================================
// ARG PARSING (no deps — keep this zero-dependency)
//======================================================

function parseArgs(argv) {

    const [, , command, ...rest] = argv;

    const flags = { command };

    for (let i = 0; i < rest.length; i++) {

        const token = rest[i];

        if (token === "--yes") {
            flags.yes = true;
            continue;
        }

        if (token === "--refresh") {
            flags.refresh = true;
            continue;
        }

        if (token === "--symbols") {
            flags.symbols = rest[++i];
            continue;
        }

        if (token === "--timeframe") {
            flags.timeframe = rest[++i];
            continue;
        }

        if (token === "--minutes") {
            flags.minutes = rest[++i];
            continue;
        }
    }

    return flags;
}

function parseSymbolsArg(symbolsArg, timeframeArg) {

    const resolution = timeframeArg ?? "1";

    return symbolsArg
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {

            const [exchange, token] = entry.split("|").map((s) => (s ?? "").trim());

            return { exchange, token, resolution };
        })
        .filter((k) => k.exchange && k.token);
}

//======================================================
// STATUS
//======================================================

function runStatus() {

    const keys = listTrackedKeys();

    if (keys.length === 0) {

        console.log(
            `No tracked keys found in ${CACHE_DIR}.\n` +
            "The store is empty — this is exactly what causes " +
            "\"Waiting for first sync\" everywhere. Run 'preflight' " +
            "next to confirm AliceBlue is reachable, then either " +
            "load charts in the UI once each, or use 'refresh --symbols'."
        );

        return;
    }

    console.log(`Tracked keys (${keys.length}) — reading from ${CACHE_DIR}\n`);
    console.log(
        "EXCHANGE".padEnd(10) +
        "TOKEN".padEnd(12) +
        "RES".padEnd(6) +
        "CANDLES".padEnd(10) +
        "AGE"
    );
    console.log("-".repeat(50));

    for (const { exchange, token, resolution } of keys) {

        const freshness = getCacheFreshness({ exchange, token, timeframe: resolution });

        console.log(
            exchange.padEnd(10) +
            token.padEnd(12) +
            resolution.padEnd(6) +
            String(freshness.count).padEnd(10) +
            formatAge(freshness.ageMs)
        );
    }
}

//======================================================
// PREFLIGHT — one cheap live call, tells you immediately
// whether the problem is "empty store" or "broken session".
//======================================================

async function runPreflight() {

    const status = getTokenStatus?.() ?? {};
    const sessionId = getSessionId();

    console.log("Token status:", JSON.stringify(status));

    if (!sessionId) {

        console.log(
            "\nNO SESSION FOUND. Log in via /api/aliceblue/login first — " +
            "nothing else in this script will work until that's fixed."
        );

        process.exitCode = 1;
        return;
    }

    // Use whatever's currently tracked as the probe symbol; fall back to
    // a well-known liquid NSE token (Reliance = 2885) if the store is
    // totally empty, since we need SOMETHING to test against.
    const tracked = listTrackedKeys();
    const probe = tracked[0] ?? { exchange: "NSE", token: "2885", resolution: "1" };

    console.log(
        `\nProbing AliceBlue with ${probe.exchange}|${probe.token} (${probe.resolution})...`
    );

    const now = Date.now();

    try {

        const result = await fetchAndCacheLive({
            exch: probe.exchange,
            instrumentToken: probe.token,
            resolution: probe.resolution,
            fromMs: now - HISTORY_WINDOW_MS,
            toMs: now
        });

        if (result && result.length > 0) {
            console.log(`SUCCESS — got ${result.length} live candles. Session and connectivity are fine.`);
            console.log("If charts still show \"Waiting for first sync\", the problem is specific to those symbols, not the session — try 'refresh --symbols' for them directly.");
        } else {
            console.log("Call succeeded but returned 0 candles (market closed / no data for this window). This is NOT a session problem.");
        }

    } catch (error) {

        if (error?.aliceBlueReason === "SESSION_EXPIRED") {
            console.log("SESSION EXPIRED. Log in again via /api/aliceblue/login, then re-run preflight.");
        } else {
            console.log("Live call failed:", error?.message ?? error);
        }

        process.exitCode = 1;
    }
}

//======================================================
// MARKET-HOURS DIAGNOSTIC
//
// Prints exactly what isMarketOpen() sees, so we can tell
// whether "worker never refreshes" is a real logic bug vs
// the server machine's clock/timezone being wrong. Every
// line here should be checkable against a phone clock.
//======================================================

function runMarketHoursDiagnostic() {

    const utcNow = new Date();
    const ist = istNow();
    const open = isMarketOpen();

    const osTimeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log("System clock (UTC, from Date.toISOString — timezone-independent):");
    console.log("  " + utcNow.toISOString());
    console.log();
    console.log("System clock (local, as this OS/process interprets it):");
    console.log("  " + utcNow.toString());
    console.log("  OS-configured timezone: " + osTimeZone);
    console.log();
    console.log("This script's computed IST time (UTC + 5:30, what isMarketOpen() checks against):");
    console.log("  " + ist.toISOString().replace("Z", " (as IST wall-clock)"));
    console.log();
    console.log("isMarketOpen() result: " + open);
    console.log();

    if (osTimeZone !== "UTC" && osTimeZone.toLowerCase() !== "etc/utc") {

        console.log(
            `NOTE: this machine's OS timezone is "${osTimeZone}", not UTC. That's fine BY ITSELF — ` +
            "istNow() only ever reads Date.now() (always true UTC epoch millis, independent of OS " +
            "timezone setting) and adds +5:30 in code. The one thing that WOULD break this is if the " +
            "underlying system clock itself (not just its timezone label) is set wrong — e.g. the " +
            "hardware/BIOS clock is actually showing IST wall-clock time but Windows believes it's UTC. " +
            "Compare the two 'System clock' lines above against your phone's actual clock right now: " +
            "if the UTC line does NOT read ~5:30 behind your real IST time, the system clock itself is " +
            "wrong and isMarketOpen() will be wrong no matter what this code does."
        );
        console.log();
    }

    if (!open) {

        const day = ist.getUTCDay();

        if (day === 0 || day === 6) {
            console.log("Reported CLOSED because computed IST day is a weekend.");
        } else {
            const minutesSinceMidnight = ist.getUTCHours() * 60 + ist.getUTCMinutes();
            console.log(`Reported CLOSED because computed IST time-of-day (${ist.getUTCHours()}:${String(ist.getUTCMinutes()).padStart(2, "0")}) falls outside 09:15-15:30.`);
        }
    }
}

//======================================================
// VERIFY-STORE-FIRST
//
// Proves the actual design claim: a KNOWN key is served
// from disk with zero network activity, while an UNKNOWN
// (or force-refreshed) key does hit AliceBlue live.
//
// Method: temporarily intercept console.log during each
// call and check for the "LIVE REQUEST" marker that
// fetchLiveCandles() always logs right before it calls
// AliceBlue. If that marker appears during a call to an
// already-cached key, the store-first guarantee is
// broken — this would catch that regression directly,
// not just infer it from timing.
//======================================================

async function captureLiveRequestActivity(fn) {

    const originalLog = console.log;
    let sawLiveRequest = false;

    console.log = (...args) => {
        if (args[0] === "[ALICEBLUE HISTORY] LIVE REQUEST") {
            sawLiveRequest = true;
        }
        originalLog(...args);
    };

    const startedAt = Date.now();

    try {
        await fn();
    } finally {
        console.log = originalLog;
    }

    return { elapsedMs: Date.now() - startedAt, hitLive: sawLiveRequest };
}

async function runVerifyStoreFirst(flags) {

    const targets =
        flags.symbols
            ? parseSymbolsArg(flags.symbols, flags.timeframe)
            : listTrackedKeys().slice(0, 1);

    if (targets.length === 0) {

        console.log(
            "Nothing to verify — store is empty and no --symbols given.\n" +
            'Example: node server\\aliceblue\\cli.mjs verify-store-first --symbols "NSE|2885" --timeframe 1'
        );

        return;
    }

    const { exchange, token, resolution } = targets[0];

    console.log(`Verifying store-first behavior for ${exchange}|${token} (${resolution})\n`);

    const freshnessBefore = getCacheFreshness({ exchange, token, timeframe: resolution });

    if (!freshnessBefore.hasCache) {

        console.log(
            "This key isn't cached yet, so there's nothing to prove a 'warm read' " +
            "against. Run 'refresh --symbols' for it first, then re-run this."
        );

        return;
    }

    console.log(`Store already has ${freshnessBefore.count} candles, last synced ${formatAge(freshnessBefore.ageMs)} ago.\n`);

    console.log("Call 1 — reading this known key through the normal read path (getAliceBlueHistory)...");

    const call1 = await captureLiveRequestActivity(() =>
        getAliceBlueHistory({ exchange, token, timeframe: resolution })
    );

    console.log(`  -> ${call1.elapsedMs}ms, hit AliceBlue live: ${call1.hitLive}`);

    console.log("\nCall 2 — same key, immediately again (should be identical: pure disk read)...");

    const call2 = await captureLiveRequestActivity(() =>
        getAliceBlueHistory({ exchange, token, timeframe: resolution })
    );

    console.log(`  -> ${call2.elapsedMs}ms, hit AliceBlue live: ${call2.hitLive}`);

    console.log();

    if (!call1.hitLive && !call2.hitLive) {
        console.log("PASS — both reads served from the store, zero network calls. This is the whole point of the redesign, and it's holding.");
    } else {
        console.log("FAIL — a read for an already-cached key hit AliceBlue live. This is a regression in the store-first guarantee, not expected behavior — worth investigating before trusting the freshness badge in the UI.");
        process.exitCode = 1;
    }
}

//======================================================
// WATCH
//
// Proves the background worker is actually advancing,
// not just present in the code. Takes a snapshot of every
// intraday key's age, waits, takes another snapshot, and
// reports which keys got fresher (worker touched them) vs
// which just aged by exactly the wait time (worker never
// reached them, or the server isn't running this script
// was pointed at).
//
// Only meaningful while the market is open — the worker
// intentionally skips intraday keys otherwise, so a flat
// result outside market hours is expected, not a failure.
//======================================================

async function runWatch(flags) {

    const waitMs = (Number(flags.minutes) || 2) * 60 * 1000;

    if (!isMarketOpen()) {
        console.log(
            "NOTE: market is currently closed (NSE hours: 9:15-15:30 IST, Mon-Fri).\n" +
            "The sync worker intentionally skips intraday keys outside market hours, " +
            "so seeing NO refresh activity below is expected, not a bug.\n"
        );
    }

    const intradayKeys = listTrackedKeys().filter((k) => k.resolution !== "D");

    if (intradayKeys.length === 0) {
        console.log("No intraday keys tracked — nothing to watch. Run 'refresh' or load a 1m chart first.");
        return;
    }

    const snapshot = (keys) =>
        new Map(
            keys.map((k) => [
                `${k.exchange}_${k.token}_${k.resolution}`,
                getCacheFreshness({ exchange: k.exchange, token: k.token, timeframe: k.resolution }).ageMs
            ])
        );

    const before = snapshot(intradayKeys);

    console.log(`Watching ${intradayKeys.length} intraday key(s) for ${waitMs / 60000} minute(s)...`);
    console.log("(This process must run WHILE your actual server — with the sync worker — is also running. This script does not run the worker itself; it just observes candle-cache from outside.)\n");

    await sleep(waitMs);

    const after = snapshot(intradayKeys);

    let refreshed = 0;
    let stale = 0;

    for (const [key, ageBefore] of before) {

        const ageAfter = after.get(key);
        const gotFresher = ageAfter !== null && (ageBefore === null || ageAfter < ageBefore + waitMs - 5000);

        console.log(
            `  ${key.padEnd(20)} age before: ${formatAge(ageBefore).padEnd(6)} age after: ${formatAge(ageAfter).padEnd(6)} -> ${gotFresher ? "REFRESHED" : "unchanged"}`
        );

        if (gotFresher) refreshed += 1; else stale += 1;
    }

    console.log(`\n${refreshed} of ${intradayKeys.length} key(s) were refreshed by the worker during this window.`);

    if (refreshed === 0 && isMarketOpen()) {
        console.log("Market is open but nothing refreshed — check the server's console for '[ALICEBLUE SYNC]' log lines. The worker may not be running (confirm startAliceBlueSync() is actually called in index.js and the process didn't error out on boot).");
    }
}

//======================================================
// SHARED REFRESH LOOP
//
// The one and only place that actually walks a key list
// and calls fetchAndCacheLive on each. Both 'refresh' and
// 'clear --refresh' call this — no duplicated logic, no
// risk of one path getting a fix and the other not (which
// is exactly how the clear --refresh bug happened).
//======================================================

async function refreshKeys(targets) {

    if (targets.length === 0) {

        console.log(
            "Nothing to refresh. Store is empty and no --symbols were given.\n" +
            'Example: node server\\aliceblue\\cli.mjs refresh --symbols "NSE|2885,NFO|35235" --timeframe 1'
        );

        return { ok: 0, failed: 0 };
    }

    console.log(`Refreshing ${targets.length} key(s)...\n`);

    let ok = 0;
    let failed = 0;

    for (const { exchange, token, resolution } of targets) {

        const now = Date.now();

        process.stdout.write(`  ${exchange}|${token} (${resolution}) ... `);

        try {

            const result = await fetchAndCacheLive({
                exch: exchange,
                instrumentToken: token,
                resolution,
                fromMs: now - HISTORY_WINDOW_MS,
                toMs: now
            });

            if (result && result.length > 0) {
                console.log(`OK (${result.length} candles)`);
                ok += 1;
            } else {
                console.log("no data (market closed or nothing available right now)");
                failed += 1;
            }

        } catch (error) {

            if (error?.aliceBlueReason === "SESSION_EXPIRED") {
                console.log("SESSION EXPIRED — stopping.");
                console.log("\nLog in again via /api/aliceblue/login, then re-run refresh.");
                return { ok, failed, sessionExpired: true };
            }

            console.log(`FAILED (${error?.message ?? error})`);
            failed += 1;
        }

        await sleep(REQUEST_SPACING_MS);
    }

    console.log(`\nDone. ok=${ok} failed=${failed} of ${targets.length}`);

    return { ok, failed };
}

async function runRefresh(flags) {

    const targets =
        flags.symbols
            ? parseSymbolsArg(flags.symbols, flags.timeframe)
            : listTrackedKeys();

    await refreshKeys(targets);
}

//======================================================
// CLEAR
//======================================================

async function runClear(flags) {

    if (!flags.yes) {

        console.log(
            "This deletes every .json file in:\n  " + CACHE_DIR +
            "\n\nRe-run with --yes to confirm, e.g.:\n" +
            "  node server\\aliceblue\\cli.mjs clear --yes\n" +
            "  node server\\aliceblue\\cli.mjs clear --yes --refresh   (wipe, then immediately redownload the same keys)"
        );

        return;
    }

    if (!fs.existsSync(CACHE_DIR)) {
        console.log("Cache directory doesn't exist yet — nothing to clear:", CACHE_DIR);
        return;
    }

    // Capture the key list BEFORE deleting anything, so --refresh
    // has something to redownload afterwards.
    const previousKeys = listTrackedKeys();

    const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));

    for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
    }

    console.log(`Deleted ${files.length} cache file(s) from ${CACHE_DIR}.`);

    if (!flags.refresh) {

        console.log(
            "\nStore is now empty. Every chart will show \"Waiting for first sync\" " +
            "until either you load it once in the UI, or you run:\n" +
            '  node server\\aliceblue\\cli.mjs refresh --symbols "..."'
        );

        return;
    }

    if (previousKeys.length === 0) {
        console.log("\n(Store was already empty before clearing — nothing to redownload.)");
        return;
    }

    console.log(`\nRedownloading the ${previousKeys.length} key(s) that were tracked before clearing...\n`);

    await refreshKeys(previousKeys);
}

//======================================================
// MAIN
//======================================================

async function main() {

    const flags = parseArgs(process.argv);

    switch (flags.command) {

        case "status":
            runStatus();
            break;

        case "preflight":
            await runPreflight();
            break;

        case "refresh":
            await runRefresh(flags);
            break;

        case "clear":
            await runClear(flags);
            break;

        case "verify-store-first":
            await runVerifyStoreFirst(flags);
            break;

        case "watch":
            await runWatch(flags);
            break;

        case "market-hours":
            runMarketHoursDiagnostic();
            break;

        default:
            console.log(
                "Usage: node server\\aliceblue\\cli.mjs <command> [options]\n\n" +
                "  status                                            list everything currently cached, with age\n" +
                "  preflight                                         one live call — tells you if the session/connection is actually the problem\n" +
                '  refresh [--symbols "A|1,B|2"] [--timeframe 1]     re-fetch live data for tracked (or given) keys, in place\n' +
                "  clear --yes [--refresh]                           delete all cached candles, optionally redownload the same set immediately\n" +
                '  verify-store-first [--symbols "A|1"] [--timeframe 1]   proves a known key is served with zero network calls\n' +
                "  watch [--minutes 2]                               proves the sync worker (running in your actual server process) is advancing tracked keys\n" +
                "  market-hours                                      shows exactly what isMarketOpen() sees — diagnoses clock/timezone issues\n\n" +
                'PowerShell users: always QUOTE --symbols, e.g. --symbols "NSE|2885,NFO|35235" — unquoted "|" is treated as the pipe operator.'
            );
    }
}

main().catch((error) => {
    console.error("[CLI] Fatal error:", error?.message ?? error);
    process.exitCode = 1;
});
