//======================================================
// server/deltaexchange/optionsRoute.js
//
// GET /api/deltaexchange/options/resolve
//   ?underlying=BTC&expiry=2026-10-27&strike=90000&type=CE
//
// GET /api/deltaexchange/options/search
//   ?underlying=BTC
//
// GET /api/deltaexchange/options/status
//
// Mount in server/index.js with:
//   import deltaOptionsRouter from "./deltaexchange/optionsRoute.js";
//   app.use("/api/deltaexchange/options", deltaOptionsRouter);
//
// Built on the EXISTING DeltaOptionResolver /
// DeltaProductMaster - no new resolver logic, just an
// HTTP surface for what was already there.
//======================================================

import express from "express";

import {
    resolveDeltaOptionContract,
    listDeltaOptionExpiries
} from "./DeltaOptionResolver.ts";

const router = express.Router();

//======================================================
// NORMALIZE UNDERLYING - chart friendly names to the
// underlying asset symbol Delta's master uses.
// "BITCOIN" / "BTCUSD" / "BTCUSDT" -> "BTC"
//======================================================

function normalizeUnderlying(value) {

    const raw =
        String(value ?? "")
            .trim()
            .toUpperCase()
            .replace(/[\s_-]/g, "");

    const map = {
        BITCOIN: "BTC",
        BTCUSD: "BTC",
        BTCUSDT: "BTC",
        BTC: "BTC",
        ETHEREUM: "ETH",
        ETHUSD: "ETH",
        ETHUSDT: "ETH",
        ETH: "ETH",
        RIPPLE: "XRP",
        XRPUSD: "XRP",
        XRPUSDT: "XRP",
        XRP: "XRP"
    };

    if (map[raw]) {
        return map[raw];
    }

    // Generic: strip common quote suffixes.
    return raw
        .replace(/(USDT|USDC|USD)$/, "")
        .replace(/^INR/, "")
        || raw;
}

//======================================================
// EXPIRY NORMALIZE - "27OCT25" / "2026-10-27" both
// accepted; DeltaOptionResolver matches by UTC day.
//======================================================

const OPTION_MONTHS = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04",
    MAY: "05", JUN: "06", JUL: "07", AUG: "08",
    SEP: "09", OCT: "10", NOV: "11", DEC: "12"
};

function normalizeExpiryInput(value) {

    const raw =
        String(value ?? "").trim().toUpperCase();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const m = raw.match(
        /^(\d{1,2})[\s-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})?$/
    );

    if (!m) {
        return raw;
    }

    const day = m[1].padStart(2, "0");
    const month = OPTION_MONTHS[m[2]];

    let year = m[3]
        ? Number(m[3])
        : new Date().getFullYear();

    if (year < 100) {
        year += 2000;
    }

    return `${year}-${month}-${day}`;
}

//======================================================
// STATUS
//======================================================

router.get(
    "/status",
    async (_req, res) => {

        try {

            const { getDeltaProducts } =
                await import("./DeltaProductMaster.ts");

            const products =
                await getDeltaProducts();

            return res.json({
                ok: true,
                products: products.length,
                platform:
                    process.env.DELTA_API_BASE ??
                    "https://api.india.delta.exchange"
            });

        } catch (error) {

            return res.status(502).json({
                ok: false,
                error:
                    "Delta Exchange option master is not reachable right now."
            });

        }

    }
);

//======================================================
// SEARCH - expiry list for one underlying
//======================================================

router.get(
    "/search",
    async (req, res) => {

        try {

            const underlying =
                normalizeUnderlying(
                    req.query.underlying
                );

            if (!underlying) {

                return res.status(400).json({
                    ok: false,
                    error:
                        "An underlying asset is required."
                });
            }

            const expiries =
                await listDeltaOptionExpiries(
                    underlying
                );

            return res.json({
                ok: true,
                underlying,
                expiries
            });

        } catch (error) {

            console.error(
                "[DELTA OPTIONS SEARCH]",
                error?.message
            );

            return res.status(502).json({
                ok: false,
                error:
                    "Could not read Delta Exchange option expiries. Try again."
            });

        }

    }
);

//======================================================
// RESOLVE - canonical identity -> native contract
//======================================================

router.get(
    "/resolve",
    async (req, res) => {

        try {

            const underlying =
                normalizeUnderlying(
                    req.query.underlying
                );

            const expiry =
                normalizeExpiryInput(
                    req.query.expiry
                );

            const strike =
                Number(req.query.strike);

            const optionType =
                String(
                    req.query.type ?? ""
                )
                    .trim()
                    .toUpperCase()
                    .replace(/^CE$/, "CE")
                    .replace(/^PE$/, "PE")
                    .replace(/^CALL$/, "CE")
                    .replace(/^PUT$/, "PE");

            if (
                !underlying ||
                !expiry ||
                !Number.isFinite(strike) ||
                (optionType !== "CE" && optionType !== "PE")
            ) {

                return res.status(400).json({
                    ok: false,
                    error:
                        "underlying, expiry, strike and type are all required."
                });
            }

            const resolved =
                await resolveDeltaOptionContract({
                    underlying,
                    expiry,
                    strike,
                    optionType
                });

            if (!resolved) {

                return res.status(404).json({
                    ok: false,
                    error:
                        "No Delta Exchange option found for that underlying and expiry. Check expiry."
                });
            }

            return res.json({
                ok: true,
                symbol: resolved.symbol,
                snapped: resolved.snapped === true,
                symbolTicker: resolved.symbol,
                productId: resolved.productId,
                exchange: resolved.exchange,
                segment: resolved.segment,
                lotSize: resolved.lotSize,
                tickSize: resolved.tickSize,
                contract: resolved
            });

        } catch (error) {

            console.error(
                "[DELTA OPTIONS RESOLVE]",
                error?.message
            );

            return res.status(502).json({
                ok: false,
                error:
                    "Could not resolve that option on Delta Exchange. Try again."
            });

        }

    }
);

export default router;
