/****************************************************************************************
 * File:
 * MultiTimeframeResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MultiTimeframe/MultiTimeframeResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Multi-Timeframe Engine.
 *
 * This contract exposes only multi-timeframe market alignment
 * and institutional agreement. It contains no execution,
 * confidence scoring or trading decisions.
 ****************************************************************************************/

import type {
    TimeframeVote,
    DominantTrend,
    AgreementLevel
} from "./MultiTimeframeTypes";

export interface MultiTimeframeResult {

    //--------------------------------------------------
    // INDIVIDUAL TIMEFRAMES
    //--------------------------------------------------

    tf1m: TimeframeVote;

    tf5m: TimeframeVote;

    tf15m: TimeframeVote;

    tf1h: TimeframeVote;

    tf4h: TimeframeVote;

    tf1d: TimeframeVote;

    //--------------------------------------------------
    // TREND VOTING
    //--------------------------------------------------

    bullVotes: number;

    bearVotes: number;

    neutralVotes: number;

    //--------------------------------------------------
    // ALIGNMENT
    //--------------------------------------------------

    alignmentPercent: number;

    agreementLevel: AgreementLevel;

    alignmentScore: number;

    //--------------------------------------------------
    // DOMINANT TREND
    //--------------------------------------------------

    dominantTrend: DominantTrend;

    dominantTimeframe: string;

    //--------------------------------------------------
    // AGREEMENT
    //--------------------------------------------------

    higherTimeframeAgreement: boolean;

    lowerTimeframeAgreement: boolean;

    overallAgreement: boolean;

    //--------------------------------------------------
    // CONFLICT DETECTION
    //--------------------------------------------------

    conflictingTimeframes: boolean;

    conflictCount?: number;

    conflictReason?: string[];

    //--------------------------------------------------
    // INSTITUTIONAL ALIGNMENT
    //--------------------------------------------------

    institutionalAlignment: boolean;

    bullishAlignment: boolean;

    bearishAlignment: boolean;

    neutralAlignment: boolean;

    //--------------------------------------------------
    // MTF ANALYTICS
    //--------------------------------------------------

    htfBias?: -1 | 0 | 1;

    ltfBias?: -1 | 0 | 1;

    strongestTimeframe?: string;

    weakestTimeframe?: string;

    averageStrength?: number;

    weightedAlignment?: number;

    //--------------------------------------------------
    // MTF QUALITY
    //--------------------------------------------------

    trendConsensus?: number;

    structuralConsensus?: number;

    institutionalConsensus?: number;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics?: {

        voteAgreement: number;

        htfAgreement: number;

        ltfAgreement: number;

        alignmentQuality: number;

        institutionalQuality: number;

    };

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

    notes?: string[];

}