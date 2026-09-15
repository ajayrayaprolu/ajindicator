//======================================================
// server/indstocks/symbols.js
//
// IndStocks Contract Master / Symbol Catalog
//======================================================

import fs from "fs";
import path from "path";
import axios from "axios";
import { getAccessToken } from "./token.js";

const DATA_DIR =
    path.resolve(process.cwd(), "server", "indstocks", "data");

const MASTER_FILE =
    path.join(DATA_DIR, "contract-master.json");

const INDSTOCKS_BASE =
    "https://api.indstocks.com";

const REFRESH_INTERVAL_MS =
    Number(process.env.INDSTOCKS_SYMBOL_REFRESH_MS ?? 30 * 60 * 1000);

//======================================================
// STATE
//======================================================

let contracts = [];
let loaded = false;
let lastRefresh = 0;
let refreshTimer = null;

const symbolIndex = new Map();
const securityIdIndex = new Map();
const optionIndex = new Map();

//======================================================
// HELPERS
//======================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function clean(value) {
    return String(value ?? "").trim().toUpperCase();
}

function num(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

//======================================================
// CSV PARSER (simple, no embedded-comma fields expected)
//======================================================

function parseCsv(text) {

    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length === 0) {
        return [];
    }

    const headers = lines[0].split(",").map(h => h.trim());

    const rows = [];

    for (let i = 1; i < lines.length; i++) {

        const cols = lines[i].split(",");

        const row = {};

        headers.forEach((h, idx) => {
            row[h] = cols[idx] !== undefined ? cols[idx].trim() : "";
        });

        rows.push(row);
    }

    return rows;
}

//======================================================
// UNDERLYING EXTRACTION
//
// TRADING_SYMBOL is cleanly delimited by "-":
//   MIDCPNIFTY-Sep2026-13275-PE  -> "MIDCPNIFTY"
//   BANDHANBNK-Oct2026-225-CE    -> "BANDHANBNK"
// No regex/digit-boundary guessing needed, unlike AliceBlue.
//======================================================

function extractUnderlying(contract) {

    const ts = clean(contract.tradingSymbol);

    if (ts.includes("-")) {
        return ts.split("-")[0];
    }

    const cs = clean(contract.customSymbol);

    if (cs.includes(" ")) {
        return cs.split(" ")[0];
    }

    return clean(contract.symbolName) || ts || cs;
}

//======================================================
// NORMALIZATION - FNO / EQUITY ROWS (full column set)
//======================================================

function normalizeFullRow(row, exchangeFallback) {

    const exchange =
        clean(row.EXCH) || exchangeFallback;

    const securityId =
        String(row.SECURITY_ID ?? "").trim();

    if (!exchange || !securityId) {
        return null;
    }

    return {

        exchange,
        securityId,

        segment: clean(row.SEGMENT),

        tradingSymbol: clean(row.TRADING_SYMBOL),
        customSymbol: row.CUSTOM_SYMBOL ?? "",
        symbolName: row.SYMBOL_NAME ?? "",
        instrumentName: clean(row.INSTRUMENT_NAME),

        expiryDate: row.EXPIRY_DATE || null,
        expiryCode: row.EXPIRY_CODE || null,

        strike: num(row.STRIKE_PRICE),
        optionType: clean(row.OPTION_TYPE),

        lotSize: num(row.LOT_UNITS),
        tickSize: num(row.TICK_SIZE),

        instrumentType: clean(row.SEM_EXCH_INSTRUMENT_TYPE),
        series: row.SERIES ?? "",

        raw: row

    };

}

//======================================================
// NORMALIZATION - INDEX ROWS (EXCH,SEGMENT,SECURITY_ID only,
// where SEGMENT is actually the index display name)
//======================================================

function normalizeIndexRow(row) {

    const exchange = clean(row.EXCH);
    const securityId = String(row.SECURITY_ID ?? "").trim();
    const name = clean(row.SEGMENT);

    if (!exchange || !securityId) {
        return null;
    }

    return {

        exchange,
        securityId,

        segment: "INDEX",

        tradingSymbol: name,
        customSymbol: name,
        symbolName: name,
        instrumentName: "INDEX",

        expiryDate: null,
        expiryCode: null,

        strike: undefined,
        optionType: "",

        lotSize: undefined,
        tickSize: undefined,

        instrumentType: "INDEX",
        series: "",

        raw: row

    };

}

//======================================================
// INDEX BUILD
//======================================================

