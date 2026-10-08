//====================================
// server/zerodha/optionsRoute.js
//====================================

import express from "express";
import { getAllInstruments } from "./instruments/instruments.js";

const router = express.Router();

function cleanName(value) {
    return String(value ?? "").replace(/^"+|"+$/g, "").trim();
}

router.get("/search", (req, res) => {
    try {
        const underlying = String(req.query.underlying ?? "").trim().toUpperCase();
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

        if (!underlying) {
            return res.json({ success: true, count: 0, results: [] });
        }

        const matches = getAllInstruments()
            .filter(row =>
                (row.instrument_type === "CE" || row.instrument_type === "PE") &&
                cleanName(row.name) === underlying
            )
            .sort((a, b) => a.expiry.localeCompare(b.expiry) || Number(a.strike) - Number(b.strike))
            .slice(0, limit)
            .map(row => ({
                symbol: row.tradingsymbol,
                displayName: `${cleanName(row.name)} ${row.expiry} ${row.strike}${row.instrument_type}`,
                exchange: row.exchange,
                type: "OPTION",
                feedSource: "ZERODHA",
                expiry: row.expiry,
                strike: Number(row.strike),
                optionType: row.instrument_type,
                underlying: cleanName(row.name)
            }));

        res.json({ success: true, count: matches.length, results: matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error?.message ?? "Zerodha option search failed." });
    }
});

export default router;