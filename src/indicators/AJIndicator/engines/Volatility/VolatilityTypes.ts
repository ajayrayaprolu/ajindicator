/****************************************************************************************
 * File:
 * VolatilityTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Volatility/VolatilityTypes.ts
 *
 * Purpose:
 * Canonical input contracts and reusable types for the AJ v2
 * Volatility Engine.
 *
 * This file contains only contracts, enums and configuration.
 * No calculations or trading logic belong here.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * VolatilityEngine
 *      ↓
 * VolatilityResult
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 ****************************************************************************************/

//======================================================
// VOLATILITY DIRECTION
//======================================================

export type VolatilityDirection =
    | "EXPANDING"
    | "COMPRESSING"
    | "NEUTRAL";

//======================================================
// VOLATILITY STRENGTH
//======================================================

export type VolatilityStrength =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "EXTREME";

//======================================================
// VOLATILITY REGIME
//======================================================

export type VolatilityRegime =
    | "LOW"
    | "NORMAL"
    | "HIGH"
    | "EXTREME";

//======================================================
// ATR INFORMATION
//======================================================

export interface ATRInformation {

    atr: number;

    averageATR: number;

    atrRatio: number;

    atrPercentile?: number;

}

//======================================================
// EXPANSION INFORMATION
//======================================================

export interface ExpansionInformation {

    expansion: boolean;

    expansionStrength: number;

    breakoutVolatility: boolean;

    expansionAfterCompression?: boolean;

}

//======================================================
// COMPRESSION INFORMATION
//======================================================

export interface CompressionInformation {

    compression: boolean;

    compressionStrength: number;

    squeezeDetected?: boolean;

    lowVolatilityCluster?: boolean;

}

//======================================================
// VOLATILITY METRICS
//======================================================

export interface VolatilityMetrics {

    volatilityScore: number;

    expansionScore: number;

    compressionScore: number;

    relativeVolatility: number;

    atrSlope?: number;

}

//======================================================
// ENGINE INPUT
//======================================================

export interface VolatilityInput {

    //--------------------------------------------------
    // ATR
    //--------------------------------------------------

    atr: number;

    averageATR: number;

    //--------------------------------------------------
    // BREAKOUT
    //--------------------------------------------------

    breakoutStrength: number;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    atrSlope?: number;

    currentRange?: number;

    averageRange?: number;

    volume?: number;

    //--------------------------------------------------
    // THRESHOLDS
    //--------------------------------------------------

    expansionThreshold: number;

    compressionThreshold: number;

}

//======================================================
// ENGINE CONFIGURATION
//======================================================

export interface VolatilityConfiguration {

    expansionThreshold: number;

    compressionThreshold: number;

    highATRRatio: number;

    extremeATRRatio: number;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultVolatilityConfiguration: VolatilityConfiguration = {

    expansionThreshold: 1.20,

    compressionThreshold: 0.80,

    highATRRatio: 1.50,

    extremeATRRatio: 2.00

};