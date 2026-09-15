//======================================================
// server/aliceblue/websocket.js
//
// Alice Blue Market Data WebSocket
//
// AJ Institutional Terminal
//
// Authentication:
//   userSession
//       ↓
//   SHA256
//       ↓
//   SHA256
//       ↓
//   susertoken
//
// WebSocket:
//   wss://ws1.aliceblueonline.com/NorenWS/
//
// Authentication acknowledgement:
//   {"t":"cf","k":"OK"}
//
// Market data:
//   {"t":"tk", ...}
//   {"t":"tf", ...}
//
// Subscription:
//   {"k":"NSE|26000","t":"t"}
//
// Heartbeat:
//   {"k":"","t":"h"}
//   every 50 seconds
//======================================================

import crypto from "crypto";
import WebSocket from "ws";

import {
    loadSession,
    getUserId,
    getSessionId
} from "./token.js";

//======================================================
// CONSTANTS
//======================================================

const WS_URL =
    "wss://ws1.aliceblueonline.com/NorenWS/";

const CREATE_WS_SESSION_URL =
    "https://a3.aliceblueonline.com/open-api/od/v1/profile/createWsSess";

const RECONNECT_DELAY =
    3000;

const HEARTBEAT_INTERVAL =
    50000;

//======================================================
// STATE
//======================================================

let ws = null;

let connected = false;

let connecting = false;

let authenticated = false;

let wsSession = null;

let reconnectTimer = null;

let heartbeatTimer = null;

let tickHandler = null;

//======================================================
// SUBSCRIPTIONS
//======================================================

const subscriptions =
    new Set();

const pendingSubscriptions =
    new Set();

//======================================================
// SHA256
//======================================================

function sha256(value) {

    return crypto
        .createHash("sha256")
        .update(String(value))
        .digest("hex");

}

//======================================================
// DOUBLE SHA256
//======================================================

function doubleSha256(value) {

    return sha256(
        sha256(value)
    );

}

//======================================================
// CREATE / VALIDATE WS SESSION
//======================================================

