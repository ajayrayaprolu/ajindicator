//======================================================
// server/fyers/websocket.js
//======================================================
//
// FYERS API v3 Market Data WebSocket
//
// Uses the official FYERS JavaScript SDK.
//
// Data mode:
//   SymbolUpdate
//
// AJ Institutional Terminal
//======================================================

import FyersApiPkg from "fyers-api-v3";

const {
    data_ws
} = FyersApiPkg;

import {
    getFullAccessToken,
    isLoggedIn
} from "./token.js";

//======================================================
// STATE
//======================================================

let socket = null;

let connected = false;

let tickHandler = null;

let reconnecting = false;

//======================================================
// SUBSCRIPTIONS
//======================================================

const subscriptions = new Set();

//======================================================
// HANDLER
//======================================================

export function setTickHandler(handler) {

    if (
        handler !== null &&
        typeof handler !== "function"
    ) {
        throw new Error(
            "[FYERS WS] Tick handler must be a function."
        );
    }

    tickHandler = handler;
}

//======================================================
// STATUS
//======================================================

export function isConnected() {

    return connected;
}

//======================================================
// CONNECT
//======================================================

export function connectFyersWebSocket() {

    if (socket) {
        return socket;
    }

    if (!isLoggedIn()) {

        throw new Error(
            "[FYERS WS] FYERS login required."
        );
    }

    const accessToken =
        getFullAccessToken();

    if (!accessToken) {

        throw new Error(
            "[FYERS WS] FYERS access token missing."
        );
    }

    console.log(
        "[FYERS WS] Creating data socket..."
    );

    socket =
        new data_ws.FyersDataSocket({

            access_token:
                accessToken,

            log_path:
                "",

            litemode:
                false,

            write_to_file:
                false,

            reconnect:
                true,

            on_connect:
                handleConnect,

            on_close:
                handleClose,

            on_error:
                handleError,

            on_message:
                handleMessage

        });

    console.log(
        "[FYERS WS] Connecting..."
    );

    socket.connect();

    return socket;
}

//======================================================
// CONNECT CALLBACK
//======================================================

function handleConnect() {

    connected = true;

    reconnecting = false;

    console.log(
        "[FYERS WS] Connected."
    );

    resubscribe();
}

//======================================================
// CLOSE
//======================================================

function handleClose(message) {

    connected = false;

    socket = null;

    console.warn(
        "[FYERS WS] Closed:",
        message ?? ""
    );
}

//======================================================
// ERROR
//======================================================

function handleError(error) {

    console.error(
        "[FYERS WS] Error:",
        error
    );
}

//======================================================
// MESSAGE
//======================================================

function handleMessage(message) {

    if (
        !message ||
        typeof message !== "object"
    ) {
        return;
    }

    /*
     * FYERS can send non-tick/control messages.
     * Ignore anything that cannot become a normalized tick.
     */

    const normalized =
        normalizeFyersTick(
            message
        );

    if (!normalized) {
        return;
    }

    if (
        typeof tickHandler ===
        "function"
    ) {

        try {

            tickHandler(
                normalized
            );

        } catch (error) {

            console.error(
                "[FYERS WS] Tick handler error:",
                error
            );
        }
    }
}

//======================================================
// NORMALIZE FYERS TICK
//======================================================

function normalizeFyersTick(message) {

    if (
        !message ||
        typeof message !== "object"
    ) {
        return null;
    }

    const symbol =
        String(
            message.symbol ??
            ""
        )
        .trim();

    if (!symbol) {
        return null;
    }

    const ltp =
        toNumber(
            message.ltp
        );

    /*
     * A SymbolUpdate tick without a valid LTP is not
     * useful to the chart engine.
     */

    if (ltp === null) {
        return null;
    }

    const timestamp =
        toNumber(
            message.last_traded_time
        );

    return {

        //================================================
        // SYMBOL
        //================================================

        symbol,

        providerSymbol:
            symbol,

        exchange:
            extractExchange(
                symbol
            ),

        tradable:
            true,

        //================================================
        // PRICE
        //================================================

        ltp,

        lastPrice:
            ltp,

        //================================================
        // OHLC
        //================================================

        open:
            toNumber(
                message.open_price
            ),

        high:
            toNumber(
                message.high_price
            ),

        low:
            toNumber(
                message.low_price
            ),

        close:
            toNumber(
                message.prev_close_price
            ),

        //================================================
        // VOLUME
        //================================================

        volume:
            toNumber(
                message.vol_traded_today
            ) ?? 0,

        //================================================
        // AVERAGE PRICE
        //================================================

        averagePrice:
            toNumber(
                message.avg_trade_price
            ) ?? 0,

        //================================================
        // BID / ASK
        //================================================

        bid:
            toNumber(
                message.bid_price
            ),

        ask:
            toNumber(
                message.ask_price
            ),

        bidQuantity:
            toNumber(
                message.bid_size
            ) ?? 0,

        askQuantity:
            toNumber(
                message.ask_size
            ) ?? 0,

        //================================================
        // TRADE QUANTITY
        //================================================

        lastQuantity:
            toNumber(
                message.last_traded_qty
            ) ?? 0,

        //================================================
        // BUY / SELL
        //================================================

        totalBuyQuantity:
            toNumber(
                message.tot_buy_qty
            ) ?? 0,

        totalSellQuantity:
            toNumber(
                message.tot_sell_qty
            ) ?? 0,

        //================================================
        // TIMESTAMP
        //================================================

        timestamp:
            normalizeTimestamp(
                timestamp
            ),

        //================================================
        // SOURCE
        //================================================

        feedSource:
            "fyers",

        provider:
            "fyers",

        //================================================
        // RAW
        //================================================

        raw:
            message
    };
}

