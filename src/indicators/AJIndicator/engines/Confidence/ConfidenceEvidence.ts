/****************************************************************************************
 * File:
 * ConfidenceEvidence.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Confidence/ConfidenceEvidence.ts
 *
 * Purpose:
 * Canonical evidence contracts for the AJ v2 Confidence Engine.
 *
 * The Confidence Engine replaces the legacy Score Engine by
 * evaluating weighted institutional evidence instead of simple
 * point addition. Each downstream engine contributes positive
 * and negative evidence which is aggregated into a confidence
 * percentage and trade grade.
 *
 * This file contains only reusable contracts.
 * No calculations or execution logic belong here.
 ****************************************************************************************/

//======================================================
// EVIDENCE POLARITY
//======================================================

export type EvidencePolarity =
    | "POSITIVE"
    | "NEGATIVE"
    | "NEUTRAL";

//======================================================
// EVIDENCE CATEGORY
//======================================================

export type EvidenceCategory =
    | "TREND"
    | "MOMENTUM"
    | "MARKET_STATE"
    | "ORDER_FLOW"
    | "MARKET_STRUCTURE"
    | "LIQUIDITY"
    | "ORDER_BLOCK"
    | "PRICE_ACTION"
    | "VOLATILITY"
    | "MULTI_TIMEFRAME"
    | "RISK"
    | "SESSION"
    | "NEWS"
    | "AI"
    | "OTHER";

//======================================================
// EVIDENCE
//======================================================

export interface ConfidenceEvidence {

    //--------------------------------------------------
    // IDENTIFICATION
    //--------------------------------------------------

    id: string;

    title: string;

    description?: string;

    //--------------------------------------------------
    // CATEGORY
    //--------------------------------------------------

    category: EvidenceCategory;

    //--------------------------------------------------
    // RESULT
    //--------------------------------------------------

    polarity: EvidencePolarity;

    passed: boolean;

    //--------------------------------------------------
    // WEIGHT
    //--------------------------------------------------

    weight: number;

    contribution: number;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    confidence?: number;

    metadata?: Record<string, unknown>;

}

//======================================================
// EVIDENCE SUMMARY
//======================================================

export interface ConfidenceEvidenceSummary {

    positive: ConfidenceEvidence[];

    negative: ConfidenceEvidence[];

    neutral: ConfidenceEvidence[];

    totalWeight: number;

    positiveWeight: number;

    negativeWeight: number;

    netWeight: number;

}

//======================================================
// COMMON EVIDENCE NAMES
//======================================================

export const ConfidenceEvidenceNames = {

    EMA_ALIGNMENT:
        "EMA Alignment",

    VWAP_ALIGNMENT:
        "VWAP Alignment",

    ADX_STRENGTH:
        "ADX Strength",

    CVD_CONFIRMATION:
        "CVD Confirmation",

    STRONG_BOS:
        "Strong BOS",

    STRONG_CHOCH:
        "Strong CHOCH",

    BULLISH_FVG:
        "Bullish FVG",

    BEARISH_FVG:
        "Bearish FVG",

    LIQUIDITY_SWEEP:
        "Liquidity Sweep",

    ORDER_BLOCK:
        "Order Block",

    PRICE_ACTION:
        "Price Action",

    MOMENTUM:
        "Momentum",

    HTF_ALIGNMENT:
        "HTF Alignment",

    TREND_ALIGNMENT:
        "Trend Alignment",

    LOW_VOLATILITY:
        "Low Volatility",

    HIGH_VOLATILITY:
        "High Volatility",

    LOW_VOLUME:
        "Low Volume",

    WEAK_RSI:
        "Weak RSI",

    CHOPPY_MARKET:
        "Choppy Market",

    NEARBY_SUPPLY:
        "Nearby Supply",

    NEARBY_DEMAND:
        "Nearby Demand",

    HIGH_IMPACT_NEWS:
        "High Impact News",

    SESSION_FILTER:
        "Session Filter"

} as const;