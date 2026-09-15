//======================================================
// server/feeds/FeedManager.js
//======================================================
//
// Central Market Data Feed Manager
//
// Responsibilities
//
// 1. Register available feeds
// 2. Select active feed
// 3. Start / stop active feed
// 4. Subscribe / unsubscribe symbols
// 5. Receive normalized ticks
// 6. Forward ticks to Candle Engine / Charts
//
// IMPORTANT
// ---------
// FeedManager does NOT contain provider-specific logic.
//
// FYERS logic     -> server/fyers/FyersFeed.js
// Alice Blue      -> server/aliceblue/AliceBlueFeed.js
// Upstox          -> server/upstox/UpstoxFeed.js
// Yahoo           -> server/yahoo/YahooFeed.ts
// Zerodha         -> server/zerodha/ZerodhaFeed.ts
// 
//                    Symbol Search
//                         │
//                         ▼
//                  Selected Symbol
//                         │
//                         ▼
//                ┌─────────────────┐
//                │   FeedManager   │
//                │                 │
//                │ active provider │
//                │ lifecycle       │
//                │ subscription    │
//                └────────┬────────┘
//                         │
//                         ▼
//                  ┌──────────────┐
//                  │ FeedRegistry │
//                  └──────┬───────┘
//                         │
//        ┌────────────────┼────────────────┐
//        ▼                ▼                ▼
//     Yahoo             FYERS          Alice Blue
//        │                │                │
//        │          provider adapter      │
//        │                │                │
//        └────────────────┼────────────────┘
//                         ▼
//                  normalizeTick()
//                         │
//                         ▼
//                  Normalized Tick
//                         │
//                         ▼
//                   Candle Engine
//                         │
//                         ▼
//                       Charts
//
//======================================================
// server/feeds/FeedManager.js
//======================================================
//
// Central Market Data Feed Manager
//
// Provider architecture:
//
// FeedManager
//     |
//     +--> FeedRegistry
//     |
//     +--> AliceBlueFeed
//     |       +--> websocket.js
//     |       +--> history.js
//     |
//     +--> FyersFeed
//     |
//     +--> YahooFeed
//     |
//     +--> UpstoxFeed
//     |
//     +--> ZerodhaFeed
//
// All provider ticks converge here before being
// forwarded to Candle Engine / Charts.
//
//======================================================

import {
    getFeed,
    getRegisteredFeeds
} from "./FeedRegistry.js";

import {
    onTick as onZerodhaTick
} from "../zerodha/websocket.js";

import {
    setTickHandler as setAliceBlueTickHandler
} from "../aliceblue/websocket.js";

//======================================================
// FEED MANAGER
//======================================================

export class FeedManager {

    constructor() {

        this.activeFeedName =
            null;

        this.activeFeed =
            null;

        this.running =
            false;

        this.tickListeners =
            new Set();

        this.zerodhaTickUnsubscribe =
            null;

        this.aliceBlueTickBridgeInitialized =
            false;

        this.initializeZerodhaTickBridge();

        this.initializeAliceBlueTickBridge();

    }

    //==================================================
    // GET FEED
    //==================================================

    getFeed(name) {

        return getFeed(name);

    }

    //==================================================
    // AVAILABLE FEEDS
    //==================================================

    getFeedNames() {

        return getRegisteredFeeds();

    }

    //==================================================
    // SELECT FEED
    //==================================================

    async setFeed(name) {

        const feedName =
            String(name ?? "")
                .trim()
                .toLowerCase();

        if (!feedName) {

            throw new Error(
                "[FEED MANAGER] Feed name is required."
            );

        }

        const feed =
            getFeed(feedName);

        if (!feed) {

            throw new Error(
                `[FEED MANAGER] Feed "${feedName}" is not registered.`
            );

        }

        if (
            this.activeFeedName ===
            feedName
        ) {

            return feed;

        }

        if (this.activeFeed) {

            await this.stopFeed(
                this.activeFeed
            );

        }

        this.activeFeedName =
            feedName;

        this.activeFeed =
            feed;

        this.running =
            false;

        console.log(
            "[FEED MANAGER] Selected:",
            feedName
        );

        return feed;

    }

    //==================================================
    // ACTIVE FEED
    //==================================================

    getActiveFeed() {

        return this.activeFeed;

    }

    getActiveFeedName() {

        return this.activeFeedName;

    }

    //==================================================
    // START
    //==================================================

    async start() {

        if (!this.activeFeed) {

            throw new Error(
                "[FEED MANAGER] No feed selected."
            );

        }

        if (this.running) {

            return;

        }

        if (
            typeof this.activeFeed.start ===
            "function"
        ) {

            await this.activeFeed.start(
                this.handleTick.bind(this)
            );

        }

        this.running =
            true;

        console.log(
            "[FEED MANAGER] Started:",
            this.activeFeedName
        );

    }

    //==================================================
    // STOP
    //==================================================

    async stop() {

        if (!this.activeFeed) {

            return;

        }

        await this.stopFeed(
            this.activeFeed
        );

        this.running =
            false;

    }

    //==================================================
    // STOP PROVIDER
    //==================================================

    async stopFeed(feed) {

        if (!feed) {

            return;

        }

        if (
            typeof feed.stop ===
            "function"
        ) {

            await feed.stop();

        }

        else if (
            typeof feed.disconnect ===
            "function"
        ) {

            await feed.disconnect();

        }

    }

