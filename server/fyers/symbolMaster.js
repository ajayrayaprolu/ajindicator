//======================================================
// server/fyers/symbolMaster.js
//
// FYERS Symbol Master — download, cache, index, search.
//
// FYERS publishes per-segment CSV symbol masters with NO
// header row. Column layout below was CONFIRMED against a
// live sample downloaded 2026-08-20:
//
// 101126082535011,BANKNIFTY 25 Aug 26 39900 CE,14,30,0.05,,
// 0915-1540|1815-1915:,2026-08-19,1787652600,
// NSE:BANKNIFTY26AUG39900CE,10,11,35011,BANKNIFTY,26009,
// 39900.0,CE,101000000026009,None,0,0.0
//
// Responsibilities:
//   1. Download NSE_FO / BSE_FO symbol master CSVs
//   2. Cache raw CSV + parsed JSON to disk
//   3. Build option indexes (underlying/expiry/strike/type)
//   4. Search NIFTY / SENSEX option contracts
//   5. Return the exact FYERS-native trading symbol
//      (never construct one manually — always the one
//      the master itself published)
//
// AJ Institutional Terminal
//======================================================

import axios from "axios";

import * as contractDb from "./data/FyersContractDatabase.js";

//======================================================
// CONFIGURATION
//======================================================

const SEGMENTS = {
    NSE_FO: {
        url:
            "https://public.fyers.in/sym_details/NSE_FO.csv",
        underlyings: null
    },
    BSE_FO: {
        url:
            "https://public.fyers.in/sym_details/BSE_FO.csv",
        underlyings: null
    }
};

const REFRESH_INTERVAL_MS =
    Number(
        process.env.FYERS_SYMBOL_REFRESH_MS ??
        30 * 60 * 1000
    );

// Raw CSV is retained in memory for inspectRawSample() only.
const rawSamples = new Map();

//======================================================
// COLUMN LAYOUT (0-indexed) — CONFIRMED, see header
//======================================================

const COLUMN = {
    FYTOKEN: 0,
    SYMBOL_DETAILS: 1,            // e.g. "BANKNIFTY 25 Aug 26 39900 CE" — expiry parsed from here
    EXCHANGE_INSTRUMENT_TYPE: 2,
    MIN_LOT_SIZE: 3,
    TICK_SIZE: 4,
    ISIN: 5,
    TRADING_SESSION: 6,
    LAST_UPDATE_DATE: 7,
    EXPIRY_EPOCH: 8,               // present but NOT used — timezone-ambiguous; SYMBOL_DETAILS is authoritative
    SYMBOL_TICKER: 9,              // e.g. NSE:BANKNIFTY26AUG39900CE — exact FYERS-native symbol
    EXCHANGE_CODE: 10,             // numeric (10=NSE, 12=BSE) — exchange text derived from ticker prefix instead
    SEGMENT_CODE: 11,              // numeric segment code
    SCRIP_CODE: 12,
    UNDERLYING_SYMBOL: 13,         // clean text, e.g. "NIFTY" / "BANKNIFTY" / "SENSEX" — EXACT match key
    UNDERLYING_SCRIP_CODE: 14,
    STRIKE_PRICE: 15,
    OPTION_TYPE: 16,               // CE / PE
    UNDERLYING_FYTOKEN: 17
};

const MONTH_MAP = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
};

// Matches "BANKNIFTY 25 Aug 26 39900 CE" -> day=25, mon=Aug, yy=26
const SYMBOL_DETAILS_DATE_RE = /^\S+\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})\b/;

//======================================================
// STATE
//======================================================

let contracts = [];
let loaded = false;
let lastRefresh = 0;
let refreshTimer = null;

// key: `${underlying}|${expiry}|${strike}|${optionType}` -> contract
const optionIndex = new Map();

// key: symbol ticker (e.g. "NSE:BANKNIFTY26AUG39900CE") -> contract
const tickerIndex = new Map();

