//==========================================
// server/deltaexchange/DeltaExchangeFeed.ts
//
// Delta Exchange unified market-data feed.
//
// Supports:
//   1. Delta Exchange perpetual futures   (BTCUSD, ETHUSD, ...)
//   2. Delta Exchange dated futures
//   3. Delta Exchange options (calls/puts on BTC, ETH, ...)
//
// Examples:
//
//   BTCUSD    -> perpetual futures
//   ETHUSD    -> perpetual futures
//   BTC-27D-60000-C  -> call option (native Delta symbol)
//
//                        Delta Exchange
//                              │
//             ┌────────────────┼────────────────┐
//             │                │                │
//         PERPETUAL        DATED FUT       OPTIONS
//             │                │                │
//      api.delta.exchange  (same REST)    (same REST)
//             │                │                │
//      /v2/history/candles        /v2/products (contract master)
//      socket.delta.exchange      candlestick_{tf} WS channel
//
// REST base:    https://api.delta.exchange
// WebSocket:    wss://socket.delta.exchange
// Docs:         https://docs.delta.exchange
//
// Public market data (klines, products, tickers) needs NO auth.
// Auth (HMAC SHA256 signature) is only needed for account
// endpoints - see DeltaExchangeAuth.ts / the auth check script.
//==========================================

import axios from "axios";
import type { Candle } from "../../src/types/Candle.ts";

//==========================================
// ENDPOINTS
//==========================================

const REST_API = process.env.DELTA_API_BASE ?? "https://api.india.delta.exchange";
const WS_URL = process.env.DELTA_WS_URL ?? "wss://socket.india.delta.exchange";

//==========================================
// INTERVAL MAP
//
// Delta candle history "resolution" values:
//   1, 3, 5, 15, 30, 60, 120, 240, 360, 720 minutes,
//   "D", "W", "M"
//==========================================

// India platform candle resolutions are letter-based
// (the API validates against: 1m,3m,5m,15m,30m,1h,2h,4h,6h,1d,1w).
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
    "12h": "12h",
    "1d": "1d",
    "1w": "1w"
};

// WS candlestick channel names use the raw resolution string too.
const WS_CHANNEL_MAP: Record<string, string> = {
    "1m": "candlestick_1m",
    "3m": "candlestick_3m",
    "5m": "candlestick_5m",
    "15m": "candlestick_15m",
    "30m": "candlestick_30m",
    "1h": "candlestick_1h",
    "2h": "candlestick_2h",
    "4h": "candlestick_4h",
    "6h": "candlestick_6h",
    "1d": "candlestick_1d"
};

//==========================================
// SYMBOL NORMALIZATION
//==========================================

function resolveDeltaSymbol(symbol: string): string {
    return String(symbol ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9._-]/g, "");
}

function resolveInterval(timeframe: string): string {
    return INTERVAL_MAP[timeframe] ?? "5m";
}

//==========================================
// CANDLE MAPPER
//
// Delta candles: { time (epoch seconds), open, high, low, close, volume }
//==========================================

function mapCandle(c: any): Candle {
    const time = Number(c.time);
    return {
        time:
            time > 1e12
                ? Math.floor(time / 1000)   // ms guard
                : Math.floor(time),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume ?? 0)
    } as Candle;
}

function validCandle(c: Candle): boolean {
    return (
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
    );
}

//==========================================
// DELTA EXCHANGE FEED
//==========================================

export class DeltaExchangeFeed {

    private ws?: WebSocket;

    //==========================================
    // GET HISTORY
    //
    // GET /v2/history/candles
    //   ?symbol=BTCUSD&resolution=5&start=...&end=...
    //   -> { success, result: [{ time, open, high, low, close, volume }] }
    //==========================================

    async getHistory(
        symbol: string,
        timeframe: string = "5m",
        lookbackBars: number = 1000
    ): Promise<Candle[]> {

        const pair = resolveDeltaSymbol(symbol);
        const resolution = resolveInterval(timeframe);

        if (!pair) {
            return [];
        }

        // Delta caps each candle-history request window; request the
        // largest supported span ending now, then tail-trim.
        const end = Math.floor(Date.now() / 1000);
        const stepSeconds: Record<string, number> = {
            "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800,
            "1h": 3600, "2h": 7200, "4h": 14400, "6h": 21600,
            "12h": 43200, "1d": 86400, "1w": 604800
        };
        const step = stepSeconds[resolution] ?? 300;
        const start = end - lookbackBars * step;

        console.log(`[DELTA] History: ${pair} res=${resolution} (${timeframe})`);

        try {
            const response = await axios.get(
                `${REST_API}/v2/history/candles`,
                {
                    timeout: 10000,
                    params: {
                        symbol: pair,
                        resolution,
                        start,
                        end
                    }
                }
            );

            const rows = response?.data?.result;
            if (!Array.isArray(rows)) {
                console.error("[DELTA] Invalid candle response:", response?.data);
                return [];
            }

            const candles = rows
                .map(mapCandle)
                .filter(validCandle);

            console.log(`[DELTA] ${pair}: ${candles.length} candles`);
            return candles;

        } catch (error: any) {
            console.error("[DELTA HISTORY ERROR]", {
                symbol: pair,
                timeframe: resolution,
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message
            });
            return [];
        }
    }

    //==========================================
    // SUBSCRIBE (live candles)
    //
    // Delta WS v2:
    //   -> { type: "subscribe",
    //        payload: { channels: [{ name: "candlestick_5m",
    //                                symbols: ["BTCUSD"] }] } }
    //   <- { type: "candlestick_5m", symbol, candles: [ {...} ] }
    //      each candle: { time, open, high, low, close, volume }
    //==========================================

    subscribe(
        symbol: string,
        callback: (candle: Candle) => void,
        timeframe: string = "5m"
    ): void {

        const pair = resolveDeltaSymbol(symbol);
        const channel =
            WS_CHANNEL_MAP[timeframe] ?? "candlestick_5m";

        if (!pair) {
            return;
        }

        this.disconnect();

        console.log(`[DELTA] WebSocket: ${channel} ${pair}`);

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            try {
                this.ws?.send(JSON.stringify({
                    type: "subscribe",
                    payload: {
                        channels: [
                            {
                                name: channel,
                                symbols: [pair]
                            }
                        ]
                    }
                }));
                console.log(`[DELTA] WS subscribed: ${pair} ${channel}`);
            } catch (error) {
                console.error("[DELTA WS SUBSCRIBE ERROR]", error);
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(String(event.data));

                if (String(message?.type) !== channel) {
                    return;
                }

                const candles = message?.candles;
                const list = Array.isArray(candles) ? candles : [candles];

                for (const raw of list) {
                    if (!raw) continue;
                    const candle = mapCandle(raw);
                    if (validCandle(candle)) {
                        callback(candle);
                    }
                }
            } catch (error) {
                console.error("[DELTA WS PARSE ERROR]", error);
            }
        };

        this.ws.onerror = (error) => {
            console.error("[DELTA WS ERROR]", error);
        };

        this.ws.onclose = () => {
            console.log("[DELTA] WS closed");
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
            this.ws = undefined;
        }
    }
}
