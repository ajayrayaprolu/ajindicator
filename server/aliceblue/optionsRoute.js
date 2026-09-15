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

    return "";
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
            resolveExchangeForUnderlying(underlying);

        let contracts;

        if (exchange) {

            contracts =
                searchAliceBlueOptions({
                    underlying,
                    expiry,
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
                    expiry, strike, optionType: type,
                    exchange: "NFO", limit: limit ?? 100
                });

            const bfo =
                searchAliceBlueOptions({
                    expiry, strike, optionType: type,
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
            resolveExchangeForUnderlying(underlying) ?? "NFO";

        const matches =
            searchAliceBlueOptions({
                underlying,
                expiry,
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