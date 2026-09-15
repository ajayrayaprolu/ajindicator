//================================================
// NPM Server INDEX Page .\server\index.js.new2808
//===============================================

import dotenv from "dotenv";

dotenv.config();

console.log("=================================");
console.log("ENV CHECK");
console.log("=================================");
console.log("PORT    :", process.env.PORT);
console.log("=================================");

import express from "express";
import https from "https";
import fs from "fs";
import path from "path";
import cors from "cors";
import axios from "axios";
import { WebSocketServer } from "ws";

import { registerFeed } from "./feeds/FeedRegistry.js";
import feedManager from "./feeds/FeedManager.js";

import { searchSymbols } from "./instruments/SymbolSearch.js";

import {
    initializeInstrumentDatabase
} from "./instruments/InstrumentDatabase.js";

import {
    initializeInstrumentSynchronizer,
    startInstrumentSynchronization
} from "./instruments/InstrumentSynchronizer.js";

import {
    startWebSocket,
    attachWebSocketServer,
    registerClient
} from "./zerodha/websocket.js";

import {
    registerLoginRoutes
} from "./zerodha/login.js";

import {
    registerTokenRoutes
} from "./zerodha/token.js";

import {
    initializeInstrumentCache,
    getAllInstruments,
    instrumentCount
} from "./zerodha/instruments.js";

import {
    getHistoricalData
} from "./zerodha/history.js";

//==========================
// YAHOO import
//==========================
import {
    searchYahooSymbols
} from "./yahoo/YahooSymbolCatalog.js";

import {
    createYahooFeed
} from "./yahoo/YahooFeedAdapter.js";

//============================
// BINANCE import
//============================
import {
    createBinanceFeed
} from "./binance/BinanceFeedAdapter.js";

//============================
// FYERS import
//============================
import {
    createFyersFeed
} from "./fyers/FyersFeed.js";

import {
    generateLoginUrl as generateFyersLoginUrl,
    exchangeAuthCode as exchangeFyersAuthCode,
    getLoginStatus as getFyersLoginStatus,
    logout as fyersLogout
} from "./fyers/login.js";

import {
    getHistory as getFyersHistory
} from "./fyers/history.js";

import {
    resolveFyersSymbol
} from "./fyers/symbols.js";

import {
    initializeFyersSymbolMaster,
	getFyersContractByTicker,
    startFyersSymbolRefresh
} from "./fyers/symbolMaster.js";

import fyersOptionsRouter from "./fyers/optionsRoute.js";

import fyersEquitySearchRouter from "./fyers/equitySearchRoute.js";

import {
    initializeFyersEquityMaster,
    startFyersEquityRefresh
} from "./fyers/equityMaster.js";

//============================
// ALICEBLUE import
//============================

import {
    generateLoginUrl as generateAliceBlueLoginUrl,
    exchangeAuthCode as exchangeAliceBlueAuthCode,
    loginFromRedirectUrl as aliceBlueLoginFromRedirectUrl,
    logout as aliceBlueLogout,
    getLoginStatus as getAliceBlueLoginStatus
} from "./aliceblue/login.js";

import {
    getTokenStatus as getAliceBlueTokenStatus
} from "./aliceblue/token.js";

import {
    createAliceBlueFeed
} from "./aliceblue/AliceBlueFeed.js";

import {
    initializeAliceBlueSymbols,
    getAliceBlueContractBySymbol,
    startSymbolRefresh
} from "./aliceblue/symbols.js";

import aliceBlueOptionsRouter from "./aliceblue/optionsRoute.js";
import aliceBlueEquitySearchRouter from "./aliceblue/equitySearchRoute.js";

import {
    startAliceBlueSync
} from "./aliceblue/syncWorker.js";

//============================
// INDSTOCKS import
//============================

import {
    createIndstocksFeed
} from "./indstocks/INDstocksFeed.js";

import {
    initializeIndstocksSymbols,
    startSymbolRefresh as startIndstocksSymbolRefresh
} from "./indstocks/symbols.js";

import {
    getTokenStatus as getIndstocksTokenStatus
} from "./indstocks/token.js";

import indstocksOptionsRouter from "./indstocks/optionsRoute.js";
import indstocksEquitySearchRouter from "./indstocks/equitySearchRoute.js";

//================================================
const AJTRADE_FRONTEND_ORIGIN =
    "https://ajtrade.in";

