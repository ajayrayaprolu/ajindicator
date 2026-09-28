import express from "express";
import { searchInstrument, getAllInstruments } from "./instruments.js";

const router = express.Router();

function cleanName(value) {
    return String(value ?? "").replace(/^"+|"+$/g, "").trim();
}

// Zerodha index tradingsymbol -> the name its options are listed under.
// Only applied when that name really exists in the option master.
const INDEX_OPTION_UNDERLYING = {
    "NIFTY 50": "NIFTY",
    "NIFTY BANK": "BANKNIFTY",
    "NIFTY FIN SERVICE": "FINNIFTY",
    "NIFTY MID SELECT": "MIDCPNIFTY",
    "SENSEX": "SENSEX",
    "BANKEX": "BANKEX"
};

let optionUnderlyings = null;

function getOptionUnderlyings() {
    if (optionUnderlyings && optionUnderlyings.size > 0) {
        return optionUnderlyings;
    }

    const names = new Set();

    for (const row of getAllInstruments()) {
        if (row.instrument_type === "CE" || row.instrument_type === "PE") {
            names.add(cleanName(row.name).toUpperCase());
        }
    }

    optionUnderlyings = names;
    return names;
}

function optionUnderlyingFor(row) {
    const mapped = INDEX_OPTION_UNDERLYING[String(row.tradingsymbol).toUpperCase()];

    if (mapped && getOptionUnderlyings().has(mapped)) {
        return mapped;
    }

    return row.tradingsymbol;
}

function rank(row, query) {
    const ts = String(row.tradingsymbol).toUpperCase();
    const isIndex = row.segment === "INDICES";

    if (ts === query) return 0;
    if (isIndex && ts.startsWith(query)) return 1;
    if (ts.startsWith(query)) return 2;
    return 3;
}

function exchangeRank(row) {
    if (row.exchange === "NSE") return 0;
    if (row.exchange === "BSE") return 1;
    return 2;
}

router.get("/search", (req, res) => {
    try {
        const query = String(req.query.q ?? req.query.query ?? "").trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

        if (!query) {
            return res.json({ success: true, query, count: 0, results: [] });
        }

        const upper = query.toUpperCase();

        const matches = searchInstrument(query)
            .filter(row => row.instrument_type === "EQ")
            .sort((a, b) =>
                rank(a, upper) - rank(b, upper) ||
                exchangeRank(a) - exchangeRank(b) ||
                String(a.tradingsymbol).length - String(b.tradingsymbol).length ||
                String(a.tradingsymbol).localeCompare(String(b.tradingsymbol))
            )
            .slice(0, limit)
            .map(row => ({
                symbol: row.tradingsymbol,
                displayName: row.tradingsymbol,
                exchange: row.exchange,
                type: row.segment === "INDICES" ? "INDEX" : "EQUITY",
                feedSource: "ZERODHA",
                tradingSymbol: row.tradingsymbol,
                tokenIdentifier: String(row.instrument_token),
                underlying: optionUnderlyingFor(row)
            }));

        res.json({ success: true, query, count: matches.length, results: matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error?.message ?? "Zerodha symbol search failed." });
    }
});

export default router;