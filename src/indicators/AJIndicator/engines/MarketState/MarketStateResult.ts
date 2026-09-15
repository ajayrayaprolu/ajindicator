/****************************************************************************************
 * File:
 * MarketStateResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketState/MarketStateResult.ts
 *
 * Purpose:
 * Canonical output contract produced by the MarketStateEngine.
 *
 * Responsibility:
 * Contains only raw market-state analysis. It does not include
 * trade scores, confidence engine results, execution decisions,
 * or authority information.
 *
 * AJ v2 Architecture:
 * Raw Market Data
 *      │
 *      ▼
 * MarketStateEngine
 *      ▼
 * OrderFlowEngine
 ****************************************************************************************/

//======================================================
// MarketStateResult
//======================================================

export interface MarketStateResult {

    //--------------------------------------------------
    // PRIMARY MARKET REGIME
    //--------------------------------------------------

    marketState:
        | "TREND_BULL"
        | "TREND_BEAR"
        | "RANGE"
        | "EXPANSION"
        | "COMPRESSION"
        | "ACCUMULATION"
        | "DISTRIBUTION"
        | "UNKNOWN";

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    bullishTrend: boolean;

    bearishTrend: boolean;

    ranging: boolean;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    expansion: boolean;

    compression: boolean;

    highVolatility: boolean;

    lowVolatility: boolean;

    //--------------------------------------------------
    // SMART MONEY REGIME
    //--------------------------------------------------

    accumulation: boolean;

    distribution: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    asianSession: boolean;

    europeanSession: boolean;

    usSession: boolean;

    indianSession: boolean;

    openingDrive: boolean;

    closingSession: boolean;

    //--------------------------------------------------
    // NEWS / EVENT
    //--------------------------------------------------

    newsEvent: boolean;

    //--------------------------------------------------
    // MARKET QUALITY
    //--------------------------------------------------

    marketQuality: boolean;

    confidence: number;

    //--------------------------------------------------
    // PRICE EXTREMES
    //--------------------------------------------------

    currentDayHigh: number;

    currentDayLow: number;

}