const app = express();

app.use(cors());
app.use(express.json());

//============================
// Register feeds
//============================

registerFeed(
    "yahoo",
    createYahooFeed()
);

registerFeed(
    "binance",
    createBinanceFeed()
);

registerFeed(
    "fyers",
    createFyersFeed()
);

registerFeed(
    "aliceblue",
    createAliceBlueFeed()
);

registerFeed(
    "indstocks",
    createIndstocksFeed()
);

await feedManager.setFeed("yahoo");
await feedManager.start();

console.log(
    "[MARKET DATA]",
    feedManager.getStatus()
);

//====================
// Options App use
//====================
app.use(
    "/api/fyers/options",
    fyersOptionsRouter
);

app.use(
    "/api/fyers/symbols",
    fyersEquitySearchRouter
);

app.use(
    "/api/aliceblue/options",
    aliceBlueOptionsRouter
);

app.use(
    "/api/aliceblue/symbols",
    aliceBlueEquitySearchRouter
);


app.use(
    "/api/indstocks/options",
    indstocksOptionsRouter
);

app.use(
    "/api/indstocks/symbols",
    indstocksEquitySearchRouter
);

//=================================

initializeInstrumentDatabase();

await initializeInstrumentSynchronizer();

startInstrumentSynchronization();

registerLoginRoutes(app);
registerTokenRoutes(app);

app.get(
    "/debug",
    (req, res) => {
        res.send("THIS IS MY SERVER FILE");
    }
);

app.get(
    "/health",
    (req, res) => {
        res.json({
            status:
                "AJ Institutional Terminal Running",
            server:
                "online",
            timestamp:
                new Date().toISOString()
        });
    }
);

app.get(
    "/",
    (req, res) => {
        res.json({
            application:
                "AJ Institutional Terminal",
            version:
                "2.0.0"
        });
    }
);

