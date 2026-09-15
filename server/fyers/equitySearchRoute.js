//======================================================
// server/fyers/equitySearchRoute.js
//
// GET /api/fyers/symbols/search?q=ADANI
//
// Mount in server/index.js with:
//   import fyersEquitySearchRouter from "./fyers/equitySearchRoute.js";
//   app.use("/api/fyers/symbols", fyersEquitySearchRouter);
//======================================================

import express from "express";

import { searchFyersEquities } from "./equityMaster.js";

const router = express.Router();

router.get("/search", (req, res) => {

    try {

        const query = String(req.query.q ?? req.query.query ?? "").trim();
        const limit = req.query.limit;

        if (!query) {
            return res.json({ success: true, query, count: 0, results: [] });
        }

        const matches = searchFyersEquities(query, limit);

        const results = matches.map(item => ({
            symbol: item.symbol,
            displayName: item.companyName,
            exchange: item.symbolTicker.split(":")[0] ?? "NSE",
            type: item.kind === "INDEX" ? "INDEX" : "EQUITY",
            feedSource: "FYERS"
        }));

        res.json({ success: true, query, count: results.length, results });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "FYERS equity search failed.",
            results: []
        });
    }
});

export default router;