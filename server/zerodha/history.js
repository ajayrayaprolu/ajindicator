//======================================================
// server/zerodha/history.js
// Part 1
//
// Timeframe Mapping
// Date Range Calculation
// Instrument Resolution
// Request Preparation
//
// Part 2 will contain:
//
// - Kite Historical API call
// - Candle conversion
// - Diagnostics
// - export getHistoricalData()
//======================================================

import axios from "axios";

import {

    getAccessToken

} from "./token.js";

import {

    getByTradingSymbol,

    getInstrument

} from "./instruments.js";

//======================================================
// KITE API
//======================================================

const BASE_URL =
    "https://api.kite.trade";

//======================================================
// TIMEFRAME MAP
//
// AJ Terminal
//
// ↓
//
// Kite Historical API
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
//
// Controls from_date
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
// FORMAT DATE
//
// YYYY-MM-DD HH:mm:ss
//======================================================

function formatDate(

    date

) {

    const pad = value =>

        String(value)
            .padStart(2, "0");

    return (

        `${date.getFullYear()}-`

        +

        `${pad(date.getMonth() + 1)}-`

        +

        `${pad(date.getDate())} `

        +

        `${pad(date.getHours())}:`

        +

        `${pad(date.getMinutes())}:`

        +

        `${pad(date.getSeconds())}`

    );

}

//======================================================
// DATE RANGE
//======================================================

function getDateRange(

    interval

) {

    const now =
        new Date();

    const from =
        new Date(now);

    const days =

        historyDays[
            interval
        ]

        ||

        30;

    from.setDate(

        from.getDate()

        -

        days

    );

    return {

        from:
            formatDate(from),

        to:
            formatDate(now)

    };

}

//======================================================
// RESOLVE INSTRUMENT
//
// Registry
//
// ↓
//
// Cache
//======================================================

function resolveInstrument(

    symbol

) {

    //--------------------------------------------------
    // Registry lookup
    //--------------------------------------------------

    let instrument =

        getInstrument(

            "NSE",

            symbol

        );

    //--------------------------------------------------
    // Cache lookup
    //--------------------------------------------------

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
        ]

        ||

        "minute";

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

            continuous: 0,

            oi: 1

        },

        timeout: 20000

    };

    console.log();

    console.log(
        "===================================="
    );

    console.log(
        "ZERODHA REQUEST"
    );

    console.log(
        "===================================="
    );

    console.log(
        "Symbol           :",
        symbol
    );

    console.log(
        "Instrument Token :",
        instrumentToken
    );

    console.log(
        "Interval         :",
        interval
    );

    console.log(
        "From             :",
        range.from
    );

    console.log(
        "To               :",
        range.to
    );

    console.log(
        "===================================="
    );

    console.log();

    return {

        url,

        config,

        instrument,

        interval

    };

}

//======================================================
// PART 2
//
// export async function getHistoricalData()
//======================================================
//======================================================
// server/zerodha/history.js
// Part 2
//
// Kite Historical API
// Candle Conversion
// Diagnostics
// Export
//
// Continues from Part 1
//======================================================

//======================================================
// GET HISTORICAL DATA
//======================================================

export async function getHistoricalData(

    symbol,

    timeframe = "1m"

) {

    //--------------------------------------------------
    // Build Request
    //--------------------------------------------------

    const {

        url,

        config,

        instrument,

        interval

    } = buildRequest(

        symbol,

        timeframe

    );

    //--------------------------------------------------
    // Call Kite Historical API
    //--------------------------------------------------

    const response =

        await axios.get(

            url,

            config

        );

    //--------------------------------------------------
    // Validate Response
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
    // Candle Array
    //--------------------------------------------------

    const rows =

        response.data

            ?.data

            ?.candles

        ||

        [];

    //--------------------------------------------------
    // Diagnostics
    //--------------------------------------------------

    console.log();

    console.log(
        "======================================"
    );

    console.log(
        "ZERODHA RAW HISTORY RESPONSE"
    );

    console.log(
        "======================================"
    );

    console.log(
        "Trading Symbol :",
        instrument.tradingsymbol
    );

    console.log(
        "Exchange       :",
        instrument.exchange
    );

    console.log(
        "Interval       :",
        interval
    );

    console.log(
        "Bars           :",
        rows.length
    );

    //--------------------------------------------------
    // Convert
    //--------------------------------------------------

    const candles =

        rows

            .map(

                row => {

                    //--------------------------------------------------
                    // Zerodha format
                    //
                    // [
                    //   timestamp,
                    //   open,
                    //   high,
                    //   low,
                    //   close,
                    //   volume,
                    //   oi?
                    // ]
                    //--------------------------------------------------

                    return {

                        time:

                            Math.floor(

                                new Date(

                                    row[0]

                                ).getTime()

                                / 1000

                            ),

                        open:
                            Number(row[1]),

                        high:
                            Number(row[2]),

                        low:
                            Number(row[3]),

                        close:
                            Number(row[4]),

                        volume:
                            Number(

                                row[5] ?? 0

                            ),

                        oi:
                            Number(

                                row[6] ?? 0

                            )

                    };

                }

            )

            .filter(

                candle =>

                    !Number.isNaN(
                        candle.open
                    )

                    &&

                    !Number.isNaN(
                        candle.high
                    )

                    &&

                    !Number.isNaN(
                        candle.low
                    )

                    &&

                    !Number.isNaN(
                        candle.close
                    )

            );

    //--------------------------------------------------
    // Last 10 Bars
    //--------------------------------------------------

    const start =

        Math.max(

            0,

            candles.length - 10

        );

    for (

        let i = start;

        i < candles.length;

        i++

    ) {

        console.log(

            `BAR ${i}`,

            {

                time:
                    candles[i].time,

                open:
                    candles[i].open,

                high:
                    candles[i].high,

                low:
                    candles[i].low,

                close:
                    candles[i].close,

                volume:
                    candles[i].volume,

                oi:
                    candles[i].oi

            }

        );

    }

    console.log(
        "======================================"
    );

    console.log();

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