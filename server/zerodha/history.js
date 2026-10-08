//======================================================
// server/zerodha/history.js
//======================================================
// Zerodha Historical Data
//
// Flow:
//
// AJ Terminal
//      ↓
// Instrument Resolution
//      ↓
// SQLite Candle Cache
//      ↓
// Cache Miss
//      ↓
// Kite Historical API
//      ↓
// Candle Conversion
//      ↓
// SQLite Upsert
//      ↓
// AJ Candle[]
//======================================================

import axios from "axios";

import {
    getAccessToken
} from "./token.js";

import {
    getByTradingSymbol,
    getInstrument
} from "./instruments/instruments.js";

import {
    getCandles as getCachedCandles,
    getCandleCacheStats,
    upsertCandles
} from "./data/ZerodhaCandleDatabase.js";

//======================================================
// KITE API
//======================================================

const BASE_URL =
    "https://api.kite.trade";

//======================================================
// TIMEFRAME MAP
//======================================================

const intervalMap = {

    "1m": "minute",

    "3m": "3minute",

    "5m": "5minute",

    "10m": "10minute",

    "15m": "15minute",

    "30m": "30minute",

    "1h": "60minute",

    "2h": "60minute",

    "4h": "60minute",

    "1d": "day"
};

//======================================================
// HISTORY LOOKBACK
//======================================================

const historyDays = {

    minute: 30,

    "3minute": 60,

    "5minute": 90,

    "10minute": 120,

    "15minute": 180,

    "30minute": 365,

    "60minute": 730,

    day: 3650
};

//======================================================
// INTERVAL SECONDS
//
// Used to determine whether a cache ending slightly
// before "now" is still fresh enough for the request.
//======================================================

const intervalSeconds = {

    minute:
        60,

    "3minute":
        3 * 60,

    "5minute":
        5 * 60,

    "10minute":
        10 * 60,

    "15minute":
        15 * 60,

    "30minute":
        30 * 60,

    "60minute":
        60 * 60,

    day:
        24 * 60 * 60
};

//======================================================
// FORMAT DATE
//
// Kite expects:
//
// YYYY-MM-DD HH:mm:ss
//======================================================

function formatDate(date) {

    const pad =
        value =>
            String(value)
                .padStart(2, "0");

    return (

        `${date.getFullYear()}-` +

        `${pad(
            date.getMonth() + 1
        )}-` +

        `${pad(
            date.getDate()
        )} ` +

        `${pad(
            date.getHours()
        )}:` +

        `${pad(
            date.getMinutes()
        )}:` +

        `${pad(
            date.getSeconds()
        )}`
    );
}

//======================================================
// DATE RANGE
//======================================================

function getDateRange(interval) {

    const now =
        new Date();

    const from =
        new Date(now);

    const days =
        historyDays[
            interval
        ] || 30;

    from.setDate(
        from.getDate() -
        days
    );

    return {

        from:
            formatDate(from),

        to:
            formatDate(now),

        fromSeconds:
            Math.floor(
                from.getTime() / 1000
            ),

        toSeconds:
            Math.floor(
                now.getTime() / 1000
            )
    };
}

//======================================================
// RESOLVE INSTRUMENT
//======================================================

function resolveInstrument(symbol) {

    let instrument =
        getInstrument(
            "NSE",
            symbol
        );

    if (!instrument) {

        instrument =
            getByTradingSymbol(
                symbol
            );
    }

    if (!instrument) {

        throw new Error(
            `Instrument not found: ${symbol}`
        );
    }

    return instrument;
}

//======================================================
// BUILD REQUEST
//======================================================

function buildRequest(
    symbol,
    timeframe
) {

    const interval =
        intervalMap[
            timeframe
        ] || "minute";

    const instrument =
        resolveInstrument(
            symbol
        );

    const range =
        getDateRange(
            interval
        );

    const accessToken =
        getAccessToken();

    if (!accessToken) {

        throw new Error(
            "Zerodha access token missing."
        );
    }

    const instrumentToken =
        instrument.instrument_token;

    const url =
        `${BASE_URL}/instruments/historical/${instrumentToken}/${interval}`;

    const config = {

        headers: {

            Authorization:
                `token ${process.env.ZERODHA_API_KEY}:${accessToken}`,

            "X-Kite-Version":
                "3"
        },

        params: {

            from:
                range.from,

            to:
                range.to,

            continuous:
                0,

            oi:
                1
        },

        timeout:
            20000
    };

    return {

        url,

        config,

        instrument,

        interval,

        range
    };
}

//======================================================
// CACHE FRESHNESS
//
// For a request ending at "now", the latest completed
// candle naturally ends slightly before the current time.
//
// Therefore the cache is considered fresh when its latest
// candle is within one interval of the requested end.
//======================================================

