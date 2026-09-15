/****************************************************************************************
 * File:
 * ContextResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/context/AJContextResult.ts
 *
 * AJ v2 - Canonical Institutional Context Result
 *
 * Responsibilities
 * ----------------
 * • Canonical output of ContextEngine
 * • Pure data contract
 * • No business logic
 *
 * Notes
 * -----
 * • Backward compatible with existing pipeline
 * • Extended to support Phase 15.5 validation
 * • Supports future dashboard visualization
 ****************************************************************************************/

import type {
    ConfidenceGrade,
    MarketState,
    OrderFlowMode,
    RetailTrap,
    TradeGrade
} from "../AJTypes";

//======================================================
// COMMON TYPES
//======================================================

export type ContextDirection =
    "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

export type ContextStatus =
    "PASS"
    | "FAIL"
    | "NEUTRAL";

export type ContextGrade =
    "A+"
    | "A"
    | "B"
    | "C"
    | "D";

export type VolatilityState =
    "LOW"
    | "NORMAL"
    | "HIGH"
    | "EXTREME";

export type SessionState =
    "OPEN"
    | "CLOSED"
    | "UNKNOWN";

//======================================================
// ENGINE VALIDATION
//======================================================

export interface ContextValidation {

    passed: boolean;

    score: number;

    status: ContextStatus;

    message: string;

}

//======================================================
// CONTEXT RESULT
//======================================================

export interface ContextResult {

    //==================================================
    // PRIMARY CONTEXT
    //==================================================

    ctxLong: boolean;

    ctxShort: boolean;

    tradeDirectionFinal: number;

    contextDirection: ContextDirection;

    //==================================================
    // TREND
    //==================================================

    trendDirection: ContextDirection;

    trendScore: number;

    trendStrength: number;

    trendAligned: boolean;

    //==================================================
    // MOMENTUM
    //==================================================

    momentumScore: number;

    momentumAligned: boolean;

    breakoutScore: number;

    breakoutConfirmed: boolean;

    //==================================================
    // EMA
    //==================================================

    emaBull: boolean;

    emaBear: boolean;

    emaSlope: number;

    emaScore: number;

    //==================================================
    // VWAP
    //==================================================

    vwapBull: boolean;

    vwapBear: boolean;

    vwapAligned: boolean;

    vwapScore: number;

    //==================================================
    // ORDER FLOW / VOLUME
    //==================================================

    cvdBull: boolean;

    cvdBear: boolean;

    cvdStrength: number;

    orderFlowScore: number;

    //==================================================
    // MARKET STRUCTURE
    //==================================================

    bosBull: boolean;

    bosBear: boolean;

    chochBull: boolean;

    chochBear: boolean;

    structureScore: number;

    //==================================================
    // FAIR VALUE GAP
    //==================================================

    bullFvgQuality: number;

    bearFvgQuality: number;

    fvgScore: number;

    //==================================================
    // LIQUIDITY
    //==================================================

    liquiditySweepStrength: number;

    liquidityGrabConfirmed: boolean;

    liquidityScore: number;

    //==================================================
    // MULTI TIMEFRAME
    //==================================================

    htfBullTrend: boolean;

    htfBearTrend: boolean;

    mtfAlignmentScore: number;

    multiTimeframeAligned: boolean;

    //==================================================
    // VOLATILITY
    //==================================================

    volatilityScore: number;

    volatilityState: VolatilityState;

    //==================================================
    // SESSION
    //==================================================

    sessionState: SessionState;

    sessionQualified: boolean;

    //==================================================
    // INSTITUTIONAL
    //==================================================

    institutionalScore: number;

    contextScore: number;

    confluenceScore: number;

    overallScore: number;

    //==================================================
    // LEGACY COMPATIBILITY
    //==================================================

	longScore: number;

    shortScore: number;

    tradeScore: number;

    insideBarScore: number;

    boostScore: number;

    confidenceLong: number;

    confidenceShort: number;

    confidenceValue: number;

    confidenceGrade: ConfidenceGrade;

    tradeGrade: TradeGrade;

    marketState: MarketState | string;

    marketRegime: string;

    orderFlowMode: OrderFlowMode | string;

    retailTrap: RetailTrap;

    riskQualified: boolean;

    //==================================================
    // VALIDATION RESULTS
    //==================================================

    trendValidation: ContextValidation;

    momentumValidation: ContextValidation;

    emaValidation: ContextValidation;

    vwapValidation: ContextValidation;

    orderFlowValidation: ContextValidation;

    structureValidation: ContextValidation;

    liquidityValidation: ContextValidation;

    fvgValidation: ContextValidation;

    volatilityValidation: ContextValidation;

    multiTimeframeValidation: ContextValidation;

    institutionalValidation: ContextValidation;

    //==================================================
    // PHASE 15.5 DEBUG
    //==================================================

    diagnostics: {

        totalChecks: number;

        passedChecks: number;

        failedChecks: number;

        overallGrade: ContextGrade;

        summary: string;

    };

}