app.get(
    "/api/symbols/search",
    async (req, res) => {
        try {
            const query =
                String(
                    req.query.q ??
                    req.query.query ??
                    ""
                ).trim();

            const limit =
                Math.min(
                    Math.max(
                        Number(
                            req.query.limit ??
                            50
                        ) || 50,
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

            const text =
                query.toUpperCase();

            const numericOnly =
                /^\d+(?:\.\d+)?$/.test(text);

            const hasStrike =
                /\d+(?:\.\d+)?/.test(text);

            const optionText =
                /\b(?:NIFTY|BANKNIFTY)\b/.test(text) &&
                /\b(?:CE|PE)\b/.test(text);

            const optionSearch =
                numericOnly ||
                hasStrike ||
                optionText;

            let results;

            if (optionSearch) {
                const instrumentResults =
                    searchSymbols(
                        text,
                        limit
                    );

                results =
                    instrumentResults.map(
                        row => ({
                            symbol:
                                row.trading_symbol ||
                                row.symbol,

                            yahooSymbol:
                                null,

                            displayName:
                                row.display_name ||
                                row.trading_symbol ||
                                row.symbol,

                            exchange:
                                row.exchange,

                            type:
                                row.instrument_type ||
                                "OPTION",

                            feedSource:
                                row.feed_source ||
                                "NSE",

                            instrumentId:
                                row.id,

                            tradingSymbol:
                                row.trading_symbol,

                            expiry:
                                row.expiry,

                            strike:
                                row.strike,

                            optionType:
                                row.option_type,

                            underlying:
                                row.underlying,

                            tokenIdentifier:
                                row.token_identifier
                        })
                    );
            }
            else {
                results =
                    await searchYahooSymbols(
                        text
                    );
            }

            const limitedResults =
                results.slice(0, limit);

            return res.json({
                success: true,
                query,
                count:
                    limitedResults.length,
                results:
                    limitedResults
            });
        }
        catch (error) {
            console.error(
                "[SYMBOL SEARCH]",
                error
            );

            return res.status(500).json({
                success: false,
                query:
                    String(
                        req.query.q ??
                        req.query.query ??
                        ""
                    ),
                count: 0,
                results: [],
                error:
                    error?.message ||
                    "Symbol search failed"
            });
        }
    }
);

//===============
// YAHOO API get
//===============
app.get(
    "/api/yahoo/:symbol",
    async (req, res) => {
        try {
            const symbol =
                decodeURIComponent(
                    req.params.symbol
                ).toUpperCase();

            const timeframe =
                String(
                    req.query.timeframe ??
                    "1m"
                );

            const feed =
                feedManager.getFeed("yahoo");

            if (!feed) {
                return res.status(500).json({
                    error:
                        "Yahoo feed is not registered."
                });
            }

            const candles =
                await feed.getHistory(
                    symbol,
                    timeframe
                );

            return res.json(candles);
        }
        catch (error) {
            console.error(
                "[YAHOO ERROR]",
                error?.message
            );

            return res.status(
                error?.response?.status ?? 500
            ).json({
                error:
                    "Yahoo fetch failed",
                symbol:
                    req.params.symbol,
                details:
                    error?.message ??
                    "Unknown Yahoo error"
            });
        }
    }
);

//=========================================
app.get(
    "/api/fyers/history",
    async (req, res) => {
        try {
            const symbol =
                String(
                    req.query.symbol ??
                    ""
                ).trim();

            const timeframe =
                String(
                    req.query.timeframe ??
                    "1m"
                ).trim();

            if (!symbol) {
                return res.status(400).json({
                    ok: false,
                    error:
                        "[FYERS HISTORY] Symbol is required."
                });
            }

            const fyersSymbol =
                resolveFyersSymbol(symbol);

            //--------------------------------------------------
            // VALIDATE OPTION CONTRACTS AGAINST THE LIVE MASTER
            //
            // A native FYERS option symbol (ends CE/PE) that
            // isn't in today's downloaded master is either a
            // typo or an expired/non-existent strike - fail
            // with a clear reason instead of forwarding a bad
            // symbol to FYERS and getting back a bare 422.
            //--------------------------------------------------

            if (/(CE|PE)$/.test(fyersSymbol)) {

                const knownContract =
                    getFyersContractByTicker(fyersSymbol);

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

            const candles =
                await getFyersHistory(
                    fyersSymbol,
                    timeframe
                );

            return res.json({
                ok: true,
                candles:
                    Array.isArray(candles)
                        ? candles
                        : []
            });
        }
		
        catch (error) {
            console.error(
                "[FYERS HISTORY ROUTE] FAILED",
                {
                    message:
                        error?.message,
                    stack:
                        error?.stack,
                    reason:
                        error?.fyersReason
                }
            );

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
                reason:
                    error?.fyersReason ?? "UNKNOWN",
                error:
                    error?.message ??
                    "FYERS history failed.",
                candles: []
            });
        }
    }
);

//====================================================
app.get(
    "/api/aliceblue/history",
    async (req, res) => {
        try {
            const symbol =
                decodeURIComponent(
                    String(
                        req.query.symbol ??
                        ""
                    )
                ).trim();

            const timeframe =
                String(
                    req.query.timeframe ??
                    "1m"
                );

            if (!symbol) {
                return res.status(400).json({
                    error:
                        "Alice Blue symbol is required."
                });
            }

            const feed =
                feedManager.getFeed(
                    "aliceblue"
                );

            if (!feed) {
                return res.status(500).json({
                    error:
                        "Alice Blue feed is not registered."
                });
            }

            if (
                typeof feed.getHistory !==
                "function"
            ) {
                return res.status(500).json({
                    error:
                        "Alice Blue feed does not support getHistory()."
                });
            }

            let aliceBlueSymbol =
                String(
                    symbol ?? ""
                )
                    .trim()
                    .toUpperCase();

            if (!aliceBlueSymbol) {
                return res.status(400).json({
                    error:
                        "Alice Blue history requires a symbol."
                });
            }

            if (
                aliceBlueSymbol.includes("|")
            ) {
                const parts =
                    aliceBlueSymbol.split("|");

                const exchange =
                    String(
                        parts[0] ?? ""
                    )
                        .trim()
                        .toUpperCase();

                const token =
                    String(
                        parts[1] ?? ""
                    ).trim();

                if (
                    !exchange ||
                    !token
                ) {
                    return res.status(400).json({
                        error:
                            "Invalid Alice Blue instrument. Expected EXCHANGE|TOKEN."
                    });
                }

                aliceBlueSymbol =
                    `${exchange}|${token}`;
            }
            else {
                const resolver =
                    feed.resolveInstrument;

                if (
                    typeof resolver !==
                    "function"
                ) {
                    return res.status(500).json({
                        error:
                            "Alice Blue feed does not expose resolveInstrument()."
                    });
                }

                const resolved =
                    resolver(
                        aliceBlueSymbol
                    );

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
                    `${String(
                        resolved.exchange
                    ).toUpperCase()}|${String(
                        resolved.token
                    )}`;
            }

            if (
                aliceBlueSymbol.includes("|")
            ) {
                const parts =
                    aliceBlueSymbol.split("|");

                const exchange =
                    String(
                        parts[0] ?? ""
                    )
                        .trim()
                        .toUpperCase();

                const token =
                    String(
                        parts[1] ?? ""
                    ).trim();

                if (
                    !exchange ||
                    !token
                ) {
                    return res.status(400).json({
                        error:
                            "Invalid Alice Blue symbol. Expected EXCHANGE|TOKEN.",
                        symbol:
                            aliceBlueSymbol
                    });
                }

                aliceBlueSymbol =
                    `${exchange}|${token}`;
            }
            else {
                const requestedExchange =
                    String(
                        req.query.exchange ??
                        ""
                    )
                        .trim()
                        .toUpperCase();

                const normalizedSymbol =
                    String(
                        aliceBlueSymbol ?? ""
                    )
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

                const contract =
                    getAliceBlueContractBySymbol(
                        aliceBlueSymbol,
                        exchange
                    );

                if (!contract) {
                    console.error(
                        "[ALICEBLUE HISTORY] CONTRACT NOT FOUND:",
                        {
                            requested:
                                aliceBlueSymbol,
                            exchange,
                            symbolMaster:
                                "NOT LOADED"
                        }
                    );

                    return res.status(404).json({
                        error:
                            "Alice Blue symbol could not be resolved.",
                        symbol:
                            aliceBlueSymbol,
                        exchange
                    });
                }

                aliceBlueSymbol =
                    `${contract.exchange}|${contract.token}`;
            }

            const result =
                await feed.getHistory(
                    aliceBlueSymbol,
                    timeframe
                );

            //--------------------------------------------------
            // getHistory() now returns { candles, freshness }.
            // Kept tolerant of a bare-array return too, so this
            // route never breaks if getHistory's shape changes
            // again later.
            //--------------------------------------------------

            const candles =
                Array.isArray(result)
                    ? result
                    : (Array.isArray(result?.candles) ? result.candles : []);

            const freshness =
                Array.isArray(result)
                    ? null
                    : (result?.freshness ?? null);

            return res.json({
                candles,
                freshness
            });
        }
		
        catch (error) {
            console.error(
                "[ALICEBLUE HISTORY ROUTE] ERROR",
                {
                    message:
                        error?.message,
                    stack:
                        error?.stack,
                    response:
                        error?.response?.data,
                    reason:
                        error?.aliceBlueReason
                }
            );

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
                error:
                    "Alice Blue historical data request failed.",
                reason:
                    error?.aliceBlueReason ?? "UNKNOWN",
                details:
                    error?.message ??
                    "Unknown Alice Blue history error."
            });
        }
    }
);

