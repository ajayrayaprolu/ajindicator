/****************************************************************************************
 * File:
 * MarketStructureTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketStructure/MarketStructureTypes.ts
 *
 * Purpose:
 * Defines all shared contracts, enums and configuration used by the
 * AJ v2 Market Structure Engine.
 *
 * This file contains types only.
 * No calculation or business logic should exist here.
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
 ****************************************************************************************/

//--------------------------------------------------
// MARKET BIAS
//--------------------------------------------------

export type MarketBias =
    | -1
    | 0
    | 1;

//--------------------------------------------------
// BOS TYPE
//--------------------------------------------------

export type BOSStrength =
    | "NONE"
    | "WEAK"
    | "NORMAL"
    | "STRONG"
    | "FAILED";

//--------------------------------------------------
// STRUCTURE SIDE
//--------------------------------------------------

export type StructureSide =
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

//--------------------------------------------------
// MARKET STRUCTURE TYPE
//--------------------------------------------------

export type MarketStructureType =
    | "RANGE"
    | "ACCUMULATION"
    | "DISTRIBUTION"
    | "TRENDING_BULL"
    | "TRENDING_BEAR"
    | "STRONG_BULL_BOS"
    | "STRONG_BEAR_BOS"
    | "BULL_CHOCH"
    | "BEAR_CHOCH";

//--------------------------------------------------
// STRUCTURE EVENT
//--------------------------------------------------

export interface StructureEvent {

    index: number;

    price: number;

    timestamp: number;

    side: StructureSide;

    strength: BOSStrength;

    confidence: number;

}

//--------------------------------------------------
// BOS INFORMATION
//--------------------------------------------------

export interface BOSInformation {

    detected: boolean;

    bullish: boolean;

    bearish: boolean;

    strength: BOSStrength;

    confidence: number;

    breakDistance: number;

}

//--------------------------------------------------
// CHOCH INFORMATION
//--------------------------------------------------

export interface CHOCHInformation {

    detected: boolean;

    bullish: boolean;

    bearish: boolean;

    confidence: number;

}

//--------------------------------------------------
// INTERNAL STRUCTURE
//--------------------------------------------------

export interface InternalStructure {

    bullish: boolean;

    bearish: boolean;

    confidence: number;

}

//--------------------------------------------------
// EXTERNAL STRUCTURE
//--------------------------------------------------

export interface ExternalStructure {

    bullish: boolean;

    bearish: boolean;

    confidence: number;

}

//--------------------------------------------------
// MARKET STRUCTURE CONFIGURATION
//--------------------------------------------------

export interface MarketStructureConfig {

    swingLength: number;

    minimumBreakPercent: number;

    minimumConfidence: number;

    enableInternalBos: boolean;

    enableExternalBos: boolean;

    enableFailedBosDetection: boolean;

    enableWeakBosDetection: boolean;

    enableStrongBosDetection: boolean;

}

//--------------------------------------------------
// DEFAULT CONFIGURATION
//--------------------------------------------------

export const DEFAULT_MARKET_STRUCTURE_CONFIG: MarketStructureConfig = {

    swingLength: 10,

    minimumBreakPercent: 0.10,

    minimumConfidence: 60,

    enableInternalBos: true,

    enableExternalBos: true,

    enableFailedBosDetection: true,

    enableWeakBosDetection: true,

    enableStrongBosDetection: true

};