//======================================================
// server/aliceblue/optionsRoute.js
//
// GET /api/aliceblue/options/search
//   ?underlying=NIFTY&expiry=2026-09-08&strike=26000&type=CE
//
// GET /api/aliceblue/options/resolve
//   ?underlying=NIFTY&expiry=2026-09-08&strike=26000&type=CE
//
// GET /api/aliceblue/options/status
//
// Mount in server/index.js with:
//   import aliceBlueOptionsRouter from "./aliceblue/optionsRoute.js";
//   app.use("/api/aliceblue/options", aliceBlueOptionsRouter);
//
// Built on the EXISTING searchAliceBlueOptions() in
// symbols.js — no new resolver logic, just an HTTP surface
// for what was already there.
//======================================================

import express from "express";

import {
    searchAliceBlueOptions,
    getAliceBlueSymbolStatus
} from "./symbols.js";

const router = express.Router();

//======================================================
// UNDERLYING -> DERIVATIVE EXCHANGE
//======================================================

function resolveExchangeForUnderlying(underlying) {

    const value =
        String(underlying ?? "").trim().toUpperCase();

    if (value === "SENSEX" || value === "BANKEX") {
        return "BFO";
    }

    if (
        value === "NIFTY" ||
        value === "BANKNIFTY" ||
        value === "FINNIFTY" ||
        value === "MIDCPNIFTY"
    ) {
        return "NFO";
    }

    return null;
}

//======================================================
// NORMALIZE UNDERLYING - strip a chart equity "-EQ" suffix
// (e.g. "ADANIENT-EQ") down to the canonical option
// underlying ("ADANIENT"), same normalization the inline
// history.js option parser already applies.
//======================================================

function normalizeUnderlying(value) {
    return String(value ?? "").trim().toUpperCase().replace(/-EQ$/i, "");
}

const OPTION_MONTHS = { JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12" };

function normalizeExpiryInput(value) {
    const raw = String(value ?? "").trim().toUpperCase();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) { return raw; }
    const m = raw.match(/^(\d{1,2})[\s-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/);
    if (!m) { return raw; }
    const day = m[1].padStart(2, "0");
    const month = OPTION_MONTHS[m[2]];
    const currentYear = new Date().getFullYear();
    let expiry = `${currentYear}-${month}-${day}`;
    const expiryDate = new Date(`${expiry}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) { expiry = `${currentYear + 1}-${month}-${day}`; }
    return expiry;
}

//======================================================
// DERIVE UNDERLYING FROM TRADING SYMBOL
//
// searchAliceBlueOptions() results don't carry a stored
// "underlying" field — it's inferred from the symbol
// prefix here, same heuristic symbols.js uses internally.
//======================================================

function deriveUnderlying(contract) {

    const symbol =
        String(contract?.symbol ?? contract?.tradingSymbol ?? "").toUpperCase();

    if (symbol.startsWith("BANKNIFTY")) return "BANKNIFTY";
    if (symbol.startsWith("FINNIFTY")) return "FINNIFTY";
    if (symbol.startsWith("MIDCPNIFTY")) return "MIDCPNIFTY";
    if (symbol.startsWith("NIFTY")) return "NIFTY";
    if (symbol.startsWith("BANKEX")) return "BANKEX";
    if (symbol.startsWith("SENSEX")) return "SENSEX";

    return symbol
        .replace(/-EQ$/, "")
        .replace(/-BE$/, "")
        .replace(/-SM$/, "");
}

//======================================================
// MAP CONTRACT -> API SHAPE
//
// "symbol" here is EXCHANGE|TOKEN (e.g. "NFO|58067") —
// the authoritative identifier /api/aliceblue/history
// already accepts directly (Case 1: already-resolved
// instrument), with zero further name-matching needed.
//======================================================

function toApiShape(contract) {

    return {
        symbol: `${contract.exchange}|${contract.token}`,
        token: contract.token,
        broker: "ALICEBLUE",
        exchange: contract.exchange,
        tradingSymbol: contract.tradingSymbol,
        underlying: deriveUnderlying(contract),
        expiry: contract.expiry,
        strike: contract.strike,
        optionType: contract.optionType,
        lotSize: contract.lotSize,
        tickSize: contract.tickSize
    };
}

//======================================================
// SEARCH
//======================================================

router.get("/search", (req, res) => {

    try {

        const { underlying, expiry, strike, type, limit } = req.query;

        const exchange =
            resolveExchangeForUnderlying(normalizeUnderlying(underlying));

        let contracts;

        if (exchange) {

            contracts =
                searchAliceBlueOptions({
                    underlying: normalizeUnderlying(underlying),
                    expiry: normalizeExpiryInput(expiry),
                    strike,
                    optionType: type,
                    exchange,
                    limit: limit ?? 100
                });

        } else {

            // No underlying given (or unrecognized) — search
            // both derivative exchanges and merge, same
            // underlying-optional behavior as the FYERS route.
            const nfo =
                searchAliceBlueOptions({
                    expiry: normalizeExpiryInput(expiry), strike, optionType: type,
                    exchange: "NFO", limit: limit ?? 100
                });

            const bfo =
                searchAliceBlueOptions({
                    expiry: normalizeExpiryInput(expiry), strike, optionType: type,
                    exchange: "BFO", limit: limit ?? 100
                });

            contracts = [...nfo, ...bfo];
        }

        const max =
            Math.min(Math.max(Number(limit) || 100, 1), 500);

        const results =
            contracts
                .sort((a, b) =>
                    String(a.expiry).localeCompare(String(b.expiry)) ||
                    Number(a.strike) - Number(b.strike)
                )
                .slice(0, max)
                .map(toApiShape);

        res.json({
            success: true,
            count: results.length,
            results
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "Alice Blue option search failed."
        });
    }
});

//======================================================
// EXACT RESOLVE
//======================================================

router.get("/resolve", (req, res) => {

    try {

        const { underlying, expiry, strike, type } = req.query;

        if (!underlying || !expiry || strike === undefined || !type) {

            return res.status(400).json({
                success: false,
                error: "underlying, expiry, strike and type are all required."
            });
        }

        const exchange =
            resolveExchangeForUnderlying(normalizeUnderlying(underlying)) ?? "NFO";

        const matches =
            searchAliceBlueOptions({
                underlying: normalizeUnderlying(underlying),
                expiry: normalizeExpiryInput(expiry),
                strike,
                optionType: type,
                exchange,
                limit: 5
            });

        if (matches.length === 0) {

            return res.status(404).json({
                success: false,
                error: "No matching Alice Blue option contract found."
            });
        }

        res.json({
            success: true,
            result: toApiShape(matches[0])
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "Alice Blue option resolve failed."
        });
    }
});

//======================================================
// STATUS
//======================================================

router.get("/status", (req, res) => {
    res.json({ success: true, status: getAliceBlueSymbolStatus() });
});

export default router;
