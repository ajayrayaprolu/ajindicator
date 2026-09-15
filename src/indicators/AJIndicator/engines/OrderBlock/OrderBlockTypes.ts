/****************************************************************************************
 * File:
 * OrderBlockTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderBlock/OrderBlockTypes.ts
 *
 * Purpose:
 * Shared contracts, enums and configuration for the AJ v2 Order Block Engine.
 *
 * This file contains only shared type definitions.
 * No business logic or calculations should exist here.
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
 ****************************************************************************************/

//--------------------------------------------------
// MARKET BIAS
//--------------------------------------------------

export type OrderBlockBias =
    | -1
    | 0
    | 1;

//--------------------------------------------------
// ORDER BLOCK TYPE
//--------------------------------------------------

export type OrderBlockType =
    | "NONE"
    | "BULLISH"
    | "BEARISH";

//--------------------------------------------------
// ZONE QUALITY
//--------------------------------------------------

export type OrderBlockQuality =
    | "NONE"
    | "FRESH"
    | "ACTIVE"
    | "MITIGATED"
    | "WEAK"
    | "EXPIRED";

//--------------------------------------------------
// BLOCK STATUS
//--------------------------------------------------

export type OrderBlockStatus =
    | "VALID"
    | "INVALID"
    | "BROKEN"
    | "MITIGATED";

//--------------------------------------------------
// REACTION QUALITY
//--------------------------------------------------

export type ReactionQuality =
    | "NONE"
    | "WEAK"
    | "NORMAL"
    | "STRONG"
    | "EXPLOSIVE";

//--------------------------------------------------
// HIGHER TIMEFRAME
//--------------------------------------------------

export type HigherTimeframe =
    | "NONE"
    | "5M"
    | "15M"
    | "30M"
    | "1H"
    | "4H"
    | "1D"
    | "1W";

//--------------------------------------------------
// ORDER BLOCK ZONE
//--------------------------------------------------

export interface OrderBlockZone {

    id: string;

    type: OrderBlockType;

    high: number;

    low: number;

    midpoint: number;

    createdTime: number;

    createdBarIndex: number;

    lastTouchedBar: number;

    touchCount: number;

    mitigationCount: number;

    fresh: boolean;

    mitigated: boolean;

    active: boolean;

    expired: boolean;

    reactionPercent: number;

    reactionQuality: ReactionQuality;

    strength: number;

    confidence: number;

    higherTimeframe: HigherTimeframe;

    higherTimeframeAligned: boolean;

}

//--------------------------------------------------
// ORDER BLOCK STATISTICS
//--------------------------------------------------

export interface OrderBlockStatistics {

    totalBlocks: number;

    bullishBlocks: number;

    bearishBlocks: number;

    activeBlocks: number;

    freshBlocks: number;

    mitigatedBlocks: number;

    expiredBlocks: number;

    strongestBlockStrength: number;

}

//--------------------------------------------------
// ENGINE CONFIGURATION
//--------------------------------------------------

export interface OrderBlockConfig {

    lookback: number;

    minimumBodyPercent: number;

    minimumImpulsePercent: number;

    minimumReactionPercent: number;

    maximumMitigationCount: number;

    maximumTouchCount: number;

    enableFreshnessTracking: boolean;

    enableMitigationTracking: boolean;

    enableReactionAnalysis: boolean;

    enableHigherTimeframeAlignment: boolean;

}

//--------------------------------------------------
// DEFAULT CONFIGURATION
//--------------------------------------------------

export const DEFAULT_ORDER_BLOCK_CONFIG: OrderBlockConfig = {

    lookback: 30,

    minimumBodyPercent: 55,

    minimumImpulsePercent: 1.0,

    minimumReactionPercent: 20,

    maximumMitigationCount: 5,

    maximumTouchCount: 10,

    enableFreshnessTracking: true,

    enableMitigationTracking: true,

    enableReactionAnalysis: true,

    enableHigherTimeframeAlignment: true

};