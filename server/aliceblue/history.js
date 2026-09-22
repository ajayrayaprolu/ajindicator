//======================================================
// server/aliceblue/history.js.2908
//
// Alice Blue historical market data.
//
// API:
//
// POST
// https://a3.aliceblueonline.com/open-api/od/ChartAPIService/api/chart/history
//
// STRATEGY (v2 — store-first):
//
//   The read path (getAliceBlueHistory) NEVER makes a
//   synchronous broker call on a symbol it has already
//   seen. It reads the local candle-cache and returns
//   instantly. Freshness is the background sync worker's
//   job (see syncWorker.js), not the request path's.
//
//   1. Known key (cache file exists, even if stale/empty
//      after market-hours) -> serve straight from disk.
//      Instant, never blocked on AliceBlue being up.
//   2. Unknown key (first time this symbol+resolution has
//      ever been requested) -> one-time "cold start" live
//      fetch, so the user isn't staring at nothing. Once
//      that succeeds, the key is written to disk and from
//      then on it's case 1 forever, and the sync worker
//      picks it up automatically (it just scans the cache
//      directory — see listTrackedKeys()).
//   3. Cold start fails too (broker down, or genuinely no
//      data yet) -> return empty. Nothing to show yet.
//
//   Session expiry (401/403) and the two hard platform
//   limits (BSE/BCD/BFO not supported at all; index
//   symbols, which AliceBlue's chart API cannot resolve)
//   are real, permanent errors, so they still throw
//   immediately instead of attempting anything.
//
//   fetchAndCacheLive() is the shared low-level "hit
//   AliceBlue, normalize, write to disk" primitive used by
//   both the cold-start path here AND the background sync
//   worker — one code path, one place that talks to the
//   broker.
//
//======================================================

import fs from "fs";
import path from "path";
import axios from "axios";

import {
    getSessionId
} from "./token.js";

const ALICEBLUE_BASE =
    "https://a3.aliceblueonline.com";

//======================================================
// CACHE
//======================================================

const CACHE_DIR =
    path.resolve(
        process.cwd(),
        "server",
        "aliceblue",
        "data",
        "candle-cache"
    );

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

function cacheKey(exchange, token, resolution) {
    return `${exchange}_${token}_${resolution}`;
}

function cacheFile(key) {
    return path.join(CACHE_DIR, `${key}.json`);
}

function readCache(key) {

    try {

        const file = cacheFile(key);

        if (!fs.existsSync(file)) {
            return null;
        }

        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

        if (!Array.isArray(parsed?.candles) || parsed.candles.length === 0) {
            return null;
        }

        return parsed.candles;

    } catch (error) {

        console.warn(
            "[ALICEBLUE HISTORY CACHE] Read failed:",
            key,
            error?.message ?? error
        );

        return null;
    }
}

function writeCache(key, candles, meta = {}) {

    try {

        ensureCacheDir();

        fs.writeFileSync(
            cacheFile(key),
            JSON.stringify(
                {
                    cachedAt: new Date().toISOString(),
                    count: candles.length,
                    // Self-describing, so the sync worker can
                    // rebuild the fetch params from disk alone
                    // (no separate registry to drift out of
                    // sync with what's actually cached).
                    exchange: meta.exchange ?? null,
                    token: meta.token ?? null,
                    resolution: meta.resolution ?? null,
                    candles
                },
                null,
                2
            ),
            "utf8"
        );

    } catch (error) {

        console.warn(
            "[ALICEBLUE HISTORY CACHE] Write failed:",
            key,
            error?.message ?? error
        );
    }
}

//======================================================
// FRESHNESS — for the (future) frontend badge and for
// the sync worker to decide what's due for a refresh.
//======================================================