//=======================
// INDSTOCKS API get
//=======================

app.get(
    "/api/indstocks/status",
    (req, res) => {
        try {
            const status = getIndstocksTokenStatus();
            res.json({
                loggedIn: status.hasToken,
                status: status.hasToken ? "connected" : "login_required",
                message:
                    status.hasToken
                        ? `Token valid, ${status.minutesRemaining}m remaining.`
                        : "No active IndStocks token yet.",
                ...status
            });
        }
        catch (error) {
            console.error("[INDSTOCKS STATUS]", error);
            res.status(500).json({
                loggedIn: false,
                status: "server_unavailable",
                message: error?.message ?? "Unable to read IndStocks token status."
            });
        }
    }
);

app.get(
    "/api/indstocks/history",
    async (req, res) => {
        try {
            const symbol =
                decodeURIComponent(String(req.query.symbol ?? "")).trim();

            const timeframe =
                String(req.query.timeframe ?? "1m");

            if (!symbol) {
                return res.status(400).json({
                    error: "IndStocks symbol is required."
                });
            }

            const feed =
                feedManager.getFeed("indstocks");

            if (!feed) {
                return res.status(500).json({
                    error: "IndStocks feed is not registered."
                });
            }

            const candles =
                await feed.getHistory(symbol, timeframe);

            return res.json({
                candles: Array.isArray(candles) ? candles : []
            });

        }
        catch (error) {

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
                details: error?.message ?? "Unknown IndStocks history error."
            });

        }
    }
);

