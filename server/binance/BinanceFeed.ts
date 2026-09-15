//==========================================
// server/binance/BinanceFeed.ts
//
// Binance unified market-data feed.
// 
// Supports:
//   1. Binance Spot
//   2. Binance USDⓈ-M Futures
//
// Examples:
//
//   BTCUSDT -> spot
//   ETHUSDT -> spot
//   BTCUSDT -> futures
//   XAUUSDT -> futures
//
//                         Binance
//                            │
//             ┌──────────────┼──────────────┐
//             │              │              │
//            SPOT         USDⓈ-M         COIN-M
//             │           FUTURES         FUTURES
//             │              │              │
//      api.binance.com  fapi.binance.com  dapi.binance.com
//             │              │              │
//     /api/v3/klines    /fapi/v1/klines     │
//    stream.binance.com fstream.binance.com │
//             │              │              │
//          BTCUSDT        XAUUSDT         BTCUSD
//          ETHUSDT        BTCUSDT 
//          BNBUSDT        ETHUSDT
//==========================================

import axios from "axios";
import type { Candle } from "../../src/types/Candle";


//==========================================
// TYPES
//==========================================

export type BinanceMarket =
    | "spot"
    | "futures";


//==========================================
// ENDPOINTS
//==========================================

const SPOT_API =
    "https://api.binance.com";

const FUTURES_API =
    "https://fapi.binance.com";


const SPOT_WS =
    "wss://stream.binance.com:9443/ws";

const FUTURES_WS =
    "wss://fstream.binance.com/ws";


//==========================================
// INTERVAL MAP
//==========================================

const INTERVAL_MAP: Record<string, string> = {

    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",

    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "6h": "6h",
    "8h": "8h",
    "12h": "12h",

    "1d": "1d",
    "3d": "3d",

    "1w": "1w",

    "1M": "1M"
};


//==========================================
// SYMBOL NORMALIZATION
//==========================================