    //==================================================
    // HISTORY
    //==================================================

    async getHistory(
        symbol,
        timeframe = "1m"
    ) {

        if (!this.activeFeed) {

            throw new Error(
                "[FEED MANAGER] No feed selected."
            );

        }

        if (
            typeof this.activeFeed.getHistory !==
            "function"
        ) {

            throw new Error(
                `[FEED MANAGER] Feed "${this.activeFeedName}" does not support getHistory().`
            );

        }

        return await this.activeFeed.getHistory(
            symbol,
            timeframe
        );

    }

    //==================================================
    // SUBSCRIBE
    //==================================================

    async subscribe(symbol) {

        if (!this.activeFeed) {

            throw new Error(
                "[FEED MANAGER] No feed selected."
            );

        }

        if (
            typeof this.activeFeed.subscribe !==
            "function"
        ) {

            throw new Error(
                `[FEED MANAGER] Feed "${this.activeFeedName}" does not support subscribe().`
            );

        }

        return await this.activeFeed.subscribe(
            symbol
        );

    }

    //==================================================
    // UNSUBSCRIBE
    //==================================================

    async unsubscribe(symbol) {

        if (!this.activeFeed) {

            throw new Error(
                "[FEED MANAGER] No feed selected."
            );

        }

        if (
            typeof this.activeFeed.unsubscribe !==
            "function"
        ) {

            throw new Error(
                `[FEED MANAGER] Feed "${this.activeFeedName}" does not support unsubscribe().`
            );

        }

        return await this.activeFeed.unsubscribe(
            symbol
        );

    }

    //==================================================
    // NORMALIZE / FORWARD TICK
    //==================================================

    handleTick(tick) {

        if (!tick) {

            return;

        }

        const provider =
            String(
                tick.provider ??
                tick.feedSource ??
                tick.feed ??
                this.activeFeedName ??
                ""
            )
            .trim()
            .toLowerCase();

        const feedSource =
            tick.feedSource ??
            tick.feed ??
            tick.provider ??
            this.activeFeedName ??
            "";

        const normalizedTick = {

            ...tick,

            feedSource,

            provider,

            symbol:
                tick.symbol ??
                tick.tradingSymbol ??
                tick.providerSymbol ??
                "",

            exchange:
                tick.exchange ??
                "",

            time:
                tick.time ??
                tick.timestamp ??
                Date.now(),

            timestamp:
                tick.timestamp ??
                tick.time ??
                Date.now(),

            ltp:
                tick.ltp ??
                tick.lastPrice ??
                tick.close ??
                null,

            close:
                tick.close ??
                tick.ltp ??
                tick.lastPrice ??
                null,

            open:
                tick.open ??
                null,

            high:
                tick.high ??
                null,

            low:
                tick.low ??
                null,

            volume:
                tick.volume ??
                tick.volumeTraded ??
                0

        };

        console.log(
            "[FEED MANAGER] TICK:",
            {
                provider:
                    normalizedTick.provider,

                symbol:
                    normalizedTick.symbol,

                exchange:
                    normalizedTick.exchange,

                ltp:
                    normalizedTick.ltp,

                time:
                    normalizedTick.time
            }
        );

        for (
            const listener
            of this.tickListeners
        ) {

            try {

                listener(
                    normalizedTick
                );

            }

            catch (error) {

                console.error(
                    "[FEED MANAGER] Tick listener error:",
                    error?.message ??
                    error
                );

            }

        }

    }

    //==================================================
    // LISTENER
    //==================================================

    onTick(listener) {

        if (
            typeof listener !==
            "function"
        ) {

            throw new Error(
                "[FEED MANAGER] Tick listener must be a function."
            );

        }

        this.tickListeners.add(
            listener
        );

        return () => {

            this.tickListeners.delete(
                listener
            );

        };

    }

    //==================================================
    // ZERODHA BRIDGE
    //==================================================

    initializeZerodhaTickBridge() {

        if (
            this.zerodhaTickUnsubscribe
        ) {

            return;

        }

        this.zerodhaTickUnsubscribe =
            onZerodhaTick(

                tick => {

                    this.handleTick(
                        tick
                    );

                }

            );

        console.log(
            "[FEED MANAGER] Zerodha tick bridge initialized."
        );

    }

    //==================================================
    // ALICE BLUE BRIDGE
    //==================================================

    initializeAliceBlueTickBridge() {

        if (
            this.aliceBlueTickBridgeInitialized
        ) {

            return;

        }

        setAliceBlueTickHandler(

            tick => {

                if (!tick) {

                    return;

                }

                this.handleTick({

                    ...tick,

                    provider:
                        "aliceblue",

                    feedSource:
                        "aliceblue"

                });

            }

        );

        this.aliceBlueTickBridgeInitialized =
            true;

        console.log(
            "[FEED MANAGER] AliceBlue tick bridge initialized."
        );

    }

    //==================================================
    // STATUS
    //==================================================

    getStatus() {

        return {

            activeFeed:
                this.activeFeedName,

            running:
                this.running,

            availableFeeds:
                this.getFeedNames(),

            tickListeners:
                this.tickListeners.size,

            aliceBlueTickBridge:
                this.aliceBlueTickBridgeInitialized

        };

    }

}

//======================================================
// SINGLETON
//======================================================

const feedManager =
    new FeedManager();

export default feedManager;