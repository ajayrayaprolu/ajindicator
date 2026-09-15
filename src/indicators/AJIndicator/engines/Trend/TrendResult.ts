/****************************************************************************************
 * File:
 * TrendResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Trend/TrendResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Trend Engine.
 *
 * This result represents institutional trend intelligence only.
 * It intentionally contains no confidence scoring,
 * execution authority, or trading decisions.
 *
 * AJ Architecture
 *
 * Runtime
 *      │
 *      ▼
 * TrendEngine
 *      │
 *      ▼
 * TrendResult
 *      │
 *      ├── Momentum
 *      ├── Risk Qualification
 *      ├── Confidence
 *      └── Authority
 ****************************************************************************************/

import type {
    TrendDirection,
    TrendStrength,
    TrendStage
} from "./TrendTypes";

export interface TrendResult {

    //--------------------------------------------------
    // PRIMARY TREND
    //--------------------------------------------------

    direction: TrendDirection;

    bullishTrend: boolean;

    bearishTrend: boolean;

    neutralTrend: boolean;

    //--------------------------------------------------
    // EMA ALIGNMENT
    //--------------------------------------------------

    emaBullishAlignment: boolean;

    emaBearishAlignment: boolean;

    emaAligned: boolean;

    //--------------------------------------------------
    // EMA SLOPE
    //--------------------------------------------------

    positiveSlope: boolean;

    negativeSlope: boolean;

    accelerating: boolean;

    decelerating: boolean;

    //--------------------------------------------------
    // ALPHA TREND
    //--------------------------------------------------

    alphaTrendBull: boolean;

    alphaTrendBear: boolean;

    //--------------------------------------------------
    // ADX TREND
    //--------------------------------------------------

    adxStrength: TrendStrength;

    trendStrengthScore: number;

    //--------------------------------------------------
    // HIGHER TIMEFRAME
    //--------------------------------------------------

    higherTimeframeAligned: boolean;

    //--------------------------------------------------
    // TREND LIFE CYCLE
    //--------------------------------------------------

    matureTrend: boolean;

    continuation: boolean;

    exhausted: boolean;

    bullishPullback: boolean;

    bearishPullback: boolean;

    trendStage: TrendStage;

    //--------------------------------------------------
    // INSTITUTIONAL QUALITY
    //--------------------------------------------------

    institutionalTrendQuality: number;

    //--------------------------------------------------
    // TREND METRICS
    //--------------------------------------------------

    trendScore?: number;

    alignmentScore?: number;

    slopeScore?: number;

    maturityScore?: number;

    exhaustionScore?: number;

    continuationScore?: number;

    pullbackScore?: number;

    //--------------------------------------------------
    // TREND CLASSIFICATION
    //--------------------------------------------------

    trendState?:
        | "TRENDING"
        | "RANGING"
        | "REVERSAL"
        | "PULLBACK"
        | "BREAKOUT"
        | "UNKNOWN";

    trendPhase?:
        | "EARLY"
        | "BUILDING"
        | "MATURE"
        | "EXHAUSTION"
        | "REVERSAL";

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics?: {

        emaAgreement: number;

        slopeAgreement: number;

        adxAgreement: number;

        htfAgreement: number;

        overallAgreement: number;

    };

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

    notes?: string[];

}