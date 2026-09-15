/****************************************************************************************
 * File:
 * MarketStateTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketState/MarketStateTypes.ts
 *
 * Purpose:
 * Defines the canonical input contract for the AJ v2 MarketStateEngine.
 *
 * Responsibility:
 * Supplies only raw market data and derived indicator values required
 * to classify the current market regime. This file contains no business
 * logic or calculations.
 *
 * AJ v2 Architecture
 *
 * Raw Market Data
 *      │
 *      ▼
 * MarketStateEngine
 *      ▼
 * OrderFlowEngine
 ****************************************************************************************/

//======================================================
// MARKET STATE INPUT
//======================================================

export interface MarketStateInput {

    //--------------------------------------------------
    // SYMBOL
    //--------------------------------------------------

    symbol: string;

    exchange: string;

    timeframe: string;

    //--------------------------------------------------
    // TIME
    //--------------------------------------------------

    currentTime: number;

    sessionOpen: number;

    sessionClose: number;

    sessionName: string;

    //--------------------------------------------------
    // PRICE
    //--------------------------------------------------

    open: number;

    high: number;

    low: number;

    close: number;

    previousClose: number;

    previousHigh: number;

    previousLow: number;

    dayHigh: number;

    dayLow: number;

    //--------------------------------------------------
    // VOLUME
    //--------------------------------------------------

    currentVolume: number;

    averageVolume: number;

    //--------------------------------------------------
    // TREND INDICATORS
    //--------------------------------------------------

    ema20: number;

    ema50: number;

    ema200: number;

    ema20Slope: number;

    ema50Slope: number;

    ema200Slope: number;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    adx: number;

    rsi: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atr: number;

    averageATR: number;

    //--------------------------------------------------
    // MARKET CONTEXT
    //--------------------------------------------------

    gapUp: boolean;

    gapDown: boolean;

    insideBar: boolean;

    outsideBar: boolean;

    //--------------------------------------------------
    // OPTIONAL MARKET INFORMATION
    //--------------------------------------------------

    vix?: number;

    indiaVix?: number;

    newsEvent?: boolean;

    economicEvent?: boolean;

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    marketOpen?: boolean;

    marketClose?: boolean;

    broker?: string;

    datasource?: string;

}