function clearIndexes() {
    symbolIndex.clear();
    securityIdIndex.clear();
    optionIndex.clear();
}

function addToArrayMap(map, key, value) {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
}

function buildIndexes() {

    clearIndexes();

    for (const c of contracts) {

        securityIdIndex.set(`${c.exchange}_${c.securityId}`, c);

        const names = [
            clean(c.tradingSymbol),
            clean(c.customSymbol),
            clean(c.symbolName)
        ].filter(Boolean);

        for (const name of names) {
            addToArrayMap(symbolIndex, name, c);
        }

        if (c.optionType === "CE" || c.optionType === "PE") {

            const underlying = extractUnderlying(c);

            const key = [
                c.exchange,
                underlying,
                c.expiryDate ?? "",
                c.strike ?? "",
                c.optionType
            ].join("|");

            addToArrayMap(optionIndex, key, c);

        }

    }

}

//======================================================
// DOWNLOAD CONTRACT MASTER
//======================================================

export async function downloadContractMaster() {

    ensureDataDir();

    const token = await getAccessToken();

    console.log("[INDSTOCKS SYMBOLS] Downloading instrument masters...");

    const allContracts = [];

    //--------------------------------------------------
    // FNO
    //--------------------------------------------------

    try {

        const res = await axios.get(
            `${INDSTOCKS_BASE}/market/instruments?source=fno`,
            { headers: { Authorization: token }, responseType: "text", timeout: 60000 }
        );

        const rows = parseCsv(res.data);

        for (const row of rows) {
            const c = normalizeFullRow(row, "NSE");
            if (c) allContracts.push(c);
        }

        console.log(`[INDSTOCKS SYMBOLS] fno: ${rows.length} rows`);

    } catch (error) {

        console.warn("[INDSTOCKS SYMBOLS] fno download failed:", error?.message ?? error);

    }

    //--------------------------------------------------
    // EQUITY
    //--------------------------------------------------

    try {

        const res = await axios.get(
            `${INDSTOCKS_BASE}/market/instruments?source=equity`,
            { headers: { Authorization: token }, responseType: "text", timeout: 60000 }
        );

        const rows = parseCsv(res.data);

        for (const row of rows) {
            const c = normalizeFullRow(row, "NSE");
            if (c) allContracts.push(c);
        }

        console.log(`[INDSTOCKS SYMBOLS] equity: ${rows.length} rows`);

    } catch (error) {

        console.warn("[INDSTOCKS SYMBOLS] equity download failed:", error?.message ?? error);

    }

    //--------------------------------------------------
    // INDEX
    //--------------------------------------------------

    try {

        const res = await axios.get(
            `${INDSTOCKS_BASE}/market/instruments?source=index`,
            { headers: { Authorization: token }, responseType: "text", timeout: 60000 }
        );

        const rows = parseCsv(res.data);

        for (const row of rows) {
            const c = normalizeIndexRow(row);
            if (c) allContracts.push(c);
        }

        console.log(`[INDSTOCKS SYMBOLS] index: ${rows.length} rows`);

    } catch (error) {

        console.warn("[INDSTOCKS SYMBOLS] index download failed:", error?.message ?? error);

    }

    if (allContracts.length === 0) {
        throw new Error("[INDSTOCKS SYMBOLS] No contracts downloaded from any source.");
    }

    contracts = allContracts;

    buildIndexes();

    fs.writeFileSync(
        MASTER_FILE,
        JSON.stringify(
            { provider: "INDSTOCKS", downloadedAt: new Date().toISOString(), count: contracts.length, contracts },
            null,
            2
        ),
        "utf8"
    );

    loaded = true;
    lastRefresh = Date.now();

    console.log(`[INDSTOCKS SYMBOLS] Total contracts loaded: ${contracts.length}`);

    return { success: true, count: contracts.length };

}

//======================================================
// LOCAL CACHE
//======================================================

export function loadContractMaster() {

    ensureDataDir();

    if (!fs.existsSync(MASTER_FILE)) {
        return false;
    }

    try {

        const parsed = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));

        const cached = Array.isArray(parsed?.contracts) ? parsed.contracts : [];

        if (cached.length === 0) {
            return false;
        }

        contracts = cached;
        buildIndexes();
        loaded = true;
        lastRefresh = parsed?.downloadedAt ? Date.parse(parsed.downloadedAt) || 0 : 0;

        console.log(`[INDSTOCKS SYMBOLS] Loaded ${contracts.length} contracts from cache.`);

        return true;

    } catch (error) {

        console.error("[INDSTOCKS SYMBOLS] Cache load failed:", error?.message ?? error);
        return false;

    }

}

