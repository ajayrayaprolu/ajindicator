/****************************************************************************************
 * File:
 * VolatilityResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Volatility/VolatilityResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Volatility Engine.
 *
 * This contract exposes institutional volatility analytics
 * only. It contains no confidence scoring, execution logic
 * or trading decisions.
 ****************************************************************************************/

import type {
    VolatilityDirection,
    VolatilityStrength,
    VolatilityRegime
} from "./VolatilityTypes";

export interface VolatilityResult {

    //--------------------------------------------------
    // ATR
    //--------------------------------------------------

    atr: number;

    averageATR: number;

    atrRatio: number;

    //--------------------------------------------------
    // VOLATILITY REGIME
    //--------------------------------------------------

    volatilityRegime: VolatilityRegime;

    volatilityStrength: VolatilityStrength;

    volatilityDirection: VolatilityDirection;

    //--------------------------------------------------
    // EXPANSION / COMPRESSION
    //--------------------------------------------------

    expansion: boolean;

    compression: boolean;

    stableVolatility: boolean;

    breakoutVolatility: boolean;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    institutionalVolatilityQuality: number;

    //--------------------------------------------------
    // SCORES
    //--------------------------------------------------

    volatilityScore: number;

    expansionScore: number;

    compressionScore: number;

    relativeVolatility: number;

    //--------------------------------------------------
    // OPTIONAL ANALYTICS
    //--------------------------------------------------

    atrPercentile?: number;

    atrSlope?: number;

    volatilityIncrease?: boolean;

    volatilityDecrease?: boolean;

    expandingRapidly?: boolean;

    compressingRapidly?: boolean;

    //--------------------------------------------------
    // REGIME FLAGS
    //--------------------------------------------------

    lowVolatility?: boolean;

    normalVolatility?: boolean;

    highVolatility?: boolean;

    extremeVolatility?: boolean;

    //--------------------------------------------------
    // INSTITUTIONAL ANALYTICS
    //--------------------------------------------------

    breakoutEnvironment?: boolean;

    meanReversionEnvironment?: boolean;

    trendFriendlyEnvironment?: boolean;

    rangeFriendlyEnvironment?: boolean;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics?: {

        atrContribution: number;

        expansionContribution: number;

        compressionContribution: number;

        regimeContribution: number;

        overallVolatility: number;

    };

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

    notes?: string[];

}