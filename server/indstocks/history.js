//======================================================
// server/indstocks/history.js
//
// IndStocks historical candle data.
//
// Confirmed working endpoint:
//   GET /market/historical/{interval}?scrip-codes=EXCH_SECURITYID&start_time=..&end_time=..
//   Auth header: Authorization: <access_token>  (raw token, no "Bearer " prefix)
//   Response: { success:true, data: { "EXCH_SECID": { candles: [{ts,o,h,l,c,v}, ...] } } }
//======================================================

import axios from "axios";
import { getAccessToken, refreshToken } from "./token.js";
import {
    getCandles,
    upsertCandles
} from "./data/IndstocksCandleDatabase.js";

const INDSTOCKS_BASE =
    "https://api.indstocks.com";

function readCache(exchange, securityId, resolution) {

    try {

        const candles =
            getCandles(
                exchange,
                securityId,
                resolution,
                0,
                Number.MAX_SAFE_INTEGER
            );

        return Array.isArray(candles) && candles.length > 0
            ? candles
            : null;

    } catch {

        return null;

    }

}

function writeCache(exchange, securityId, resolution, candles) {

    try {

        upsertCandles(
            exchange,
            securityId,
            resolution,
            candles
        );

    } catch (error) {

        console.warn(
            "[INDSTOCKS HISTORY CACHE] SQLite write failed:",
            exchange,
            securityId,
            resolution,
            error?.message ?? error
        );

    }

}
//======================================================
// RESOLUTION
//
// Only "1minute" is confirmed working from testing so far.
// Other values follow the same naming pattern but have NOT
// been verified against the live API yet - adjust here if
// IndStocks rejects any of these.
//======================================================

function normalizeResolution(timeframe) {

    const value = String(timeframe ?? "1m").trim().toLowerCase();

    if (value === "1m" || value === "1") return "1minute";
    if (value === "5m" || value === "5") return "5minute";
    if (value === "15m" || value === "15") return "15minute";
    if (value === "30m" || value === "30") return "30minute";
    if (value === "60m" || value === "60" || value === "1h") return "60minute";
    if (value === "1d" || value === "d" || value === "day" || value === "daily") return "day";

    return "1minute";

}

//======================================================
// LIVE FETCH
//======================================================

async function fetchLiveCandles({ exchange, securityId, resolution, fromMs, toMs }) {

    const token = await getAccessToken();

    const url =
        `${INDSTOCKS_BASE}/market/historical/${resolution}` +
        `?scrip-codes=${exchange}_${securityId}` +
        `&start_time=${fromMs}&end_time=${toMs}`;

    console.log("[INDSTOCKS HISTORY] LIVE REQUEST", { exchange, securityId, resolution, fromMs, toMs });

    let response;

    try {

        response = await axios.get(url, {
            headers: { Authorization: token },
            timeout: 20000
        });

    } catch (error) {

        const httpStatus = error?.response?.status;

        console.error("[INDSTOCKS HISTORY] REQUEST FAILED", {
            status: httpStatus,
            data: error?.response?.data,
            message: error?.message
        });

        if (httpStatus === 401 || httpStatus === 403) {

            const sessionError = new Error(
                "[INDSTOCKS HISTORY] IndStocks token invalid or expired."
            );
            sessionError.indstocksReason = "SESSION_EXPIRED";
            throw sessionError;

        }

        const liveUnavailable = new Error(error?.message ?? "IndStocks live request failed.");
        liveUnavailable.indstocksReason = "LIVE_UNAVAILABLE";
        throw liveUnavailable;

    }

    const key = `${exchange}_${securityId}`;

    const rows =
        response?.data?.data?.[key]?.candles ??
        [];

    return rows
        .map(row => {

            const rawTs = Number(row.ts);

            // IndStocks' docs say ts is milliseconds, but some rows
            // come back already in seconds. A blind /1000 on a
            // seconds value produces a near-epoch-zero timestamp
            // (renders around Jan 1970), which corrupts the whole
            // chart time axis. Detect the unit by magnitude instead
            // of assuming it is always milliseconds.
            const time =
                Number.isFinite(rawTs)
                    ? (
                        rawTs > 1e12
                            ? Math.floor(rawTs / 1000)
                            : Math.floor(rawTs)
                    )
                    : NaN;

            return {
                time,
                open: Number(row.o),
                high: Number(row.h),
                low: Number(row.l),
                close: Number(row.c),
                volume: Number(row.v) || 0
            };

        })
        .filter(c =>
            Number.isFinite(c.time) &&
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close)
        )
        .sort((a, b) => a.time - b.time);

}