function resolveBinanceSymbol(
    symbol: string
): string {

    return String(symbol ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}


//==========================================
// INTERVAL NORMALIZATION
//==========================================

function resolveInterval(
    timeframe: string
): string {

    return (
        INTERVAL_MAP[timeframe] ??
        "1m"
    );
}


//==========================================
// MARKET NORMALIZATION
//==========================================

function resolveMarket(
    market?: BinanceMarket
): BinanceMarket {

    if (
        String(market).toLowerCase() ===
        "futures"
    ) {

        return "futures";
    }

    return "spot";
}


//==========================================
// API URL
//==========================================

function getApiBase(
    market: BinanceMarket
): string {

    return market === "futures"
        ? FUTURES_API
        : SPOT_API;
}


//==========================================
// WEBSOCKET URL
//==========================================

function getWebSocketBase(
    market: BinanceMarket
): string {

    return market === "futures"
        ? FUTURES_WS
        : SPOT_WS;
}


//==========================================
// KLINE MAPPER
//==========================================

function mapKline(
    k: any
): Candle {

    return {

        time:
            Math.floor(
                Number(k[0]) / 1000
            ),

        open:
            Number(k[1]),

        high:
            Number(k[2]),

        low:
            Number(k[3]),

        close:
            Number(k[4]),

        volume:
            Number(k[5])
    };
}


//==========================================
// BINANCE FEED
//==========================================

export class BinanceFeed {

    private ws?: WebSocket;


    //==========================================
    // GET HISTORY
    //==========================================

    async getHistory(
        symbol: string,
        timeframe: string = "1m",
        market: BinanceMarket = "spot"
    ): Promise<Candle[]> {

        const pair =
            resolveBinanceSymbol(symbol);

        const interval =
            resolveInterval(timeframe);

        const resolvedMarket =
            resolveMarket(market);

        if (!pair) {

            return [];
        }


        const baseUrl =
            getApiBase(
                resolvedMarket
            );


        const endpoint =
            resolvedMarket === "futures"
                ? "/fapi/v1/klines"
                : "/api/v3/klines";


        console.log(
            `[BINANCE ${resolvedMarket.toUpperCase()}] ` +
            `History: ${pair} ${interval}`
        );


        try {

            const response =
                await axios.get(
                    `${baseUrl}${endpoint}`,
                    {
                        timeout: 10000,

                        params: {

                            symbol: pair,

                            interval,

                            limit: 1000
                        }
                    }
                );


            if (
                !Array.isArray(
                    response.data
                )
            ) {

                console.error(
                    "[BINANCE] Invalid kline response:",
                    response.data
                );

                return [];
            }


            const candles =
                response.data
                    .map(mapKline)
                    .filter(
                        (candle: Candle) =>
                            Number.isFinite(
                                candle.time
                            ) &&

                            Number.isFinite(
                                candle.open
                            ) &&

                            Number.isFinite(
                                candle.high
                            ) &&

                            Number.isFinite(
                                candle.low
                            ) &&

                            Number.isFinite(
                                candle.close
                            )
                    );


            console.log(
                `[BINANCE ${resolvedMarket.toUpperCase()}] ` +
                `${pair}: ${candles.length} candles`
            );


            return candles;

        } catch (error: any) {

            console.error(
                `[BINANCE ${resolvedMarket.toUpperCase()} ` +
                `HISTORY ERROR]`,
                {

                    symbol: pair,

                    timeframe: interval,

                    status:
                        error?.response?.status,

                    data:
                        error?.response?.data,

                    message:
                        error?.message
                }
            );


            return [];
        }
    }


    //==========================================
    // SUBSCRIBE
    //==========================================

    subscribe(
        symbol: string,
        callback: (
            candle: Candle
        ) => void,
        timeframe: string = "1m",
        market: BinanceMarket = "spot"
    ): void {

        const pair =
            resolveBinanceSymbol(symbol)
                .toLowerCase();

        const interval =
            resolveInterval(timeframe);

        const resolvedMarket =
            resolveMarket(market);


        if (!pair) {

            return;
        }


        this.disconnect();


        const wsBase =
            getWebSocketBase(
                resolvedMarket
            );


        const wsUrl =
            `${wsBase}/` +
            `${pair}@kline_${interval}`;


        console.log(
            `[BINANCE ${resolvedMarket.toUpperCase()}] ` +
            `WebSocket: ${wsUrl}`
        );


        this.ws =
            new WebSocket(
                wsUrl
            );


        this.ws.onopen =
            () => {

                console.log(
                    `[BINANCE ${resolvedMarket.toUpperCase()}] ` +
                    `WS connected: ${pair} ${interval}`
                );
            };


        this.ws.onmessage =
            (event) => {

                try {

                    const message =
                        JSON.parse(
                            String(
                                event.data
                            )
                        );


                    if (
                        !message?.k
                    ) {

                        return;
                    }


                    const k =
                        message.k;


                    callback({

                        time:
                            Math.floor(
                                Number(k.t) / 1000
                            ),

                        open:
                            Number(k.o),

                        high:
                            Number(k.h),

                        low:
                            Number(k.l),

                        close:
                            Number(k.c),

                        volume:
                            Number(k.v)
                    });


                } catch (error) {

                    console.error(
                        "[BINANCE WS PARSE ERROR]",
                        error
                    );
                }
            };


        this.ws.onerror =
            (error) => {

                console.error(
                    `[BINANCE ${resolvedMarket.toUpperCase()} ` +
                    `WS ERROR]`,
                    error
                );
            };


        this.ws.onclose =
            () => {

                console.log(
                    `[BINANCE ${resolvedMarket.toUpperCase()}] ` +
                    `WS closed: ${pair} ${interval}`
                );
            };
    }


    //==========================================
    // DISCONNECT
    //==========================================

    disconnect(): void {

        if (this.ws) {

            try {

                this.ws.close();

            } catch {
                // ignore
            }


            this.ws =
                undefined;
        }
    }
}