// key: underlying -> Set of expiry strings
const expiryIndex = new Map();

//======================================================
// STORAGE
//======================================================
// Persistent master storage is SQLite.
// Raw CSV text exists only in memory for diagnostics.

//======================================================
// MINIMAL CSV LINE SPLIT
// (FYERS symbol master fields are not quoted/comma-
// embedded in practice, so a plain split is sufficient;
// guarded against trailing \r from CRLF line endings.)
//======================================================

function splitCsvLine(line) {
    return line.replace(/\r$/, "").split(",");
}

//======================================================
// DIAGNOSTIC — call this after any future re-download to
// confirm FYERS hasn't changed the column layout on us.
//======================================================

export function inspectRawSample(segmentKey = "NSE_FO", sampleSize = 5) {

    const segment = SEGMENTS[segmentKey];

    if (!segment) {
        throw new Error(
            `[FYERS MASTER] Unknown segment: ${segmentKey}`
        );
    }

    const text = rawSamples.get(segmentKey);

    if (!text) {
        return {
            error:
                "Raw CSV sample is not available in memory. Call downloadFyersSymbolMaster() first."
        };
    }

    const lines =
        text
            .split("\n")
            .filter(Boolean)
            .slice(0, sampleSize);

    return {
        segment: segmentKey,
        totalLines:
            text.split("\n").filter(Boolean).length,
        sampleRows:
            lines.map(line => {
                const fields = splitCsvLine(line);
                return {
                    columnCount: fields.length,
                    fields,
                    mapped: {
                        symbolDetails:
                            fields[COLUMN.SYMBOL_DETAILS],
                        symbolTicker:
                            fields[COLUMN.SYMBOL_TICKER],
                        underlyingSymbol:
                            fields[COLUMN.UNDERLYING_SYMBOL],
                        strikePrice:
                            fields[COLUMN.STRIKE_PRICE],
                        optionType:
                            fields[COLUMN.OPTION_TYPE]
                    }
                };
            })
    };
}

//======================================================
// NORMALIZATION
//======================================================
// EXACT match only. A substring match here previously let
// "BANKNIFTY" tickers leak into "NIFTY" search results.
//=====================================================================

function normalizeUnderlying(underlyingField, expectedUnderlyings) {

    const value = String(underlyingField ?? "").trim().toUpperCase();

    if (!value) {
        return null;
    }

    // null/undefined list means "accept any underlying" — used
    // for the full stock+index F&O universe. A real list (kept
    // for future narrowing if ever needed) still restricts.
    if (!expectedUnderlyings) {
        return value;
    }

    return expectedUnderlyings.includes(value) ? value : null;
}

// Parsed from SYMBOL_DETAILS text (e.g. "25 Aug 26"), not the
// epoch column — avoids IST/UTC boundary day-shift risk.
function parseExpiryFromSymbolDetails(symbolDetails) {

    const match = SYMBOL_DETAILS_DATE_RE.exec(String(symbolDetails ?? "").trim());

    if (!match) {
        return null;
    }

    const [, dayRaw, monRaw, yyRaw] = match;

    const month = MONTH_MAP[monRaw.toUpperCase()];

    if (!month) {
        return null;
    }

    const day = dayRaw.padStart(2, "0");
    const year = `20${yyRaw}`;

    return `${year}-${month}-${day}`; // YYYY-MM-DD
}

function normalizeOptionType(value) {

    const v = String(value ?? "").trim().toUpperCase();

    return (v === "CE" || v === "PE") ? v : null;
}

function exchangeFromTicker(symbolTicker) {

    return String(symbolTicker ?? "").split(":")[0]?.trim().toUpperCase() ?? "";
}

//======================================================
// PARSE ONE SEGMENT FILE
//======================================================