//======================================================
// LIVE FETCH WITH SESSION RECOVERY
//
// IndStocks appears to invalidate a previously issued
// token whenever a new one is generated for the same
// client id/MPIN (this project and OpenAlgo currently
// share that client id). getAccessToken()'s own cache
// can therefore believe a token is still valid for hours
// while IndStocks has already killed it server-side.
//
// On a 401/403 (SESSION_EXPIRED), force one token refresh
// and retry the request exactly once before giving up.
//======================================================

async function fetchLiveCandlesWithRecovery(params) {

    try {

        return await fetchLiveCandles(params);

    } catch (error) {

        if (error?.indstocksReason !== "SESSION_EXPIRED") {
            throw error;
        }

        console.warn(
            "[INDSTOCKS HISTORY] Session expired mid-request - refreshing token and retrying once."
        );

        await refreshToken();

        return await fetchLiveCandles(params);

    }

}

//======================================================
// HISTORY LOOKBACK (days) PER RESOLUTION
//
// Wider windows give the chart enough candles. If the wide
// request fails or returns nothing, getIndstocksHistory falls
// back to the old 24 hour window.
//======================================================

const LOOKBACK_DAYS = {
    "1minute": 3,
    "5minute": 5,
    "15minute": 10,
    "30minute": 20,
    "60minute": 40,
    "day": 365
};

//======================================================
// PUBLIC ENTRY POINT
//======================================================

export async function getIndstocksHistory({
    exchange,
    securityId,
    timeframe,
    from,
    to
}) {

    const exch = String(exchange ?? "").trim().toUpperCase();
    const secId = String(securityId ?? "").trim();

    if (!exch) throw new Error("[INDSTOCKS HISTORY] Exchange is required.");
    if (!secId) throw new Error("[INDSTOCKS HISTORY] Security ID is required.");

    const resolution = normalizeResolution(timeframe);

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const toMs = to ?? now;
    const narrowFromMs = from ?? (now - DAY_MS);
    const wideFromMs = from ?? (now - (LOOKBACK_DAYS[resolution] ?? 1) * DAY_MS);

    try {

        let candles = [];

        try {

            candles = await fetchLiveCandlesWithRecovery({
                exchange: exch,
                securityId: secId,
                resolution,
                fromMs: wideFromMs,
                toMs
            });

        } catch (wideError) {

            console.log("[INDSTOCKS HISTORY] Wide window failed, retrying 24h:", wideError?.message);

        }

        if (candles.length === 0 && wideFromMs !== narrowFromMs) {

            candles = await fetchLiveCandlesWithRecovery({
                exchange: exch,
                securityId: secId,
                resolution,
                fromMs: narrowFromMs,
                toMs
            });

        }

        if (candles.length > 0) {
            writeCache(exch, secId, resolution, candles);
            console.log("[INDSTOCKS HISTORY] LIVE candles:", candles.length);
            return candles;
        }

        console.log("[INDSTOCKS HISTORY] Live returned 0 rows, checking cache...");

    } catch (error) {

        console.log("[INDSTOCKS HISTORY] Live unavailable, checking cache. Reason:", error?.message);

    }

    const cached = readCache(exch, secId, resolution);

    if (cached && cached.length > 0) {
        console.log("[INDSTOCKS HISTORY] Serving cached candles:", cached.length);
        return cached;
    }

    console.log("[INDSTOCKS HISTORY] No live data and no cache available.");
    return [];

}

export default { getIndstocksHistory };