//======================================
app.get(
    "/api/zerodha/instruments",
    (req, res) => {
        try {
            res.json({
                success: true,
                count:
                    instrumentCount(),
                instruments:
                    getAllInstruments()
            });
        }
        catch (error) {
            console.error(
                "[ZERODHA INSTRUMENTS]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);

//=================
// ZERODHA API get
//=================
app.get(
    "/api/zerodha/history/:symbol",
    async (req, res) => {
        try {
            const symbol =
                decodeURIComponent(
                    req.params.symbol
                ).toUpperCase();

            const timeframe =
                req.query.timeframe ||
                "1minute";

            const candles =
                await getHistoricalData(
                    symbol,
                    timeframe
                );

            res.json(candles);
        }
        catch (error) {
            console.error(
                "[ZERODHA HISTORY]",
                error
            );

            res.status(500).json({
                error:
                    "Unable to fetch Zerodha history",
                details:
                    error.message
            });
        }
    }
);

//=====================
// Binance API get
//=====================

app.get(
    "/api/binance/:symbol",
    async (req, res) => {

        try {

            //==================================
            // SYMBOL
            //==================================

            const symbol =
                String(
                    req.params.symbol ?? ""
                )
                    .trim()
                    .toUpperCase()
                    .replace(
                        /[^A-Z0-9]/g,
                        ""
                    );


            //==================================
            // TIMEFRAME
            //==================================

            const interval =
                String(
                    req.query.timeframe ??
                    req.query.interval ??
                    "1m"
                );


            //==================================
            // MARKET
            //
            // Default = spot
            //
            // Supported:
            //   spot
            //   futures
            //==================================

            const requestedMarket =
                String(
                    req.query.market ??
                    "spot"
                )
                    .trim()
                    .toLowerCase();


            const market =
                (
                    requestedMarket ===
                    "futures" ||

                    requestedMarket ===
                    "future" ||

                    requestedMarket ===
                    "usdm" ||

                    requestedMarket ===
                    "usd-m"
                )
                    ? "futures"
                    : "spot";


            //==================================
            // VALIDATE SYMBOL
            //==================================

            if (!symbol) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Binance symbol is required."
                    });
            }


            //==================================
            // VALIDATE INTERVAL
            //==================================

            const allowedIntervals =
                new Set([

                    "1m",
                    "3m",
                    "5m",
                    "15m",
                    "30m",

                    "1h",
                    "2h",
                    "4h",
                    "6h",
                    "8h",
                    "12h",

                    "1d",
                    "3d",

                    "1w",

                    "1M"
                ]);


            const resolvedInterval =
                allowedIntervals.has(
                    interval
                )
                    ? interval
                    : "1m";


            //==================================
            // BINANCE ENDPOINT
            //==================================

            const apiBase =
                market === "futures"

                    ? "https://fapi.binance.com"

                    : "https://api.binance.com";


            const endpoint =
                market === "futures"

                    ? "/fapi/v1/klines"

                    : "/api/v3/klines";


            console.log(
                `[BINANCE API] ` +
                `${market.toUpperCase()} ` +
                `${symbol} ` +
                `${resolvedInterval}`
            );


            //==================================
            // REQUEST
            //==================================

            const response =
                await axios.get(

                    `${apiBase}${endpoint}`,

                    {

                        timeout:
                            10000,

                        params: {

                            symbol,

                            interval:
                                resolvedInterval,

                            limit:
                                1000
                        }
                    }
                );


            //==================================
            // RESPONSE
            //==================================

            return res.json(

                Array.isArray(
                    response.data
                )
                    ? response.data
                    : []
            );


        } catch (error) {

            console.error(

                "[BINANCE ERROR]",

                {

                    symbol:
                        req.params?.symbol,

                    market:
                        req.query?.market ??
                        "spot",

                    timeframe:
                        req.query?.timeframe ??
                        req.query?.interval ??
                        "1m",

                    status:
                        error?.response?.status,

                    data:
                        error?.response?.data,

                    message:
                        error?.message
                }
            );


            return res
                .status(
                    error?.response?.status ??
                    500
                )
                .json({

                    error:
                        error?.response?.data ??
                        error?.message ??
                        "Binance fetch failed"
                });
        }

    }
);

//======================
// Fyers API get
//======================

app.get(
    "/api/fyers/login",
    (req, res) => {
        try {
            const url =
                generateFyersLoginUrl();

            console.log(
                "[FYERS LOGIN] Redirecting."
            );

            res.redirect(url);
        }
        catch (error) {
            console.error(
                "[FYERS LOGIN]",
                error
            );

            res.status(500).json({
                ok: false,
                provider: "fyers",
                error:
                    error?.message ??
                    "Unable to generate FYERS login URL."
            });
        }
    }
);

app.get(
    "/api/fyers/callback",
    async (req, res) => {
        try {
            const authCode =
                req.query.auth_code ??
                req.query.authCode ??
                req.query.code;

            if (!authCode) {
                throw new Error(
                    "FYERS authorization code missing."
                );
            }

            console.log(
                "[FYERS CALLBACK] Authorization code received."
            );

            const session =
                await exchangeFyersAuthCode(
                    String(authCode)
                );

            console.log(
                "[FYERS CALLBACK] Authentication successful.",
                {
                    hasAccessToken:
                        Boolean(
                            session?.accessToken
                        )
                }
            );

            res
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
        if (
            window.opener &&
            !window.opener.closed
        ) {
            window.opener.postMessage(
                {
                    type: "AJTRADE_BROKER_AUTH",
                    provider: "fyers",
                    status: "success"
                },
                AJTRADE_FRONTEND_ORIGIN
            );
        }
    }
    catch (e) {
        console.error(e);
    }

    setTimeout(
        function () {
            window.close();
        },
        300
    );
})();
</script>
<p>FYERS connected. This window can be closed.</p>
</body>
</html>
                `);
        }
        catch (error) {
            console.error(
                "[FYERS CALLBACK] FAILED:",
                {
                    message:
                        error?.message,
                    status:
                        error?.response?.status,
                    response:
                        error?.response?.data
                }
            );

            res
                .status(500)
                .type("html")
                .send(`
<!doctype html>
<html>
<body>
<script>
(function () {
    try {
        if (
            window.opener &&
            !window.opener.closed
        ) {
            window.opener.postMessage(
                {
                    type: "AJTRADE_BROKER_AUTH",
                    provider: "fyers",
                    status: "error",
                    message:
                        ${JSON.stringify(
                            error?.message ??
                            "FYERS authentication failed."
                        )}
                },
                AJTRADE_FRONTEND_ORIGIN
            );
        }
    }
    catch (e) {}
})();
</script>
<h3>FYERS authentication failed</h3>
<pre>${String(
    error?.message ??
    "Unknown error"
)}</pre>
</body>
</html>
                `);
        }
    }
);

//=======================
// FYERS API get
//=======================

app.get(
    "/api/fyers/status",
    (req, res) => {
        try {
            res.json(
                getFyersLoginStatus()
            );
        }
        catch (error) {
            console.error(
                "[FYERS STATUS]",
                error
            );

            res.status(500).json({
                loggedIn: false,
                status:
                    "server_unavailable",
                message:
                    error?.message ??
                    "Unable to read FYERS session."
            });
        }
    }
);

app.post(
    "/api/fyers/logout",
    (req, res) => {
        try {
            fyersLogout();

            res.json({
                ok: true,
                provider: "fyers",
                loggedIn: false
            });
        }
        catch (error) {
            console.error(
                "[FYERS LOGOUT]",
                error
            );

            res.status(500).json({
                ok: false,
                provider: "fyers",
                error:
                    error?.message ??
                    "Unable to logout FYERS."
            });
        }
    }
);

//=======================
// ALICEBLUE API get
//=======================
app.get(
    "/api/aliceblue/login",
    (req, res) => {
        try {
            const loginUrl =
                generateAliceBlueLoginUrl();

            console.log(
                "[ALICEBLUE LOGIN] Redirecting."
            );

            res.redirect(loginUrl);
        }
        catch (error) {
            console.error(
                "[ALICEBLUE LOGIN]",
                error
            );

            res.status(500).json({
                ok: false,
                provider: "aliceblue",
                error:
                    error?.message ??
                    "Unable to generate Alice Blue login URL."
            });
        }
    }
);

app.get(
    "/api/aliceblue/callback",
    async (req, res) => {
        try {
            const authCode =
                String(
                    req.query.authCode ??
                    req.query.auth_code ??
                    ""
                ).trim();

            const userId =
                String(
                    req.query.userId ??
                    ""
                ).trim();

            const appCode =
                String(
                    req.query.appcode ??
                    req.query.appCode ??
                    ""
                ).trim();

            if (!authCode) {
                throw new Error(
                    "Alice Blue authCode missing."
                );
            }

            if (!userId) {
                throw new Error(
                    "Alice Blue userId missing."
                );
            }

            console.log(
                "[ALICEBLUE CALLBACK] Received:",
                {
                    userId,
                    appCode:
                        appCode || null,
                    hasAuthCode:
                        Boolean(authCode)
                }
            );

            const redirectUrl =
                new URL(
                    "/api/aliceblue/callback",
                    "https://localhost:3001"
                );

            redirectUrl.searchParams.set(
                "authCode",
                authCode
            );

            redirectUrl.searchParams.set(
                "userId",
                userId
            );

            if (appCode) {
                redirectUrl.searchParams.set(
                    "appcode",
                    appCode
                );
            }

            const session =
                await aliceBlueLoginFromRedirectUrl(
                    redirectUrl.toString()
                );

            console.log(
                "[ALICEBLUE CALLBACK] Login successful:",
                {
                    userId:
                        session?.userId,
                    clientId:
                        session?.clientId,
                    hasSession:
                        Boolean(
                            session?.userSession
                        )
                }
            );

            res
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
        if (
            window.opener &&
            !window.opener.closed
        ) {
            window.opener.postMessage(
                {
                    type:
                        "AJTRADE_BROKER_AUTH",
                    provider:
                        "aliceblue",
                    status:
                        "success"
                },
                AJTRADE_FRONTEND_ORIGIN
            );
        }
    }
    catch (e) {
        console.error(e);
    }

    setTimeout(
        function () {
            window.close();
        },
        300
    );
})();
</script>
<h3>Alice Blue authentication successful.</h3>
<p>You can close this window.</p>
</body>
</html>
                `);
        }
        catch (error) {
            console.error(
                "[ALICEBLUE CALLBACK] Authentication failed:",
                {
                    message:
                        error?.message,
                    response:
                        error?.response?.data,
                    status:
                        error?.response?.status
                }
            );

            res
                .status(500)
                .type("html")
                .send(`
<!doctype html>
<html>
<body>
<h3>Alice Blue authentication failed</h3>
<pre>${String(
    error?.message ??
    error
)}</pre>
<script>
(function () {
    try {
        if (
            window.opener &&
            !window.opener.closed
        ) {
            window.opener.postMessage(
                {
                    type:
                        "AJTRADE_BROKER_AUTH",
                    provider:
                        "aliceblue",
                    status:
                        "error",
                    message:
                        ${JSON.stringify(
                            error?.message ??
                            "Alice Blue authentication failed."
                        )}
                },
                AJTRADE_FRONTEND_ORIGIN
            );
        }
    }
    catch (e) {}
})();
</script>
</body>
</html>
                `);
        }
    }
);

