/****************************************************************************************
 * File:
 * PriceActionTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/PriceAction/PriceActionTypes.ts
 *
 * Purpose:
 * Defines the canonical input contracts, enums and reusable
 * types consumed by the AJ Price Action Engine.
 *
 * This file contains data contracts only.
 * No calculations or trading logic should exist here.
 *
 * AJ Architecture:
 * Runtime
 *      ↓
 * PriceActionEngine
 *      ↓
 * PriceActionResult
 *      ↓
 * Trend / Momentum / Risk / Confidence
 ****************************************************************************************/

//======================================================
// CANDLE
//======================================================

export interface PriceActionCandle {

    time: number;

    open: number;

    high: number;

    low: number;

    close: number;

    volume?: number;

}

//======================================================
// ENGINE INPUT
//======================================================

export interface PriceActionInput {

    candles: PriceActionCandle[];

    atr?: number;

    averageBodySize?: number;

    averageRange?: number;

    compressionLookback?: number;

    expansionLookback?: number;

    volatilityThreshold?: number;

}

//======================================================
// MARKET BIAS
//======================================================

export type MarketBias =
    | -1
    | 0
    | 1;

//======================================================
// CANDLE QUALITY
//======================================================

export type CandleQuality =

    | "STRONG_BULL"

    | "STRONG_BEAR"

    | "WEAK_BULL"

    | "WEAK_BEAR"

    | "NEUTRAL";

//======================================================
// WICK QUALITY
//======================================================

export type WickQuality =

    | "BALANCED"

    | "UPPER_DOMINANT"

    | "LOWER_DOMINANT"

    | "EXHAUSTION";

//======================================================
// REJECTION TYPE
//======================================================

export type RejectionType =

    | "NONE"

    | "BULLISH"

    | "BEARISH"

    | "DOUBLE"

    | "TRIPLE";

//======================================================
// PATTERN TYPE
//======================================================

export type PriceActionPattern =

    | "NONE"

    | "ENGULFING"

    | "PIN_BAR"

    | "HAMMER"

    | "INVERTED_HAMMER"

    | "SHOOTING_STAR"

    | "DOJI"

    | "INSIDE_BAR"

    | "OUTSIDE_BAR";

//======================================================
// COMPRESSION
//======================================================

export interface CompressionState {

    compression: boolean;

    tightRange: boolean;

    atrCompression: boolean;

    clusterCompression: boolean;

    lowVolatility: boolean;

    compressionRatio: number;

}

//======================================================
// EXPANSION
//======================================================

export interface ExpansionState {

    expansion: boolean;

    impulse: boolean;

    postCompressionExpansion: boolean;

    expansionStrength: number;

    expansionRatio: number;

}

//======================================================
// CANDLE METRICS
//======================================================

export interface CandleMetrics {

    range: number;

    bodySize: number;

    upperWick: number;

    lowerWick: number;

    bodyPercent: number;

    upperWickPercent: number;

    lowerWickPercent: number;

    bodyDominance: number;

    wickDominance: number;

    closePosition: number;

    openPosition: number;

    relativeSize: number;

    averageSizeRatio: number;

}

//======================================================
// REVERSAL EVIDENCE
//======================================================

export interface ReversalEvidence {

    bullishExhaustion: boolean;

    bearishExhaustion: boolean;

    buyingClimax: boolean;

    sellingClimax: boolean;

    rejectionStrength: number;

}

//======================================================
// ENGINE CONFIGURATION
//======================================================

export interface PriceActionConfiguration {

    bodyStrengthThreshold: number;

    wickDominanceThreshold: number;

    dojiThreshold: number;

    engulfingThreshold: number;

    pinBarThreshold: number;

    compressionThreshold: number;

    expansionThreshold: number;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultPriceActionConfiguration: PriceActionConfiguration = {

    bodyStrengthThreshold: 0.65,

    wickDominanceThreshold: 0.60,

    dojiThreshold: 0.10,

    engulfingThreshold: 1.05,

    pinBarThreshold: 0.60,

    compressionThreshold: 0.70,

    expansionThreshold: 1.30

};