//======================================================
// INITIALIZE
//======================================================

export async function initializeIndstocksSymbols(options = {}) {

    const { forceRefresh = false, downloadIfMissing = true } = options;

    const localLoaded = loadContractMaster();

    const stale = !lastRefresh || (Date.now() - lastRefresh) > REFRESH_INTERVAL_MS;

    if (forceRefresh || (!localLoaded && downloadIfMissing) || (localLoaded && stale)) {

        try {
            await downloadContractMaster();
        } catch (error) {
            if (localLoaded) {
                console.warn("[INDSTOCKS SYMBOLS] Refresh failed, using cache.");
            } else {
                throw error;
            }
        }

    }

    return { loaded, count: contracts.length, lastRefresh };

}

export function startSymbolRefresh() {

    if (refreshTimer) return;

    refreshTimer = setInterval(async () => {
        try {
            await downloadContractMaster();
        } catch (error) {
            console.error("[INDSTOCKS SYMBOLS] Scheduled refresh failed:", error?.message ?? error);
        }
    }, REFRESH_INTERVAL_MS);

    if (refreshTimer.unref) refreshTimer.unref();

}

export function stopSymbolRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

//======================================================
// SEARCH
//======================================================

export function searchIndstocksSymbols(query = "", limit = 50) {

    const text = clean(query);
    const max = Math.min(Math.max(Number(limit) || 50, 1), 500);

    if (!text) {
        return contracts.slice(0, max);
    }

    function matchRank(c) {

        const ts = clean(c.tradingSymbol);
        const cs = clean(c.customSymbol);
        const sn = clean(c.symbolName);

        if (c.instrumentType === "INDEX") {

            // Full-name match ("SENSEX") or the query matches one
            // whole word of a multi-word name ("NIFTY" inside
            // "NIFTY 50", "BANK" or "NIFTY" inside "BANK NIFTY").
            // Anything less strict (mid-word substrings) still
            // falls through to the generic buckets below.
            const words = ts.split(/\s+/);

            if (ts === text || sn === text || words.includes(text)) {
                return -2;
            }

            if (words.some(w => w.startsWith(text))) {
                return -1;
            }

        }

        if (ts === text || cs === text || sn === text) return 0;
        if (ts.startsWith(text) || cs.startsWith(text) || sn.startsWith(text)) return 1;
        return 2;

    }

    const results = contracts.filter(c => {
        const ts = clean(c.tradingSymbol);
        const cs = clean(c.customSymbol);
        const sn = clean(c.symbolName);
        return ts.includes(text) || cs.includes(text) || sn.includes(text);
    });

    const sorted =
        results.sort((a, b) => {

            const rankDiff = matchRank(a) - matchRank(b);

            if (rankDiff !== 0) return rankDiff;

            const aLen = (a.tradingSymbol || a.customSymbol || "").length;
            const bLen = (b.tradingSymbol || b.customSymbol || "").length;

            return aLen - bLen;

        });

    // Indices are rare and always relevant when they match at all -
    // never let them get pushed out of the visible window by a
    // flood of unrelated option/equity matches for the same query.
    const indexMatches =
        sorted.filter(c => c.instrumentType === "INDEX");

    const nonIndexMatches =
        sorted.filter(c => c.instrumentType !== "INDEX");

    return [
        ...indexMatches,
        ...nonIndexMatches
    ].slice(0, max);

}

export function searchIndstocksOptions(options = {}) {

    const {
        underlying = "",
        expiry = "",
        strike,
        optionType = "",
        limit = 100
    } = options;

    const wantedUnderlying = clean(underlying);
    const wantedOptionType = clean(optionType);
    const wantedStrike = strike !== undefined && strike !== null && strike !== "" ? Number(strike) : undefined;
    const max = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const result = contracts.filter(c => {

        if (c.optionType !== "CE" && c.optionType !== "PE") return false;

        if (wantedUnderlying && extractUnderlying(c) !== wantedUnderlying) return false;

        if (expiry && c.expiryDate !== expiry) return false;

        if (wantedStrike !== undefined && Number(c.strike) !== wantedStrike) return false;

        if (wantedOptionType && c.optionType !== wantedOptionType) return false;

        return true;

    });

    return result.slice(0, max);

}

