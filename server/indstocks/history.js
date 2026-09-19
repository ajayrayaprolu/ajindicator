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

import fs from "fs";
import path from "path";
import axios from "axios";
import { getAccessToken } from "./token.js";

const INDSTOCKS_BASE =
    "https://api.indstocks.com";

const CACHE_DIR =
    path.resolve(process.cwd(), "server", "indstocks", "data", "candle-cache");

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

function cacheKey(exchange, securityId, resolution) {
    return `${exchange}_${securityId}_${resolution}`;
}

function cacheFile(key) {
    return path.join(CACHE_DIR, `${key}.json`);
}

function readCache(key) {

    try {

        const file = cacheFile(key);

        if (!fs.existsSync(file)) return null;

        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

        if (!Array.isArray(parsed?.candles) || parsed.candles.length === 0) return null;

        return parsed.candles;

    } catch {

        return null;

    }

}

function writeCache(key, candles) {

    try {

        ensureCacheDir();

        fs.writeFileSync(
            cacheFile(key),
            JSON.stringify({ cachedAt: new Date().toISOString(), count: candles.length, candles }, null, 2),
            "utf8"
        );

    } catch (error) {

        console.warn("[INDSTOCKS HISTORY CACHE] Write failed:", key, error?.message ?? error);

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
        .map(row => ({
            time: Math.floor(Number(row.ts) / 1000),
            open: Number(row.o),
            high: Number(row.h),
            low: Number(row.l),
            close: Number(row.c),
            volume: Number(row.v) || 0
        }))
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
    const key = cacheKey(exch, secId, resolution);

    const now = Date.now();
    const fromMs = from ?? (now - 24 * 60 * 60 * 1000);
    const toMs = to ?? now;

    try {

        const candles = await fetchLiveCandles({
            exchange: exch,
            securityId: secId,
            resolution,
            fromMs,
            toMs
        });

        if (candles.length > 0) {
            writeCache(key, candles);
            console.log("[INDSTOCKS HISTORY] LIVE candles:", candles.length);
            return candles;
        }

        console.log("[INDSTOCKS HISTORY] Live returned 0 rows, checking cache...");

    } catch (error) {

        if (error?.indstocksReason === "SESSION_EXPIRED") {
            throw error;
        }

        console.log("[INDSTOCKS HISTORY] Live unavailable, checking cache. Reason:", error?.message);

    }

    const cached = readCache(key);

    if (cached && cached.length > 0) {
        console.log("[INDSTOCKS HISTORY] Serving cached candles:", cached.length);
        return cached;
    }

    console.log("[INDSTOCKS HISTORY] No live data and no cache available.");
    return [];

}

export default { getIndstocksHistory };