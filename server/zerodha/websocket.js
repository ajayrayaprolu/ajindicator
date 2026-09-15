//======================================================
// server/zerodha/websocket.js
//======================================================
//
// AJ Institutional Terminal
//
// Zerodha Live Market Data
//
// Phase 6
// Part 1
//
// Responsibilities
//
// • KiteTicker initialization
// • Authentication
// • Singleton ticker
// • Client registry
// • Instrument registry
// • Startup
//
//======================================================

import { KiteTicker } from "kiteconnect";

import {

    getApiKey,

    getAccessToken,

    isLoggedIn

} from "./token.js";

//------------------------------------------------------
// WEBSOCKET SERVER
//------------------------------------------------------

let websocketServer = null;

//------------------------------------------------------
// KITE TICKER
//------------------------------------------------------

let ticker = null;

//------------------------------------------------------
// STATE
//------------------------------------------------------

let connected = false;

let connecting = false;

//------------------------------------------------------
// CLIENTS
//------------------------------------------------------

const clients =
    new Set();

//------------------------------------------------------
// SUBSCRIPTIONS
//------------------------------------------------------

const subscriptions =
    new Map();

/*

Map

instrumentToken

↓

{

    symbol,

    exchange,

    mode

}

*/

//------------------------------------------------------
// LATEST TICKS
//------------------------------------------------------

const latestTicks =
    new Map();

//------------------------------------------------------
// INTERNAL TICK LISTENERS
//------------------------------------------------------

const tickListeners =
    new Set();
	
/*
Map
instrumentToken
↓
Latest Tick
*/

//------------------------------------------------------
// INITIALIZE
//------------------------------------------------------

export function initializeTicker() {

    //--------------------------------------------------
    // ALREADY INITIALIZED
    //--------------------------------------------------

    if (ticker) {
        return ticker;
    }

    //--------------------------------------------------
    // LOGIN CHECK
    //--------------------------------------------------

    if (!isLoggedIn()) {
        throw new Error(
            "Zerodha session not available."
        );
    }

    //--------------------------------------------------
    // CREATE TICKER
    //--------------------------------------------------

    ticker = new KiteTicker({
        api_key:
            getApiKey(),
        access_token:
            getAccessToken()
    });

    console.log();
    console.log(
        "======================================"
    );

    console.log(
        "ZERODHA KITE TICKER"
    );

    console.log(
        "======================================"
    );

    console.log(
        "Connected :",
        connected
    );

    console.log(
        "======================================"
    );

    console.log();

    return ticker;

}

//------------------------------------------------------
// START
//------------------------------------------------------

export function startTicker() {

    if (connecting) {
        return;
    }

    if (!ticker) {
        initializeTicker();
    }

    connecting = true;
	
    console.log(
        "[ZERODHA]",
        "Connecting KiteTicker..."
    );

    ticker.connect();

}

//------------------------------------------------------
// STOP
//------------------------------------------------------

export function stopTicker() {

    if (!ticker) {
        return;
    }

    console.log(
        "[ZERODHA]",
        "Disconnecting KiteTicker..."
    );

    ticker.disconnect();

}

//------------------------------------------------------
// STATUS
//------------------------------------------------------

export function isConnected() {
    return connected;

}

//------------------------------------------------------
// EXPORTS
//------------------------------------------------------

export {
    ticker,
    clients,
    subscriptions,
    latestTicks,
    websocketServer

};

//The next part will wire the official SDK events
//This completes Part 2: ✅ connect ✅ automatic re-subscription after reconnect ✅ reconnect ✅ disconnect ✅ close ✅ error ✅ order_update
//✅ message ✅ exported registerTickerEvents()using the actual KiteTicker event model. 
//------------------------------------------------------
// CONNECTION EVENTS
//------------------------------------------------------