//=======================
// ALICEBLUE API get
//=======================

app.get(
    "/api/aliceblue/status",
    (req, res) => {
        try {
            res.json(
                getAliceBlueTokenStatus()
            );
        }
        catch (error) {
            console.error(
                "[ALICEBLUE STATUS]",
                error
            );

            res.status(500).json({
                loggedIn: false,
                status:
                    "server_unavailable",
                message:
                    error?.message ??
                    "Unable to read Alice Blue session."
            });
        }
    }
);

app.get(
    "/api/aliceblue/logout",
    (req, res) => {
        try {
            aliceBlueLogout();

            res.json({
                success: true,
                provider: "aliceblue",
                loggedIn: false
            });
        }
        catch (error) {
            console.error(
                "[ALICEBLUE LOGOUT]",
                error
            );

            res.status(500).json({
                success: false,
                provider: "aliceblue",
                error:
                    error?.message ??
                    "Unable to logout Alice Blue."
            });
        }
    }
);

const PORT =
    process.env.PORT ||
    3001;

try {
    const aliceBlueSymbolStatus =
        await initializeAliceBlueSymbols({
            downloadIfMissing: true
        });

    startSymbolRefresh();

    console.log(
        "[ALICEBLUE SYMBOLS] Initialized:",
        aliceBlueSymbolStatus
    );
}
catch (error) {
    console.error(
        "[ALICEBLUE SYMBOLS] Initialization failed:",
        error?.message ??
        error
    );
}

