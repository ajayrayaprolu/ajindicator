//======================================================
// server/fyers/FyersFeed.js
//======================================================
//
// FYERS API v3 Feed Adapter
//
// FeedManager contract:
//
//   start(onTick)
//   stop()
//   getHistory(symbol, timeframe)
//   subscribe(symbol)
//   unsubscribe(symbol)
//
//======================================================

import {
    connectFyersWebSocket,
    setTickHandler,
    subscribe as subscribeWebSocket,
    unsubscribe as unsubscribeWebSocket,
    disconnect as disconnectWebSocket,
    isConnected,
    getStatus
}
from "./websocket.js";

import {
    getHistory as getFyersHistory
}
from "./history.js";

import {
    resolveFyersSymbol
}
from "./symbols.js";

import {
    isLoggedIn,
    getAppId,
    getAccessToken
}
from "./token.js";

//======================================================
// CLASS
//======================================================

export class FyersFeed {

    constructor() {

        this.name =
            "fyers";

        this.running =
            false;

        this.tickCallback =
            null;

        this.subscriptions =
            new Set();

        this.boundTickHandler =
            tick => {

                if (
                    typeof this.tickCallback ===
                    "function"
                ) {

                    this.tickCallback(
                        tick
                    );

                }

            };

        setTickHandler(
            this.boundTickHandler
        );

    }

    //--------------------------------------------------
    // CONFIG
    //--------------------------------------------------

    isConfigured() {

        return Boolean(
            getAppId() &&
            getAccessToken()
        );

    }

    //--------------------------------------------------
    // START
    //--------------------------------------------------

    async start(
        onTick
    ) {

        if (
            typeof onTick ===
            "function"
        ) {

            this.tickCallback =
                onTick;

        }

        if (
            this.running
        ) {

            return;

        }

        if (
            !this.isConfigured()
        ) {

            throw new Error(
                "[FYERS] FYERS session is not available."
            );

        }

        connectFyersWebSocket();

        this.running =
            true;

        console.log(
            "[FYERS] Feed started."
        );

    }

    //--------------------------------------------------
    // STOP
    //--------------------------------------------------

    async stop() {

        this.running =
            false;

        disconnectWebSocket();

        this.tickCallback =
            null;

        console.log(
            "[FYERS] Feed stopped."
        );

    }

    //--------------------------------------------------
    // HISTORY
    //--------------------------------------------------

    async getHistory(
        symbol,
        timeframe = "1m"
    ) {

        const fyersSymbol =
            resolveFyersSymbol(
                symbol
            );

        return getFyersHistory(
            fyersSymbol,
            timeframe
        );

    }

    //--------------------------------------------------
    // SUBSCRIBE
    //--------------------------------------------------

    async subscribe(
        symbol
    ) {

        const fyersSymbol =
            resolveFyersSymbol(
                symbol
            );

        this.subscriptions.add(
            fyersSymbol
        );

        subscribeWebSocket(
            fyersSymbol
        );

        console.log(
            "[FYERS] Subscribed:",
            fyersSymbol
        );

        return fyersSymbol;

    }

    //--------------------------------------------------
    // UNSUBSCRIBE
    //--------------------------------------------------

    async unsubscribe(
        symbol
    ) {

        const fyersSymbol =
            resolveFyersSymbol(
                symbol
            );

        this.subscriptions.delete(
            fyersSymbol
        );

        unsubscribeWebSocket(
            fyersSymbol
        );

        console.log(
            "[FYERS] Unsubscribed:",
            fyersSymbol
        );

        return fyersSymbol;

    }

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    getStatus() {

        return {

            name:
                this.name,

            running:
                this.running,

            connected:
                isConnected(),

            subscriptions:
                this.subscriptions.size,

            websocket:
                getStatus()

        };

    }

}

//======================================================
// FACTORY
//======================================================

export function createFyersFeed() {

    return new FyersFeed();

}

//======================================================
// SINGLETON
//======================================================

const fyersFeed =
    createFyersFeed();

export default fyersFeed;