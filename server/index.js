/**
 * ============================================================================
 * AJ v2 — Institutional Trading Terminal
 * File: server/index.js  NPM Server INDEX Page
 * ============================================================================
 *
 * PURPOSE
 *   Main backend entry point for the AJ v2 trading platform.
 *
 * RESPONSIBILITIES
 *   1. Load environment variables and initialize Express middleware.
 *   2. Register broker and market-data feed adapters.
 *   3. Mount broker-specific options, symbols, login, and history routes.
 *   4. Provide normalized market-data APIs for the frontend.
 *   5. Initialize instrument databases and broker symbol masters.
 *   6. Serve the application over HTTPS and accept WebSocket connections.
 *
 * ARCHITECTURAL NOTES
 *   - Broker-specific logic remains in its respective module.
 *   - This file coordinates routes, initialization, and server lifecycle.
 *   - Broker fallbacks must preserve the existing response contracts.
 *   - Scheduled symbol refreshes are started by their respective modules.
 *   - TLS certificates are required for HTTPS startup.
 *
 * AJ v2 VERSION: 2.0.0
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Process-level flags
// Prevent repetitive fallback and persistence warnings during polling.
// ---------------------------------------------------------------------------

let hasLoggedZerodhaFyersFallbackSuccess = false;
let hasLoggedZerodhaFallbackPersistenceSkipped = false;
let hasLoggedMissingZerodhaInstrument = false;

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

import dotenv from "dotenv";

dotenv.config();

console.log("=================================");
console.log("AJ v2 ENVIRONMENT CHECK");
console.log("=================================");
console.log("PORT    :", process.env.PORT);
console.log("=================================");

// ---------------------------------------------------------------------------
// Node.js and third-party dependencies
// ---------------------------------------------------------------------------

import express from "express";
import https from "https";
import fs from "fs";
import path from "path";
import cors from "cors";
import axios from "axios";
import { WebSocketServer } from "ws";

// ---------------------------------------------------------------------------
// Shared market-data infrastructure
// ---------------------------------------------------------------------------

import { registerFeed } from "./feeds/FeedRegistry.js";
import feedManager from "./feeds/FeedManager.js";

// ===========================================================================
// ZERODHA — Instruments, history, authentication, and candle persistence
// ===========================================================================

import { searchSymbols } from "./zerodha/SymbolSearch.js";

import {
    initializeInstrumentDatabase
} from "./zerodha/instruments/InstrumentDatabase.js";

import {
    initializeInstrumentSynchronizer,
    startInstrumentSynchronization
} from "./zerodha/instruments/InstrumentSynchronizer.js";

import {
    registerLoginRoutes,
    getLoginUrl as getZerodhaLoginUrl
} from "./zerodha/login.js";

import {
    registerTokenRoutes,
    isLoggedIn as isZerodhaLoggedIn
} from "./zerodha/token.js";

import {
    getAllInstruments,
    instrumentCount,
    getInstrument,
    getByTradingSymbol
} from "./zerodha/instruments/instruments.js";

import {
    getHistoricalData
} from "./zerodha/history.js";

import {
    upsertCandles as upsertZerodhaCandles,
    zerodhaCandleDatabasePath
} from "./zerodha/data/ZerodhaCandleDatabase.js";

// ===========================================================================
// YAHOO — Symbol catalog and market-data feed
// ===========================================================================

import {
    searchYahooSymbols
} from "./yahoo/YahooSymbolCatalog.js";

import {
    createYahooFeed
} from "./yahoo/YahooFeedAdapter.js";

// ===========================================================================
// BINANCE — Market-data feed
// ===========================================================================

import {
    createBinanceFeed
} from "./binance/BinanceFeedAdapter.js";

// ===========================================================================
// DELTA EXCHANGE — Market-data feed
// ===========================================================================

import {
    createDeltaExchangeFeed
} from "./deltaexchange/DeltaExchangeFeedAdapter.js";

// ===========================================================================
// FYERS — Feed, authentication, history, symbols, and equity master
// ===========================================================================

import {
    createFyersFeed
} from "./fyers/FyersFeed.js";

import {
    generateLoginUrl as generateFyersLoginUrl,
    exchangeAuthCode as exchangeFyersAuthCode,
    refreshAccessToken as refreshFyersAccessToken,
    getLoginStatus as getFyersLoginStatus,
    logout as fyersLogout
} from "./fyers/login.js";

import {
    isLoggedIn as isFyersLoggedIn,
    getRefreshToken as getFyersRefreshToken
} from "./fyers/token.js";

import {
    getHistory as getFyersHistory
} from "./fyers/history.js";

import {
    resolveFyersSymbol,
    initializeFyersSymbolMaster,
    getFyersContractByTicker,
    getFyersOptionContract,
    startFyersSymbolRefresh
} from "./fyers/symbolMaster.js";

import fyersOptionsRouter from "./fyers/optionsRoute.js";
import fyersEquitySearchRouter from "./fyers/equitySearchRoute.js";

import {
    initializeFyersEquityMaster,
    startFyersEquityRefresh
} from "./fyers/equityMaster.js";

// ===========================================================================
// ALICE BLUE — Feed, authentication, options, symbols, and synchronization
// ===========================================================================

import {
    generateLoginUrl as generateAliceBlueLoginUrl,
    exchangeAuthCode as exchangeAliceBlueAuthCode,
    loginFromRedirectUrl as aliceBlueLoginFromRedirectUrl,
    logout as aliceBlueLogout,
    getLoginStatus as getAliceBlueLoginStatus
} from "./aliceblue/login.js";

import {
    createAliceBlueFeed
} from "./aliceblue/AliceBlueFeed.js";

import {
    initializeAliceBlueSymbols,
    getAliceBlueContractBySymbol,
    startSymbolRefresh
} from "./aliceblue/symbolMaster.js";

import aliceBlueOptionsRouter from "./aliceblue/optionsRoute.js";
import aliceBlueEquitySearchRouter from "./aliceblue/equitySearchRoute.js";
import deltaExchangeOptionsRouter from "./deltaexchange/optionsRoute.js";

import {
    startAliceBlueSync
} from "./aliceblue/syncWorker.js";

import {
    getTokenStatus as getAliceBlueTokenStatus,
    isLoggedIn as isAliceBlueLoggedIn
} from "./aliceblue/token.js";

// ===========================================================================
// INDSTOCKS — Feed, symbol master, token status, and options
// ===========================================================================

import {
    createIndstocksFeed
} from "./indstocks/INDstocksFeed.js";

import {
    initializeIndstocksSymbols,
    startSymbolRefresh as startIndstocksSymbolRefresh,
    loadContractMaster,
    getAllIndstocksSymbols,
    searchIndstocksOptions
} from "./indstocks/symbolMaster.js";

import {
    getTokenStatus as getIndstocksTokenStatus
} from "./indstocks/token.js";

import indstocksOptionsRouter from "./indstocks/optionsRoute.js";
import indstocksEquitySearchRouter from "./indstocks/equitySearchRoute.js";

// ===========================================================================
// ZERODHA ROUTERS AND TELEGRAM NOTIFICATIONS
// ===========================================================================

import zerodhaOptionsRouter from "./zerodha/optionsRoute.js";
import zerodhaEquitySearchRouter from "./zerodha/equitySearchRoute.js";
import telegramRoute from "./telegram/telegramRoute.js";

// ---------------------------------------------------------------------------
// Application configuration
// ---------------------------------------------------------------------------

const AJTRADE_FRONTEND_ORIGIN = "https://ajtrade.in";

const app = express();

// Telegram API routes are mounted before the shared middleware, as in the
// current application. Review the route module if it needs parsed JSON bodies.
app.use("/api/telegram", telegramRoute);

app.use(cors());
app.use(express.json());

// ===========================================================================
// MARKET-DATA FEED REGISTRATION
// Register adapters with the shared feed manager.
// ===========================================================================

registerFeed("yahoo", createYahooFeed());
registerFeed("binance", createBinanceFeed());
registerFeed("deltaexchange", createDeltaExchangeFeed());
registerFeed("fyers", createFyersFeed());
registerFeed("aliceblue", createAliceBlueFeed());
registerFeed("indstocks", createIndstocksFeed());

// Start Yahoo as the default active feed. Other registered feeds remain
// available to their respective API routes.
await feedManager.setFeed("yahoo");
await feedManager.start();

console.log(
    "MARKET DATA Available: YAHOO, BINANCE, DELTA EXCHANGE, FYERS, ALICEBLUE, INDSTOCKS"
);

// ===========================================================================
// ROUTER MOUNTS
// Each broker retains ownership of its specialized options and symbol APIs.
// ===========================================================================

app.use("/api/fyers/options", fyersOptionsRouter);
app.use("/api/fyers/symbols", fyersEquitySearchRouter);

app.use("/api/aliceblue/options", aliceBlueOptionsRouter);
app.use("/api/aliceblue/symbols", aliceBlueEquitySearchRouter);

app.use("/api/deltaexchange/options", deltaExchangeOptionsRouter);

app.use("/api/indstocks/options", indstocksOptionsRouter);
app.use("/api/indstocks/symbols", indstocksEquitySearchRouter);

app.use("/api/zerodha/options", zerodhaOptionsRouter);
app.use("/api/zerodha/symbols", zerodhaEquitySearchRouter);

// ===========================================================================
// ZERODHA INITIALIZATION
// Prepare the instrument database and synchronizer before serving requests.
// ===========================================================================

initializeInstrumentDatabase();

await initializeInstrumentSynchronizer();
startInstrumentSynchronization();

registerLoginRoutes(app);
registerTokenRoutes(app);

// ===========================================================================
// GENERAL HEALTH AND APPLICATION INFORMATION
// ===========================================================================

app.get("/debug", (req, res) => {
    res.send("THIS IS MY SERVER FILE");
});

app.get("/health", (req, res) => {
    res.json({
        status: "AJ Institutional Terminal Running",
        server: "online",
        timestamp: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.json({
        application: "AJ Institutional Terminal",
        version: "2.0.0"
    });
});

// ===========================================================================
// UNIFIED SYMBOL SEARCH
// Route numeric/option searches to the Zerodha instrument catalog and other
// searches to Yahoo's symbol catalog.
// ===========================================================================

app.get("/api/symbols/search", async (req, res) => {
    try {
        const query = String(
            req.query.q ?? req.query.query ?? ""
        ).trim();

        const limit = Math.min(
            Math.max(
                Number(req.query.limit ?? 50) || 50,
                1
            ),
            100
        );

        if (!query) {
            return res.json({
                success: true,
                query,
                count: 0,
                results: []
            });
        }

        const text = query.toUpperCase();

        const numericOnly = /^\d+(?:\.\d+)?$/.test(text);
        const hasStrike = /\d+(?:\.\d+)?/.test(text);

        const optionText =
            /\b(?:NIFTY|BANKNIFTY)\b/.test(text) &&
            /\b(?:CE|PE)\b/.test(text);

        const optionSearch =
            numericOnly || hasStrike || optionText;

        let results;

        if (optionSearch) {
            const instrumentResults = searchSymbols(text, limit);

            results = instrumentResults.map((row) => ({
                symbol: row.trading_symbol || row.symbol,
                yahooSymbol: null,
                displayName:
                    row.display_name ||
                    row.trading_symbol ||
                    row.symbol,
                exchange: row.exchange,
                type: row.instrument_type || "OPTION",
                feedSource: row.feed_source || "NSE",
                instrumentId: row.id,
                tradingSymbol: row.trading_symbol,
                expiry: row.expiry,
                strike: row.strike,
                optionType: row.option_type,
                underlying: row.underlying,
                tokenIdentifier: row.token_identifier
            }));
        } else {
            results = await searchYahooSymbols(text);
        }

        const limitedResults = results.slice(0, limit);

        return res.json({
            success: true,
            query,
            count: limitedResults.length,
            results: limitedResults
        });
    } catch (error) {
        console.error("[SYMBOL SEARCH]", error);

        return res.status(500).json({
            success: false,
            query: String(req.query.q ?? req.query.query ?? ""),
            count: 0,
            results: [],
            error: error?.message || "Symbol search failed"
        });
    }
});

// ===========================================================================
// YAHOO HISTORICAL DATA
// Query the registered Yahoo feed for a symbol and requested timeframe.
// ===========================================================================

app.get("/api/yahoo/:symbol", async (req, res) => {
    try {
        const symbol = decodeURIComponent(
            req.params.symbol
        ).toUpperCase();

        const timeframe = String(req.query.timeframe ?? "1m");
        const feed = feedManager.getFeed("yahoo");

        if (!feed) {
            return res.status(500).json({
                error: "Yahoo feed is not registered."
            });
        }

        const candles = await feed.getHistory(symbol, timeframe);

        return res.json(candles);
    } catch (error) {
        console.error("[YAHOO ERROR]", error?.message);

        return res.status(error?.response?.status ?? 500).json({
            error: "Yahoo fetch failed",
            symbol: req.params.symbol,
            details: error?.message ?? "Unknown Yahoo error"
        });
    }
});

// ===========================================================================
// FYERS HISTORICAL DATA
// Resolve the requested symbol and validate option contracts against the
// downloaded FYERS master before requesting historical candles.
// ===========================================================================

app.get("/api/fyers/history", async (req, res) => {
    try {
        const symbol = String(req.query.symbol ?? "").trim();
        const timeframe = String(req.query.timeframe ?? "1m").trim();

        if (!symbol) {
            return res.status(400).json({
                ok: false,
                error: "[FYERS HISTORY] Symbol is required."
            });
        }

        const fyersSymbol = resolveFyersSymbol(symbol);

        // A CE/PE ticker must exist in the current option master. This avoids
        // forwarding invalid or expired option symbols to the FYERS API.
        if (/(CE|PE)$/.test(fyersSymbol)) {
            const knownContract = getFyersContractByTicker(fyersSymbol);

            if (!knownContract) {
                return res.status(404).json({
                    ok: false,
                    reason: "CONTRACT_NOT_FOUND",
                    error:
                        `[FYERS HISTORY] "${fyersSymbol}" is not in the current FYERS option master. Use /api/fyers/options/search to get a valid, live contract symbol.`,
                    candles: []
                });
            }
        }

        const candles = await getFyersHistory(
            fyersSymbol,
            timeframe
        );

        return res.json({
            ok: true,
            candles: Array.isArray(candles) ? candles : []
        });
    } catch (error) {
        console.error("[FYERS HISTORY ROUTE] FAILED", {
            message: error?.message,
            stack: error?.stack,
            reason: error?.fyersReason
        });

        const fyersStatusByReason = {
            SESSION_EXPIRED: 401,
            REQUEST_REJECTED: 422
        };

        const status =
            fyersStatusByReason[error?.fyersReason] ??
            error?.response?.status ??
            500;

        return res.status(status).json({
            ok: false,
            reason: error?.fyersReason ?? "UNKNOWN",
            error: error?.message ?? "FYERS history failed.",
            candles: []
        });
    }
});

// ===========================================================================
// ALICE BLUE HISTORICAL DATA
// Resolve exchange/token contracts, retrieve candles, and use IndStocks as
// a fallback when Alice Blue returns no candles or the request fails.
// ===========================================================================

app.get("/api/aliceblue/history", async (req, res) => {
    // Try IndStocks when Alice Blue has no usable historical data.
    const tryIndstocksFallback = async (rawSymbol, timeframe) => {
        try {
            const indstocksFeed = feedManager.getFeed("indstocks");

            if (
                !indstocksFeed ||
                typeof indstocksFeed.getHistory !== "function"
            ) {
                return null;
            }

            let indstocksSymbol = String(rawSymbol ?? "").trim();

            const optUnderlying = String(
                req.query.underlying ?? ""
            ).trim();

            const optExpiry = String(
                req.query.expiry ?? ""
            ).trim();

            const optStrike = req.query.strike;

            const optType = String(
                req.query.optionType ?? ""
            ).trim().toUpperCase();

            // Resolve an option from the IndStocks contract master when
            // canonical option metadata is provided by the frontend.
            if (
                optUnderlying &&
                optExpiry &&
                optStrike &&
                /^(CE|PE)$/.test(optType)
            ) {
                const optMatches = searchIndstocksOptions({
                    underlying: optUnderlying,
                    expiry: optExpiry,
                    strike: Number(optStrike),
                    optionType: optType,
                    limit: 5
                });

                const optContract =
                    Array.isArray(optMatches) && optMatches.length > 0
                        ? optMatches[0]
                        : null;

                if (optContract?.exchange && optContract?.securityId) {
                    indstocksSymbol =
                        `${optContract.exchange}_${optContract.securityId}`;

                    console.log(
                        "[ALICEBLUE HISTORY] IndStocks OPTION resolved:",
                        {
                            optUnderlying,
                            optExpiry,
                            optStrike,
                            optType,
                            indstocksSymbol
                        }
                    );
                }
            } else if (
                indstocksSymbol &&
                !/^[A-Z]+_\d+$/i.test(indstocksSymbol)
            ) {
                const normalizedQuery = indstocksSymbol
                    .toUpperCase()
                    .replace(/-EQ$/, "")
                    .replace(/\s+/g, "");

                const allIndstocksSymbols = getAllIndstocksSymbols();

                const indexMatch = Array.isArray(allIndstocksSymbols)
                    ? allIndstocksSymbols.find((item) => {
                        const type = String(
                            item?.type ?? item?.instrumentType ?? ""
                        ).toUpperCase();

                        if (!type.includes("INDEX")) {
                            return false;
                        }

                        const name = String(
                            item?.tradingSymbol ??
                            item?.displayName ??
                            item?.symbol ??
                            ""
                        )
                            .toUpperCase()
                            .replace(/\s+/g, "");

                        return name === normalizedQuery;
                    })
                    : null;

                if (indexMatch?.exchange && indexMatch?.securityId) {
                    indstocksSymbol =
                        `${indexMatch.exchange}_${indexMatch.securityId}`;

                    console.log(
                        "[ALICEBLUE HISTORY] IndStocks name resolved:",
                        { rawSymbol, indstocksSymbol }
                    );
                }
            }

            const fallbackResult = await indstocksFeed.getHistory(
                indstocksSymbol,
                timeframe
            );

            const fallbackCandles = Array.isArray(fallbackResult)
                ? fallbackResult
                : Array.isArray(fallbackResult?.candles)
                    ? fallbackResult.candles
                    : [];

            return fallbackCandles.length > 0
                ? fallbackCandles
                : null;
        } catch (fallbackError) {
            console.warn(
                "[ALICEBLUE HISTORY] IndStocks fallback also failed:",
                fallbackError?.message ?? fallbackError
            );

            return null;
        }
    };

    try {
        const symbol = decodeURIComponent(
            String(req.query.symbol ?? "")
        ).trim();

        const timeframe = String(req.query.timeframe ?? "1m");

        if (!symbol) {
            return res.status(400).json({
                error: "Alice Blue symbol is required."
            });
        }

        const feed = feedManager.getFeed("aliceblue");

        if (!feed) {
            return res.status(500).json({
                error: "Alice Blue feed is not registered."
            });
        }

        if (typeof feed.getHistory !== "function") {
            return res.status(500).json({
                error: "Alice Blue feed does not support getHistory()."
            });
        }

        let aliceBlueSymbol = String(symbol ?? "")
            .trim()
            .toUpperCase();

        if (!aliceBlueSymbol) {
            return res.status(400).json({
                error: "Alice Blue history requires a symbol."
            });
        }

        // Accept a canonical EXCHANGE|TOKEN identifier directly.
        if (aliceBlueSymbol.includes("|")) {
            const parts = aliceBlueSymbol.split("|");

            const exchange = String(parts[0] ?? "")
                .trim()
                .toUpperCase();

            const token = String(parts[1] ?? "").trim();

            if (!exchange || !token) {
                return res.status(400).json({
                    error:
                        "Invalid Alice Blue instrument. Expected EXCHANGE|TOKEN."
                });
            }

            aliceBlueSymbol = `${exchange}|${token}`;
        } else {
            const resolver = feed.resolveInstrument;

            if (typeof resolver !== "function") {
                return res.status(500).json({
                    error:
                        "Alice Blue feed does not expose resolveInstrument()."
                });
            }

            // Resolve friendly option symbols through the authoritative
            // Alice Blue option master before using the generic resolver.
            const optionMatch = aliceBlueSymbol.match(
                /^([A-Z0-9&.-]+)(?:-EQ)?\s+(\d{1,2}[A-Z]{3})\s+(\d+(?:\.\d+)?)(CE|PE)$/i
            );

            let resolved = null;

            if (optionMatch) {
                const underlying = String(optionMatch[1] ?? "")
                    .trim()
                    .toUpperCase()
                    .replace(/-EQ$/i, "");

                const expiryText = String(optionMatch[2] ?? "")
                    .trim()
                    .toUpperCase();

                const strike = Number(optionMatch[3]);

                const optionType = String(optionMatch[4] ?? "")
                    .trim()
                    .toUpperCase();

                const monthMap = {
                    JAN: "01",
                    FEB: "02",
                    MAR: "03",
                    APR: "04",
                    MAY: "05",
                    JUN: "06",
                    JUL: "07",
                    AUG: "08",
                    SEP: "09",
                    OCT: "10",
                    NOV: "11",
                    DEC: "12"
                };

                const expiryMatch = expiryText.match(
                    /^(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/
                );

                if (expiryMatch) {
                    const day = expiryMatch[1].padStart(2, "0");
                    const month = monthMap[expiryMatch[2]];
                    const currentYear = new Date().getFullYear();

                    // The UI provides DDMMM while the master uses YYYY-MM-DD.
                    // Preserve the existing current-year/next-occurrence rule.
                    let expiry = `${currentYear}-${month}-${day}`;

                    const expiryDate = new Date(`${expiry}T00:00:00`);
                    const today = new Date();

                    today.setHours(0, 0, 0, 0);

                    if (expiryDate < today) {
                        expiry = `${currentYear + 1}-${month}-${day}`;
                    }

                    const { searchAliceBlueOptions } = await import(
                        "./aliceblue/symbolMaster.js"
                    );

                    const matches = searchAliceBlueOptions({
                        underlying,
                        expiry,
                        strike,
                        optionType,
                        limit: 5
                    });

                    if (Array.isArray(matches) && matches.length > 0) {
                        const contract = matches[0];

                        resolved = {
                            exchange: contract.exchange,
                            token: contract.token
                        };
                    }
                }
            }

            // Fall back to normal equity/index resolution.
            if (!resolved) {
                const normalizedIndex = String(aliceBlueSymbol ?? "")
                    .trim()
                    .toUpperCase();

                const indexAliases = {
                    "NIFTY": "NIFTY",
                    "NIFTY 50": "NIFTY",
                    "NIFTY50": "NIFTY",
                    "BANKNIFTY": "BANKNIFTY",
                    "BANK NIFTY": "BANKNIFTY",
                    "FINNIFTY": "FINNIFTY",
                    "MIDCPNIFTY": "MIDCPNIFTY"
                };

                const indexSymbol = indexAliases[normalizedIndex];

                if (indexSymbol) {
                    const { searchAliceBlueSymbols } = await import(
                        "./aliceblue/symbolMaster.js"
                    );

                    const matches = searchAliceBlueSymbols({
                        query: indexSymbol,
                        limit: 50
                    });

                    const indexContract = Array.isArray(matches)
                        ? matches.find((item) => {
                            const type = String(
                                item?.type ?? item?.instrumentType ?? ""
                            ).toUpperCase();

                            const segment = String(
                                item?.exchangeSegment ?? item?.segment ?? ""
                            ).toUpperCase();

                            return (
                                type === "INDEX" ||
                                segment.includes("INDEX")
                            );
                        })
                        : null;

                    if (indexContract) {
                        resolved = {
                            exchange: indexContract.exchange ?? "NSE",
                            token:
                                indexContract.token ??
                                indexContract.instrumentToken
                        };
                    }
                }
            }

            if (!resolved) {
                resolved = resolver(aliceBlueSymbol);
            }

            if (
                !resolved ||
                !resolved.exchange ||
                !resolved.token
            ) {
                return res.status(404).json({
                    error:
                        `Unable to resolve Alice Blue instrument: ${aliceBlueSymbol}`
                });
            }

            aliceBlueSymbol =
                `${String(resolved.exchange).toUpperCase()}|${String(resolved.token)}`;
        }

        // Normalize and validate canonical exchange/token symbols.
        if (aliceBlueSymbol.includes("|")) {
            const parts = aliceBlueSymbol.split("|");

            const exchange = String(parts[0] ?? "")
                .trim()
                .toUpperCase();

            const token = String(parts[1] ?? "").trim();

            if (!exchange || !token) {
                return res.status(400).json({
                    error:
                        "Invalid Alice Blue symbol. Expected EXCHANGE|TOKEN.",
                    symbol: aliceBlueSymbol
                });
            }

            aliceBlueSymbol = `${exchange}|${token}`;
        } else {
            const requestedExchange = String(
                req.query.exchange ?? ""
            )
                .trim()
                .toUpperCase();

            const normalizedSymbol = String(aliceBlueSymbol ?? "")
                .trim()
                .toUpperCase();

            const exchange =
                requestedExchange ||
                (
                    normalizedSymbol === "SENSEX" ||
                    normalizedSymbol === "BANKEX"
                        ? "BSE"
                        : "NSE"
                );

            const contract = getAliceBlueContractBySymbol(
                aliceBlueSymbol,
                exchange
            );

            if (!contract) {
                console.error(
                    "[ALICEBLUE HISTORY] CONTRACT NOT FOUND:",
                    {
                        requested: aliceBlueSymbol,
                        exchange,
                        symbolMaster: "NOT LOADED"
                    }
                );

                return res.status(404).json({
                    error: "Alice Blue symbol could not be resolved.",
                    symbol: aliceBlueSymbol,
                    exchange
                });
            }

            aliceBlueSymbol = `${contract.exchange}|${contract.token}`;
        }

        const result = await feed.getHistory(
            aliceBlueSymbol,
            timeframe
        );

        // Accept both the current { candles, freshness } result and a bare
        // candle array for compatibility with existing feed implementations.
        const candles = Array.isArray(result)
            ? result
            : Array.isArray(result?.candles)
                ? result.candles
                : [];

        const freshness = Array.isArray(result)
            ? null
            : result?.freshness ?? null;

        if (!candles || candles.length === 0) {
            const fallbackCandles = await tryIndstocksFallback(
                symbol,
                timeframe
            );

            if (fallbackCandles) {
                return res.json({
                    candles: fallbackCandles,
                    freshness: null,
                    source: "indstocks"
                });
            }
        }

        return res.json({ candles, freshness });
    } catch (error) {
        const fallbackCandles = await tryIndstocksFallback(
            req.query.symbol,
            req.query.timeframe ?? "1m"
        );

        if (fallbackCandles) {
            return res.json({
                candles: fallbackCandles,
                freshness: null,
                source: "indstocks"
            });
        }

        console.error("[ALICEBLUE HISTORY ROUTE] ERROR", {
            message: error?.message,
            stack: error?.stack,
            response: error?.response?.data,
            reason: error?.aliceBlueReason
        });

        const statusByReason = {
            MARKET_HOURS_RESTRICTED: 503,
            EXCHANGE_NOT_SUPPORTED: 400,
            SESSION_EXPIRED: 401,
            RESOLUTION_NOT_SUPPORTED: 400
        };

        const status =
            statusByReason[error?.aliceBlueReason] ??
            error?.response?.status ??
            500;

        return res.status(status).json({
            error: "Alice Blue historical data request failed.",
            reason: error?.aliceBlueReason ?? "UNKNOWN",
            details:
                error?.message ?? "Unknown Alice Blue history error."
        });
    }
});

// ===========================================================================
// INDSTOCKS — Token status and historical data
// ===========================================================================

app.get("/api/indstocks/status", (req, res) => {
    try {
        const status = getIndstocksTokenStatus();

        res.json({
            loggedIn: status.hasToken,
            status: status.hasToken ? "connected" : "login_required",
            message: status.hasToken
                ? `Token valid, ${status.minutesRemaining}m remaining.`
                : "No active IndStocks token yet.",
            ...status
        });
    } catch (error) {
        console.error("[INDSTOCKS STATUS]", error);

        res.status(500).json({
            loggedIn: false,
            status: "server_unavailable",
            message:
                error?.message ?? "Unable to read IndStocks token status."
        });
    }
});

app.get("/api/indstocks/history", async (req, res) => {
    try {
        const symbol = decodeURIComponent(
            String(req.query.symbol ?? "")
        ).trim();

        const timeframe = String(req.query.timeframe ?? "1m");

        if (!symbol) {
            return res.status(400).json({
                error: "IndStocks symbol is required."
            });
        }

        const feed = feedManager.getFeed("indstocks");

        if (!feed) {
            return res.status(500).json({
                error: "IndStocks feed is not registered."
            });
        }

        const candles = await feed.getHistory(symbol, timeframe);

        return res.json({
            candles: Array.isArray(candles) ? candles : []
        });
    } catch (error) {
        console.error("[INDSTOCKS HISTORY ROUTE] FAILED", {
            message: error?.message,
            reason: error?.indstocksReason
        });

        const statusByReason = {
            SESSION_EXPIRED: 401
        };

        const status =
            statusByReason[error?.indstocksReason] ??
            error?.response?.status ??
            500;

        return res.status(status).json({
            error: "IndStocks historical data request failed.",
            reason: error?.indstocksReason ?? "UNKNOWN",
            details:
                error?.message ?? "Unknown IndStocks history error."
        });
    }
});

// ===========================================================================
// ZERODHA — Instrument master API
// ===========================================================================

app.get("/api/zerodha/instruments", (req, res) => {
    try {
        res.json({
            success: true,
            count: instrumentCount(),
            instruments: getAllInstruments()
        });
    } catch (error) {
        console.error("[ZERODHA INSTRUMENTS]", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================================================
// ZERODHA — Canonical option expiry normalization
// Convert DDMMM to YYYY-MM-DD while retaining ISO dates unchanged.
// ===========================================================================

function zerodhaCanonicalExpiryToISO(value) {
    const raw = String(value ?? "").trim().toUpperCase();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const months = {
        JAN: "01",
        FEB: "02",
        MAR: "03",
        APR: "04",
        MAY: "05",
        JUN: "06",
        JUL: "07",
        AUG: "08",
        SEP: "09",
        OCT: "10",
        NOV: "11",
        DEC: "12"
    };

    const match = raw.match(
        /^(\d{1,2})[\s-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/
    );

    if (!match) {
        return raw;
    }

    const day = match[1].padStart(2, "0");
    const month = months[match[2]];
    const currentYear = new Date().getFullYear();

    let expiry = `${currentYear}-${month}-${day}`;

    const expiryDate = new Date(`${expiry}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
        expiry = `${currentYear + 1}-${month}-${day}`;
    }

    return expiry;
}

// ===========================================================================
// ZERODHA HISTORICAL DATA
// Primary source: Zerodha.
// Fallback source: FYERS.
// Successful fallback candles are persisted to the Zerodha candle database
// when a matching Zerodha instrument token is available.
// ===========================================================================

app.get("/api/zerodha/history/:symbol", async (req, res) => {
    try {
        const symbol = decodeURIComponent(
            req.params.symbol
        ).toUpperCase();

        const timeframe = req.query.timeframe || "1minute";

        const candles = await getHistoricalData(
            symbol,
            timeframe
        );

        return res.json(candles);
    } catch (error) {
        const fallbackSymbol = decodeURIComponent(
            req.params.symbol ?? ""
        ).toUpperCase();

        const fallbackTimeframe =
            req.query.timeframe || "1minute";

        try {
            const canonicalUnderlying = String(
                req.query.underlying ?? ""
            ).trim();

            const canonicalExpiry = String(
                req.query.expiry ?? ""
            ).trim();

            const canonicalStrike = req.query.strike;

            const canonicalType = String(
                req.query.optionType ?? ""
            ).trim().toUpperCase();

            let fyersCandles = null;

            // If canonical option metadata was supplied, resolve the
            // corresponding FYERS option contract first.
            if (
                canonicalUnderlying &&
                canonicalExpiry &&
                canonicalStrike &&
                /^(CE|PE)$/.test(canonicalType)
            ) {
                const isoExpiry = zerodhaCanonicalExpiryToISO(
                    canonicalExpiry
                );

                const contract = getFyersOptionContract({
                    underlying: canonicalUnderlying,
                    expiry: isoExpiry,
                    strike: Number(canonicalStrike),
                    optionType: canonicalType
                });

                if (contract?.symbolTicker) {
                    fyersCandles = await getFyersHistory(
                        contract.symbolTicker,
                        fallbackTimeframe
                    );
                }
            }

            // If canonical option metadata did not resolve, try the
            // Zerodha instrument catalog to identify the instrument type.
            if (!fyersCandles) {
                const zerodhaRow =
                    getInstrument("NSE", fallbackSymbol) ||
                    getInstrument("NFO", fallbackSymbol) ||
                    getInstrument("BSE", fallbackSymbol) ||
                    getByTradingSymbol(fallbackSymbol);

                if (zerodhaRow) {
                    const isOption =
                        zerodhaRow.instrument_type === "CE" ||
                        zerodhaRow.instrument_type === "PE";

                    if (isOption) {
                        const cleanUnderlying = String(
                            zerodhaRow.name ?? ""
                        )
                            .replace(/^"+|"+$/g, "")
                            .trim();

                        const contract = getFyersOptionContract({
                            underlying: cleanUnderlying,
                            expiry: zerodhaRow.expiry,
                            strike: Number(zerodhaRow.strike),
                            optionType: zerodhaRow.instrument_type
                        });

                        if (contract?.symbolTicker) {
                            fyersCandles = await getFyersHistory(
                                contract.symbolTicker,
                                fallbackTimeframe
                            );
                        }
                    } else {
                        const fyersSymbol = resolveFyersSymbol(
                            fallbackSymbol
                        );

                        fyersCandles = await getFyersHistory(
                            fyersSymbol,
                            fallbackTimeframe
                        );
                    }
                } else if (
                    !canonicalUnderlying ||
                    !canonicalExpiry ||
                    !canonicalStrike ||
                    !/^(CE|PE)$/.test(canonicalType)
                ) {
                    // For ordinary symbols, allow FYERS fallback even if
                    // the symbol is missing from the Zerodha master.
                    const fyersSymbol = resolveFyersSymbol(
                        fallbackSymbol
                    );

                    fyersCandles = await getFyersHistory(
                        fyersSymbol,
                        fallbackTimeframe
                    );
                }
            }

            if (
                Array.isArray(fyersCandles) &&
                fyersCandles.length > 0
            ) {
                if (!hasLoggedZerodhaFyersFallbackSuccess) {
                    console.log(
                        "[ZERODHA HISTORY] FYERS fallback succeeded:",
                        {
                            symbol: fallbackSymbol,
                            count: fyersCandles.length
                        }
                    );

                    hasLoggedZerodhaFyersFallbackSuccess = true;
                }

                // Persist FYERS candles to the Zerodha SQLite candle cache
                // when a corresponding Zerodha instrument is available.
                const zerodhaCacheInstrument =
                    getInstrument("NSE", fallbackSymbol) ||
                    getInstrument("NFO", fallbackSymbol) ||
                    getInstrument("BSE", fallbackSymbol) ||
                    getByTradingSymbol(fallbackSymbol);

                if (zerodhaCacheInstrument?.instrument_token) {
                    const zerodhaInterval =
                        fallbackTimeframe === "1m" ||
                        fallbackTimeframe === "1minute"
                            ? "minute"
                            : fallbackTimeframe === "3m" ||
                              fallbackTimeframe === "3minute"
                                ? "3minute"
                                : fallbackTimeframe === "5m" ||
                                  fallbackTimeframe === "5minute"
                                    ? "5minute"
                                    : fallbackTimeframe === "10m" ||
                                      fallbackTimeframe === "10minute"
                                        ? "10minute"
                                        : fallbackTimeframe === "15m" ||
                                          fallbackTimeframe === "15minute"
                                            ? "15minute"
                                            : fallbackTimeframe === "30m" ||
                                              fallbackTimeframe === "30minute"
                                                ? "30minute"
                                                : fallbackTimeframe === "1h" ||
                                                  fallbackTimeframe === "60minute"
                                                    ? "60minute"
                                                    : fallbackTimeframe === "1d" ||
                                                      fallbackTimeframe === "day"
                                                        ? "day"
                                                        : "minute";

                    const saved = upsertZerodhaCandles(
                        zerodhaCacheInstrument.instrument_token,
                        zerodhaInterval,
                        fyersCandles,
                        {
                            exchange:
                                zerodhaCacheInstrument.exchange || "NSE",
                            trading_symbol:
                                zerodhaCacheInstrument.tradingsymbol ||
                                fallbackSymbol
                        }
                    );

                    if (saved !== fyersCandles.length) {
                        throw new Error(
                            `[ZERODHA CANDLE DB] FYERS fallback persistence mismatch: received ${fyersCandles.length} candles but upserted ${saved}.`
                        );
                    }
                } else if (!hasLoggedZerodhaFallbackPersistenceSkipped) {
                    console.warn(
                        "[ZERODHA CANDLE DB] FYERS fallback succeeded, but Zerodha instrument was not found. SQLite persistence skipped:",
                        fallbackSymbol
                    );

                    hasLoggedZerodhaFallbackPersistenceSkipped = true;
                }

                return res.json(fyersCandles);
            }
        } catch (fallbackError) {
            console.warn(
                "[ZERODHA HISTORY] FYERS fallback also failed:",
                fallbackError?.message ?? fallbackError
            );
        }

        const historyErrorMessage = String(
            error?.message ?? error
        );

        if (/^Instrument not found:/i.test(historyErrorMessage)) {
            if (!hasLoggedMissingZerodhaInstrument) {
                console.warn(
                    "[ZERODHA HISTORY] Zerodha instrument unavailable; FYERS fallback was unsuccessful for this request."
                );

                hasLoggedMissingZerodhaInstrument = true;
            }
        } else {
            console.error("[ZERODHA HISTORY]", error);
        }

        return res.status(500).json({
            error: "Unable to fetch Zerodha history",
            details: error.message
        });
    }
});

// ===========================================================================
// BINANCE HISTORICAL DATA
// Supports spot and USD-M futures candle requests.
// ===========================================================================

app.get("/api/binance/:symbol", async (req, res) => {
    try {
        const symbol = String(req.params.symbol ?? "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        const interval = String(
            req.query.timeframe ??
            req.query.interval ??
            "1m"
        );

        const requestedMarket = String(
            req.query.market ?? "spot"
        )
            .trim()
            .toLowerCase();

        const market = [
            "futures",
            "future",
            "usdm",
            "usd-m"
        ].includes(requestedMarket)
            ? "futures"
            : "spot";

        if (!symbol) {
            return res.status(400).json({
                error: "Binance symbol is required."
            });
        }

        const allowedIntervals = new Set([
            "1m", "3m", "5m", "15m", "30m",
            "1h", "2h", "4h", "6h", "8h", "12h",
            "1d", "3d", "1w", "1M"
        ]);

        const resolvedInterval = allowedIntervals.has(interval)
            ? interval
            : "1m";

        const apiBase = market === "futures"
            ? "https://fapi.binance.com"
            : "https://api.binance.com";

        const endpoint = market === "futures"
            ? "/fapi/v1/klines"
            : "/api/v3/klines";

        console.log(
            `[BINANCE API] ${market.toUpperCase()} ${symbol} ${resolvedInterval}`
        );

        const response = await axios.get(
            `${apiBase}${endpoint}`,
            {
                timeout: 10000,
                params: {
                    symbol,
                    interval: resolvedInterval,
                    limit: 1000
                }
            }
        );

        return res.json(
            Array.isArray(response.data) ? response.data : []
        );
    } catch (error) {
        console.error("[BINANCE ERROR]", {
            symbol: req.params?.symbol,
            market: req.query?.market ?? "spot",
            timeframe:
                req.query?.timeframe ??
                req.query?.interval ??
                "1m",
            status: error?.response?.status,
            data: error?.response?.data,
            message: error?.message
        });

        return res.status(error?.response?.status ?? 500).json({
            error:
                error?.response?.data ??
                error?.message ??
                "Binance fetch failed"
        });
    }
});

// ===========================================================================
// DELTA EXCHANGE HISTORICAL DATA
// Retrieve public candles and normalize the result to the frontend OHLCV
// format with epoch timestamps in seconds.
// ===========================================================================

app.get("/api/deltaexchange/:symbol", async (req, res) => {
    try {
        const symbol = String(req.params.symbol ?? "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9._-]/g, "");

        const interval = String(
            req.query.timeframe ??
            req.query.interval ??
            "1m"
        );

        if (!symbol) {
            return res.status(400).json({
                error: "Delta Exchange symbol is required."
            });
        }

        // Log each symbol/timeframe pair only once per server process.
        // Regular frontend polling should not flood the server console.
        globalThis.__deltaLogged =
            globalThis.__deltaLogged || new Set();

        const deltaLogKey = `${symbol}:${interval}`;

        if (!globalThis.__deltaLogged.has(deltaLogKey)) {
            globalThis.__deltaLogged.add(deltaLogKey);

            console.log(`[DELTA API] ${symbol} ${interval}`);
        }

        const RESOLUTION_MAP = {
            "1m": "1m",
            "3m": "3m",
            "5m": "5m",
            "15m": "15m",
            "30m": "30m",
            "1h": "1h",
            "2h": "2h",
            "4h": "4h",
            "6h": "6h",
            "1d": "1d",
            "1w": "1w"
        };

        const resolution = RESOLUTION_MAP[interval] ?? "5";

        const stepSeconds = {
            "1m": 60,
            "3m": 180,
            "5m": 300,
            "15m": 900,
            "30m": 1800,
            "1h": 3600,
            "2h": 7200,
            "4h": 14400,
            "6h": 21600,
            "1d": 86400,
            "1w": 604800
        };

        const step = stepSeconds[resolution] ?? 300;
        const end = Math.floor(Date.now() / 1000);
        const start = end - 1000 * step;

        const apiBase =
            process.env.DELTA_API_BASE ??
            "https://api.india.delta.exchange";

        const response = await axios.get(
            `${apiBase}/v2/history/candles`,
            {
                timeout: 10000,
                params: {
                    symbol,
                    resolution,
                    start,
                    end
                }
            }
        );

        const rows = Array.isArray(response?.data?.result)
            ? response.data.result
            : [];

        const candles = rows
            .map((candle) => ({
                time: Number(candle.time) > 1e12
                    ? Math.floor(Number(candle.time) / 1000)
                    : Math.floor(Number(candle.time)),
                open: Number(candle.open),
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
                volume: Number(candle.volume ?? 0)
            }))
            .filter((candle) =>
                Number.isFinite(candle.time) &&
                Number.isFinite(candle.open) &&
                Number.isFinite(candle.high) &&
                Number.isFinite(candle.low) &&
                Number.isFinite(candle.close)
            );

        return res.json(candles);
    } catch (error) {
        console.error("[DELTA ERROR]", {
            symbol: req.params?.symbol,
            timeframe:
                req.query?.timeframe ??
                req.query?.interval ??
                "1m",
            status: error?.response?.status,
            data: error?.response?.data,
            message: error?.message
        });

        return res.status(error?.response?.status ?? 500).json({
            error:
                error?.response?.data ??
                error?.message ??
                "Delta Exchange fetch failed"
        });
    }
});

// ===========================================================================
// ZERODHA — Login
// Redirect the user to the broker's authentication page.
// ===========================================================================

app.get("/api/zerodha/login", (req, res) => {
    try {
        console.log("[ZERODHA LOGIN] Initiating fresh login.");

        return res.redirect(getZerodhaLoginUrl());
    } catch (error) {
        console.error(
            "[ZERODHA LOGIN] Failed to generate login URL:",
            error?.message
        );

        return res.status(500).json({
            success: false,
            provider: "zerodha",
            error:
                error?.message ??
                "Unable to generate Zerodha login URL."
        });
    }
});

// ===========================================================================
// FYERS — Login
// Start interactive authentication.
// ===========================================================================

app.get("/api/fyers/login", (req, res) => {
    try {
        console.log(
            "[FYERS LOGIN] Automatic token refresh disabled. Starting interactive login."
        );

        return res.redirect(generateFyersLoginUrl());
    } catch (error) {
        console.error(
            "[FYERS LOGIN] Route failed:",
            error?.message
        );

        return res.status(500).json({
            ok: false,
            provider: "fyers",
            error:
                error?.message ??
                "Unable to generate FYERS login URL."
        });
    }
});

// ===========================================================================
// FYERS — Authentication callback
// Exchange the authorization code and notify the opener window.
// ===========================================================================

app.get("/api/fyers/callback", async (req, res) => {
    try {
        const authCode =
            req.query.auth_code ??
            req.query.authCode ??
            req.query.code;

        if (!authCode) {
            throw new Error("FYERS authorization code missing.");
        }

        console.log(
            "[FYERS CALLBACK] Authorization code received."
        );

        const session = await exchangeFyersAuthCode(
            String(authCode)
        );

        console.log(
            "[FYERS CALLBACK] Authentication successful.",
            {
                hasAccessToken: Boolean(session?.accessToken)
            }
        );

        return res
            .status(200)
            .type("html")
            .send(`
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>FYERS Connected</title>
</head>
<body>
    <script>
        (function () {
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        {
                            type: "AJTRADE_BROKER_AUTH",
                            provider: "fyers",
                            status: "success"
                        },
                        ${JSON.stringify(AJTRADE_FRONTEND_ORIGIN)}
                    );
                }
            } catch (error) {
                console.error(error);
            }

            setTimeout(function () {
                window.close();
            }, 300);
        })();
    </script>

    <p>FYERS connected. This window can be closed.</p>
</body>
</html>
            `);
    } catch (error) {
        console.error("[FYERS CALLBACK] FAILED:", {
            message: error?.message,
            status: error?.response?.status,
            response: error?.response?.data
        });

        const safeMessage = JSON.stringify(
            error?.message ?? "FYERS authentication failed."
        );

        const safeHtmlMessage = String(
            error?.message ?? "Unknown error"
        ).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

        return res
            .status(500)
            .type("html")
            .send(`
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>FYERS Authentication Failed</title>
</head>
<body>
    <script>
        (function () {
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        {
                            type: "AJTRADE_BROKER_AUTH",
                            provider: "fyers",
                            status: "error",
                            message: ${safeMessage}
                        },
                        ${JSON.stringify(AJTRADE_FRONTEND_ORIGIN)}
                    );
                }
            } catch (error) {}
        })();
    </script>

    <h3>FYERS authentication failed</h3>
    <pre>${safeHtmlMessage}</pre>
</body>
</html>
            `);
    }
});

// ===========================================================================
// FYERS — Session status and logout
// ===========================================================================

app.get("/api/fyers/status", (req, res) => {
    try {
        return res.json(getFyersLoginStatus());
    } catch (error) {
        console.error("[FYERS STATUS]", error);

        return res.status(500).json({
            loggedIn: false,
            status: "server_unavailable",
            message:
                error?.message ??
                "Unable to read FYERS session."
        });
    }
});

app.post("/api/fyers/logout", (req, res) => {
    try {
        fyersLogout();

        return res.json({
            ok: true,
            provider: "fyers",
            loggedIn: false
        });
    } catch (error) {
        console.error("[FYERS LOGOUT]", error);

        return res.status(500).json({
            ok: false,
            provider: "fyers",
            error:
                error?.message ??
                "Unable to logout FYERS."
        });
    }
});

// ===========================================================================
// ALICE BLUE — Login
// Reuse an existing session where available; otherwise start broker login.
// ===========================================================================

app.get("/api/aliceblue/login", (req, res) => {
    try {
        if (isAliceBlueLoggedIn()) {
            return res.status(200).type("html").send(`
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Alice Blue Already Connected</title>
</head>
<body>
    <h2>Alice Blue is already connected.</h2>
    <p>No additional login is required.</p>

    <script>
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
                {
                    type: "AJTRADE_BROKER_AUTH",
                    provider: "aliceblue",
                    status: "success"
                },
                ${JSON.stringify(AJTRADE_FRONTEND_ORIGIN)}
            );
        }

        window.close();
    </script>
</body>
</html>
            `);
        }

        return res.redirect(generateAliceBlueLoginUrl());
    } catch (error) {
        console.error("[ALICEBLUE LOGIN] Failed:", error?.message);

        return res.status(500).json({
            ok: false,
            provider: "aliceblue",
            error:
                error?.message ??
                "Unable to generate Alice Blue login URL."
        });
    }
});

// ===========================================================================
// ALICE BLUE — Authentication callback
// Validate callback parameters, exchange the redirect URL for a session,
// and notify the frontend popup opener of the authentication result.
// ===========================================================================

app.get("/api/aliceblue/callback", async (req, res) => {
    try {
        const authCode = String(
            req.query.authCode ??
            req.query.auth_code ??
            ""
        ).trim();

        const userId = String(
            req.query.userId ?? ""
        ).trim();

        const appCode = String(
            req.query.appcode ??
            req.query.appCode ??
            ""
        ).trim();

        if (!authCode) {
            throw new Error("Alice Blue authCode missing.");
        }

        if (!userId) {
            throw new Error("Alice Blue userId missing.");
        }

        console.log("[ALICEBLUE CALLBACK] Received.", {
            hasUserId: Boolean(userId),
            hasAppCode: Boolean(appCode),
            hasAuthCode: Boolean(authCode)
        });

        const redirectUrl = new URL(
            "/api/aliceblue/callback",
            "https://localhost:3001"
        );

        redirectUrl.searchParams.set("authCode", authCode);
        redirectUrl.searchParams.set("userId", userId);

        if (appCode) {
            redirectUrl.searchParams.set("appcode", appCode);
        }

        const session = await aliceBlueLoginFromRedirectUrl(
            redirectUrl.toString()
        );

        console.log("[ALICEBLUE CALLBACK] Login successful.", {
            hasSession: Boolean(session?.userSession),
            hasClientId: Boolean(session?.clientId)
        });

        return res
            .status(200)
            .type("html")
            .send(`
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Alice Blue Connected</title>
</head>
<body>
    <script>
        (function () {
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        {
                            type: "AJTRADE_BROKER_AUTH",
                            provider: "aliceblue",
                            status: "success"
                        },
                        ${JSON.stringify(AJTRADE_FRONTEND_ORIGIN)}
                    );
                }
            } catch (error) {
                console.error(error);
            }

            setTimeout(function () {
                window.close();
            }, 300);
        })();
    </script>

    <h3>Alice Blue authentication successful.</h3>
    <p>You can close this window.</p>
</body>
</html>
            `);
    } catch (error) {
        console.error(
            "[ALICEBLUE CALLBACK] Authentication failed.",
            {
                httpStatus: error?.response?.status ?? null,
                providerStatus:
                    typeof error?.response?.data?.status === "string"
                        ? error.response.data.status
                        : null,
                responseKeys:
                    error?.response?.data &&
                    typeof error.response.data === "object"
                        ? Object.keys(error.response.data)
                        : [],
                errorType: error?.name ?? "Error"
            }
        );

        return res
            .status(500)
            .type("html")
            .send(`
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Alice Blue Authentication Failed</title>
</head>
<body>
    <h3>Alice Blue authentication failed</h3>
    <p>
        Authentication failed. Return to the trading platform
        and try again.
    </p>

    <script>
        (function () {
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        {
                            type: "AJTRADE_BROKER_AUTH",
                            provider: "aliceblue",
                            status: "error",
                            message: "Alice Blue authentication failed."
                        },
                        ${JSON.stringify(AJTRADE_FRONTEND_ORIGIN)}
                    );
                }
            } catch (error) {}
        })();
    </script>
</body>
</html>
            `);
    }
});

// ===========================================================================
// ALICE BLUE — Session status and logout
// ===========================================================================

app.get("/api/aliceblue/status", (req, res) => {
    try {
        return res.json(getAliceBlueTokenStatus());
    } catch (error) {
        console.error("[ALICEBLUE STATUS]", error);

        return res.status(500).json({
            loggedIn: false,
            status: "server_unavailable",
            message:
                error?.message ??
                "Unable to read Alice Blue session."
        });
    }
});

app.get("/api/aliceblue/logout", (req, res) => {
    try {
        aliceBlueLogout();

        return res.json({
            success: true,
            provider: "aliceblue",
            loggedIn: false
        });
    } catch (error) {
        console.error("[ALICEBLUE LOGOUT]", error);

        return res.status(500).json({
            success: false,
            provider: "aliceblue",
            error:
                error?.message ??
                "Unable to logout Alice Blue."
        });
    }
});

// ===========================================================================
// SYMBOL-MASTER INITIALIZATION AND DAILY REFRESH
//
// These calls initialize each broker's master before HTTPS begins listening.
// The refresh functions register their scheduled background work.
// ===========================================================================

const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Alice Blue symbol master
// ---------------------------------------------------------------------------

try {
    const aliceBlueSymbolStatus = await initializeAliceBlueSymbols({
        downloadIfMissing: true
    });

    startSymbolRefresh();

    console.log(
        "[ALICEBLUE SYMBOLS] Initialized:",
        aliceBlueSymbolStatus
    );
} catch (error) {
    console.error(
        "[ALICEBLUE SYMBOLS] Initialization failed:",
        error?.message ?? error
    );
}

// Start the worker independently of login state. The worker's own logic
// determines whether authenticated synchronization can currently proceed.
startAliceBlueSync();

// ---------------------------------------------------------------------------
// FYERS option/symbol master
// ---------------------------------------------------------------------------

try {
    const fyersSymbolStatus = await initializeFyersSymbolMaster({
        downloadIfMissing: true
    });

    startFyersSymbolRefresh();

    console.log(
        "[FYERS SYMBOL MASTER] Initialized:",
        fyersSymbolStatus
    );
} catch (error) {
    console.error(
        "[FYERS SYMBOL MASTER] Initialization failed:",
        error?.message ?? error
    );
}

// ---------------------------------------------------------------------------
// IndStocks symbol master
// ---------------------------------------------------------------------------

try {
    const indstocksSymbolStatus = await initializeIndstocksSymbols({
        downloadIfMissing: true
    });

    startIndstocksSymbolRefresh();

    console.log(
        "[INDSTOCKS SYMBOLS] Initialized:",
        indstocksSymbolStatus
    );
} catch (error) {
    console.error(
        "[INDSTOCKS SYMBOLS] Initialization failed:",
        error?.message ?? error
    );
}

// ---------------------------------------------------------------------------
// FYERS equity master
// ---------------------------------------------------------------------------

try {
    const fyersEquityStatus = await initializeFyersEquityMaster({
        downloadIfMissing: true
    });

    startFyersEquityRefresh();

    console.log(
        "[FYERS EQUITY MASTER] Initialized:",
        fyersEquityStatus
    );
} catch (error) {
    console.error(
        "[FYERS EQUITY MASTER] Initialization failed:",
        error?.message ?? error
    );
}

// ===========================================================================
// HTTPS CONFIGURATION
// Require the AJ Trade TLS key and certificate before starting the server.
// ===========================================================================

const TLS_KEY = path.resolve(
    process.cwd(),
    "certs",
    "ajtrade-key.pem"
);

const TLS_CERT = path.resolve(
    process.cwd(),
    "certs",
    "ajtrade.pem"
);

if (!fs.existsSync(TLS_KEY)) {
    throw new Error(`[HTTPS] TLS key not found: ${TLS_KEY}`);
}

if (!fs.existsSync(TLS_CERT)) {
    throw new Error(`[HTTPS] TLS certificate not found: ${TLS_CERT}`);
}

const server = https.createServer(
    {
        key: fs.readFileSync(TLS_KEY),
        cert: fs.readFileSync(TLS_CERT)
    },
    app
);

// ===========================================================================
// HTTPS SERVER STARTUP
// Bind to all network interfaces so authorized clients can reach the server.
// ===========================================================================

server.listen(PORT, "0.0.0.0", () => {
    console.log("YAHOO ROUTE LOADED");
    console.log("BINANCE ROUTE LOADED");
    console.log("ZERODHA ROUTE LOADED");
    console.log("FYERS FEED LOADED");
    console.log("ALICE BLUE FEED LOADED");
    console.log("FYERS LOGIN ROUTE LOADED");
    console.log("ALICE BLUE LOGIN ROUTE LOADED");

    console.log(
        "AJ v2 HTTPS Server running on port",
        PORT
    );

    console.log(
        "[HTTPS] Backend:",
        `https://localhost:${PORT}`
    );
});

// ===========================================================================
// WEBSOCKET SERVER
// Attach WebSocket handling to the same HTTPS server.
// Current protocol supports ping/pong health checks.
// ===========================================================================

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
    console.log("[WS] Client Connected");

    socket.on("message", (message) => {
        try {
            const request = JSON.parse(message.toString());

            if (request.action === "ping") {
                socket.send(JSON.stringify({ type: "pong" }));
            }
        } catch {
            // Ignore malformed messages to keep the connection alive.
        }
    });

    socket.on("close", () => {
        console.log("[WS] Client Disconnected");
    });

    socket.on("error", (error) => {
        console.error("[WS ERROR]", error);
    });
});
