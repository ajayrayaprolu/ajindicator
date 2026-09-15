//======================================================
// server/fyers/optionsRoute.js
//
// GET /api/fyers/options/search
//   ?underlying=NIFTY&expiry=2026-09-08&strike=26000&type=CE
//
// GET /api/fyers/options/expiries?underlying=NIFTY
//
// GET /api/fyers/options/status
//
// Mount in server/index.js with:
//   import fyersOptionsRouter from "./fyers/optionsRoute.js";
//   app.use("/api/fyers/options", fyersOptionsRouter);
//======================================================

import express from "express";

import {
    searchFyersOptions,
    getFyersOptionContract,
    listFyersExpiries,
    getFyersSymbolMasterStatus
} from "./symbolMaster.js";

const router = express.Router();

//======================================================
// SEARCH
//======================================================

router.get("/search", (req, res) => {

    try {

        const { underlying, expiry, strike, type, limit } = req.query;

        const results = searchFyersOptions({
            underlying,
            expiry,
            strike,
            optionType: type,
            limit
        });

        res.json({
            success: true,
            count: results.length,
            results: results.map(contract => ({
                symbol: contract.symbolTicker,
                broker: "FYERS",
                exchange: contract.exchange,
                segment: contract.segment,
                underlying: contract.underlying,
                expiry: contract.expiry,
                strike: contract.strike,
                optionType: contract.optionType,
                lotSize: contract.lotSize,
                tickSize: contract.tickSize
            }))
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "FYERS option search failed."
        });
    }
});

//======================================================
// EXACT RESOLVE — one contract, guaranteed
//======================================================

router.get("/resolve", (req, res) => {

    try {

        const { underlying, expiry, strike, type } = req.query;

        const contract = getFyersOptionContract({
            underlying,
            expiry,
            strike,
            optionType: type
        });

        if (!contract) {
            return res.status(404).json({
                success: false,
                error: "No matching FYERS option contract found."
            });
        }

        res.json({
            success: true,
            result: {
                symbol: contract.symbolTicker,
                broker: "FYERS",
                exchange: contract.exchange,
                segment: contract.segment,
                underlying: contract.underlying,
                expiry: contract.expiry,
                strike: contract.strike,
                optionType: contract.optionType,
                lotSize: contract.lotSize,
                tickSize: contract.tickSize
            }
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "FYERS option resolve failed."
        });
    }
});

//======================================================
// EXPIRIES
//======================================================

router.get("/expiries", (req, res) => {

    const { underlying } = req.query;

    if (!underlying) {
        return res.status(400).json({ success: false, error: "underlying is required." });
    }

    res.json({
        success: true,
        underlying: String(underlying).toUpperCase(),
        expiries: listFyersExpiries(underlying)
    });
});

//======================================================
// STATUS
//======================================================

router.get("/status", (req, res) => {
    res.json({ success: true, status: getFyersSymbolMasterStatus() });
});

export default router;