function registerConnectionEvents() {

    if (!ticker) {

        throw new Error(
            "KiteTicker not initialized."
        );

    }

    //--------------------------------------------------
    // CONNECT
    //--------------------------------------------------

    ticker.on(
        "connect",

        () => {

            connected = true;

            connecting = false;

            console.log();

            console.log(
                "======================================"
            );

            console.log(
                "ZERODHA CONNECTED"
            );

            console.log(
                "======================================"
            );

            console.log(
                "Subscriptions :",
                subscriptions.size
            );

            console.log(
                "Clients :",
                clients.size
            );

            console.log(
                "======================================"
            );

            console.log();

            //--------------------------------------------------
            // RESUBSCRIBE
            //--------------------------------------------------

            const tokens =
                Array.from(
                    subscriptions.keys()
                );

            if (tokens.length > 0) {

                ticker.subscribe(
                    tokens
                );

                ticker.setMode(

                    ticker.modeFull,

                    tokens

                );

                console.log(

                    "[ZERODHA]",

                    "Resubscribed",

                    tokens.length,

                    "instrument(s)."

                );

            }

        }

    );

    //--------------------------------------------------
    // RECONNECT
    //--------------------------------------------------

    ticker.on(

        "reconnect",

        (

            reconnectCount,

            reconnectInterval

        ) => {

            connected = false;

            console.warn(

                "[ZERODHA]",

                "Reconnect",

                reconnectCount,

                "Interval:",

                reconnectInterval

            );

        }

    );

    //--------------------------------------------------
    // DISCONNECT
    //--------------------------------------------------

    ticker.on(

        "disconnect",

        (error) => {

            connected = false;

            connecting = false;

            console.error();

            console.error(
                "======================================"
            );

            console.error(
                "ZERODHA DISCONNECTED"
            );

            console.error(
                "======================================"
            );

            console.error(
                error
            );

            console.error(
                "======================================"
            );

            console.error();

        }

    );

    //--------------------------------------------------
    // CLOSE
    //--------------------------------------------------

    ticker.on(

        "close",

        (reason) => {

            connected = false;

            connecting = false;

            console.warn();

            console.warn(
                "======================================"
            );

            console.warn(
                "ZERODHA SOCKET CLOSED"
            );

            console.warn(
                "======================================"
            );

            console.warn(
                "Reason:",
                reason
            );

            console.warn(
                "======================================"
            );

            console.warn();

        }

    );

    //--------------------------------------------------
    // ERROR
    //--------------------------------------------------

    ticker.on(

        "error",

        (error) => {

            console.error();

            console.error(
                "======================================"
            );

            console.error(
                "ZERODHA SOCKET ERROR"
            );

            console.error(
                "======================================"
            );

            console.error(
                error
            );

            console.error(
                "======================================"
            );

            console.error();

        }

    );

    //--------------------------------------------------
    // ORDER UPDATE
    //--------------------------------------------------

    ticker.on(

        "order_update",

        (order) => {

            console.log(

                "[ZERODHA ORDER UPDATE]",

                order

            );

        }

    );

    //--------------------------------------------------
    // MESSAGE
    //--------------------------------------------------

    ticker.on(

        "message",

        (message) => {

            console.debug(

                "[ZERODHA MESSAGE]",

                message

            );

        }

    );

}

//------------------------------------------------------
// REGISTER EVENTS
//------------------------------------------------------

export function registerTickerEvents() {

    if (!ticker) {

        throw new Error(
            "KiteTicker not initialized."
        );

    }

    registerConnectionEvents();

    registerTickEvents();

}

//The next part (Part 3) will implement the core market data flow:
// ✅ ticker.on("ticks") using the official KiteTicker SDK, ✅ Normalizes Zerodha Tick objects into a consistent internal structure.
// ✅ Caches the latest tick in latestTicks. ✅ Broadcasts normalized ticks to every connected frontend WebSocket client.
// ✅ Keeps the raw SDK tick (raw) available for future features such as market depth, VWAP, OI, etc.
//------------------------------------------------------
// TICK NORMALIZATION
//------------------------------------------------------

