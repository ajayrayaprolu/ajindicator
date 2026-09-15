//======================================================
// server/zerodha/instruments.js
// Part 1
//
// Responsibilities
//
// ✓ Download Zerodha instrument master
// ✓ Parse CSV
// ✓ Build in-memory cache
// ✓ Build fast lookup indexes
//
// Part 2 continues immediately after this file.
//
//======================================================

import fs from "fs";
import path from "path";
import axios from "axios";

import {
    getAuthorizationHeader
}
from "./token.js";

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
// PATH
//======================================================

const CACHE_FILE =
    path.join(
        process.cwd(),
        "server",
        "zerodha",
        "instruments.json"
    );

//======================================================
// DOWNLOAD MASTER
//======================================================

export async function downloadInstruments() {

    console.log();

    console.log(
        "======================================"
    );

    console.log(
        "ZERODHA INSTRUMENT DOWNLOAD"
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

    const csv =
        response.data;

    console.log(
        "CSV Size:",
        Math.round(
            csv.length / 1024
        ),
        "KB"
    );

    instruments =
        parseCSV(csv);

    buildIndexes();

    saveCache();

    console.log(
        "Loaded:",
        instruments.length,
        "instruments"
    );

    console.log(
        "======================================"
    );

    console.log();

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
            .split("\n");

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

        tokenIndex.set(

            item.instrument_token,

            item

        );

        //--------------------------------------------------
        // SYMBOL
        //--------------------------------------------------

        tradingSymbolIndex.set(

            item.tradingsymbol,

            item

        );

        //--------------------------------------------------
        // EXCHANGE
        //--------------------------------------------------

        if (

            !exchangeIndex.has(

                item.exchange

            )

        ) {

            exchangeIndex.set(

                item.exchange,

                []

            );

        }

        exchangeIndex
            .get(
                item.exchange
            )
            .push(item);

        //--------------------------------------------------
        // NSE:RELIANCE
        //--------------------------------------------------

        exchangeTradingSymbolIndex.set(

            `${item.exchange}:${item.tradingsymbol}`,

            item

        );

    }

}

//======================================================
// SAVE CACHE
//======================================================

function saveCache() {

    fs.writeFileSync(

        CACHE_FILE,

        JSON.stringify(

            instruments,

            null,

            2

        ),

        "utf8"

    );

}

//======================================================
// LOAD CACHE
//======================================================

export function loadCache() {

    if (

        !fs.existsSync(
            CACHE_FILE
        )

    ) {

        return false;

    }

    instruments =
        JSON.parse(

            fs.readFileSync(

                CACHE_FILE,

                "utf8"

            )

        );

    buildIndexes();

    console.log(

        "[ZERODHA]",

        "Instrument cache loaded:",

        instruments.length

    );

    return true;

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
// END OF PART 1
//======================================================

//
// Continue immediately with
// server/zerodha/instruments.js Part 2
//======================================================
// server/zerodha/instruments.js
// Part 2
//
// Lookup APIs
// Search helpers
// Startup initialization
//
// Continues from Part 1
//======================================================

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
//
// Example:
//
// NSE + RELIANCE
// NSE + INFY
// BSE + SBIN
// NFO + NIFTY25JULFUT
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
//
// Example:
//
// NSE
// BSE
// NFO
// CDS
// MCX
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
//
// Searches:
//
// trading symbol
// exchange
// company name
//
// Used by SymbolMapper / UI
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
        "[ZERODHA] Refreshing instrument cache..."
    );

    return await downloadInstruments();

}

//======================================================
// INITIALIZE
//
// Called once when Node server starts.
//
// Order:
//
// 1. Load local cache
// 2. If cache missing
//    download from Zerodha
//======================================================

export async function initializeInstrumentCache() {

    //--------------------------------------------------
    // Existing cache?
    //--------------------------------------------------

    if (loadCache()) {

        return;

    }

    console.log(
        "[ZERODHA] No local cache found."
    );

    //--------------------------------------------------
    // Try download
    //--------------------------------------------------

    try {

        console.log(
            "[ZERODHA] Downloading instrument master..."
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