/****************************************************************************************
 * File:
 * PriceActionResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/PriceAction/PriceActionResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Price Action Engine.
 *
 * This contract exposes raw institutional candle analytics only.
 * No confidence aggregation, trade qualification or execution
 * logic belongs in this file.
 *
 * AJ v2 Architecture
 *
 * MarketState
 *      │
 *      ▼
 * OrderFlow
 *      │
 *      ▼
 * MarketStructure
 *      │
 *      ▼
 * Liquidity
 *      │
 *      ▼
 * OrderBlock
 *      │
 *      ▼
 * PriceAction
 *      │
 *      ▼
 * Trend
 ****************************************************************************************/

export interface PriceActionResult {

    //--------------------------------------------------
    // CANDLE QUALITY
    //--------------------------------------------------

    strongBull: boolean;

    strongBear: boolean;

    weakBull: boolean;

    weakBear: boolean;

    neutral: boolean;

    candleQuality: number;

    confidence: number;

    //--------------------------------------------------
    // BODY / WICK ANALYSIS
    //--------------------------------------------------

    bodyPercent: number;

    upperWickPercent: number;

    lowerWickPercent: number;

    bodyDominance: number;

    wickDominance: number;

    longUpperWick: boolean;

    longLowerWick: boolean;

    balancedWick: boolean;

    exhaustionWick: boolean;

    //--------------------------------------------------
    // CANDLE POSITION
    //--------------------------------------------------

    closePosition: number;

    openPosition: number;

    relativeCandleSize: number;

    averageCandleRatio: number;

    //--------------------------------------------------
    // REJECTION ANALYSIS
    //--------------------------------------------------

    bullishRejection: boolean;

    bearishRejection: boolean;

    doubleRejection: boolean;

    tripleRejection: boolean;

    //--------------------------------------------------
    // CANDLE PATTERNS
    //--------------------------------------------------

    bullishEngulfing: boolean;

    bearishEngulfing: boolean;

    pinBar: boolean;

    hammer: boolean;

    invertedHammer: boolean;

    shootingStar: boolean;

    doji: boolean;

    insideBar: boolean;

    outsideBar: boolean;

    //--------------------------------------------------
    // VOLATILITY STRUCTURE
    //--------------------------------------------------

    compression: boolean;

    tightRange: boolean;

    atrCompression: boolean;

    expansion: boolean;

    impulseCandle: boolean;

    expansionAfterCompression: boolean;

    expansionStrength: number;

    //--------------------------------------------------
    // REVERSAL EVIDENCE
    //--------------------------------------------------

    bullishExhaustion: boolean;

    bearishExhaustion: boolean;

    buyingClimax: boolean;

    sellingClimax: boolean;

    //--------------------------------------------------
    // PRICE ACTION CLASSIFICATION
    //--------------------------------------------------

    marketBias:
        | -1
        | 0
        | 1;

    priceActionState:
        | "NEUTRAL"
        | "BULLISH"
        | "BEARISH"
        | "COMPRESSION"
        | "EXPANSION"
        | "REVERSAL";

    dominantPattern:
        | "NONE"
        | "ENGULFING"
        | "PINBAR"
        | "HAMMER"
        | "SHOOTING_STAR"
        | "DOJI"
        | "INSIDE_BAR"
        | "OUTSIDE_BAR";

    //--------------------------------------------------
    // ANALYTICS
    //--------------------------------------------------

    momentumBodyPercent?: number;

    rejectionStrength?: number;

    expansionRatio?: number;

    compressionRatio?: number;

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    notes?: string[];

}