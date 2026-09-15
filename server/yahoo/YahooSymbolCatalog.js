//======================================================
// server/yahoo/YahooSymbolCatalog.js
//======================================================

import axios from "axios";

//======================================================
// STATIC YAHOO SYMBOLS
//======================================================

const YAHOO_SYMBOLS = [
    {
        symbol: "NIFTY",
        yahooSymbol: "^NSEI",
        displayName: "NIFTY 50",
        exchange: "NSE",
        type: "INDEX"
    },

    {
        symbol: "BANKNIFTY",
        yahooSymbol: "^NSEBANK",
        displayName: "NIFTY BANK",
        exchange: "NSE",
        type: "INDEX"
    },

    {
        symbol: "SENSEX",
        yahooSymbol: "^BSESN",
        displayName: "SENSEX",
        exchange: "BSE",
        type: "INDEX"
    },

    {
        symbol: "USDINR",
        yahooSymbol: "INR=X",
        displayName: "USD/INR",
        exchange: "FOREX",
        type: "FOREX"
    },

    {
        symbol: "XAUUSD",
        yahooSymbol: "GC=F",
        displayName: "Gold",
        exchange: "COMEX",
        type: "COMMODITY"
    },

    {
        symbol: "BTCUSDT",
        yahooSymbol: "BTC-USD",
        displayName: "Bitcoin",
        exchange: "CRYPTO",
        type: "CRYPTO"
    },

    {
        symbol: "ETHUSDT",
        yahooSymbol: "ETH-USD",
        displayName: "Ethereum",
        exchange: "CRYPTO",
        type: "CRYPTO"
    },

    {
        symbol: "SOLUSDT",
        yahooSymbol: "SOL-USD",
        displayName: "Solana",
        exchange: "CRYPTO",
        type: "CRYPTO"
    },

    {
        symbol: "DOGEUSDT",
        yahooSymbol: "DOGE-USD",
        displayName: "Dogecoin",
        exchange: "CRYPTO",
        type: "CRYPTO"
    },

    {
        symbol: "XRPUSDT",
        yahooSymbol: "XRP-USD",
        displayName: "XRP",
        exchange: "CRYPTO",
        type: "CRYPTO"
    }
];

//======================================================
// YAHOO SYMBOL SEARCH
//
// Responsibilities:
//
// 1. Search known Yahoo symbols.
// 2. Resolve ordinary NSE equity symbols to Yahoo.
//
// Examples:
//
// NIFTY      -> ^NSEI
// BANKNIFTY  -> ^NSEBANK
// INFY       -> INFY.NS
// RELIANCE   -> RELIANCE.NS
// TCS        -> TCS.NS
//
// IMPORTANT:
//
// This file does NOT resolve option contracts.
//
// There is intentionally NO:
// - Yahoo option-chain API
// - Yahoo option contract generation
// - numeric strike handling
//
// Option contracts must be resolved by the appropriate
// instrument source at the API/search layer.
//======================================================

export async function searchYahooSymbols(query) {

    const text =
        String(query ?? "")
            .trim()
            .toUpperCase();

    if (!text) {
        return [];
    }

    //==================================================
    // KNOWN YAHOO MAPPINGS
    //==================================================

    const knownMatches =
        YAHOO_SYMBOLS
            .filter(item => {

                return (
                    item.symbol.includes(text) ||
                    item.yahooSymbol
                        .toUpperCase()
                        .includes(text) ||
                    item.displayName
                        .toUpperCase()
                        .includes(text)
                );

            })
            .map(item => ({

                symbol:
                    item.symbol,

                yahooSymbol:
                    item.yahooSymbol,

                displayName:
                    item.displayName,

                exchange:
                    item.exchange,

                type:
                    item.type,

                feedSource:
                    "YAHOO"

            }));

    //==================================================
    // NSE EQUITY FALLBACK
    //
    // Ordinary NSE equity:
    //
    // INFY      -> INFY.NS
    // RELIANCE  -> RELIANCE.NS
    // TCS       -> TCS.NS
    //
    // Do NOT treat numeric queries as equities.
    // Do NOT generate option symbols.
    //==================================================

    const isNumeric =
        /^\d+(?:\.\d+)?$/.test(text);

    const alreadyMatched =
        knownMatches.some(
            item =>
                item.symbol === text ||
                item.yahooSymbol === text
        );

    if (
        !alreadyMatched &&
        !isNumeric &&
        /^[A-Z0-9&.-]+$/.test(text) &&
        !text.includes("=") &&
        !text.startsWith("^") &&
        !text.includes(" ")
    ) {

        knownMatches.push({

            symbol:
                text,

            yahooSymbol:
                `${text}.NS`,

            displayName:
                text,

            exchange:
                "NSE",

            type:
                "EQUITY",

            feedSource:
                "YAHOO"

        });

    }

    return knownMatches;
}