function parseSegmentText(segmentKey, text) {

    const segment = SEGMENTS[segmentKey];
    const lines = text.split("\n").filter(Boolean);
    const parsed = [];

    for (const line of lines) {

        const fields = splitCsvLine(line);

        if (fields.length < 18) {
            continue;
        }

        const optionType =
            normalizeOptionType(
                fields[COLUMN.OPTION_TYPE]
            );

        if (!optionType) {
            continue;
        }

        const underlying =
            normalizeUnderlying(
                fields[COLUMN.UNDERLYING_SYMBOL],
                segment.underlyings
            );

        if (!underlying) {
            continue;
        }

        const symbolTicker =
            String(fields[COLUMN.SYMBOL_TICKER] ?? "").trim();

        const expiry =
            parseExpiryFromSymbolDetails(
                fields[COLUMN.SYMBOL_DETAILS]
            );

        const strike =
            Number(fields[COLUMN.STRIKE_PRICE]);

        if (!expiry || !Number.isFinite(strike)) {
            continue;
        }

        parsed.push({
            symbolTicker,
            underlying,
            exchange:
                exchangeFromTicker(symbolTicker),
            segment: segmentKey,
            expiry,
            strike,
            optionType,
            lotSize:
                Number(fields[COLUMN.MIN_LOT_SIZE]) || null,
            tickSize:
                Number(fields[COLUMN.TICK_SIZE]) || null,
            fyToken:
                String(fields[COLUMN.FYTOKEN] ?? "").trim(),
            scripCode:
                String(fields[COLUMN.SCRIP_CODE] ?? "").trim()
        });
    }

    return parsed;
}

//======================================================
// BUILD INDEXES
//======================================================

function buildIndexes() {

    optionIndex.clear();
    tickerIndex.clear();
    expiryIndex.clear();

    for (const contract of contracts) {

        const key = [
            contract.underlying,
            contract.expiry,
            contract.strike,
            contract.optionType
        ].join("|");

        optionIndex.set(key, contract);
        tickerIndex.set(contract.symbolTicker.toUpperCase(), contract);

        if (!expiryIndex.has(contract.underlying)) {
            expiryIndex.set(contract.underlying, new Set());
        }
        expiryIndex.get(contract.underlying).add(contract.expiry);
    }
}

//======================================================
// DOWNLOAD
//======================================================

export async function downloadFyersSymbolMaster() {

    console.log(
        "[FYERS MASTER] Downloading symbol master (NSE_FO, BSE_FO)..."
    );

    const allParsed = [];

    for (const [segmentKey, segment] of Object.entries(SEGMENTS)) {

        console.log(
            `[FYERS MASTER] Downloading ${segmentKey}...`
        );

        const response =
            await axios.get(
                segment.url,
                {
                    timeout: 30000,
                    responseType: "text"
                }
            );

        const body =
            typeof response.data === "string"
                ? response.data
                : String(response.data);

        rawSamples.set(
            segmentKey,
            body
        );

        const parsed =
            parseSegmentText(
                segmentKey,
                body
            );

        console.log(
            `[FYERS MASTER] ${segmentKey}: ${parsed.length} option contracts parsed`
        );

        allParsed.push(...parsed);
    }

    if (allParsed.length === 0) {
        throw new Error(
            "[FYERS MASTER] Zero option contracts parsed. Column mapping may have changed — " +
            "run inspectRawSample() immediately after download."
        );
    }

    const downloadedAt =
        new Date().toISOString();

    contractDb.replaceOptions(
        allParsed,
        downloadedAt
    );

    contracts =
        contractDb.getOptions();

    buildIndexes();
    loaded = true;
    lastRefresh = Date.parse(downloadedAt);

    console.log("[FYERS MASTER] Ready:", {
        count: contracts.length,
        niftyExpiries:
            [...(expiryIndex.get("NIFTY") ?? [])].sort(),
        sensexExpiries:
            [...(expiryIndex.get("SENSEX") ?? [])].sort()
    });

    return {
        success: true,
        count: contracts.length,
        downloadedAt
    };
}