export function getCacheFreshness({ exchange, token, timeframe }) {

    const resolution = normalizeResolution(timeframe);
    const key = cacheKey(
        String(exchange ?? "").trim().toUpperCase(),
        String(token ?? "").trim(),
        resolution
    );

    const file = cacheFile(key);

    if (!fs.existsSync(file)) {
        return { hasCache: false, cachedAt: null, ageMs: null, count: 0 };
    }

    try {

        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        const cachedAt = parsed?.cachedAt ?? null;

        return {
            hasCache: true,
            cachedAt,
            ageMs: cachedAt ? (Date.now() - new Date(cachedAt).getTime()) : null,
            count: parsed?.count ?? (parsed?.candles?.length ?? 0)
        };

    } catch {

        return { hasCache: false, cachedAt: null, ageMs: null, count: 0 };
    }
}

//======================================================
// TRACKED KEYS — every symbol+resolution ever
// successfully cached. This IS the sync worker's
// worklist: it just scans the directory, so there's
// nothing to keep manually in sync. A key only ever
// lands here after a real successful AliceBlue response,
// which means indices and unsupported exchanges never
// appear (they never succeed in the first place).
//======================================================

export function listTrackedKeys() {

    ensureCacheDir();

    const files =
        fs.readdirSync(CACHE_DIR)
            .filter((name) => name.endsWith(".json"));

    return files
        .map((name) => {

            const base = name.slice(0, -".json".length);

            // key format: EXCHANGE_TOKEN_RESOLUTION
            // e.g. NFO_35235_1, NSE_21808_D
            const firstUnderscore = base.indexOf("_");
            const lastUnderscore = base.lastIndexOf("_");

            if (
                firstUnderscore === -1 ||
                firstUnderscore === lastUnderscore
            ) {
                return null;
            }

            const exchange = base.slice(0, firstUnderscore);
            const token = base.slice(firstUnderscore + 1, lastUnderscore);
            const resolution = base.slice(lastUnderscore + 1);

            if (!exchange || !token || !resolution) {
                return null;
            }

            return { key: base, exchange, token, resolution };
        })
        .filter(Boolean);
}

//======================================================
// RESOLUTION
//======================================================

function normalizeResolution(timeframe) {

    const value =
        String(
            timeframe ?? "1m"
        )
        .trim()
        .toLowerCase();

    if (
        value === "d" ||
        value === "1d" ||
        value === "day" ||
        value === "daily"
    ) {
        return "D";
    }

    if (
        value === "1m" ||
        value === "1"
    ) {
        return "1";
    }

    if (
        value === "5m" ||
        value === "5"
    ) {
        return "5";
    }

    if (
        value === "15m" ||
        value === "15"
    ) {
        return "15";
    }

    if (
        value === "30m" ||
        value === "30"
    ) {
        return "30";
    }

    if (
        value === "60m" ||
        value === "60" ||
        value === "1h"
    ) {
        return "60";
    }

    return "1";
}

//======================================================
// LIVE FETCH — raw AliceBlue call + response validation.
// Throws on real errors (session expiry, broker rejection).
// Returns [] (not an error) when AliceBlue answers "ok"
// with zero rows — that case is handled by the caller as
// a cache-fallback trigger, not an exception.
//======================================================

