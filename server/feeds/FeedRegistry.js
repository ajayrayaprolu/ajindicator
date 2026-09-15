//======================================================
// server/feeds/FeedRegistry.js
//======================================================
//
// Central provider registry.
//
// FeedManager uses this registry to discover and select
// market-data providers.
//
// Provider implementations remain inside their own
// provider directories.
//
// Example:
//
//   server/yahoo/YahooFeed.ts
//   server/fyers/FyersFeed.js
//   server/aliceblue/AliceBlueFeed.js
//   server/upstox/UpstoxFeed.js
//   server/zerodha/ZerodhaFeed.ts
//
//					  FeedRegistry
//							│
//                          │
//        ┌─────────┬───────┼────────┬─────────┐
//        ▼         ▼       ▼        ▼         ▼
//      Yahoo     FYERS  AliceBlue Upstox   Zerodha
//        │         │       │        │         │
//        └─────────┴───────┼────────┴─────────┘
//							│
//						FeedManager
//                          ▼
//                    normalizeTick
//                          │
//                          ▼
//                  Normalized Market Tick
//                          │
//                          ▼
//                    Candle Engine
//                          │
//                          ▼
//                       Charts
//======================================================
//======================================================
// server/feeds/FeedRegistry.js
//======================================================
//
// Central Market Data Feed Registry
//
// Responsibilities
//
// 1. Register market-data providers
// 2. Retrieve a registered provider
// 3. Check provider availability
// 4. Remove providers
// 5. List registered providers
//
// Provider-specific implementation remains outside this file.
//
// Yahoo    -> server/yahoo/
// FYERS    -> server/fyers/
// AliceBlue -> server/aliceblue/
// Upstox   -> server/upstox/
// Zerodha  -> server/zerodha/
//
// FeedManager is responsible for:
//
//     select provider
//     start provider
//     stop provider
//     history
//     subscribe
//     unsubscribe
//     normalized ticks
//
//======================================================

const providers = new Map();

//======================================================
// NORMALIZE NAME
//======================================================

function normalizeFeedName(name) {

    return String(name ?? "")
        .trim()
        .toLowerCase();

}

//======================================================
// REGISTER
//======================================================

export function registerFeed(
    name,
    feed
) {

    const key =
        normalizeFeedName(name);

    if (!key) {

        throw new Error(
            "[FEED REGISTRY] Feed name is required."
        );

    }

    if (!feed) {

        throw new Error(
            `[FEED REGISTRY] Feed implementation missing: ${key}`
        );

    }

    if (
        typeof feed !== "object" &&
        typeof feed !== "function"
    ) {

        throw new Error(
            `[FEED REGISTRY] Invalid feed implementation: ${key}`
        );

    }

    providers.set(
        key,
        feed
    );

    console.log(
        "[FEED REGISTRY] Registered:",
        key
    );

    return feed;

}

//======================================================
// GET
//======================================================

export function getFeed(
    name
) {

    const key =
        normalizeFeedName(name);

    if (!key) {

        return null;

    }

    return (
        providers.get(key)
        ??
        null
    );

}

//======================================================
// HAS
//======================================================

export function hasFeed(
    name
) {

    const key =
        normalizeFeedName(name);

    if (!key) {

        return false;

    }

    return providers.has(
        key
    );

}

//======================================================
// REMOVE
//======================================================

export function unregisterFeed(
    name
) {

    const key =
        normalizeFeedName(name);

    if (!key) {

        return false;

    }

    const removed =
        providers.delete(
            key
        );

    if (removed) {

        console.log(
            "[FEED REGISTRY] Unregistered:",
            key
        );

    }

    return removed;

}

//======================================================
// LIST
//======================================================

export function getRegisteredFeeds() {

    return Array.from(
        providers.keys()
    );

}

//======================================================
// COUNT
//======================================================

export function getFeedCount() {

    return providers.size;

}

//======================================================
// CLEAR
//======================================================

export function clearFeedRegistry() {

    providers.clear();

    console.log(
        "[FEED REGISTRY] Registry cleared."
    );

}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {

    registerFeed,

    getFeed,

    hasFeed,

    unregisterFeed,

    getRegisteredFeeds,

    getFeedCount,

    clearFeedRegistry

};