//--------------------------------------------------
// ALICEBLUE BACKGROUND SYNC WORKER
//
// Started unconditionally at boot, independent of
// login state - fetchAndCacheLive() no-ops safely
// (returns null, logs, moves on) until a session
// exists. Once the user logs in, the very next
// interval starts keeping the store warm with no
// further action needed.
//--------------------------------------------------

startAliceBlueSync();

try {
    const fyersSymbolStatus =
        await initializeFyersSymbolMaster({
            downloadIfMissing: true
        });

    startFyersSymbolRefresh();

    console.log(
        "[FYERS SYMBOL MASTER] Initialized:",
        fyersSymbolStatus
    );
}

catch (error) {
    console.error(
        "[FYERS SYMBOL MASTER] Initialization failed:",
        error?.message ??
        error
    );
}

try {
    const indstocksSymbolStatus =
        await initializeIndstocksSymbols({
            downloadIfMissing: true
        });

    startIndstocksSymbolRefresh();

    console.log(
        "[INDSTOCKS SYMBOLS] Initialized:",
        indstocksSymbolStatus
    );
}
catch (error) {
    console.error(
        "[INDSTOCKS SYMBOLS] Initialization failed:",
        error?.message ??
        error
    );
}

try {
    const fyersEquityStatus =
        await initializeFyersEquityMaster({
            downloadIfMissing: true
        });

    startFyersEquityRefresh();

    console.log(
        "[FYERS EQUITY MASTER] Initialized:",
        fyersEquityStatus
    );
}

