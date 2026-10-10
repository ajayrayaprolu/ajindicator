//======================================================
// server/fyers/history.js
//======================================================
// FYERS API v3 Historical Data
// Endpoint:  GET https://api-t1.fyers.in/data/history
//======================================================
// AJ V2 NOTES
// 1. Retrieves FYERS API v3 historical candles with normalized resolutions and date ranges.
// 2. Automatically refreshes an expired access token and retries the history request once.
// 3. Preserves candle normalization, SQLite persistence, cached-data fallback, and existing exports.
//======================================================

import axios from "axios";

import {
    getAppId,
    getAccessToken
} from "./token.js";

import {
    refreshAccessToken
} from "./login.js";

import * as candleDb from "./data/FyersCandleDatabase.js";

//======================================================
// CONFIGURATION
//======================================================

const FYERS_DATA_BASE =
    "https://api-t1.fyers.in/data";

const REQUEST_TIMEOUT_MS = 15000;

//======================================================
// RESOLUTION
//======================================================

export function normalizeResolution(timeframe) {
    const value = String(timeframe ?? "1m")
        .trim()
        .toLowerCase();

    const map = {
        "1s": "5S",
        "5s": "5S",
        "10s": "10S",
        "15s": "15S",
        "30s": "30S",
        "45s": "45S",

        "1m": "1",
        "1min": "1",
        "1minute": "1",
        "2m": "2",
        "3m": "3",
        "5m": "5",
        "10m": "10",
        "15m": "15",
        "20m": "20",
        "30m": "30",

        "60m": "60",
        "1h": "60",
        "120m": "120",
        "2h": "120",
        "240m": "240",
        "4h": "240",

        "1d": "D",
        "day": "D",
        "daily": "D",

        "1w": "1W",
        "week": "1W",

        "1mo": "1M",
        "1month": "1M"
    };

    return map[value] ?? timeframe;
}

//======================================================
// AUTHORIZATION
//======================================================

function buildAuthorization(appId, accessToken) {
    if (!appId || !accessToken) {
        throw new Error(
            "[FYERS HISTORY] App ID or access token is missing."
        );
    }

    return `${appId}:${accessToken}`;
}

//======================================================
// HISTORY REQUEST
//======================================================

async function requestHistory(params, appId, accessToken) {
    return axios.get(
        `${FYERS_DATA_BASE}/history`,
        {
            params,
            headers: {
                Authorization: buildAuthorization(
                    appId,
                    accessToken
                )
            },
            timeout: REQUEST_TIMEOUT_MS
        }
    );
}

//======================================================
// GET HISTORY
//======================================================

export async function getHistory(
    symbol,
    timeframe = "1m",
    options = {}
) {
    if (!symbol) {
        throw new Error(
            "[FYERS HISTORY] Symbol is required."
        );
    }

    const appId = getAppId();

    let accessToken = getAccessToken();

    if (!appId || !accessToken) {
        const sessionError = new Error(
            "[FYERS HISTORY] FYERS access token is missing. " +
            "Complete login via /api/fyers/login."
        );

        sessionError.fyersReason = "SESSION_EXPIRED";

        throw sessionError;
    }

    const resolution =
        normalizeResolution(timeframe);

    const now = Math.floor(Date.now() / 1000);

    //--------------------------------------------------
    // DATE RANGE
    //--------------------------------------------------

    const defaultDays =
        isDailyResolution(resolution) ? 30 : 7;

    const rangeTo = normalizeDateValue(
        options.rangeTo,
        now
    );

    const rangeFrom = normalizeDateValue(
        options.rangeFrom,
        rangeTo - defaultDays * 24 * 60 * 60
    );

    //--------------------------------------------------
    // REQUEST PARAMETERS
    //--------------------------------------------------

    const params = {
        symbol: String(symbol).trim().toUpperCase(),
        resolution,
        date_format: "0",
        range_from: rangeFrom,
        range_to: rangeTo,
        cont_flag: options.contFlag ?? "1"
    };

    if (options.oiFlag) {
        params.oi_flag = "1";
    }

    //--------------------------------------------------
    // REQUEST + ONE TOKEN REFRESH RETRY
    //--------------------------------------------------

    let response;

    try {
        response = await requestHistory(
            params,
            appId,
            accessToken
        );
    } catch (firstError) {
        const firstStatus =
            firstError?.response?.status;

        if (firstStatus === 401 || firstStatus === 403) {
            console.warn(
                "[FYERS HISTORY] Authorization rejected; attempting one token refresh.",
                params.symbol,
                firstStatus
            );

            try {
                accessToken = await refreshAccessToken();

                response = await requestHistory(
                    params,
                    appId,
                    accessToken
                );
            } catch (refreshOrRetryError) {
                const retryStatus =
                    refreshOrRetryError?.response?.status;

                console.error(
                    "[FYERS HISTORY] Refresh/retry failed.",
                    {
                        symbol: params.symbol,
                        status: retryStatus,
                        message:
                            refreshOrRetryError?.response?.data?.message ??
                            refreshOrRetryError?.message
                    }
                );

                const sessionError = new Error(
                    "[FYERS HISTORY] Automatic token refresh or retry failed. " +
                    "Check FYERS session.json, refresh-token validity, and FYERS_PIN. " +
                    "If refresh is no longer possible, complete login via /api/fyers/login."
                );

                sessionError.fyersReason = "SESSION_EXPIRED";
                sessionError.cause = refreshOrRetryError;

                throw sessionError;
            }
        } else {
            handleHistoryRequestError(
                firstError,
                params,
                rangeFrom,
                rangeTo
            );
        }
    }

    //--------------------------------------------------
    // VALIDATE RESPONSE
    //--------------------------------------------------

    const data = response?.data;

    if (
        !data ||
        String(data.s ?? "").toLowerCase() !== "ok"
    ) {
        const providerMessage =
            data?.message ??
            JSON.stringify(data) ??
            "Unknown FYERS error.";

        const responseError = new Error(
            `[FYERS HISTORY] ${providerMessage}`
        );

        responseError.fyersReason = "REQUEST_REJECTED";

        throw responseError;
    }

    if (!Array.isArray(data.candles)) {
        return [];
    }

    //--------------------------------------------------
    // NORMALIZE CANDLES
    //--------------------------------------------------

    const normalizedCandles =
        data.candles.map(normalizeCandle);

    //--------------------------------------------------
    // PERSIST CANDLES
    //--------------------------------------------------

    try {
        candleDb.upsertCandles(
            params.symbol,
            params.resolution,
            normalizedCandles
        );
    } catch (cacheError) {
        console.error(
            "[FYERS HISTORY] SQLite candle cache write failed:",
            cacheError?.message ?? cacheError
        );
    }

    return normalizedCandles;
}