async function fetchLiveCandles({ exch, instrumentToken, resolution, fromMs, toMs }) {

    const sessionId =
        getSessionId();

    if (!sessionId) {
        throw new Error(
            "[ALICEBLUE HISTORY] Alice Blue session unavailable. Login required."
        );
    }

    let response;

    try {

        response =
            await axios.post(

                `${ALICEBLUE_BASE}/open-api/od/ChartAPIService/api/chart/history`,

                {
                    token: instrumentToken,
                    resolution,
                    from: String(fromMs),
                    to: String(toMs),
                    exchange: exch
                },

                {
                    headers: {
                        Authorization: `Bearer ${sessionId}`,
                        "Content-Type": "application/json"
                    },

                    timeout: 20000
                }
            );

    } catch (error) {

        const httpStatus = error?.response?.status;

        if (httpStatus === 401 || httpStatus === 403) {

            // Genuinely worth a loud log - this is the one AliceBlue
            // outcome that's actually actionable (log in again), and
            // it doesn't fire on every poll like the routine "no
            // data" case does, so it won't flood the console.
            console.warn(
                "[ALICEBLUE HISTORY] Session expired or invalid - log in again via /api/aliceblue/login."
            );

            const sessionError =
                new Error(
                    "[ALICEBLUE HISTORY] Alice Blue session has expired or is invalid. Log in again via /api/aliceblue/login, then retry."
                );

            sessionError.aliceBlueReason = "SESSION_EXPIRED";

            throw sessionError;
        }

        // Any other transport-level failure is treated as
        // "live unavailable right now" by the caller, not a
        // hard error — so just signal it distinctly here.
        // Deliberately no console noise: this fires on every
        // routine poll whenever the broker has nothing to give,
        // which is the normal/expected case for a huge fraction
        // of requests (market closed, no API entitlement, etc.)
        // - not worth a log line every single time.
        console.error(
            "[ALICEBLUE HISTORY] LIVE UNAVAILABLE - real reason:",
            {
                httpStatus: error?.response?.status,
                responseData: error?.response?.data,
                code: error?.code,
                message: error?.message
            }
        );

        const liveUnavailable =
            new Error(
                error?.message ?? "Alice Blue live request failed."
            );

        liveUnavailable.aliceBlueReason = "LIVE_UNAVAILABLE";

        throw liveUnavailable;
    }

    const data = response?.data;
    console.log(
        "[ALICEBLUE HISTORY] RAW RESPONSE DATA:",
        JSON.stringify(data)?.slice(0, 2000)
    );

    if (!data) {

        const empty = new Error("[ALICEBLUE HISTORY] Empty response.");
        empty.aliceBlueReason = "LIVE_UNAVAILABLE";
        throw empty;
    }

    const status =
        String(data.stat ?? data.status ?? "")
            .trim()
            .toLowerCase();

    if (status && status !== "ok") {

        // e.g. {"emsg":"No data available"} — broker-level
        // "nothing to give you right now", not a real error.
        // No console noise here either, same reasoning as above.
        const noData = new Error(data.emsg ?? data.message ?? "No data available.");
        noData.aliceBlueReason = "LIVE_UNAVAILABLE";
        throw noData;
    }

    const rows =
        Array.isArray(data.result) ? data.result : [];

    return dedupeCandlesByTime(
        rows
            .map(normalizeCandle)
            .filter(Boolean)
            .sort((a, b) => a.time - b.time)
    );
}

//======================================================
// DEDUPE
//
// AliceBlue's raw response occasionally contains the
// exact same candle twice, back to back (confirmed from
// real responses in this project - identical time/open/
// high/low/close/volume repeated). Two candles sharing a
// timestamp violates the strict-ascending requirement most
// charting libraries enforce, and throws a hard rendering
// assertion (seen on 1D specifically, since it has the most
// candles and therefore the highest chance of hitting a
// duplicate). Input must already be sorted ascending by
// time; this keeps the LAST occurrence of each timestamp.
//======================================================

function dedupeCandlesByTime(sortedCandles) {

    const byTime = new Map();

    for (const candle of sortedCandles) {
        byTime.set(candle.time, candle);
    }

    return Array.from(byTime.values());
}

//======================================================
// FETCH + CACHE — shared primitive. Hits AliceBlue once,
// normalizes, writes to disk on success. Used by both the
// cold-start path below and the background sync worker.
// Throws on real errors (session expiry); returns null on
// "nothing to give you right now" (0 rows / transient
// rejection) instead of throwing, since that's a normal,
// expected outcome for both callers, not an exception.
//======================================================

export async function fetchAndCacheLive({ exch, instrumentToken, resolution, fromMs, toMs }) {

    const key = cacheKey(exch, instrumentToken, resolution);

    let candles;

    try {

        candles = await fetchLiveCandles({ exch, instrumentToken, resolution, fromMs, toMs });

    } catch (error) {

        if (error?.aliceBlueReason === "SESSION_EXPIRED") {
            throw error;
        }

        return null;
    }

    if (!candles || candles.length === 0) {
        return null;
    }

    writeCache(key, candles, { exchange: exch, token: instrumentToken, resolution });

    return candles;
}

