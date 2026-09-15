//======================================================
// server/fyers/equityMaster.js
//
// FYERS NSE Cash-Market Symbol Master — equities + a
// small static index list, for company-name search
// (e.g. "ADANI" -> ADANIPORTS, ADANIENT, ADANIGREEN...).
//
// Same CSV column layout as NSE_FO.csv (confirmed against
// a live NSE_CM.csv sample on 2026-08-21), except equity
// rows have strike=-1.0 and optionType=XX instead of a
// real CE/PE contract:
//
// 101000000025,ADANI ENTERPRISES LIMITED,0,1,0.1,
// INE423A01024,0915-1530|1815-1915:,2026-08-20,,
// NSE:ADANIENT-EQ,10,10,25,ADANIENT,25,-1.0,XX,
// 101000000025,None,1,3.0
//
// AJ Institutional Terminal
//======================================================

import fs from "fs";
import path from "path";
import axios from "axios";

import { INDEX_MAP } from "./symbols.js";

//======================================================
// CONFIGURATION
//======================================================

const DATA_DIR =
    path.resolve(process.cwd(), "server", "fyers", "data");

const NSE_CM_URL =
    "https://public.fyers.in/sym_details/NSE_CM.csv";

const RAW_FILE =
    path.join(DATA_DIR, "NSE_CM.csv");

const CACHE_FILE =
    path.join(DATA_DIR, "fyers-equity-master.json");

const REFRESH_INTERVAL_MS =
    Number(process.env.FYERS_EQUITY_REFRESH_MS ?? 60 * 60 * 1000);

//======================================================
// COLUMN LAYOUT — same as symbolMaster.js, confirmed
//======================================================

const COLUMN = {
    FYTOKEN: 0,
    SYMBOL_DETAILS: 1,      // full company name, e.g. "ADANI ENTERPRISES LIMITED"
    ISIN: 5,
    SYMBOL_TICKER: 9,       // e.g. NSE:ADANIENT-EQ
    UNDERLYING_SYMBOL: 13,  // short symbol, e.g. "ADANIENT"
    STRIKE_PRICE: 15,       // -1.0 for equities
    OPTION_TYPE: 16         // "XX" for equities
};

//======================================================
// STATIC INDICES — merged into every search
//
// Ticker resolution now comes from INDEX_MAP in
// symbols.js (the same map resolveFyersSymbol() uses),
// so this file can no longer drift out of sync with the
// actual resolver — only display names live here.
//======================================================

const INDEX_DISPLAY_NAMES = {
    NIFTY: "NIFTY 50",
    BANKNIFTY: "NIFTY BANK",
    FINNIFTY: "NIFTY FINANCIAL SERVICES",
    MIDCPNIFTY: "NIFTY MIDCAP SELECT",
    SENSEX: "SENSEX",
    BANKEX: "BSE BANKEX"
};

const INDICES =
    Object.entries(INDEX_DISPLAY_NAMES).map(([symbol, companyName]) => ({
        symbol,
        companyName,
        symbolTicker: INDEX_MAP[symbol]
    }));

//======================================================
// STATE
//======================================================

let equities = [];
let loaded = false;
let lastRefresh = 0;
let refreshTimer = null;

//======================================================
// DIRECTORY
//======================================================

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function splitCsvLine(line) {
    return line.replace(/\r$/, "").split(",");
}

//======================================================
// PARSE
//======================================================

function parseEquityFile() {

    const text = fs.readFileSync(RAW_FILE, "utf8");
    const lines = text.split("\n").filter(Boolean);

    const parsed = [];

    for (const line of lines) {

        const fields = splitCsvLine(line);

        if (fields.length < 17) {
            continue;
        }

        const strike = Number(fields[COLUMN.STRIKE_PRICE]);
        const optionType = String(fields[COLUMN.OPTION_TYPE] ?? "").trim().toUpperCase();

        // Equities only — skip anything that is actually a
        // derivative contract (shouldn't appear in NSE_CM, but
        // defensive in case FYERS ever mixes segments).
        if (optionType === "CE" || optionType === "PE") {
            continue;
        }

        const symbolTicker = String(fields[COLUMN.SYMBOL_TICKER] ?? "").trim();
        const symbol = String(fields[COLUMN.UNDERLYING_SYMBOL] ?? "").trim().toUpperCase();
        const companyName = String(fields[COLUMN.SYMBOL_DETAILS] ?? "").trim();

        if (!symbolTicker || !symbol) {
            continue;
        }

        parsed.push({
            symbol,
            companyName,
            symbolTicker,
            isin: String(fields[COLUMN.ISIN] ?? "").trim()
        });
    }

    return parsed;
}

//======================================================
// DOWNLOAD
//======================================================