//======================================================
// REQUEST ERROR HANDLING + SQLITE FALLBACK
//======================================================

function handleHistoryRequestError(
    error,
    params,
    rangeFrom,
    rangeTo
) {
    const httpStatus = error?.response?.status;

    console.error(
        "[FYERS HISTORY] Request failed:",
        params.symbol,
        httpStatus ?? "",
        error?.response?.data?.message ?? error?.message
    );

    if (httpStatus === 401 || httpStatus === 403) {
        const sessionError = new Error(
            "[FYERS HISTORY] FYERS authorization failed."
        );

        sessionError.fyersReason = "SESSION_EXPIRED";

        throw sessionError;
    }

    const fyersMessage =
        error?.response?.data?.message ??
        error?.response?.data?.s ??
        null;

    if (fyersMessage) {
        const detailedError = new Error(
            `[FYERS HISTORY] ${fyersMessage} ` +
            `(symbol: ${params.symbol}, resolution: ${params.resolution})`
        );

        detailedError.fyersReason = "REQUEST_REJECTED";

        throw detailedError;
    }

    try {
        const cachedCandles = candleDb.getCandles(
            params.symbol,
            params.resolution,
            rangeFrom,
            rangeTo
        );

        if (cachedCandles.length > 0) {
            console.warn(
                "[FYERS HISTORY] Returning SQLite cached candles after request failure:",
                params.symbol,
                params.resolution,
                cachedCandles.length
            );

            // Signal cached data to the caller without changing its shape.
            throw Object.assign(
                new Error("CACHED_CANDLES_RETURNED"),
                {
                    fyersReason: "CACHED_CANDLES_RETURNED",
                    cachedCandles
                }
            );
        }
    } catch (cacheError) {
        if (
            cacheError?.fyersReason ===
            "CACHED_CANDLES_RETURNED"
        ) {
            throw cacheError;
        }

        console.error(
            "[FYERS HISTORY] SQLite candle cache read failed:",
            cacheError?.message ?? cacheError
        );
    }

    throw error;
}

//======================================================
// NORMALIZE CANDLE
//======================================================

function normalizeCandle(row) {
    return {
        time: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5] ?? 0),
        oi: row.length > 6
            ? Number(row[6])
            : undefined
    };
}

//======================================================
// DAILY RESOLUTION
//======================================================

function isDailyResolution(resolution) {
    return (
        resolution === "D" ||
        resolution === "1D" ||
        resolution === "1W" ||
        resolution === "1M"
    );
}

//======================================================
// DATE NORMALIZATION
//======================================================

function normalizeDateValue(value, fallback) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    if (typeof value === "number") {
        return Math.floor(value);
    }

    const parsed = Date.parse(value);

    if (Number.isNaN(parsed)) {
        throw new Error(
            `[FYERS HISTORY] Invalid date: ${value}`
        );
    }

    return Math.floor(parsed / 1000);
}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {
    getHistory,
    normalizeResolution
};