function isCacheFresh(
    cacheMaxTime,
    requestedTo,
    interval
) {

    if (
        !Number.isFinite(
            cacheMaxTime
        )
    ) {
        return false;
    }

    const tolerance =
        intervalSeconds[
            interval
        ] || 60;

    return (
        cacheMaxTime >=
        requestedTo -
        tolerance * 2
    );
}

//======================================================
// CACHE LOOKUP
//======================================================

function tryGetCachedCandles(
    instrument,
    interval,
    range
) {

    const instrumentToken =
        instrument.instrument_token;

    const stats =
        getCandleCacheStats(
            instrumentToken,
            interval,
            range.fromSeconds,
            range.toSeconds
        );

    //--------------------------------------------------
    // Cache must span requested range.
    //--------------------------------------------------

    if (!stats.complete) {
        return null;
    }

    //--------------------------------------------------
    // For current/live ranges, ensure cache is fresh.
    //--------------------------------------------------

    if (
        !isCacheFresh(
            stats.maxTime,
            range.toSeconds,
            interval
        )
    ) {
        return null;
    }

    const candles =
        getCachedCandles(
            instrumentToken,
            interval,
            range.fromSeconds,
            range.toSeconds
        );

    if (
        !candles ||
        candles.length === 0
    ) {
        return null;
    }

    return candles;
}

//======================================================
// CONVERT KITE RESPONSE
//======================================================

function convertKiteCandles(
    rows,
    instrument,
    interval
) {

    return rows
        .map(row => {

            if (
                !Array.isArray(row) ||
                row.length < 5
            ) {
                return null;
            }

            const timestampMs =
                new Date(
                    row[0]
                ).getTime();

            if (
                !Number.isFinite(
                    timestampMs
                )
            ) {
                return null;
            }

            const open =
                Number(row[1]);

            const high =
                Number(row[2]);

            const low =
                Number(row[3]);

            const close =
                Number(row[4]);

            const volume =
                Number(
                    row[5] ?? 0
                );

            const oi =
                Number(
                    row[6] ?? 0
                );

            if (
                !Number.isFinite(open) ||
                !Number.isFinite(high) ||
                !Number.isFinite(low) ||
                !Number.isFinite(close)
            ) {
                return null;
            }

            return {

                time:
                    Math.floor(
                        timestampMs / 1000
                    ),

                open,

                high,

                low,

                close,

                volume:
                    Number.isFinite(volume)
                        ? volume
                        : 0,

                oi:
                    Number.isFinite(oi)
                        ? oi
                        : 0,

                instrument_token:
                    String(
                        instrument.instrument_token
                    ),

                trading_symbol:
                    instrument.tradingsymbol,

                exchange:
                    instrument.exchange || "NSE",

                interval
            };

        })
        .filter(Boolean);
}

//======================================================
// GET HISTORICAL DATA
//======================================================

export async function getHistoricalData(
    symbol,
    timeframe = "1m"
) {

    //--------------------------------------------------
    // Build request
    //--------------------------------------------------

    const {

        url,

        config,

        instrument,

        interval,

        range

    } =
        buildRequest(
            symbol,
            timeframe
        );

    //--------------------------------------------------
    // CACHE-FIRST
    //--------------------------------------------------

    const cached =
        tryGetCachedCandles(
            instrument,
            interval,
            range
        );

    if (cached) {

        return cached;
    }

    //--------------------------------------------------
    // KITE API
    //--------------------------------------------------

    const response =
        await axios.get(
            url,
            config
        );

    //--------------------------------------------------
    // Validate response
    //--------------------------------------------------

    if (
        !response.data ||
        response.data.status !== "success"
    ) {

        throw new Error(
            response.data?.message ||
            "Invalid Zerodha response."
        );
    }

    //--------------------------------------------------
    // Raw candles
    //--------------------------------------------------

    const rows =
        response.data
            ?.data
            ?.candles || [];

    //--------------------------------------------------
    // Convert
    //--------------------------------------------------

    const candles =
        convertKiteCandles(
            rows,
            instrument,
            interval
        );

    //--------------------------------------------------
    // Persist SQLite
    //--------------------------------------------------

    if (candles.length > 0) {

        const saved =
            upsertCandles(
                instrument.instrument_token,
                interval,
                candles,
                {
                    exchange:
                        instrument.exchange || "NSE",

                    trading_symbol:
                        instrument.tradingsymbol
                }
            );

        if (
            saved !==
            candles.length
        ) {

            throw new Error(
                `[ZERODHA CANDLE DB] Persistence mismatch: received ${candles.length} candles but upserted ${saved}.`
            );
        }

        console.log(
            "[ZERODHA CANDLE DB] Persistence: PASS"
        );
    }

    //--------------------------------------------------
    // Return AJ Candle[]
    //--------------------------------------------------

    return candles.map(
        candle => ({

            time:
                candle.time,

            open:
                candle.open,

            high:
                candle.high,

            low:
                candle.low,

            close:
                candle.close,

            volume:
                candle.volume
        })
    );
}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {

    getHistoricalData

};

//======================================================
// END OF FILE
//======================================================