//======================================================
// SUBSCRIBE
//======================================================

export function subscribe(symbols) {

    const list =
        normalizeSymbolList(
            symbols
        );

    if (
        list.length === 0
    ) {
        return;
    }

    for (
        const symbol
        of list
    ) {

        subscriptions.add(
            symbol
        );
    }

    /*
     * If socket does not exist, create it.
     *
     * The actual subscription is performed by
     * handleConnect() -> resubscribe().
     */

    if (!socket) {

        connectFyersWebSocket();

        return;
    }

    /*
     * Socket exists but is not connected yet.
     * handleConnect() will resubscribe.
     */

    if (!connected) {
        return;
    }

    try {

        socket.subscribe(
            list,
            "SymbolUpdate"
        );

        console.log(
            "[FYERS WS] Subscribed:",
            list
        );

    } catch (error) {

        console.error(
            "[FYERS WS] Subscribe error:",
            error
        );
    }
}

//======================================================
// UNSUBSCRIBE
//======================================================

export function unsubscribe(symbols) {

    const list =
        normalizeSymbolList(
            symbols
        );

    if (
        list.length === 0
    ) {
        return;
    }

    for (
        const symbol
        of list
    ) {

        subscriptions.delete(
            symbol
        );
    }

    if (
        socket &&
        connected
    ) {

        try {

            socket.unsubscribe(
                list,
                "SymbolUpdate"
            );

            console.log(
                "[FYERS WS] Unsubscribed:",
                list
            );

        } catch (error) {

            console.error(
                "[FYERS WS] Unsubscribe error:",
                error
            );
        }
    }
}

//======================================================
// RESUBSCRIBE
//======================================================

function resubscribe() {

    if (
        !socket ||
        !connected ||
        subscriptions.size === 0
    ) {
        return;
    }

    const symbols =
        Array.from(
            subscriptions
        );

    try {

        socket.subscribe(
            symbols,
            "SymbolUpdate"
        );

        console.log(
            "[FYERS WS] Resubscribed:",
            symbols
        );

    } catch (error) {

        console.error(
            "[FYERS WS] Resubscribe error:",
            error
        );
    }
}

//======================================================
// NORMALIZE SYMBOL LIST
//======================================================

function normalizeSymbolList(symbols) {

    const list =
        Array.isArray(symbols)
            ? symbols
            : [symbols];

    return list

        .filter(
            symbol =>
                symbol !== undefined &&
                symbol !== null
        )

        .map(
            symbol =>
                String(symbol)
                    .trim()
                    .toUpperCase()
        )

        .filter(Boolean);
}

//======================================================
// EXTRACT EXCHANGE
//======================================================

function extractExchange(symbol) {

    const value =
        String(
            symbol ?? ""
        )
        .trim();

    if (!value) {
        return "";
    }

    return (
        value.split(":")[0] ??
        ""
    );
}

//======================================================
// NUMBER
//======================================================

function toNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : null;
}

//======================================================
// TIMESTAMP
//======================================================

function normalizeTimestamp(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {

        return Date.now();
    }

    const timestamp =
        Number(value);

    /*
     * FYERS last_traded_time is normally Unix time
     * in seconds.
     *
     * Convert seconds -> milliseconds.
     */

    if (
        timestamp < 100000000000
    ) {

        return timestamp * 1000;
    }

    return timestamp;
}

//======================================================
// DISCONNECT
//======================================================

export function disconnect() {

    console.log(
        "[FYERS WS] Disconnecting..."
    );

    if (socket) {

        try {

            socket.close();

        } catch (error) {

            console.error(
                "[FYERS WS] Close error:",
                error
            );
        }
    }

    socket = null;

    connected = false;

    reconnecting = false;
}

//======================================================
// CLEAR SUBSCRIPTIONS
//======================================================

export function clearSubscriptions() {

    if (
        socket &&
        connected &&
        subscriptions.size > 0
    ) {

        try {

            socket.unsubscribe(
                Array.from(
                    subscriptions
                ),
                "SymbolUpdate"
            );

        } catch (error) {

            console.error(
                "[FYERS WS] Clear subscription error:",
                error
            );
        }
    }

    subscriptions.clear();

    console.log(
        "[FYERS WS] Subscriptions cleared."
    );
}

//======================================================
// STATUS
//======================================================

export function getStatus() {

    return {

        connected,

        reconnecting,

        socket:
            Boolean(socket),

        subscriptions:
            subscriptions.size,

        subscribedSymbols:
            Array.from(
                subscriptions
            )

    };
}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {

    setTickHandler,

    connectFyersWebSocket,

    subscribe,

    unsubscribe,

    disconnect,

    clearSubscriptions,

    isConnected,

    getStatus

};