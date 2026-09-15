//======================================================
// server/indstocks/websocket.js
//
// IndStocks Price Feed WebSocket (live LTP/quote streaming)
//
// Endpoint: wss://ws-prices.indstocks.com/api/v1/ws/prices
// Auth: Authorization header = raw access token (from token.js)
//
// Instrument format on THIS endpoint only:
//   SEGMENT:TOKEN  e.g. "NSE:2885", "NIDX:26000", "BIDX:1"
// This is DIFFERENT from the REST scrip-code format
// (EXCH_SECURITYID, e.g. "NSE_2885") used by history.js/symbols.js.
// toWsInstrument() below is the only place that translates
// between the two - nothing else in this file or its callers
// needs to know both formats exist.
//======================================================

import WebSocket from "ws";
import { getAccessToken } from "./token.js";

const WS_URL =
    "wss://ws-prices.indstocks.com/api/v1/ws/prices";

const RECONNECT_DELAY_MS = 5000;

//======================================================
// STATE
//======================================================

let socket = null;
let connecting = false;
let intentionalClose = false;

const subscribedInstruments = new Set(); // "NSE:2885" form
let tickHandler = null;

//======================================================
// SEGMENT MAP (REST exchange -> WS segment prefix)
//
// REST exchange codes seen from the instrument master:
//   NSE (equities/index), BSE (equities/index),
//   and options live under NSE/BSE too (SEM_EXCH_INSTRUMENT_TYPE
//   distinguishes OPTIDX/OPTSTK, not a separate exchange code).
//
// The WS docs' NFO/BFO/NIDX/BIDX prefixes are NOT the same as
// the REST EXCH column - they encode segment (equity vs
// derivative vs index), which the REST side keeps elsewhere
// (SEM_EXCH_INSTRUMENT_TYPE, OPTION_TYPE). This map covers the
// common cases from the instrument master; unmapped instruments
// fall back to NSE:/BSE: unprefixed exchange (safe default for
// straightforward equities).
//======================================================

function toWsInstrument({ exchange, securityId, instrumentType, optionType }) {

    const exch = String(exchange ?? "").toUpperCase();
    const isOption = optionType === "CE" || optionType === "PE";
    const isIndex = instrumentType === "INDEX";

    if (isIndex) {
        return exch === "BSE" ? `BIDX:${securityId}` : `NIDX:${securityId}`;
    }

    if (isOption) {
        return exch === "BSE" ? `BFO:${securityId}` : `NFO:${securityId}`;
    }

    return exch === "BSE" ? `BSE:${securityId}` : `NSE:${securityId}`;

}

//======================================================
// CONNECT
//======================================================

export async function connectIndstocksWebSocket() {

    if (socket || connecting) {
        return;
    }

    connecting = true;
    intentionalClose = false;

    try {

        const token = await getAccessToken();

        socket = new WebSocket(WS_URL, {
            headers: { Authorization: token }
        });

        socket.on("open", () => {

            console.log("[INDSTOCKS WS] Connected.");
            connecting = false;

            // Re-subscribe everything that was requested before/
            // during a reconnect.
            if (subscribedInstruments.size > 0) {

                sendSubscription("subscribe", [...subscribedInstruments]);

            }

        });

        socket.on("message", raw => {

            try {

                const message = JSON.parse(raw.toString());

                if (message?.mode === "ltp" || message?.mode === "quote") {

                    if (typeof tickHandler === "function") {
                        tickHandler(message);
                    }

                }

                // Heartbeats / anything else: ignore, per docs.

            } catch (error) {

                console.warn("[INDSTOCKS WS] Failed to parse message:", error?.message ?? error);

            }

        });

        socket.on("close", () => {

            console.log("[INDSTOCKS WS] Disconnected.");
            socket = null;
            connecting = false;

            if (!intentionalClose) {
                scheduleReconnect();
            }

        });

        socket.on("error", error => {

            console.error("[INDSTOCKS WS] Error:", error?.message ?? error);

        });

    } catch (error) {

        connecting = false;
        console.error("[INDSTOCKS WS] Connection failed:", error?.message ?? error);
        scheduleReconnect();

    }

}

function scheduleReconnect() {

    setTimeout(() => {
        if (!intentionalClose) {
            connectIndstocksWebSocket();
        }
    }, RECONNECT_DELAY_MS);

}

//======================================================
// DISCONNECT
//======================================================

export function disconnectIndstocksWebSocket() {

    intentionalClose = true;

    if (socket) {
        try {
            socket.close();
        } catch {
            // ignore
        }
        socket = null;
    }

}

//======================================================
// TICK HANDLER
//======================================================

export function setIndstocksTickHandler(handler) {
    tickHandler = handler;
}

//======================================================
// SUBSCRIBE / UNSUBSCRIBE
//======================================================

function sendSubscription(action, instruments, mode = "ltp") {

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
    }

    socket.send(JSON.stringify({
        action,
        mode,
        instruments
    }));

    return true;

}

export function subscribeIndstocksInstrument(contractInfo) {

    const wsInstrument = toWsInstrument(contractInfo);

    subscribedInstruments.add(wsInstrument);

    const sent = sendSubscription("subscribe", [wsInstrument]);

    console.log("[INDSTOCKS WS] Subscribe:", wsInstrument, sent ? "(sent)" : "(queued - not connected yet)");

    return wsInstrument;

}

export function unsubscribeIndstocksInstrument(contractInfo) {

    const wsInstrument = toWsInstrument(contractInfo);

    subscribedInstruments.delete(wsInstrument);

    sendSubscription("unsubscribe", [wsInstrument]);

    console.log("[INDSTOCKS WS] Unsubscribe:", wsInstrument);

}

//======================================================
// STATUS
//======================================================

export function getIndstocksWsStatus() {

    return {
        connected: Boolean(socket && socket.readyState === WebSocket.OPEN),
        connecting,
        subscriptions: subscribedInstruments.size,
        subscribedInstruments: [...subscribedInstruments]
    };

}

export default {
    connectIndstocksWebSocket,
    disconnectIndstocksWebSocket,
    setIndstocksTickHandler,
    subscribeIndstocksInstrument,
    unsubscribeIndstocksInstrument,
    getIndstocksWsStatus
};