function normalizeTick(tick) {

    const subscription =
        subscriptions.get(
            tick.instrument_token
        );

    const timestamp =
        tick.exchange_timestamp
            ? new Date(
                tick.exchange_timestamp
            ).getTime()
            : Date.now();

    return {

        //--------------------------------------------------
        // SYMBOL / PROVIDER
        //--------------------------------------------------

        symbol:
            subscription?.symbol ?? "",

        exchange:
            subscription?.exchange ?? "NSE",

        feedSource:
            "zerodha",

        provider:
            "zerodha",

        //--------------------------------------------------
        // INSTRUMENT
        //--------------------------------------------------

        instrumentToken:
            tick.instrument_token,

        tradable:
            tick.tradable,

        mode:
            tick.mode,

        //--------------------------------------------------
        // PRICE
        //--------------------------------------------------

        ltp:
            tick.last_price,

        open:
            tick.ohlc?.open,

        high:
            tick.ohlc?.high,

        low:
            tick.ohlc?.low,

        close:
            tick.ohlc?.close,

        //--------------------------------------------------
        // VOLUME
        //--------------------------------------------------

        volume:
            tick.volume_traded ?? 0,

        averagePrice:
            tick.average_traded_price ?? 0,

        //--------------------------------------------------
        // MARKET DEPTH
        //--------------------------------------------------

        buyQuantity:
            tick.buy_quantity ?? 0,

        sellQuantity:
            tick.sell_quantity ?? 0,

        lastQuantity:
            tick.last_quantity ?? 0,

        //--------------------------------------------------
        // OI
        //--------------------------------------------------

        oi:
            tick.oi ?? 0,

        oiHigh:
            tick.oi_day_high ?? 0,

        oiLow:
            tick.oi_day_low ?? 0,

        //--------------------------------------------------
        // META
        //--------------------------------------------------

        timestamp,

        raw:
            tick

    };

}

//------------------------------------------------------
// INTERNAL TICK LISTENER
//------------------------------------------------------

export function onTick(listener) {

    if (
        typeof listener !==
        "function"
    ) {

        throw new Error(
            "[ZERODHA] Tick listener must be a function."
        );

    }

    tickListeners.add(
        listener
    );

    return () => {

        tickListeners.delete(
            listener
        );

    };

}

//------------------------------------------------------
// BROADCAST
//------------------------------------------------------

function broadcastTick(data) {

    if (
        !websocketServer
    ) {

        return;

    }

    const payload =
        JSON.stringify({

            type: "tick",

            provider:
                "zerodha",

            data

        });

    clients.forEach(

        client => {

            try {

                if (
                    client.readyState === 1
                ) {

                    client.send(
                        payload
                    );

                }

            }

            catch (err) {

                console.error(

                    "[ZERODHA WS]",

                    err.message

                );

            }

        }

    );

}

//------------------------------------------------------
// TICK EVENT
//------------------------------------------------------

function registerTickEvents() {

    if (!ticker) {

        throw new Error(
            "KiteTicker not initialized."
        );

    }

    ticker.on(

        "ticks",

        ticks => {

            if (
                !Array.isArray(ticks) ||
                ticks.length === 0
            ) {

                return;

            }

            for (
                const tick
                of ticks
            ) {

                const normalized =
                    normalizeTick(
                        tick
                    );

                //--------------------------------------------------
                // CACHE
                //--------------------------------------------------

                latestTicks.set(

                    normalized.instrumentToken,

                    normalized

                );

                //--------------------------------------------------
                // INTERNAL FEED PATH
                //
                // FeedManager / Candle Engine consumes this.
                //--------------------------------------------------

                for (
                    const listener
                    of tickListeners
                ) {

                    try {

                        listener(
                            normalized
                        );

                    }

                    catch (error) {

                        console.error(

                            "[ZERODHA] Internal tick listener error:",

                            error?.message ??
                            error

                        );

                    }

                }

                //--------------------------------------------------
                // FRONTEND WEBSOCKET
                //
                // Existing behaviour preserved.
                //--------------------------------------------------

                broadcastTick(
                    normalized
                );

            }

            console.log(

                "[ZERODHA TICKS]",

                ticks.length,

                "Latest:",

                ticks[
                    ticks.length - 1
                ].instrument_token

            );

        }

    );

}

//------------------------------------------------------
// INITIALIZE EVENTS
//------------------------------------------------------

export function initializeWebSocket() {

    registerTickerEvents();

}

