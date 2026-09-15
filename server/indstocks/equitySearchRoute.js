//======================================================
// server/indstocks/equitySearchRoute.js
//
// GET /api/indstocks/symbols/search?q=RELIANCE
//======================================================

import express from "express";
import {
    searchIndstocksSymbolsForUI,
    getAllIndstocksSymbols,
    indstocksSymbolCount,
    getIndstocksSymbolStatus
} from "./symbols.js";

const router = express.Router();

router.get("/debug", (req, res) => {

    const all = getAllIndstocksSymbols();

    const indexRows = all.filter(c => c.instrumentType === "INDEX");

    res.json({
        status: getIndstocksSymbolStatus(),
        totalContractsInMemory: indstocksSymbolCount(),
        totalIndexRowsInMemory: indexRows.length,
        indexRowsSample: indexRows.slice(0, 15).map(c => c.symbolName || c.tradingSymbol)
    });

});

router.get("/search", (req, res) => {

    try {

        const query = String(req.query.q ?? req.query.query ?? "").trim();
        const limit = req.query.limit;

        if (!query) {
            return res.json({ success: true, query, count: 0, results: [] });
        }

        const results = searchIndstocksSymbolsForUI(query, limit);

        res.json({ success: true, query, count: results.length, results });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "IndStocks symbol search failed.",
            results: []
        });

    }

});

export default router;