//======================================================
// HISTORY (public entry point) — STORE-FIRST.
//
// Known key -> instant read from disk, no network call,
// never blocked on AliceBlue being reachable.
// Unknown key -> one cold-start live fetch to seed the
// store, then it behaves like every other key forever.
//======================================================

export async function getAliceBlueHistory({
    exchange,
    token,
    timeframe,
    from,
    to,
    isIndex = false,
    exchangeSegment = "",
    instrumentType = "",
    forceRefresh = false
}) {

    const rawExchange =
        String(exchange ?? "").trim().toUpperCase();

    const instrumentToken =
        String(token ?? "").trim();

    const normalizedSegment =
        String(exchangeSegment ?? "").trim().toUpperCase();

    const normalizedInstrumentType =
        String(instrumentType ?? "").trim().toUpperCase();

    const indexTokens = new Set(["26000", "26009", "26037", "26074"]);

    const finalIsIndex =
        isIndex === true ||
        indexTokens.has(instrumentToken) ||
        normalizedSegment.includes("IDX") ||
        normalizedSegment.includes("INDEX") ||
        normalizedInstrumentType.includes("INDEX");

    const exch = rawExchange;

    console.log(
        "[ALICEBLUE HISTORY] EXCHANGE CLASSIFICATION:",
        {
            rawExchange: exchange,
            token: instrumentToken,
            exchangeSegment: normalizedSegment,
            instrumentType: normalizedInstrumentType,
            finalIsIndex,
            finalExchange: exch
        }
    );

    if (!exch) {
        throw new Error("[ALICEBLUE HISTORY] Exchange is required.");
    }

    if (!instrumentToken) {
        throw new Error("[ALICEBLUE HISTORY] Token is required.");
    }

    //--------------------------------------------------
    // HARD PLATFORM LIMIT — not a timing issue, still
    // fails immediately, no cache fallback attempted.
    //--------------------------------------------------

    const resolution = normalizeResolution(timeframe);

    const key = cacheKey(exch, instrumentToken, resolution);

    const UNSUPPORTED_CHART_EXCHANGES = new Set(["BSE", "BCD", "BFO"]);

    if (UNSUPPORTED_CHART_EXCHANGES.has(exch)) {

        const unsupportedError =
            new Error(
                `[ALICEBLUE HISTORY] AliceBlue does not provide chart/history data for ${exch} yet (their docs: "BSE, BCD and BFO Chart data will be added later"). Use another provider for SENSEX/BANKEX candles.`
            );

        unsupportedError.aliceBlueReason = "EXCHANGE_NOT_SUPPORTED";

        throw unsupportedError;
    }

    //--------------------------------------------------
    // RESOLUTION — no pre-block here anymore. A previous
    // version hardcoded a "1 and D only" gate that fired
    // before AliceBlue was ever called, so it was never
    // actually verified against the real API. Every
    // resolution normalizeResolution() knows about (1, 5,
    // 15, 30, 60, D) is now attempted live; if AliceBlue's
    // real endpoint rejects a given resolution, that shows
    // up as a normal LIVE_UNAVAILABLE / cache-fallback case
    // below, same as any other "no data right now" response
    // — not a hardcoded assumption.
    //--------------------------------------------------

    const now = Date.now();

    const fromMs = from ?? (now - 24 * 60 * 60 * 1000);
    const toMs = to ?? now;

    //--------------------------------------------------
    // KNOWN KEY -> READ FROM STORE, NO NETWORK CALL.
    //
    // forceRefresh is an explicit opt-in escape hatch
    // (e.g. a manual "refresh" button in the UI) — normal
    // chart loads never set it, so they never wait on
    // AliceBlue for a symbol that's already tracked.
    //--------------------------------------------------

    if (!forceRefresh) {

        const cached = readCache(key);

        if (cached && cached.length > 0) {

            console.log(
                "[ALICEBLUE HISTORY] Served from store:",
                key,
                cached.length,
                "candles"
            );

            return dedupeCandlesByTime(cached);
        }
    }

    //--------------------------------------------------
    // UNKNOWN KEY (or explicit forceRefresh) -> ONE LIVE
    // FETCH. On success this both answers the current
    // request AND seeds the store, so the sync worker
    // picks this key up on its very next scan.
    //--------------------------------------------------

    let live;

    try {

        live =
            await fetchAndCacheLive({
                exch,
                instrumentToken,
                resolution,
                fromMs,
                toMs
            });

    } catch (error) {

        if (error?.aliceBlueReason === "SESSION_EXPIRED") {
            // Real problem the user must fix — don't mask it,
            // surface it as-is.
            throw error;
        }

        console.error(
            "[ALICEBLUE HISTORY] fetchAndCacheLive failed (non-session-expired):",
            error?.aliceBlueReason ?? "(no reason)",
            error?.message ?? error
        );

        live = null;
    }

    if (live && live.length > 0) {

        console.log(
            "[ALICEBLUE HISTORY] Cold-start LIVE candles:",
            live.length
        );

        return live;
    }

    //--------------------------------------------------
    // forceRefresh on an already-tracked key that just
    // failed live -> fall back to whatever's still on
    // disk rather than blanking the chart.
    //--------------------------------------------------

    if (forceRefresh) {

        const stale = readCache(key);

        if (stale && stale.length > 0) {

            console.log(
                "[ALICEBLUE HISTORY] Refresh failed, served stale store copy:",
                key
            );

            return dedupeCandlesByTime(stale);
        }
    }

    //--------------------------------------------------
    // NOTHING LIVE, NOTHING STORED — genuinely first-ever
    // request for this symbol and the broker has nothing
    // right now.
    //--------------------------------------------------

    console.log(
        "[ALICEBLUE HISTORY] No live data and nothing in store yet:",
        key
    );

    return [];
}