export function searchIndstocksStrike(strike, underlying = "", limit = 100) {

    const numericStrike = Number(strike);

    if (!Number.isFinite(numericStrike)) return [];

    const wantedUnderlying = clean(underlying);

    const result = contracts.filter(c => {

        if (c.optionType !== "CE" && c.optionType !== "PE") return false;
        if (Number(c.strike) !== numericStrike) return false;
        if (wantedUnderlying && extractUnderlying(c) !== wantedUnderlying) return false;

        return true;

    });

    return result.slice(0, Math.min(Number(limit) || 100, 500));

}

//======================================================
// RESOLVE
//======================================================

export function getIndstocksContractBySymbol(symbol, exchange = "") {

    if (!loaded) return null;

    let wanted = clean(symbol);
    const wantedExchange = clean(exchange);

    if (!wanted) return null;

    // Already-resolved "EXCH_SECURITYID" form
    const directMatch = wanted.match(/^([A-Z]+)_(\d+)$/);

    if (directMatch) {
        return securityIdIndex.get(`${directMatch[1]}_${directMatch[2]}`) ?? null;
    }

    const candidates = symbolIndex.get(wanted) ?? [];

    for (const c of candidates) {
        if (!wantedExchange || c.exchange === wantedExchange) {
            return c;
        }
    }

    return candidates[0] ?? null;

}

export function resolveIndstocksSecurityId(exchange, symbol) {
    const c = getIndstocksContractBySymbol(symbol, exchange);
    return c ? { exchange: c.exchange, securityId: c.securityId } : null;
}

//======================================================
// UI FORMAT
//======================================================

function toUISymbol(c) {

    const displayName =
        c.customSymbol || c.tradingSymbol || c.symbolName;

    return {

        symbol: `${c.exchange}_${c.securityId}`,
        tradingSymbol: c.tradingSymbol,
        displayName,

        exchange: c.exchange,
        exchangeSegment: c.segment,

        type:
            (c.optionType === "CE" || c.optionType === "PE")
                ? "OPTION"
                : c.instrumentType === "INDEX"
                    ? "INDEX"
                    : "EQUITY",

        feedSource: "INDSTOCKS",

        token: c.securityId,
        tokenIdentifier: c.securityId,
        instrumentId: c.securityId,

        expiry: c.expiryDate,
        strike: c.strike,
        optionType: c.optionType,
        underlying: extractUnderlying(c),

        lotSize: c.lotSize,
        tickSize: c.tickSize

    };

}

export function searchIndstocksSymbolsForUI(query = "", limit = 50) {

    const text = clean(query);

    const strikeMatch = text.match(/(\d+(?:\.\d+)?)/);
    const hasCE = /\bCE\b/.test(text);
    const hasPE = /\bPE\b/.test(text);

    const optionUnderlying =
        /\b(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\b/.exec(text)?.[1] ?? "";

    if (strikeMatch && (hasCE || hasPE || optionUnderlying)) {

        const strike = Number(strikeMatch[1]);

        let results = searchIndstocksStrike(strike, optionUnderlying, limit);

        if (hasCE) results = results.filter(c => c.optionType === "CE");
        if (hasPE) results = results.filter(c => c.optionType === "PE");

        return results.map(toUISymbol);

    }

    if (/^\d+(?:\.\d+)?$/.test(text)) {
        return searchIndstocksStrike(Number(text), "", limit).map(toUISymbol);
    }

    return searchIndstocksSymbols(text, limit).map(toUISymbol);

}

//======================================================
// STATUS
//======================================================

export function getIndstocksSymbolStatus() {

    return {
        loaded,
        count: contracts.length,
        lastRefresh: lastRefresh ? new Date(lastRefresh).toISOString() : null,
        cacheFile: MASTER_FILE,
        refreshIntervalMs: REFRESH_INTERVAL_MS
    };

}

export function getAllIndstocksSymbols() {
    return [...contracts];
}

export function indstocksSymbolCount() {
    return contracts.length;
}

export { extractUnderlying };

export default {
    initializeIndstocksSymbols,
    downloadContractMaster,
    loadContractMaster,
    startSymbolRefresh,
    stopSymbolRefresh,
    searchIndstocksSymbols,
    searchIndstocksSymbolsForUI,
    searchIndstocksOptions,
    searchIndstocksStrike,
    getIndstocksContractBySymbol,
    resolveIndstocksSecurityId,
    getAllIndstocksSymbols,
    indstocksSymbolCount,
    getIndstocksSymbolStatus
};