export async function downloadFyersEquityMaster() {

    ensureDataDirectory();

    console.log("[FYERS EQUITY MASTER] Downloading NSE_CM...");

    const response = await axios.get(NSE_CM_URL, {
        timeout: 30000,
        responseType: "text"
    });

    const body = typeof response.data === "string" ? response.data : String(response.data);

    fs.writeFileSync(RAW_FILE, body, "utf8");

    console.log(`[FYERS EQUITY MASTER] Saved ${body.length} bytes`);

    const parsed = parseEquityFile();

    if (parsed.length === 0) {
        throw new Error(
            "[FYERS EQUITY MASTER] Zero equities parsed. NSE_CM.csv format may have changed."
        );
    }

    equities = parsed;
    loaded = true;
    lastRefresh = Date.now();

    fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify(
            {
                provider: "FYERS",
                downloadedAt: new Date(lastRefresh).toISOString(),
                count: equities.length,
                equities
            },
            null,
            2
        ),
        "utf8"
    );

    console.log(`[FYERS EQUITY MASTER] Ready: ${equities.length} equities`);

    return { success: true, count: equities.length };
}

//======================================================
// LOAD LOCAL CACHE
//======================================================

export function loadFyersEquityMasterFromDisk() {

    ensureDataDirectory();

    if (!fs.existsSync(CACHE_FILE)) {
        return false;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

        if (!Array.isArray(parsed?.equities) || parsed.equities.length === 0) {
            return false;
        }

        equities = parsed.equities;
        loaded = true;
        lastRefresh = parsed.downloadedAt ? Date.parse(parsed.downloadedAt) || 0 : 0;

        console.log(`[FYERS EQUITY MASTER] Loaded ${equities.length} equities from local cache.`);
        return true;

    } catch (error) {
        console.error("[FYERS EQUITY MASTER] Local cache load failed:", error?.message ?? error);
        return false;
    }
}

//======================================================
// INITIALIZE
//======================================================

export async function initializeFyersEquityMaster(options = {}) {

    const { forceRefresh = false, downloadIfMissing = true } = options;

    const localLoaded = loadFyersEquityMasterFromDisk();

    const stale = !lastRefresh || (Date.now() - lastRefresh) > REFRESH_INTERVAL_MS;

    if (forceRefresh || (!localLoaded && downloadIfMissing) || (localLoaded && stale)) {
        try {
            await downloadFyersEquityMaster();
        } catch (error) {
            if (localLoaded) {
                console.warn("[FYERS EQUITY MASTER] Refresh failed. Continuing with local cache.");
            } else {
                throw error;
            }
        }
    }

    return { loaded, count: equities.length, lastRefresh };
}

//======================================================
// AUTO REFRESH
//======================================================

export function startFyersEquityRefresh() {

    if (refreshTimer) return;

    refreshTimer = setInterval(async () => {
        try {
            await downloadFyersEquityMaster();
        } catch (error) {
            console.error("[FYERS EQUITY MASTER] Scheduled refresh failed:", error?.message ?? error);
        }
    }, REFRESH_INTERVAL_MS);

    if (refreshTimer.unref) refreshTimer.unref();

    console.log(`[FYERS EQUITY MASTER] Auto refresh enabled every ${Math.round(REFRESH_INTERVAL_MS / 60000)} minutes.`);
}

export function stopFyersEquityRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

//======================================================
// SEARCH — substring match on symbol + company name,
// merged with the static index list, ranked so exact/
// prefix symbol matches come first.
//======================================================

export function searchFyersEquities(query, limit = 20) {

    const text = String(query ?? "").trim().toUpperCase();

    if (!text) {
        return [];
    }

    const max = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const indexMatches =
        INDICES
            .filter(item =>
                item.symbol.includes(text) ||
                item.companyName.toUpperCase().includes(text)
            )
            .map(item => ({
                symbol: item.symbol,
                companyName: item.companyName,
                symbolTicker: item.symbolTicker,
                kind: "INDEX"
            }));

    const equityMatches =
        equities
            .filter(item =>
                item.symbol.includes(text) ||
                item.companyName.toUpperCase().includes(text)
            )
            .map(item => ({ ...item, kind: "EQUITY" }));

    const combined = [...indexMatches, ...equityMatches];

    return combined
        .sort((a, b) => {

            const aExact = a.symbol === text ? 0 : a.symbol.startsWith(text) ? 1 : 2;
            const bExact = b.symbol === text ? 0 : b.symbol.startsWith(text) ? 1 : 2;

            if (aExact !== bExact) return aExact - bExact;

            return a.symbol.localeCompare(b.symbol);
        })
        .slice(0, max);
}

//======================================================
// STATUS
//======================================================

export function getFyersEquityMasterStatus() {
    return {
        loaded,
        count: equities.length,
        lastRefresh: lastRefresh ? new Date(lastRefresh).toISOString() : null,
        cacheFile: CACHE_FILE,
        refreshIntervalMs: REFRESH_INTERVAL_MS
    };
}

export default {
    downloadFyersEquityMaster,
    loadFyersEquityMasterFromDisk,
    initializeFyersEquityMaster,
    startFyersEquityRefresh,
    stopFyersEquityRefresh,
    searchFyersEquities,
    getFyersEquityMasterStatus
};