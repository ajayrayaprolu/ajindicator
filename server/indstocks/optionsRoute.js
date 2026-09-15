//======================================================
// server/indstocks/optionsRoute.js
//
// GET /api/indstocks/options/search?underlying=NIFTY&strike=24500&type=CE
//======================================================

import express from "express";
import { searchIndstocksOptions } from "./symbols.js";

const router = express.Router();

router.get("/search", (req, res) => {

    try {

        const underlying = String(req.query.underlying ?? "").trim();
        const strike = req.query.strike;
        const optionType = String(req.query.type ?? req.query.optionType ?? "").trim();
        const expiry = String(req.query.expiry ?? "").trim();
        const limit = req.query.limit;

        const contracts = searchIndstocksOptions({
            underlying,
            expiry,
            strike,
            optionType,
            limit
        });

        const results = contracts.map(c => ({
            symbol: `${c.exchange}_${c.securityId}`,
            exchange: c.exchange,
            underlying,
            strike: c.strike,
            optionType: c.optionType,
            expiry: c.expiryDate,
            tradingSymbol: c.tradingSymbol,
            displayName: c.customSymbol || c.tradingSymbol
        }));

        res.json({ success: true, count: results.length, results });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "IndStocks option search failed.",
            results: []
        });

    }

});

export default router;