export function loadFyersSymbolMasterFromDisk() {

    try {

        const rows =
            contractDb.getOptions();

        if (!Array.isArray(rows) || rows.length === 0) {
            return false;
        }

        contracts = rows;
        buildIndexes();
        loaded = true;

        const status =
            contractDb.getFyersContractDatabaseStatus();

        lastRefresh =
            status?.options?.last_updated
                ? Date.parse(status.options.last_updated) || 0
                : 0;

        console.log(
            `[FYERS MASTER] Loaded ${contracts.length} contracts from SQLite.`
        );

        return true;

    }
    catch (error) {

        console.error(
            "[FYERS MASTER] SQLite load failed:",
            error?.message ?? error
        );

        return false;
    }
}

//======================================================
// INITIALIZE
//======================================================

export async function initializeFyersSymbolMaster(options = {}) {

    const { forceRefresh = false, downloadIfMissing = true } = options;

    const localLoaded = loadFyersSymbolMasterFromDisk();

    const stale = !lastRefresh || (Date.now() - lastRefresh) > REFRESH_INTERVAL_MS;

    if (forceRefresh || (!localLoaded && downloadIfMissing) || (localLoaded && stale)) {
        try {
            await downloadFyersSymbolMaster();
        } catch (error) {
            if (localLoaded) {
                console.warn("[FYERS MASTER] Refresh failed. Continuing with local cache.");
            } else {
                throw error;
            }
        }
    }

    return { loaded, count: contracts.length, lastRefresh };
}

//======================================================
// AUTO REFRESH
//======================================================

export function startFyersSymbolRefresh() {

    if (refreshTimer) return;

    refreshTimer = setInterval(async () => {
        try {
            await downloadFyersSymbolMaster();
        } catch (error) {
            console.error("[FYERS MASTER] Scheduled refresh failed:", error?.message ?? error);
        }
    }, REFRESH_INTERVAL_MS);

    if (refreshTimer.unref) refreshTimer.unref();

    console.log(`[FYERS MASTER] Auto refresh enabled every ${Math.round(REFRESH_INTERVAL_MS / 60000)} minutes.`);
}

export function stopFyersSymbolRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

//======================================================
// SEARCH — combined underlying / expiry / strike / type
//======================================================

export function searchFyersOptions(options = {}) {

    const {
        underlying = "",
        expiry = "",
        strike,
        optionType = "",
        limit = 100
    } = options;

    const wantedUnderlying = String(underlying).trim().toUpperCase();
    const wantedExpiry = String(expiry).trim();
    const wantedOptionType = normalizeOptionType(optionType);
    const wantedStrike =
        strike !== undefined && strike !== null && strike !== ""
            ? Number(strike)
            : undefined;

    const max = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const results = contracts.filter(contract => {

        if (wantedUnderlying && contract.underlying !== wantedUnderlying) return false;
        if (wantedExpiry && contract.expiry !== wantedExpiry) return false;
        if (wantedOptionType && contract.optionType !== wantedOptionType) return false;
        if (wantedStrike !== undefined && contract.strike !== wantedStrike) return false;

        return true;
    });

    return results
        .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.strike - b.strike)
        .slice(0, max);
}

//======================================================
// EXACT LOOKUP — underlying + expiry + strike + type
// Returns the authoritative FYERS trading symbol, never
// constructed manually.
//======================================================

export function getFyersOptionContract({ underlying, expiry, strike, optionType }) {

    const key = [
        String(underlying).trim().toUpperCase(),
        String(expiry).trim(),
        Number(strike),
        normalizeOptionType(optionType)
    ].join("|");

    return optionIndex.get(key) ?? null;
}

export function getFyersContractByTicker(symbolTicker) {
    return tickerIndex.get(String(symbolTicker).trim().toUpperCase()) ?? null;
}

//======================================================
// AVAILABLE EXPIRIES FOR AN UNDERLYING
//======================================================

export function listFyersExpiries(underlying) {

    const key = String(underlying).trim().toUpperCase();
    const set = expiryIndex.get(key);

    return set ? [...set].sort() : [];
}

