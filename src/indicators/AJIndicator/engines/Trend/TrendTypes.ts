/****************************************************************************************
 * File:
 * TrendTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Trend/TrendTypes.ts
 *
 * Purpose:
 * Canonical input contracts and reusable types for the AJ v2
 * Trend Engine.
 *
 * This file contains only contracts, enums and configuration.
 * No calculations or trading logic belong here.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * TrendEngine
 *      ↓
 * TrendResult
 *      ↓
 * Momentum
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 ****************************************************************************************/

//======================================================
// TREND DIRECTION
//======================================================

export type TrendDirection =
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

//======================================================
// TREND STRENGTH
//======================================================

export type TrendStrength =
    | "WEAK"
    | "MODERATE"
    | "STRONG"
    | "VERY_STRONG";

//======================================================
// TREND STAGE
//======================================================

export type TrendStage =
    | "RANGE"
    | "ACCELERATION"
    | "CONTINUATION"
    | "PULLBACK"
    | "DECELERATION";

//======================================================
// ALPHA TREND STATE
//======================================================

export type AlphaTrendState =
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

//======================================================
// TREND PHASE
//======================================================

export type TrendPhase =
    | "EARLY"
    | "BUILDING"
    | "MATURE"
    | "EXHAUSTION"
    | "REVERSAL";

//======================================================
// HTF ALIGNMENT
//======================================================

export interface HigherTimeframeAlignment {

    enabled: boolean;

    aligned: boolean;

    direction: -1 | 0 | 1;

    timeframe?: string;

    strength: number;

}

//======================================================
// EMA STRUCTURE
//======================================================

export interface EMAStructure {

    ema20: number;

    ema50: number;

    ema200: number;

    ema20Slope: number;

    ema50Slope: number;

    ema200Slope: number;

}

//======================================================
// ADX INFORMATION
//======================================================

export interface ADXInformation {

    adx: number;

    plusDI?: number;

    minusDI?: number;

}

//======================================================
// ALPHA TREND
//======================================================

export interface AlphaTrendInformation {

    enabled?: boolean;

    bullish: boolean;

    bearish: boolean;

    value?: number;

}

//======================================================
// TREND METRICS
//======================================================

export interface TrendMetrics {

    alignmentScore: number;

    slopeScore: number;

    strengthScore: number;

    maturityScore: number;

    continuationScore: number;

    exhaustionScore: number;

}

//======================================================
// ENGINE INPUT
//======================================================

export interface TrendInput {

    //--------------------------------------------------
    // PRICE
    //--------------------------------------------------

    open?: number;

    high?: number;

    low?: number;

    close: number;

    //--------------------------------------------------
    // EMA
    //--------------------------------------------------

    ema20: number;

    ema50: number;

    ema200: number;

    ema20Slope: number;

    ema50Slope: number;

    ema200Slope: number;

    //--------------------------------------------------
    // ADX
    //--------------------------------------------------

    adx: number;

    plusDI?: number;

    minusDI?: number;

    //--------------------------------------------------
    // HTF
    //--------------------------------------------------

    htfTrend: -1 | 0 | 1;

    htfStrength?: number;

    //--------------------------------------------------
    // OPTIONAL ALPHA TREND
    //--------------------------------------------------

    alphaTrend?: number;

    alphaTrendBull?: boolean;

    alphaTrendBear?: boolean;

    //--------------------------------------------------
    // OPTIONAL ATR
    //--------------------------------------------------

    atr?: number;

}

//======================================================
// ENGINE CONFIGURATION
//======================================================

export interface TrendConfiguration {

    strongADX: number;

    veryStrongADX: number;

    matureTrendADX: number;

    exhaustionADX: number;

    slopeThreshold: number;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultTrendConfiguration: TrendConfiguration = {

    strongADX: 25,

    veryStrongADX: 40,

    matureTrendADX: 30,

    exhaustionADX: 55,

    slopeThreshold: 0.01

};