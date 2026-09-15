/****************************************************************************************
 * File:
 * OrderFlowTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderFlow/OrderFlowTypes.ts
 *
 * Purpose:
 * Defines the canonical input contract for the AJ v2 OrderFlowEngine.
 *
 * Responsibility:
 * Supplies raw market data, volume information and institutional
 * evidence required to determine whether the engine should use
 * Real Order Flow or Synthetic Order Flow.
 *
 * This file contains contracts only.
 * No calculations or trading logic belong here.
 *
 * AJ v2 Architecture
 *
 * MarketStateEngine
 *          │
 *          ▼
 * OrderFlowEngine
 *          │
 *          ▼
 * MarketStructureEngine
 *
 ****************************************************************************************/

//======================================================
// ORDER FLOW INPUT
//======================================================

export interface OrderFlowInput {

    //--------------------------------------------------
    // SYMBOL
    //--------------------------------------------------

    symbol: string;

    exchange: string;

    broker?: string;

    datasource?: string;

    timeframe: string;

    //--------------------------------------------------
    // PRICE
    //--------------------------------------------------

    open: number;

    high: number;

    low: number;

    close: number;

    previousClose: number;

    //--------------------------------------------------
    // VOLUME
    //--------------------------------------------------

    volume: number;

    averageVolume: number;

    buyVolume: number;

    sellVolume: number;

    //--------------------------------------------------
    // VOLUME CAPABILITY
    //--------------------------------------------------

    useVolume: boolean;

    syntheticOnly: boolean;

    isIndex: boolean;

    isCrypto: boolean;

    isEquity: boolean;

    isFuture: boolean;

    isOption: boolean;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    emaBull: boolean;

    emaBear: boolean;

    vwapBull: boolean;

    vwapBear: boolean;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    adx: number;

    rsi: number;

    atr: number;

    atrExpansion: boolean;

    //--------------------------------------------------
    // MARKET STRUCTURE
    //--------------------------------------------------

    bosBull: boolean;

    bosBear: boolean;

    chochBull: boolean;

    chochBear: boolean;

    //--------------------------------------------------
    // FAIR VALUE GAP
    //--------------------------------------------------

    fvgBull: boolean;

    fvgBear: boolean;

    //--------------------------------------------------
    // LIQUIDITY
    //--------------------------------------------------

    sweepLow: boolean;

    sweepHigh: boolean;

    liquidityStrength: number;

    stopHuntDetected: boolean;

    //--------------------------------------------------
    // ORDER BLOCK (Future)
    //--------------------------------------------------

    bullishOrderBlock?: boolean;

    bearishOrderBlock?: boolean;

    orderBlockStrength?: number;

    //--------------------------------------------------
    // PRICE ACTION (Future)
    //--------------------------------------------------

    bullishRejection?: boolean;

    bearishRejection?: boolean;

    bullishEngulfing?: boolean;

    bearishEngulfing?: boolean;

    longLowerWick?: boolean;

    longUpperWick?: boolean;

    //--------------------------------------------------
    // MULTI TIMEFRAME (Future)
    //--------------------------------------------------

    higherTimeframeBull?: boolean;

    higherTimeframeBear?: boolean;

    higherTimeframeAligned?: boolean;

    //--------------------------------------------------
    // MARKET STATE
    //--------------------------------------------------

    marketState?: string;

    trending?: boolean;

    ranging?: boolean;

    expansion?: boolean;

    compression?: boolean;

    accumulation?: boolean;

    distribution?: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionName?: string;

    marketOpen?: boolean;

    openingDrive?: boolean;

    closingSession?: boolean;

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

}