//======================================================
// STATUS
//======================================================

export function getFyersSymbolMasterStatus() {

    const availableUnderlyings =
        [...expiryIndex.keys()].sort();

    const expiriesByUnderlying = {};

    for (const underlying of availableUnderlyings) {
        expiriesByUnderlying[underlying] = listFyersExpiries(underlying);
    }

    return {
        loaded,
        count: contracts.length,
        lastRefresh: lastRefresh ? new Date(lastRefresh).toISOString() : null,
        cacheFile:
            contractDb.fyersContractDatabasePath(),
        databaseFile:
            contractDb.fyersContractDatabasePath(),
        refreshIntervalMs:
            REFRESH_INTERVAL_MS,
        availableUnderlyings,
        expiriesByUnderlying,
        // Kept for backward compatibility with existing checks.
        niftyExpiries: listFyersExpiries("NIFTY"),
        sensexExpiries: listFyersExpiries("SENSEX")
    };
}

//======================================================
// SHUTDOWN
//======================================================

export function shutdownFyersSymbolMaster() {
    stopFyersSymbolRefresh();
    contracts = [];
    optionIndex.clear();
    tickerIndex.clear();
    expiryIndex.clear();
    loaded = false;
}

//======================================================
//
// FYERS symbol normalization.
//
// FYERS equity:
//
//   NSE:RELIANCE-EQ
//
// FYERS indices:
//
//   NSE:NIFTY50-INDEX
//   NSE:NIFTYBANK-INDEX
//
// BSE:
//
//   BSE:SENSEX-INDEX
//======================================================

export const INDEX_MAP = {
    NIFTY:
        "NSE:NIFTY50-INDEX",

    NIFTY50:
        "NSE:NIFTY50-INDEX",

    BANKNIFTY:
        "NSE:NIFTYBANK-INDEX",

    NIFTYBANK:
        "NSE:NIFTYBANK-INDEX",

    FINNIFTY:
        "NSE:FINNIFTY-INDEX",

    MIDCPNIFTY:
        "NSE:MIDCPNIFTY-INDEX",

    SENSEX:
        "BSE:SENSEX-INDEX",

    BANKEX:
        "BSE:BANKEX-INDEX",

    INDIA_VIX:
        "NSE:INDIAVIX-INDEX",

    INDVIX:
        "NSE:INDIAVIX-INDEX"
};

//======================================================
// RESOLVE FYERS SYMBOL
//======================================================
//
// Supports:
//
// EQUITY
//   RELIANCE
//   RELIANCE-EQ
//   NSE:RELIANCE-EQ
//
// INDEX
//   NIFTY
//   NIFTY50
//   NSE:NIFTY
//   SENSEX
//
// OPTION
//   NSE:NIFTY25SEP26000CE
//   NSE:NIFTY25SEP26000PE
//
// IMPORTANT:
//
// FYERS option symbols are already native FYERS symbols.
// They MUST NOT be converted to -EQ.
//
// The option symbol should normally come from the FYERS
// option symbol master and must be passed through unchanged.
//======================================================