async function createWsSession() {

    const session =
        loadSession();

    const userId =
        session?.userId ??
        getUserId();

    const userSession =
        session?.userSession ??
        getSessionId();

    if (!userId) {

        throw new Error(
            "[ALICEBLUE WS] userId missing."
        );

    }

    if (!userSession) {

        throw new Error(
            "[ALICEBLUE WS] userSession missing."
        );

    }

    console.log(
        "[ALICEBLUE WS] Creating WebSocket session..."
    );

    const response =
        await fetch(
            CREATE_WS_SESSION_URL,
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${userSession}`

                },

                body:
                    JSON.stringify({

                        source:
                            "API",

                        userId:
                            String(userId)

                    })

            }
        );

    const text =
        await response.text();

    let data;

    try {

        data =
            JSON.parse(text);

    }
    catch {

        throw new Error(
            `[ALICEBLUE WS] createWsSess invalid JSON: ${text}`
        );

    }

    console.log(
        "[ALICEBLUE WS] createWsSess response:",
        JSON.stringify(data)
    );

    if (!response.ok) {

        throw new Error(
            `[ALICEBLUE WS] createWsSess HTTP ${response.status}`
        );

    }

    const status =
        String(
            data?.status ??
            data?.stat ??
            ""
        )
        .trim()
        .toLowerCase();

    const resultStatus =
        String(
            data?.result?.[0]?.Status ??
            ""
        )
        .trim()
        .toUpperCase();

    if (
        status !== "ok" &&
        resultStatus !== "OK"
    ) {

        throw new Error(
            `[ALICEBLUE WS] createWsSess failed: ${JSON.stringify(data)}`
        );

    }

    //==================================================
    // IMPORTANT
    //
    // Current Alice Blue API does not return wsSess.
    //
    // The WebSocket authentication uses the existing
    // User Session Id and hashes it twice.
    //==================================================

    wsSession =
        userSession;

    console.log(
        "[ALICEBLUE WS] WebSocket session validated."
    );

    return wsSession;

}

//======================================================
// BUILD AUTH MESSAGE
//======================================================

function buildAuthMessage() {

    const session =
        loadSession();

    const userId =
        session?.userId ??
        getUserId();

    const clientId =
        session?.clientId ??
        userId;

    if (!wsSession) {

        throw new Error(
            "[ALICEBLUE WS] WebSocket session missing."
        );

    }

    const apiClientId =
        `${clientId}_API`;

    const auth = {

        susertoken:
            doubleSha256(
                wsSession
            ),

        t:
            "c",

        actid:
            apiClientId,

        uid:
            apiClientId,

        source:
            "API"

    };

    console.log(
        "[ALICEBLUE WS] Authentication message prepared."
    );

    return auth;

}

//======================================================
// CONNECT
//======================================================

export async function connectAliceBlue() {

    if (
        connected ||
        connecting
    ) {

        return;

    }

    if (
        ws &&
        (
            ws.readyState ===
            WebSocket.OPEN ||

            ws.readyState ===
            WebSocket.CONNECTING
        )
    ) {

        return;

    }

    connecting =
        true;

    authenticated =
        false;

    try {

        await createWsSession();

        const auth =
            buildAuthMessage();

        console.log(
            "[ALICEBLUE WS] Opening socket..."
        );

        ws =
            new WebSocket(
                WS_URL
            );

        ws.on(
            "open",
            () => {

                console.log(
                    "[ALICEBLUE WS] Socket opened."
                );

                connecting =
                    false;

                connected =
                    true;

                console.log(
                    "[ALICEBLUE WS] Sending authentication..."
                );

                ws.send(
                    JSON.stringify(
                        auth
                    )
                );

            }
        );

        ws.on(
            "message",
            data => {

                handleMessage(
                    data
                );

            }
        );

        ws.on(
            "close",
            (code, reason) => {

                connected =
                    false;

                authenticated =
                    false;

                connecting =
                    false;

                stopHeartbeat();

                ws =
                    null;

                console.warn(
                    "[ALICEBLUE WS] Closed:",
                    code,
                    reason?.toString?.() ?? ""
                );

                scheduleReconnect();

            }
        );

        ws.on(
            "error",
            error => {

                console.error(
                    "[ALICEBLUE WS] Error:",
                    error?.message ??
                    error
                );

            }
        );

    }
    catch (error) {

        connecting =
            false;

        connected =
            false;

        authenticated =
            false;

        console.error(
            "[ALICEBLUE WS] Connect failed:",
            error?.message ??
            error
        );

        throw error;

    }

}

//======================================================
// MESSAGE
//======================================================

function handleMessage(data) {

    let message;

    try {

        const text =
            Buffer
                .from(data)
                .toString();

        message =
            JSON.parse(
                text
            );

    }
    catch (error) {

        console.error(
            "[ALICEBLUE WS] Invalid message:",
            error?.message ??
            error
        );

        return;

    }

    //--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    console.log(
        "[ALICEBLUE WS] MESSAGE:",
        message
    );

    //--------------------------------------------------
    // CONNECTION / AUTH ACK
    //--------------------------------------------------

    if (
        message?.t === "cf"
    ) {

        const result =
            String(
                message?.k ??
                ""
            )
            .trim()
            .toUpperCase();

        if (
            result === "OK"
        ) {

            authenticated =
                true;

            connected =
                true;

            console.log(
                "[ALICEBLUE WS] Authentication successful."
            );

            startHeartbeat();

            flushSubscriptions();

        }
        else {

            authenticated =
                false;

            console.error(
                "[ALICEBLUE WS] Authentication FAILED:",
                message
            );

        }

        return;

    }

    //--------------------------------------------------
    // MARKET DATA
    //--------------------------------------------------

    if (
        message?.t === "tk" ||
        message?.t === "tf" ||
        message?.t === "dk" ||
        message?.t === "df"
    ) {

        const normalized =
            normalizeTick(
                message
            );

        if (
            normalized &&
            typeof tickHandler ===
            "function"
        ) {

            tickHandler(
                normalized
            );

        }

        return;

    }

}

//======================================================
// SUBSCRIBE
//======================================================

export async function subscribe(symbol) {

    const value =
        String(
            symbol ??
            ""
        )
        .trim();

    if (!value) {

        return;

    }

    pendingSubscriptions.add(
        value
    );

    console.log(
        "[ALICEBLUE WS] Subscription queued:",
        value
    );

    //--------------------------------------------------
    // Not authenticated yet.
    //
    // connectAliceBlue() will eventually receive
    // cf/OK and flush the pending subscription.
    //--------------------------------------------------

    if (
        !connected ||
        !authenticated
    ) {

        try {

            await connectAliceBlue();

        }
        catch (error) {

            console.error(
                "[ALICEBLUE WS] Subscription connection failed:",
                error?.message ??
                error
            );

        }

        return;

    }

    sendSubscription(
        value
    );

}

//======================================================
// SEND SUBSCRIPTION
//======================================================

function sendSubscription(symbol) {

    if (
        !ws ||
        ws.readyState !==
        WebSocket.OPEN ||
        !authenticated
    ) {

        return;

    }

    const payload = {

        k:
            symbol,

        t:
            "t"

    };

    console.log(
        "[ALICEBLUE WS] SUBSCRIBE:",
        JSON.stringify(
            payload
        )
    );

    ws.send(
        JSON.stringify(
            payload
        )
    );

    subscriptions.add(
        symbol
    );

    pendingSubscriptions.delete(
        symbol
    );

}

//======================================================
// FLUSH SUBSCRIPTIONS
//======================================================

function flushSubscriptions() {

    if (
        !authenticated
    ) {

        return;

    }

    console.log(
        "[ALICEBLUE WS] Flushing subscriptions:",
        [
            ...pendingSubscriptions
        ]
    );

    for (
        const symbol
        of pendingSubscriptions
    ) {

        sendSubscription(
            symbol
        );

    }

}

//======================================================
// UNSUBSCRIBE
//======================================================

export async function unsubscribe(symbol) {

    const value =
        String(
            symbol ??
            ""
        )
        .trim();

    if (!value) {

        return;

    }

    pendingSubscriptions.delete(
        value
    );

    subscriptions.delete(
        value
    );

    if (
        !ws ||
        ws.readyState !==
        WebSocket.OPEN ||
        !authenticated
    ) {

        return;

    }

    const payload = {

        k:
            value,

        t:
            "u"

    };

    console.log(
        "[ALICEBLUE WS] UNSUBSCRIBE:",
        JSON.stringify(
            payload
        )
    );

    ws.send(
        JSON.stringify(
            payload
        )
    );

}

//======================================================
// HEARTBEAT
//======================================================

function startHeartbeat() {

    stopHeartbeat();

    heartbeatTimer =
        setInterval(
            () => {

                if (
                    !ws ||
                    ws.readyState !==
                    WebSocket.OPEN ||
                    !authenticated
                ) {

                    return;

                }

                const payload = {

                    k:
                        "",

                    t:
                        "h"

                };

                try {

                    ws.send(
                        JSON.stringify(
                            payload
                        )
                    );

                    console.log(
                        "[ALICEBLUE WS] Heartbeat sent."
                    );

                }
                catch (error) {

                    console.error(
                        "[ALICEBLUE WS] Heartbeat failed:",
                        error?.message ??
                        error
                    );

                }

            },
            HEARTBEAT_INTERVAL
        );

}

//======================================================
// STOP HEARTBEAT
//======================================================

function stopHeartbeat() {

    if (
        heartbeatTimer
    ) {

        clearInterval(
            heartbeatTimer
        );

        heartbeatTimer =
            null;

    }

}

//======================================================
// DISCONNECT
//======================================================

export async function disconnect() {

    if (
        reconnectTimer
    ) {

        clearTimeout(
            reconnectTimer
        );

        reconnectTimer =
            null;

    }

    stopHeartbeat();

    connected =
        false;

    connecting =
        false;

    authenticated =
        false;

    wsSession =
        null;

    if (ws) {

        try {

            ws.removeAllListeners();

            ws.close();

        }
        catch {}

    }

    ws =
        null;

    subscriptions.clear();

    pendingSubscriptions.clear();

}

//======================================================
// RECONNECT
//======================================================

function scheduleReconnect() {

    if (
        reconnectTimer ||
        pendingSubscriptions.size ===
        0
    ) {

        return;

    }

    reconnectTimer =
        setTimeout(
            async () => {

                reconnectTimer =
                    null;

                try {

                    await connectAliceBlue();

                }
                catch (error) {

                    console.error(
                        "[ALICEBLUE WS] Reconnect failed:",
                        error?.message ??
                        error
                    );

                }

            },
            RECONNECT_DELAY
        );

}

//======================================================
// TICK NORMALIZATION
//======================================================

function normalizeTick(message) {

    if (
        !message ||
        typeof message !==
        "object"
    ) {

        return null;

    }

    const price =
        Number(
            message?.lp ??
            message?.ltp ??
            message?.LTP ??
            message?.price
        );

    const open =
        Number(
            message?.o
        );

    const high =
        Number(
            message?.h
        );

    const low =
        Number(
            message?.l
        );

    const close =
        Number(
            message?.c
        );

    const volume =
        Number(
            message?.v
        );

    const averagePrice =
        Number(
            message?.ap
        );

    const bid =
        Number(
            message?.bp1
        );

    const ask =
        Number(
            message?.sp1
        );

    const timestamp =
        Number(
            message?.ft
        );

    return {

        feedSource:
            "aliceblue",

        provider:
            "aliceblue",

        exchange:
            message?.e ??
            null,

        token:
            message?.tk ??
            null,

        symbol:
            message?.ts ??
            message?.symbol ??
            null,

        providerSymbol:
            message?.ts ??
            message?.symbol ??
            null,

        tradable:
            true,

        ltp:
            Number.isFinite(price)
                ? price
                : null,

        lastPrice:
            Number.isFinite(price)
                ? price
                : null,

        open:
            Number.isFinite(open)
                ? open
                : null,

        high:
            Number.isFinite(high)
                ? high
                : null,

        low:
            Number.isFinite(low)
                ? low
                : null,

        close:
            Number.isFinite(close)
                ? close
                : null,

        volume:
            Number.isFinite(volume)
                ? volume
                : 0,

        averagePrice:
            Number.isFinite(averagePrice)
                ? averagePrice
                : 0,

        bid:
            Number.isFinite(bid)
                ? bid
                : null,

        ask:
            Number.isFinite(ask)
                ? ask
                : null,

        timestamp:
            Number.isFinite(timestamp)
                ? timestamp * 1000
                : Date.now(),

        raw:
            message

    };

}

//======================================================
// TICK HANDLER
//======================================================

export function setTickHandler(handler) {

    tickHandler =
        typeof handler ===
        "function"
            ? handler
            : null;

}

//======================================================
// STATUS
//======================================================

export function getStatus() {

    return {

        connected,

        connecting,

        authenticated,

        subscriptions:
            subscriptions.size,

        pendingSubscriptions:
            pendingSubscriptions.size,

        subscribedSymbols:
            [
                ...subscriptions
            ],

        pendingSymbols:
            [
                ...pendingSubscriptions
            ]

    };

}

//======================================================
// EXPORT
//======================================================

export default {

    connectAliceBlue,

    disconnect,

    subscribe,

    unsubscribe,

    setTickHandler,

    getStatus

};