catch (error) {
    console.error(
        "[FYERS EQUITY MASTER] Initialization failed:",
        error?.message ??
        error
    );
}

const TLS_KEY =
    path.resolve(
        process.cwd(),
        "certs",
        "ajtrade-key.pem"
    );

const TLS_CERT =
    path.resolve(
        process.cwd(),
        "certs",
        "ajtrade.pem"
    );

if (!fs.existsSync(TLS_KEY)) {
    throw new Error(
        `[HTTPS] TLS key not found: ${TLS_KEY}`
    );
}

if (!fs.existsSync(TLS_CERT)) {
    throw new Error(
        `[HTTPS] TLS certificate not found: ${TLS_CERT}`
    );
}

const server =
    https.createServer(
        {
            key:
                fs.readFileSync(
                    TLS_KEY
                ),

            cert:
                fs.readFileSync(
                    TLS_CERT
                )
        },

        app
    );

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "YAHOO ROUTE LOADED"
        );

        console.log(
            "BINANCE ROUTE LOADED"
        );

        console.log(
            "ZERODHA ROUTE LOADED"
        );

        console.log(
            "FYERS FEED LOADED"
        );

        console.log(
            "ALICE BLUE FEED LOADED"
        );

        console.log(
            "FYERS LOGIN ROUTE LOADED"
        );

        console.log(
            "ALICE BLUE LOGIN ROUTE LOADED"
        );

        console.log(
            "AJ v2 HTTPS Server running on port",
            PORT
        );

        console.log(
            "[HTTPS] Backend:",
            `https://localhost:${PORT}`
        );
    }
);

const wss =
    new WebSocketServer({
        server
    });

attachWebSocketServer(wss);

wss.on(
    "connection",
    socket => {
        console.log(
            "[WS] Client Connected"
        );

        registerClient(socket);

        socket.on(
            "message",
            message => {
                try {
                    const request =
                        JSON.parse(
                            message.toString()
                        );

                    if (
                        request.action ===
                        "ping"
                    ) {
                        socket.send(
                            JSON.stringify({
                                type: "pong"
                            })
                        );
                    }
                }
                catch {
                }
            }
        );

        socket.on(
            "close",
            () => {
                console.log(
                    "[WS] Client Disconnected"
                );
            }
        );

        socket.on(
            "error",
            error => {
                console.error(
                    "[WS ERROR]",
                    error
                );
            }
        );
    }
);

console.log();
console.log(
    "[ZERODHA] Waiting for user login..."
);
console.log("Open:");
console.log(
    "https://localhost:3001/api/zerodha/login"
);
console.log();
