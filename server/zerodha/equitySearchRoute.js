import express from "express";
import { searchInstrument } from "./instruments.js";

const router = express.Router();

router.get("/search", (req, res) => {
    try {
        const query = String(req.query.q ?? req.query.query ?? "").trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

        if (!query) {
            return res.json({ success: true, query, count: 0, results: [] });
        }

        const matches = searchInstrument(query)
            .filter(row => row.instrument_type !== "CE" && row.instrument_type !== "PE")
            .slice(0, limit)
            .map(row => ({
                symbol: row.tradingsymbol,
                displayName: row.tradingsymbol,
                exchange: row.exchange,
                type: row.segment === "INDICES" ? "INDEX" : "EQUITY",
                feedSource: "ZERODHA",
                tradingSymbol: row.tradingsymbol,
                tokenIdentifier: String(row.instrument_token)
            }));

        res.json({ success: true, query, count: matches.length, results: matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error?.message ?? "Zerodha symbol search failed." });
    }
});

export default router;