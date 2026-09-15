//======================================================
// server/aliceblue/equitySearchRoute.js
//
// GET /api/aliceblue/symbols/search?q=RELIANCE
//
// Wraps the EXISTING searchAliceBlueSymbolsForUI() in
// symbols.js — fully generic, driven entirely by the
// downloaded contract master. No hardcoded symbol lists.
//
// Mount in server/index.js with:
//   import aliceBlueEquitySearchRouter from "./aliceblue/equitySearchRoute.js";
//   app.use("/api/aliceblue/symbols", aliceBlueEquitySearchRouter);
//======================================================

import express from "express";

import {
    searchAliceBlueSymbolsForUI,
    getAllAliceBlueSymbols,
    aliceBlueSymbolCount,
    getAliceBlueSymbolStatus,
    isIndexContract,
    extractUnderlying
} from "./symbols.js";

const router = express.Router();

//======================================================
// DEBUG — bypasses search/ranking entirely, reports the
// LIVE in-memory contract state directly, so "is NIFTY
// actually loaded right now" is never ambiguous again.
//======================================================

router.get("/debug", (req, res) => {
    const all = getAllAliceBlueSymbols();
	
    function isRealIndexRow(c) {
        const seg = String(c.exchangeSegment ?? "").toUpperCase();
        const type = String(c.instrumentType ?? "").toUpperCase();
        return (
            type === "INDEX" ||
            seg.includes("IDX") ||
            seg.includes("INDEX")
        );
    }

    const indexRows = all.filter(
        c => isRealIndexRow(c)
    );
	
    const nifty = all.find(
        c => isRealIndexRow(c) && extractUnderlying(c) === "NIFTY"
    );
	
    const banknifty = all.find(
        c => isRealIndexRow(c) && extractUnderlying(c) === "BANKNIFTY"
    );
	
    const sensex = all.find(
        c => isRealIndexRow(c) && extractUnderlying(c) === "SENSEX"
    );
	
    res.json({
        status: getAliceBlueSymbolStatus(),
        totalContractsInMemory: aliceBlueSymbolCount(),
        totalIndexRowsInMemory: indexRows.length,
        indexRowsSample: indexRows.slice(0, 10).map(c => c.symbol),
        hasNifty: Boolean(nifty),
        niftyRow: nifty ?? null,
        hasBankNifty: Boolean(banknifty),
        hasSensex: Boolean(sensex)
    });
});

router.get("/search", (req, res) => {

    try {

        const query = String(req.query.q ?? req.query.query ?? "").trim();
        const limit = req.query.limit;

        if (!query) {
            return res.json({ success: true, query, count: 0, results: [] });
        }

        const results = searchAliceBlueSymbolsForUI(query, limit);

        res.json({ success: true, query, count: results.length, results });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error?.message ?? "Alice Blue symbol search failed.",
            results: []
        });
    }
});

export default router;