export function resolveFyersSymbol(
    symbol
) {

    let value =
        String(
            symbol ?? ""
        )
        .trim()
        .toUpperCase();

    if (!value) {

        throw new Error(
            "[FYERS SYMBOL] Symbol is required."
        );

    }

    value =
        value.replace(
            /\s+/g,
            ""
        );

    //--------------------------------------------------
    // ALREADY-NATIVE FYERS OPTION
    //
    // Example:
    //
    // NSE:NIFTY25SEP26000CE
    // NSE:NIFTY25SEP26000PE
    //
    // DO NOT APPEND -EQ.
    //--------------------------------------------------

    if (
        /^(NSE|BSE):.*(CE|PE)$/.test(
            value
        )
    ) {

        return value;

    }

    //--------------------------------------------------
    // NIFTY INDEX
    //--------------------------------------------------

    if (
        value === "NIFTY" ||
        value === "NIFTY50" ||
        value === "NIFTY50-INDEX" ||
        value === "NSE:NIFTY"
    ) {

        return "NSE:NIFTY50-INDEX";

    }

    //--------------------------------------------------
    // SENSEX INDEX
    //--------------------------------------------------

    if (
        value === "SENSEX" ||
        value === "BSE:SENSEX" ||
        value === "BSE:SENSEX-INDEX"
    ) {

        return "BSE:SENSEX-INDEX";

    }

    //--------------------------------------------------
    // ALL OTHER INDICES — driven by INDEX_MAP so
    // BANKNIFTY, FINNIFTY, MIDCPNIFTY, BANKEX, INDIA_VIX
    // resolve the same way NIFTY/SENSEX do above, instead
    // of silently falling through to the equity path.
    //--------------------------------------------------

    const bareValue =
        value.replace(/^(NSE:|BSE:)/, "");

    if (INDEX_MAP[bareValue]) {

        return INDEX_MAP[bareValue];

    }

    if (value.endsWith("-INDEX")) {

        return value.includes(":")
            ? value
            : `NSE:${value}`;

    }

    //--------------------------------------------------
    // REMOVE EXCHANGE PREFIX
    //
    // We remember the exchange so BSE equities are not
    // accidentally returned as NSE.
    //--------------------------------------------------

    let exchange =
        "NSE";

    if (
        value.startsWith("NSE:")
    ) {

        exchange =
            "NSE";

        value =
            value.substring(4);

    }
    else if (
        value.startsWith("BSE:")
    ) {

        exchange =
            "BSE";

        value =
            value.substring(4);

    }

    //--------------------------------------------------
    // EQUITY
    //--------------------------------------------------

    if (
        !value.endsWith("-EQ") &&
        !value.endsWith("-INDEX")
    ) {

        value =
            `${value}-EQ`;

    }

    //--------------------------------------------------
    // RETURN NATIVE FYERS FORMAT
    //--------------------------------------------------

    return (
        `${exchange}:${value}`
    );

}

//======================================================
// MANY
//======================================================

export function resolveFyersSymbols(
    symbols,
    exchange = "NSE"
) {

    const list =
        Array.isArray(symbols)
            ? symbols
            : [symbols];

    return list
        .filter(
            symbol =>
                symbol !== undefined &&
                symbol !== null &&
                String(symbol).trim() !== ""
        )
        .map(
            symbol =>
                resolveFyersSymbol(
                    symbol,
                    exchange
                )
        );
}

//======================================================
// CHECK
//======================================================

export function isFyersSymbol(symbol) {

    if (!symbol) {
        return false;
    }

    return /^[A-Z]+:/.test(
        String(symbol)
            .trim()
            .toUpperCase()
    );
}

//======================================================
// EXCHANGE
//======================================================

export function getFyersExchange(symbol) {

    if (!symbol) {
        return "";
    }

    return String(symbol)
        .split(":")[0]
        .toUpperCase();
}

//======================================================
// NAME
//======================================================

export function getFyersSymbolName(symbol) {

    if (!symbol) {
        return "";
    }

    return String(symbol)
        .split(":")
        .pop()
        .replace(/-EQ$/, "")
        .replace(/-INDEX$/, "");
}

//======================================================
export default {
    inspectRawSample,
    downloadFyersSymbolMaster,
    loadFyersSymbolMasterFromDisk,
    initializeFyersSymbolMaster,
    startFyersSymbolRefresh,
    stopFyersSymbolRefresh,
    searchFyersOptions,
    getFyersOptionContract,
    getFyersContractByTicker,
    listFyersExpiries,
    getFyersSymbolMasterStatus,
    shutdownFyersSymbolMaster,
	resolveFyersSymbol,
    resolveFyersSymbols,
    isFyersSymbol,
    getFyersExchange,
    getFyersSymbolName
};