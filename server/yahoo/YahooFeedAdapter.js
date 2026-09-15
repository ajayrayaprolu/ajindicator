//==========================================
// server/yahoo/YahooFeedAdapter.js
//==========================================

import { YahooFeed } from "./YahooFeed.ts";

export function createYahooFeed() {

    const provider =
        new YahooFeed();

    let tickHandler =
        null;

    const subscriptions =
        new Set();

    return {

        //--------------------------------------------------
        // START
        //--------------------------------------------------

        async start(handler) {

            tickHandler =
                handler;

        },

        //--------------------------------------------------
        // SUBSCRIBE
        //--------------------------------------------------

        async subscribe(symbol) {

            if (!symbol) {
                return;
            }

            subscriptions.add(
                String(symbol)
            );

        },

        //--------------------------------------------------
        // UNSUBSCRIBE
        //--------------------------------------------------

        async unsubscribe(symbol) {

            subscriptions.delete(
                String(symbol)
            );

        },

        //--------------------------------------------------
        // HISTORY
        //--------------------------------------------------

        async getHistory(
            symbol,
            timeframe = "1m"
        ) {

            return await provider.getHistory(
                symbol,
                timeframe
            );

        },

        //--------------------------------------------------
        // STOP
        //--------------------------------------------------

        async stop() {

            subscriptions.clear();

            tickHandler =
                null;

            await provider.stop();

        }

    };

}