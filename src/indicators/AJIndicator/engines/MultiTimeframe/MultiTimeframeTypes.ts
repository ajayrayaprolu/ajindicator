/****************************************************************************************
 * File:
 * MultiTimeframeTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MultiTimeframe/MultiTimeframeTypes.ts
 *
 * Purpose:
 * Canonical input contracts and reusable types for the AJ v2
 * Multi-Timeframe Engine.
 *
 * This file defines only contracts, enums and configuration.
 * No calculations or trade decision logic belong here.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * MultiTimeframeEngine
 *      ↓
 * MultiTimeframeResult
 *      ↓
 * Trend
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 ****************************************************************************************/

//======================================================
// TREND DIRECTION
//======================================================

export type TimeframeDirection =
    | -1
    | 0
    | 1;

//======================================================
// DOMINANT TREND
//======================================================

export type DominantTrend =
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

//======================================================
// AGREEMENT LEVEL
//======================================================

export type AgreementLevel =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "VERY_HIGH";

//======================================================
// TIMEFRAME IDENTIFIER
//======================================================

export type TimeframeName =
    | "1m"
    | "5m"
    | "15m"
    | "1H"
    | "4H"
    | "1D";

//======================================================
// SINGLE TIMEFRAME VOTE
//======================================================

export interface TimeframeVote {

    //--------------------------------------------------
    // IDENTIFICATION
    //--------------------------------------------------

    timeframe: TimeframeName;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    direction: TimeframeDirection;

    strength: number;

    //--------------------------------------------------
    // OPTIONAL ANALYTICS
    //--------------------------------------------------

    confidence?: number;

    trendQuality?: number;

    aligned?: boolean;

    metadata?: Record<string, unknown>;

}

//======================================================
// ENGINE INPUT
//======================================================

export interface MultiTimeframeInput {

    //--------------------------------------------------
    // LOWER TIMEFRAMES
    //--------------------------------------------------

    tf1m: TimeframeVote;

    tf5m: TimeframeVote;

    tf15m: TimeframeVote;

    //--------------------------------------------------
    // HIGHER TIMEFRAMES
    //--------------------------------------------------

    tf1h: TimeframeVote;

    tf4h: TimeframeVote;

    tf1d: TimeframeVote;

}

//======================================================
// AGREEMENT METRICS
//======================================================

export interface AgreementMetrics {

    alignmentPercent: number;

    bullVotes: number;

    bearVotes: number;

    neutralVotes: number;

    agreementLevel: AgreementLevel;

}

//======================================================
// CONFLICT METRICS
//======================================================

export interface ConflictMetrics {

    hasConflict: boolean;

    conflictCount: number;

    conflictingTimeframes: string[];

}

//======================================================
// ENGINE CONFIGURATION
//======================================================

export interface MultiTimeframeConfiguration {

    minimumAlignment: number;

    strongAlignment: number;

    veryStrongAlignment: number;

    requireHTFAgreement: boolean;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultMultiTimeframeConfiguration: MultiTimeframeConfiguration = {

    minimumAlignment: 60,

    strongAlignment: 75,

    veryStrongAlignment: 90,

    requireHTFAgreement: true

};