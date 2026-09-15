/****************************************************************************************
 * File:
 * ConfidenceFactors.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Confidence/ConfidenceFactors.ts
 *
 * Purpose:
 * Canonical institutional confidence factors used by the AJ v2
 * Confidence Engine.
 *
 * These factors define the weighted evidence contributing to the
 * overall Confidence %. They contain no execution or scoring logic.
 ****************************************************************************************/

import type {
    EvidenceCategory
} from "./ConfidenceEvidence";

//======================================================
// FACTOR SEVERITY
//======================================================

export type ConfidenceFactorSeverity =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

//======================================================
// FACTOR DIRECTION
//======================================================

export type ConfidenceFactorDirection =
    | "POSITIVE"
    | "NEGATIVE"
    | "NEUTRAL";

//======================================================
// FACTOR
//======================================================

export interface ConfidenceFactor {

    //--------------------------------------------------
    // IDENTIFICATION
    //--------------------------------------------------

    id: string;

    name: string;

    description?: string;

    //--------------------------------------------------
    // CATEGORY
    //--------------------------------------------------

    category: EvidenceCategory;

    //--------------------------------------------------
    // WEIGHT
    //--------------------------------------------------

    weight: number;

    maxWeight: number;

    //--------------------------------------------------
    // RESULT
    //--------------------------------------------------

    direction: ConfidenceFactorDirection;

    severity: ConfidenceFactorSeverity;

    active: boolean;

    //--------------------------------------------------
    // CONTRIBUTION
    //--------------------------------------------------

    contribution: number;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    confidence?: number;

    metadata?: Record<string, unknown>;

}

//======================================================
// FACTOR SUMMARY
//======================================================

export interface ConfidenceFactorSummary {

    positiveFactors: ConfidenceFactor[];

    negativeFactors: ConfidenceFactor[];

    neutralFactors: ConfidenceFactor[];

    totalPositiveWeight: number;

    totalNegativeWeight: number;

    netWeight: number;

}

//======================================================
// DEFAULT WEIGHTS
//======================================================

export const ConfidenceWeights = {

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    EMA_ALIGNMENT: 10,
    EMA_SLOPE: 8,
    ALPHA_TREND: 8,
    HTF_ALIGNMENT: 12,

    // AJ v2 compatibility aliases
    TREND: 10,
    TREND_QUALITY: 8,
    HTF_TREND: 12,

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    ADX: 8,
    RSI: 6,
    MOMENTUM: 6,

    IMPULSE: 6,
    BREAKOUT: 6,

    //--------------------------------------------------
    // ORDER FLOW
    //--------------------------------------------------

    CVD: 8,
    VOLUME: 6,

    ORDER_FLOW: 8,
    ORDER_FLOW_QUALITY: 6,

    //--------------------------------------------------
    // MARKET STRUCTURE
    //--------------------------------------------------

    BOS: 12,
    CHOCH: 10,

    STRUCTURE_QUALITY: 8,

    //--------------------------------------------------
    // LIQUIDITY
    //--------------------------------------------------

    LIQUIDITY_SWEEP: 10,
    STOP_HUNT: 8,

    //--------------------------------------------------
    // ORDER BLOCK
    //--------------------------------------------------

    ORDER_BLOCK: 10,

    //--------------------------------------------------
    // FAIR VALUE GAP
    //--------------------------------------------------

    FVG: 8,

    //--------------------------------------------------
    // PRICE ACTION
    //--------------------------------------------------

    ENGULFING: 5,
    PIN_BAR: 5,
    REJECTION: 6,
    CANDLE_QUALITY: 5,

    //--------------------------------------------------
    // MARKET STATE
    //--------------------------------------------------

    TRENDING_MARKET: 6,
    ACCUMULATION: 5,
    DISTRIBUTION: 5,

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    ATR: 5,
    VOLATILITY_REGIME: 5,

    VOLATILITY: 5,

    //--------------------------------------------------
    // MULTI TIMEFRAME
    //--------------------------------------------------

    MULTI_TIMEFRAME: 10,
    DOMINANT_TIMEFRAME: 8,
    INSTITUTIONAL_ALIGNMENT: 10,

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    RISK_REWARD: 10,

    RISK_QUALIFICATION: 10,
    RISK_SCORE: 10,

    //--------------------------------------------------
    // CONFLUENCE
    //--------------------------------------------------

    INSTITUTIONAL_CONFLUENCE: 15,

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    SESSION: 5,

    //--------------------------------------------------
    // NEWS
    //--------------------------------------------------

    NEWS_FILTER: 8

} as const;

//======================================================
// TRADE GRADE
//======================================================

export type ConfidenceGrade =
    | "A+"
    | "A"
    | "B"
    | "C"
    | "D"
    | "F";

//======================================================
// CONFIDENCE CLASS
//======================================================

export type ConfidenceClass =
    | "VERY_HIGH"
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | "VERY_LOW";

//======================================================
// GRADE CALCULATOR
//======================================================

export function confidenceToGrade(
    confidence: number
): ConfidenceGrade {

    if (confidence >= 95) return "A+";

    if (confidence >= 85) return "A";

    if (confidence >= 75) return "B";

    if (confidence >= 65) return "C";

    if (confidence >= 50) return "D";

    return "F";

}

//======================================================
// CLASS CALCULATOR
//======================================================

export function confidenceToClass(
    confidence: number
): ConfidenceClass {

    if (confidence >= 90) return "VERY_HIGH";

    if (confidence >= 75) return "HIGH";

    if (confidence >= 60) return "MEDIUM";

    if (confidence >= 40) return "LOW";

    return "VERY_LOW";

}