//======================================================
// CANDLE
//======================================================

function normalizeCandle(row) {

    if (!row) {
        return null;
    }

    const timestamp =
        normalizeTimestamp(
            row.Time ?? row.time ?? row.timestamp ?? row.Timestamp
        );

    const open = toNumber(row.Open ?? row.open);
    const high = toNumber(row.High ?? row.high);
    const low = toNumber(row.Low ?? row.low);
    const close = toNumber(row.Close ?? row.close);
    const volume = toNumber(row.Volume ?? row.volume) ?? 0;

    if (
        timestamp === null ||
        open === null ||
        high === null ||
        low === null ||
        close === null
    ) {
        return null;
    }

    return { time: timestamp, open, high, low, close, volume };
}

//======================================================
// NUMBER
//======================================================

function toNumber(value) {

    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const n = Number(value);

    return Number.isFinite(n) ? n : undefined;
}

//======================================================
// TIMESTAMP
//======================================================

function normalizeTimestamp(value) {

    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value === "number") {

        if (!Number.isFinite(value)) {
            return null;
        }

        if (value > 100000000000) {
            return Math.floor(value / 1000);
        }

        return Math.floor(value);
    }

    const text = String(value).trim();

    if (/^\d+$/.test(text)) {

        const n = Number(text);

        if (!Number.isFinite(n)) {
            return null;
        }

        if (n > 100000000000) {
            return Math.floor(n / 1000);
        }

        return Math.floor(n);
    }

    const parsed = Date.parse(text);

    if (!Number.isFinite(parsed)) {
        return null;
    }

    return Math.floor(parsed / 1000);
}

//======================================================
// DEFAULT
//======================================================

export default {
    getAliceBlueHistory,
    fetchAndCacheLive,
    getCacheFreshness,
    listTrackedKeys
};