// The final Part 4 will complete the subsystem by adding:
// subscribe(), unsubscribe(), subscription bookkeeping, WebSocket server attachment (attachWebSocketServer())
//graceful shutdown, exports, runtime diagnostics This will complete the institutional-grade Zerodha WebSocket layer while continuing to rely entirely on the //official kiteconnect SDK.
//------------------------------------------------------
// SUBSCRIBE
//------------------------------------------------------

export function subscribe(

    instrumentToken,

    symbol = "",

    exchange = "NSE"

) {

    if (!ticker) {

        throw new Error(

            "Ticker not initialized."

        );

    }

    //--------------------------------------------------
    // CACHE
    //--------------------------------------------------

    subscriptions.set(

        instrumentToken,

        {

            symbol,

            exchange,

            mode: "full"

        }

    );

    //--------------------------------------------------
    // LIVE SUBSCRIBE
    //--------------------------------------------------

    if (connected) {

        ticker.subscribe([

            instrumentToken

        ]);

        ticker.setMode(

            ticker.modeFull,

            [

                instrumentToken

            ]

        );

    }

    console.log(

        "[ZERODHA]",

        "Subscribed:",

        symbol,

        instrumentToken

    );

}

//------------------------------------------------------
// UNSUBSCRIBE
//------------------------------------------------------

export function unsubscribe(

    instrumentToken

) {

    if (!ticker) {

        return;

    }

    subscriptions.delete(

        instrumentToken

    );

    latestTicks.delete(

        instrumentToken

    );

    if (connected) {

        ticker.unsubscribe([

            instrumentToken

        ]);

    }

    console.log(

        "[ZERODHA]",

        "Unsubscribed:",

        instrumentToken

    );

}

//------------------------------------------------------
// REMOVE ALL
//------------------------------------------------------

export function clearSubscriptions() {

    if (

        ticker &&

        connected &&

        subscriptions.size > 0

    ) {

        ticker.unsubscribe(

            Array.from(

                subscriptions.keys()

            )

        );

    }

    subscriptions.clear();

    latestTicks.clear();

}

//------------------------------------------------------
// WEBSOCKET SERVER
//------------------------------------------------------

export function attachWebSocketServer(

    server

) {

    websocketServer = server;

}

//------------------------------------------------------
// CLIENT
//------------------------------------------------------

export function registerClient(

    socket

) {

    clients.add(

        socket

    );

    console.log(

        "[ZERODHA]",

        "Client Connected",

        clients.size

    );

    socket.on(

        "close",

        () => {

            clients.delete(

                socket

            );

            console.log(

                "[ZERODHA]",

                "Client Disconnected",

                clients.size

            );

        }

    );

}

//------------------------------------------------------
// SHUTDOWN
//------------------------------------------------------

export function shutdownTicker() {

    console.log();

    console.log(

        "===================================="

    );

    console.log(

        "ZERODHA SHUTDOWN"

    );

    console.log(

        "===================================="

    );

    clearSubscriptions();

    if (ticker) {

        try {

            ticker.disconnect();

        }

        catch (err) {

            console.error(

                err

            );

        }

    }

    connected = false;

    connecting = false;

    ticker = null;

    console.log(

        "===================================="

    );

    console.log();

}

//------------------------------------------------------
// DIAGNOSTICS
//------------------------------------------------------

export function printTickerStatus() {

    console.log();

    console.log(

        "===================================="

    );

    console.log(

        "ZERODHA WEBSOCKET STATUS"

    );

    console.log(

        "===================================="

    );

    console.table({

        Connected:

            connected,

        Connecting:

            connecting,

        Clients:

            clients.size,

        Subscriptions:

            subscriptions.size,

        CachedTicks:

            latestTicks.size

    });

    console.log(

        "===================================="

    );

    console.log();

}

//------------------------------------------------------
// STARTUP
//------------------------------------------------------

export function startWebSocket() {

    initializeTicker();

    initializeWebSocket();

    startTicker();

}

//------------------------------------------------------
// DEFAULT EXPORT
//------------------------------------------------------

export default {

    startWebSocket,

    shutdownTicker,

    subscribe,

    unsubscribe,

    registerClient,

    attachWebSocketServer,

    printTickerStatus,

    isConnected,

    onTick

};