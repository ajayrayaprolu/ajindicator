//======================================================
// server/zerodha/instruments/instruments.js
//
// Responsibilities
//
// ✓ Download Zerodha instrument master
// ✓ Parse CSV
// ✓ Build in-memory cache
// ✓ Build fast lookup indexes
// ✓ Load instrument cache from SQLite
// ✓ No JSON file dependency
//
//======================================================

import axios from "axios";

import {
    getAuthorizationHeader
} from "../token.js";

import {
    getInstrumentDatabase
} from "./InstrumentDatabase.js";

//======================================================
// CACHE
//======================================================

let instruments = [];

const tokenIndex =
    new Map();

const tradingSymbolIndex =
    new Map();

const exchangeIndex =
    new Map();

const exchangeTradingSymbolIndex =
    new Map();

//======================================================
// LOAD FROM SQLITE
//======================================================

function loadFromDatabase() {

    const db =
        getInstrumentDatabase();

    const rows =
        db.prepare(`
            SELECT
                exchange,
                segment,
                symbol,
                trading_symbol,
                display_name,
                instrument_type,
                expiry,
                strike,
                option_type,
                underlying,
                token_identifier,
                feed_source,
                active_status,
                last_updated
            FROM instruments
            WHERE feed_source = 'zerodha'
            ORDER BY id
        `).all();

    instruments =
        rows.map(
            row => ({

                instrument_token:
                    row.token_identifier == null
                        ? null
                        : Number(
                            row.token_identifier
                        ),

                exchange_token:
                    0,

                tradingsymbol:
                    row.trading_symbol,

                name:
                    row.display_name ?? "",

                exchange:
                    row.exchange,

                segment:
                    row.segment,

                instrument_type:
                    row.instrument_type ?? "",

                expiry:
                    row.expiry ?? "",

                strike:
                    row.strike == null
                        ? 0
                        : Number(
                            row.strike
                        ),

                option_type:
                    row.option_type ?? null,

                tick_size:
                    0,

                lot_size:
                    0,

                underlying:
                    row.underlying ?? "",

                active_status:
                    row.active_status

            })
        );

    buildIndexes();

    console.log(
        "[ZERODHA MASTER]",
        "SQLite DB cache loaded:",
        instruments.length
    );

    return instruments.length;
}

//======================================================
// DOWNLOAD MASTER
//======================================================

export async function downloadInstruments() {

    console.log();

    console.log(
        "======================================"
    );

    console.log(
        "ZERODHA MASTER CONTRACT DOWNLOAD"
    );

    console.log(
        "======================================"
    );

    const response =
        await axios.get(

            "https://api.kite.trade/instruments",

            {

                headers:
                    getAuthorizationHeader(),

                responseType:
                    "text",

                timeout:
                    60000

            }

        );

    const csv = response.data;

//    console.log(
//        "CSV Size:",
//        Math.round(
//            csv.length / 1024
//        ),
//        "KB"
//    );

    instruments = parseCSV(csv);
    buildIndexes();

//    console.log(
//        "Loaded:",
//        instruments.length,
//        "instruments"
//    );

//    console.log(
//        "======================================"
//    );

//    console.log();

    return instruments;

}

//======================================================
// CSV PARSER
//======================================================

function parseCSV(
    csv
) {

    const rows =
        csv
            .trim()
            .split(/\r?\n/);

    const headers =
        rows[0]
            .split(",");

    const output = [];

    for (

        let i = 1;

        i < rows.length;

        i++

    ) {

        const cols =
            rows[i]
                .split(",");

        const item = {};

        headers.forEach(

            (
                h,
                index
            ) => {

                item[h] =
                    cols[index];

            }

        );

        //--------------------------------------------------
        // NUMBERS
        //--------------------------------------------------

        item.instrument_token =
            Number(
                item.instrument_token
            );

        item.exchange_token =
            Number(
                item.exchange_token
            );

        item.tick_size =
            Number(
                item.tick_size
            );

        item.lot_size =
            Number(
                item.lot_size
            );

        if (
            item.strike !== undefined &&
            item.strike !== ""
        ) {

            item.strike =
                Number(
                    item.strike
                );

        }

        output.push(
            item
        );

    }

    return output;

}

//======================================================
// BUILD LOOKUP INDEXES
//======================================================

