//==========================================
// server/deltaexchange/DeltaExchangeFeedAdapter.js
//
// Unified Delta Exchange adapter.
//
// Same provider contract as BinanceFeedAdapter.js:
//   start(handler) / subscribe(symbol, timeframe) /
//   unsubscribe(symbol) / getHistory(symbol, timeframe) /
//   stop() / disconnect()
//
// Frontend
//   │
//   │ symbol + timeframe
//   ▼
// api/deltaexchange/:symbol
//   │
//   ├── REST:  api.india.delta.exchange  /v2/history/candles
//   └── WS:    socket.india.delta.exchange  candlestick_{tf}
//
// Delta perps are quoted directly (BTCUSD, ETHUSD, XRPUSD),
// so there is no spot/futures split to normalize - the symbol
// IS the product symbol from the /v2/products master.
//==========================================

import { DeltaExchangeFeed } from "./DeltaExchangeFeed.ts";

//==========================================
// DELTA FEED FACTORY
//==========================================

export function createDeltaExchangeFeed() {

    const provider =
        new DeltaExchangeFeed();


    let tickHandler =
        null;


    const subscriptions =
        new Map();


    //==========================================
    // NORMALIZE SYMBOL
    //==========================================

    function normalizeSymbol(
        symbol
    ) {

        return String(
                symbol ?? ""
            )
            .trim()
            .toUpperCase()
            .replace(
                /[^A-Z0-9._-]/g,
                ""
            );
    }


    //==========================================
    // PROVIDER OBJECT
    //==========================================

    return {


        async start(
            handler
        ) {

            tickHandler =
                handler;


            console.log(
                "[DELTA ADAPTER] Started."
            );
        },


        //======================================
        // SUBSCRIBE
        //======================================

        async subscribe(
            symbol,
            timeframe = "1m"
        ) {

            const resolvedSymbol =
                normalizeSymbol(
                    symbol
                );


            if (!resolvedSymbol) {

                console.warn(
                    "[DELTA ADAPTER] " +
                    "Subscribe skipped: empty symbol."
                );

                return;
            }


            const key =
                `${resolvedSymbol}:` +
                `${timeframe}`;


            // Remove existing subscriptions
            // for the same symbol.

            await this.unsubscribe(
                resolvedSymbol
            );


            subscriptions.set(
                key,
                {

                    symbol:
                        resolvedSymbol,

                    timeframe
                }
            );


            console.log(
                `[DELTA ADAPTER] ` +
                `Subscribe: ${resolvedSymbol} ` +
                `${timeframe}`
            );


            provider.subscribe(

                resolvedSymbol,

                candle => {

                    if (
                        typeof tickHandler ===
                        "function"
                    ) {

                        tickHandler(
                            candle
                        );
                    }

                },

                timeframe
            );
        },


        //======================================
        // UNSUBSCRIBE
        //======================================

        async unsubscribe(
            symbol
        ) {

            const resolvedSymbol =
                normalizeSymbol(
                    symbol
                );


            if (!resolvedSymbol) {

                return;
            }


            const prefix =
                `${resolvedSymbol}:`;


            for (
                const key of
                subscriptions.keys()
            ) {

                if (
                    key.startsWith(
                        prefix
                    )
                ) {

                    subscriptions.delete(
                        key
                    );
                }
            }


            provider.disconnect();


            console.log(
                `[DELTA ADAPTER] ` +
                `Unsubscribed: ${resolvedSymbol}`
            );
        },


        //======================================
        // GET HISTORY
        //======================================

        async getHistory(
            symbol,
            timeframe = "1m"
        ) {

            const resolvedSymbol =
                normalizeSymbol(
                    symbol
                );


            if (!resolvedSymbol) {

                return [];
            }


            console.log(
                `[DELTA ADAPTER] ` +
                `History: ${resolvedSymbol} ` +
                `${timeframe}`
            );


            return await provider.getHistory(

                resolvedSymbol,

                timeframe
            );
        },


        //======================================
        // STOP
        //======================================

        async stop() {

            subscriptions.clear();


            tickHandler =
                null;


            provider.disconnect();


            console.log(
                "[DELTA ADAPTER] Stopped."
            );
        },


        //======================================
        // DISCONNECT
        //======================================

        async disconnect() {

            subscriptions.clear();


            tickHandler =
                null;


            provider.disconnect();


            console.log(
                "[DELTA ADAPTER] Disconnected."
            );
        }


    };

}
