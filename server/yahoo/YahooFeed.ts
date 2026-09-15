//==========================================
// server/yahoo/YahooFeed.ts
//==========================================

import axios from "axios";

const YAHOO_BASE_URL =
    "https://query1.finance.yahoo.com/v8/finance/chart";

const INDEX_MAP: Record<string, string> = {

    NIFTY:
        "^NSEI",

    BANKNIFTY:
        "^NSEBANK",

    SENSEX:
        "^BSESN",

    USDINR:
        "INR=X",

    XAUUSD:
        "GC=F"

};

const INTERVAL_MAP: Record<string, string> = {

    "1m": "1m",
    "3m": "5m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "4h": "1h",
    "1d": "1d"

};

const RANGE_MAP: Record<string, string> = {

    "1m": "5d",
    "3m": "5d",
    "5m": "5d",
    "15m": "1mo",
    "30m": "1mo",
    "1h": "3mo",
    "4h": "6mo",
    "1d": "1y"

};

function resolveYahooSymbol(
    symbol: string
): string {

    const value =
        String(symbol)
            .trim()
            .toUpperCase();

    if (
        INDEX_MAP[value]
    ) {
        return INDEX_MAP[value];
    }

    if (
        value.endsWith(".NS") ||
        value.endsWith(".BO") ||
        value.startsWith("^") ||
        value.includes("=") ||
        value.includes("-")
    ) {
        return value;
    }

    if (
        value.endsWith("USDT")
    ) {
        return value.replace(
            "USDT",
            "-USD"
        );
    }

    return `${value}.NS`;
}

function toNumber(
    value: unknown
): number | undefined {

    if (
        value == null ||
        value === ""
    ) {
        return undefined;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : undefined;
}

export class YahooFeed {

    async start(
        _handler?: (tick: unknown) => void
    ): Promise<void> {
        // Yahoo is HTTP based.
    }

    async getHistory(
        symbol: string,
        timeframe: string = "1m"
    ): Promise<any[]> {

        const yahooSymbol =
            resolveYahooSymbol(symbol);

        const interval =
            INTERVAL_MAP[timeframe] ??
            "1m";

        const range =
            RANGE_MAP[timeframe] ??
            "5d";

        // console.log(
        //   "[YAHOO]",
        //    symbol,
        //    "->",
        //    yahooSymbol,
        //    timeframe
        //);

        const response =
            await axios.get(
                `${YAHOO_BASE_URL}/${encodeURIComponent(yahooSymbol)}`,
                {
                    timeout: 10000,
                    params: {
                        interval,
                        range,
                        includePrePost:
                            false,
                        events:
                            "div,splits"
                    },
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0"
                    }
                }
            );

        const result =
            response.data
                ?.chart
                ?.result?.[0];

        if (!result) {
            return [];
        }

        const timestamps =
            result.timestamp ?? [];

        const quote =
            result.indicators
                ?.quote?.[0];

        if (!quote) {
            return [];
        }

        const candles =
            timestamps
                .map(
                    (
                        timestamp: number,
                        index: number
                    ) => ({

                        time:
                            timestamp,

                        open:
                            toNumber(
                                quote.open?.[index]
                            ),

                        high:
                            toNumber(
                                quote.high?.[index]
                            ),

                        low:
                            toNumber(
                                quote.low?.[index]
                            ),

                        close:
                            toNumber(
                                quote.close?.[index]
                            ),

                        volume:
                            toNumber(
                                quote.volume?.[index]
                            ) ?? 0

                    })
                )
                .filter(
                    (candle: any) =>
                        candle.open != null &&
                        candle.high != null &&
                        candle.low != null &&
                        candle.close != null
                );

        return candles;
    }

    async subscribe(
        _symbol: string,
        _callback: (candle: any) => void
    ): Promise<void> {

        /*
         * Yahoo chart API is HTTP based.
         * Live refresh is intentionally handled
         * by the frontend HTTP adapter.
         */

    }

    async unsubscribe(
        _symbol: string
    ): Promise<void> {
    }

    async stop(): Promise<void> {
    }

    async disconnect(): Promise<void> {
    }

}