function buildIndexes() {

    tokenIndex.clear();

    tradingSymbolIndex.clear();

    exchangeIndex.clear();

    exchangeTradingSymbolIndex.clear();

    for (

        const item

        of instruments

    ) {

        //--------------------------------------------------
        // TOKEN
        //--------------------------------------------------

        if (
            item.instrument_token != null
        ) {

            tokenIndex.set(

                Number(
                    item.instrument_token
                ),

                item

            );

        }

        //--------------------------------------------------
        // SYMBOL
        //--------------------------------------------------

        const tradingSymbol =
            String(
                item.tradingsymbol ?? ""
            ).toUpperCase();

        if (tradingSymbol) {

            tradingSymbolIndex.set(
                tradingSymbol,
                item
            );

        }

        //--------------------------------------------------
        // EXCHANGE
        //--------------------------------------------------

        const exchange =
            String(
                item.exchange ?? ""
            ).toUpperCase();

        if (
            !exchangeIndex.has(
                exchange
            )
        ) {

            exchangeIndex.set(
                exchange,
                []
            );

        }

        exchangeIndex
            .get(
                exchange
            )
            .push(item);

        //--------------------------------------------------
        // EXCHANGE + SYMBOL
        //--------------------------------------------------

        exchangeTradingSymbolIndex.set(

            `${exchange}:${tradingSymbol}`,

            item

        );

    }

}

//======================================================
// LOAD CACHE FROM SQLITE
//======================================================

export function loadCache() {

    try {

        const count =
            loadFromDatabase();

        return count > 0;

    }

    catch (error) {

        console.warn(
            "[ZERODHA]",
            "Unable to load SQLite DB cache:",
            error?.message
        );

        instruments = [];

        buildIndexes();

        return false;

    }

}

//======================================================
// CACHE STATUS
//======================================================

export function instrumentCount() {

    return instruments.length;

}

export function getAllInstruments() {

    return instruments;

}

//======================================================
// LOOKUP BY TOKEN
//======================================================

export function getByInstrumentToken(
    instrumentToken
) {

    return (

        tokenIndex.get(
            Number(instrumentToken)
        )

        ||

        null

    );

}

//======================================================
// LOOKUP BY TRADING SYMBOL
//======================================================

export function getByTradingSymbol(
    tradingSymbol
) {

    return (

        tradingSymbolIndex.get(

            String(tradingSymbol)
                .toUpperCase()

        )

        ||

        null

    );

}

//======================================================
// LOOKUP BY EXCHANGE + SYMBOL
//======================================================

export function getInstrument(

    exchange,

    tradingSymbol

) {

    return (

        exchangeTradingSymbolIndex.get(

            `${String(exchange).toUpperCase()}:${String(tradingSymbol).toUpperCase()}`

        )

        ||

        null

    );

}

//======================================================
// GET ALL IN EXCHANGE
//======================================================

export function getExchangeInstruments(
    exchange
) {

    return (

        exchangeIndex.get(

            String(exchange)
                .toUpperCase()

        )

        ||

        []

    );

}

//======================================================
// SIMPLE TEXT SEARCH
//======================================================

export function searchInstrument(
    keyword
) {

    const text =
        String(keyword)
            .trim()
            .toUpperCase();

    if (!text.length) {

        return [];

    }

    return instruments.filter(

        item =>

            item.tradingsymbol
                ?.toUpperCase()
                .includes(text)

            ||

            item.name
                ?.toUpperCase()
                .includes(text)

            ||

            item.exchange
                ?.toUpperCase()
                .includes(text)

    );

}

//======================================================
// CACHE REFRESH
//======================================================

export async function refreshInstrumentCache() {

    console.log(
        "[ZERODHA] Refreshing DB cache..."
    );

    return await downloadInstruments();

}

//======================================================
// INITIALIZE
//
// Order:
//
// 1. Load existing SQLite cache
// 2. If SQLite cache missing/empty
//    download from Zerodha
//
//======================================================

export async function initializeInstrumentCache() {

    //--------------------------------------------------
    // Existing SQLite cache?
    //--------------------------------------------------

    if (loadCache()) {

        return;

    }

    console.log(
        "[ZERODHA] No local SQLite DB cache found."
    );

    //--------------------------------------------------
    // Try download
    //--------------------------------------------------

    try {

        console.log(
            "[ZERODHA] Downloading master Contract DB..."
        );

        await downloadInstruments();

    }

    catch (err) {

        console.warn(
            "[ZERODHA] Instrument cache unavailable."
        );

        console.warn(
            "[ZERODHA] Server will continue without Zerodha instruments."
        );

        console.warn(
            err.message
        );

    }

}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {

    initializeInstrumentCache,

    refreshInstrumentCache,

    downloadInstruments,

    loadCache,

    instrumentCount,

    getAllInstruments,

    getByInstrumentToken,

    getByTradingSymbol,

    getInstrument,

    getExchangeInstruments,

    searchInstrument

};

//======================================================
// END OF FILE
//======================================================