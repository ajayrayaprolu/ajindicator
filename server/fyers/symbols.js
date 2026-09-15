//======================================================
// server/fyers/symbols.js
//======================================================
//
// FYERS symbol normalization.
//
// FYERS equity:
//
//   NSE:RELIANCE-EQ
//
// FYERS indices:
//
//   NSE:NIFTY50-INDEX
//   NSE:NIFTYBANK-INDEX
//
// BSE:
//
//   BSE:SENSEX-INDEX
//======================================================

export const INDEX_MAP = {
    NIFTY:
        "NSE:NIFTY50-INDEX",

    NIFTY50:
        "NSE:NIFTY50-INDEX",

    BANKNIFTY:
        "NSE:NIFTYBANK-INDEX",

    NIFTYBANK:
        "NSE:NIFTYBANK-INDEX",

    FINNIFTY:
        "NSE:FINNIFTY-INDEX",

    MIDCPNIFTY:
        "NSE:MIDCPNIFTY-INDEX",

    SENSEX:
        "BSE:SENSEX-INDEX",

    BANKEX:
        "BSE:BANKEX-INDEX",

    INDIA_VIX:
        "NSE:INDIAVIX-INDEX",

    INDVIX:
        "NSE:INDIAVIX-INDEX"
};

//======================================================
// RESOLVE FYERS SYMBOL
//======================================================
//
// Supports:
//
// EQUITY
//   RELIANCE
//   RELIANCE-EQ
//   NSE:RELIANCE-EQ
//
// INDEX
//   NIFTY
//   NIFTY50
//   NSE:NIFTY
//   SENSEX
//
// OPTION
//   NSE:NIFTY25SEP26000CE
//   NSE:NIFTY25SEP26000PE
//
// IMPORTANT:
//
// FYERS option symbols are already native FYERS symbols.
// They MUST NOT be converted to -EQ.
//
// The option symbol should normally come from the FYERS
// option symbol master and must be passed through unchanged.
//======================================================

export function resolveFyersSymbol(
    symbol
) {

    let value =
        String(
            symbol ?? ""
        )
        .trim()
        .toUpperCase();

    if (!value) {

        throw new Error(
            "[FYERS SYMBOL] Symbol is required."
        );

    }

    value =
        value.replace(
            /\s+/g,
            ""
        );

    //--------------------------------------------------
    // ALREADY-NATIVE FYERS OPTION
    //
    // Example:
    //
    // NSE:NIFTY25SEP26000CE
    // NSE:NIFTY25SEP26000PE
    //
    // DO NOT APPEND -EQ.
    //--------------------------------------------------

    if (
        /^(NSE|BSE):.*(CE|PE)$/.test(
            value
        )
    ) {

        return value;

    }

    //--------------------------------------------------
    // NIFTY INDEX
    //--------------------------------------------------

    if (
        value === "NIFTY" ||
        value === "NIFTY50" ||
        value === "NIFTY50-INDEX" ||
        value === "NSE:NIFTY"
    ) {

        return "NSE:NIFTY50-INDEX";

    }

    //--------------------------------------------------
    // SENSEX INDEX
    //--------------------------------------------------

    if (
        value === "SENSEX" ||
        value === "BSE:SENSEX" ||
        value === "BSE:SENSEX-INDEX"
    ) {

        return "BSE:SENSEX-INDEX";

    }

    //--------------------------------------------------
    // ALL OTHER INDICES — driven by INDEX_MAP so
    // BANKNIFTY, FINNIFTY, MIDCPNIFTY, BANKEX, INDIA_VIX
    // resolve the same way NIFTY/SENSEX do above, instead
    // of silently falling through to the equity path.
    //--------------------------------------------------

    const bareValue =
        value.replace(/^(NSE:|BSE:)/, "");

    if (INDEX_MAP[bareValue]) {

        return INDEX_MAP[bareValue];

    }

    if (value.endsWith("-INDEX")) {

        return value.includes(":")
            ? value
            : `NSE:${value}`;

    }

    //--------------------------------------------------
    // REMOVE EXCHANGE PREFIX
    //
    // We remember the exchange so BSE equities are not
    // accidentally returned as NSE.
    //--------------------------------------------------

    let exchange =
        "NSE";

    if (
        value.startsWith("NSE:")
    ) {

        exchange =
            "NSE";

        value =
            value.substring(4);

    }
    else if (
        value.startsWith("BSE:")
    ) {

        exchange =
            "BSE";

        value =
            value.substring(4);

    }

    //--------------------------------------------------
    // EQUITY
    //--------------------------------------------------

    if (
        !value.endsWith("-EQ") &&
        !value.endsWith("-INDEX")
    ) {

        value =
            `${value}-EQ`;

    }

    //--------------------------------------------------
    // RETURN NATIVE FYERS FORMAT
    //--------------------------------------------------

    return (
        `${exchange}:${value}`
    );

}

//======================================================
// MANY
//======================================================

export function resolveFyersSymbols(
    symbols,
    exchange = "NSE"
) {

    const list =
        Array.isArray(symbols)
            ? symbols
            : [symbols];

    return list
        .filter(
            symbol =>
                symbol !== undefined &&
                symbol !== null &&
                String(symbol).trim() !== ""
        )
        .map(
            symbol =>
                resolveFyersSymbol(
                    symbol,
                    exchange
                )
        );
}

//======================================================
// CHECK
//======================================================

export function isFyersSymbol(symbol) {

    if (!symbol) {
        return false;
    }

    return /^[A-Z]+:/.test(
        String(symbol)
            .trim()
            .toUpperCase()
    );
}

//======================================================
// EXCHANGE
//======================================================

export function getFyersExchange(symbol) {

    if (!symbol) {
        return "";
    }

    return String(symbol)
        .split(":")[0]
        .toUpperCase();
}

//======================================================
// NAME
//======================================================

export function getFyersSymbolName(symbol) {

    if (!symbol) {
        return "";
    }

    return String(symbol)
        .split(":")
        .pop()
        .replace(/-EQ$/, "")
        .replace(/-INDEX$/, "");
}

//======================================================

export default {
    resolveFyersSymbol,
    resolveFyersSymbols,
    isFyersSymbol,
    getFyersExchange,
    getFyersSymbolName
};