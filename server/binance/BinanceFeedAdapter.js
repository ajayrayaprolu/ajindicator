//==========================================
// server/binance/BinanceFeedAdapter.js
//
// Unified Binance adapter.
//
// Supports:
//   - Spot
//   - USDⓈ-M Futures
//
// Default market:
//   spot
//
// Examples:
//
//   BTCUSDT -> spot
//   ETHUSDT -> spot
//   BTCUSDT -> futures
//   XAUUSDT -> futures
//  
//	Frontend
//   │
//   │ symbol + timeframe + market
//   ▼
// api/binance/:symbol
//   │
//   ├── spot
//   │     ├── REST: api.binance.com
//   │     └── WS:   stream.binance.com
//   │
//   └── futures
//         ├── REST: fapi.binance.com
//         └── WS:   fstream.binance.com
//=================================================
//                 SEARCH BAR
//                     │
//                     ▼
//              Selected Symbol
//                     │
//                     ▼
//          BinanceSymbolResolver
//                     │
//          ┌──────────┴──────────┐
//          │                     │
//       Spot API             Futures API
//          │                     │
//          ▼                     ▼
//       FOUND?                 FOUND?
//          │                     │
//          └──────────┬──────────┘
//                     ▼
//             BinanceInstrument
//                     │
//          ┌──────────┴──────────┐
//          │                     │
//       REST history          WebSocket
//          │                     │
//          ▼                     ▼
//       Correct API           Correct WS
//==========================================

import { BinanceFeed } from "./BinanceFeed.ts";

//==========================================
// BINANCE FEED FACTORY
//==========================================

export function createBinanceFeed() {

    const provider =
        new BinanceFeed();


    let tickHandler =
        null;


    const subscriptions =
        new Map();


    //==========================================
    // NORMALIZE MARKET
    //==========================================

    function normalizeMarket(
        market
    ) {

        const value =
            String(
                market ?? "spot"
            )
                .trim()
                .toLowerCase();


        if (
            value === "futures" ||
            value === "future" ||
            value === "usdm" ||
            value === "usd-m"
        ) {

            return "futures";
        }


        return "spot";
    }


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
                /[^A-Z0-9]/g,
                ""
            );
    }


    //==========================================
    // START
    //==========================================

    return {


        async start(
            handler
        ) {

            tickHandler =
                handler;


            console.log(
                "[BINANCE ADAPTER] Started."
            );
        },


        //======================================
        // SUBSCRIBE
        //======================================

        async subscribe(
            symbol,
            timeframe = "1m",
            market = "spot"
        ) {

            const resolvedSymbol =
                normalizeSymbol(
                    symbol
                );


            const resolvedMarket =
                normalizeMarket(
                    market
                );


            if (!resolvedSymbol) {

                console.warn(
                    "[BINANCE ADAPTER] " +
                    "Subscribe skipped: empty symbol."
                );

                return;
            }


            const key =
                `${resolvedSymbol}:` +
                `${resolvedMarket}:` +
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

                    timeframe,

                    market:
                        resolvedMarket
                }
            );


            console.log(
                `[BINANCE ADAPTER] ` +
                `Subscribe: ${resolvedSymbol} ` +
                `${timeframe} ` +
                `${resolvedMarket}`
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

                timeframe,

                resolvedMarket
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
                `[BINANCE ADAPTER] ` +
                `Unsubscribed: ${resolvedSymbol}`
            );
        },


        //======================================
        // GET HISTORY
        //======================================

        async getHistory(
            symbol,
            timeframe = "1m",
            market = "spot"
        ) {

            const resolvedSymbol =
                normalizeSymbol(
                    symbol
                );


            const resolvedMarket =
                normalizeMarket(
                    market
                );


            if (!resolvedSymbol) {

                return [];
            }


            console.log(
                `[BINANCE ADAPTER] ` +
                `History: ${resolvedSymbol} ` +
                `${timeframe} ` +
                `${resolvedMarket}`
            );


            return await provider.getHistory(

                resolvedSymbol,

                timeframe,

                resolvedMarket
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
                "[BINANCE ADAPTER] Stopped."
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
                "[BINANCE ADAPTER] Disconnected."
            );
        }


    };
}