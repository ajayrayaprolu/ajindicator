/****************************************************************************************
 * File:
 * CryptoScoreEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/context/CryptoScoreEngine.ts
 *
 * AJ v2 - Institutional Crypto Qualification Engine
 *
 * Purpose
 * -------
 * CryptoScoreEngine is the canonical institutional crypto qualification
 * engine within the AJ v2 Institutional Trading Framework.
 *
 * The engine evaluates whether a cryptocurrency trading opportunity meets
 * institutional execution standards by combining trend quality, Smart Money
 * structure, order flow, liquidity participation, AI confidence, volatility
 * characteristics and adaptive crypto-specific thresholds.
 *
 * Rather than generating trading signals or authorizing execution, this
 * engine determines whether an advanced crypto setup satisfies institutional
 * qualification requirements for the AJ v2 Advanced Crypto Mode.
 *
 * Responsibilities
 * ----------------
 * • Evaluate institutional trend quality.
 * • Evaluate Smart Money market structure quality.
 * • Evaluate order flow quality.
 * • Evaluate liquidity quality.
 * • Evaluate AI confidence contribution.
 * • Apply volatility weighting.
 * • Apply inducement penalties.
 * • Apply institutional crypto bonuses.
 * • Produce normalized institutional score.
 * • Determine Advanced Crypto readiness.
 * • Return immutable CryptoScoreResult.
 *
 * Functional Areas
 * ----------------
 *
 * Trend Qualification
 * • EMA alignment.
 * • VWAP alignment.
 * • Institutional trend scoring.
 *
 * Smart Money Qualification
 * • Break of Structure (BOS).
 * • Change of Character (CHOCH).
 * • Fair Value Gap (FVG).
 * • Institutional structure weighting.
 *
 * Order Flow Qualification
 * • Cumulative Delta (CVD).
 * • Institutional participation quality.
 *
 * Liquidity Qualification
 * • Liquidity Sweep confirmation.
 * • Liquidity strength contribution.
 *
 * AI Qualification
 * • AI confidence contribution.
 * • Institutional AI weighting.
 *
 * Volatility Qualification
 * • Crypto volatility weighting.
 * • High volatility bonus.
 * • Low volatility penalty.
 *
 * Institutional Validation
 * • Inducement block penalty.
 * • Crypto execution quality.
 * • Adaptive institutional threshold.
 *
 * Final Qualification
 * • Institutional score.
 * • Advanced score validation.
 * • Advanced crypto readiness.
 *
 * Inputs
 * ------
 * CryptoScoreEngine consumes:
 *
 * • RuntimeParameters
 * • Trade score
 * • EMA alignment
 * • VWAP alignment
 * • BOS
 * • CHOCH
 * • Fair Value Gap
 * • Liquidity Sweep
 * • CVD confirmation
 * • AI confidence
 * • Liquidity score
 * • Volatility score
 * • Advanced crypto configuration
 *
 * Outputs
 * -------
 * CryptoScoreResult provides:
 *
 * Institutional Qualification
 * • institutionalScore
 * • advScoreOk
 *
 * Quality Metrics
 * • trendQuality
 * • structureQuality
 * • flowQuality
 * • liquidityQuality
 * • aiQuality
 *
 * Final Qualification
 * • advCryptoReady
 *
 * Upstream Dependencies
 * ---------------------
 * CryptoScoreEngine consumes outputs produced by:
 *
 * • ContextEngine
 * • TrendEngine
 * • MarketStructureEngine
 * • LiquidityEngine
 * • OrderFlowEngine
 * • AIConfidenceEngine
 * • RuntimeParameters
 *
 * Downstream Consumers
 * --------------------
 * CryptoScoreResult is consumed by:
 *
 * • AJDecisionEngine
 * • Strategy Qualification
 * • RuntimeExecutionEngine
 * • Crypto Dashboard
 * • Strategy Analytics
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Deterministic qualification model.
 * • Immutable output.
 * • Specialized crypto qualification.
 * • No runtime mutation.
 * • No signal generation.
 * • No execution authorization.
 * • No position sizing.
 * • No lifecycle management.
 * • No trade execution.
 * • Backward-compatible Advanced Crypto Mode.
 *
 * AJ v2 Crypto Qualification Pipeline
 *
 * TrendEngine
 *        │
 *        ▼
 * MarketStructureEngine
 *        │
 *        ▼
 * LiquidityEngine
 *        │
 *        ▼
 * OrderFlowEngine
 *        │
 *        ▼
 * AIConfidenceEngine
 *        │
 *        ▼
 * RuntimeParameters
 *        │
 *        ▼
 * CryptoScoreEngine
 *        │
 *        ▼
 * AJDecisionEngine
 *        │
 *        ▼
 * RuntimeExecutionEngine
 *
 * Notes
 * -----
 * • CryptoScoreEngine evaluates institutional crypto quality only.
 * • It does not determine BUY or SELL direction.
 * • It does not generate trading signals.
 * • It does not authorize execution.
 * • It does not calculate execution risk.
 * • It does not place or manage orders.
 * • It does not manage active positions.
 * • It does not own AI confidence calculations.
 * • CryptoScoreResult represents the canonical institutional crypto
 *   qualification output used throughout the AJ v2 Institutional Trading
 *   Framework.
 ****************************************************************************************/

import {RuntimeParameters} from "../../../runtime/config/RuntimeParameters";

export interface CryptoScoreInputs {

    //--------------------------------------------------
    // CHART
    //--------------------------------------------------

    chartId:string;

    //--------------------------------------------------
    // MODE
    //--------------------------------------------------

    advCryptoMode: boolean;
    isAdvCryptoSymbol: boolean;

    //--------------------------------------------------
    // SCORE INPUTS
    //--------------------------------------------------

    tradeScore: number;
    advMinScore: number;

    //--------------------------------------------------
    // MARKET REGIME
    //--------------------------------------------------

    advTrendOk: boolean;
    advRegimeOk: boolean;
    inducementBlock: boolean;

    //--------------------------------------------------
    // INSTITUTIONAL
    //--------------------------------------------------

    emaBull?: boolean;
    emaBear?: boolean;
    vwapBull?: boolean;
    vwapBear?: boolean;
    cvdBull?: boolean;
    cvdBear?: boolean;
    bosBull?: boolean;
    bosBear?: boolean;
    chochBull?: boolean;
    chochBear?: boolean;
    fvgBull?: boolean;
    fvgBear?: boolean;
    liquiditySweepBull?: boolean;
    liquiditySweepBear?: boolean;
    aiConfidence?: number;
    volatilityScore?: number;
    liquidityScore?: number;

}

export interface CryptoScoreResult {

    //--------------------------------------------------
    // SCORE RESULT
    //--------------------------------------------------

    institutionalScore: number;
    advScoreOk: boolean;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    trendQuality: number;
    structureQuality: number;
    flowQuality: number;
    liquidityQuality: number;
    aiQuality: number;

    //--------------------------------------------------
    // FINAL
    //--------------------------------------------------
    advCryptoReady: boolean;
}

export class CryptoScoreEngine {

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    calculate(
        input: CryptoScoreInputs
    ): CryptoScoreResult {

        //--------------------------------------------------
        // TREND
        //--------------------------------------------------

        let trendQuality = 0;
        if (
            input.emaBull ||
            input.emaBear
        ) {
            trendQuality += 15;
        }
        if (
            input.vwapBull ||
            input.vwapBear
        ) {
            trendQuality += 10;
        }

        //--------------------------------------------------
        // STRUCTURE
        //--------------------------------------------------

        let structureQuality = 0;
        if (
            input.bosBull ||
            input.bosBear
        ) {
            structureQuality += 20;
        }
        if (
            input.chochBull ||
            input.chochBear
        ) {
            structureQuality += 15;
        }
        if (
            input.fvgBull ||
            input.fvgBear
        ) {
            structureQuality += 10;
        }

        //--------------------------------------------------
        // ORDER FLOW
        //--------------------------------------------------

        let flowQuality = 0;
        if (
            input.cvdBull ||
            input.cvdBear
        ) {
            flowQuality += 15;
        }

        //--------------------------------------------------
        // LIQUIDITY
        //--------------------------------------------------

        let liquidityQuality = 0;

        if (
            input.liquiditySweepBull ||
            input.liquiditySweepBear
        ) {
            liquidityQuality += 15;
        }

        liquidityQuality +=
            Math.min(
                input.liquidityScore ??
                0,
                10
            );

        //--------------------------------------------------
        // AI
        //--------------------------------------------------

        const aiQuality =
            Math.min(
                input.aiConfidence ??
                0,
                10
            );
        
        //--------------------------------------------------
        // TOTAL
        //--------------------------------------------------
        
        const runtime =
        
            RuntimeParameters.forChart(
                input.chartId
            );
        
        let institutionalScore =
            input.tradeScore +
            trendQuality *
            runtime.cryptoVolatilityWeight +
            structureQuality *
            runtime.cryptoInstitutionalWeight +
            flowQuality +
            liquidityQuality +
            aiQuality;

        //--------------------------------------------------
        // BTC INSTITUTIONAL BOOST
        //--------------------------------------------------
        
        if(
            input.advCryptoMode &&
            input.isAdvCryptoSymbol
        ){
            institutionalScore += 8;
        }
        
        //--------------------------------------------------
        // HIGH VOLATILITY BONUS
        //--------------------------------------------------
        
        if(
            (input.volatilityScore ?? 0) >= 70
        ){
            institutionalScore += 5;
        }
        
        //--------------------------------------------------
        // STRONG STRUCTURE BONUS
        //--------------------------------------------------
        
        if(
            structureQuality >= 40
        ){
            institutionalScore += 5;
        }
        
        //--------------------------------------------------
        // VOLATILITY PENALTY
        //--------------------------------------------------

        if (
            (input.volatilityScore ?? 100) < 30
        ) {
            institutionalScore -= 10;
        }

        //--------------------------------------------------
        // INDUCEMENT PENALTY
        //--------------------------------------------------

        if (
            input.inducementBlock
        ) {
            institutionalScore -= 20;
        }

        //--------------------------------------------------
        // LIMIT
        //--------------------------------------------------

        institutionalScore =
            Math.max(
                0,
                Math.min(
                    institutionalScore,
                    100
                )
            );

        //--------------------------------------------------
        // SCORE FILTER
        //--------------------------------------------------
        
        const requiredScore =
            input.advCryptoMode &&
            input.isAdvCryptoSymbol
        
                ?
                Math.max(
                    input.advMinScore,
                    runtime.cryptoMinimumScore
        
                )
                : 50;
        const advScoreOk =
            institutionalScore >= requiredScore;
        
        //--------------------------------------------------
        // BTC EXECUTION QUALITY
        //--------------------------------------------------
        
        const cryptoExecutionQuality =
            trendQuality >= 20 &&
            structureQuality >= 30 &&
            flowQuality >= 10;
        
        //--------------------------------------------------
        // FINAL
        //--------------------------------------------------

        const advCryptoReady =
        
        (
            !input.advCryptoMode ||
            !input.isAdvCryptoSymbol
        )
        
        ||
        
        (
            input.advTrendOk &&
            input.advRegimeOk &&
            cryptoExecutionQuality &&
            advScoreOk &&
            !input.inducementBlock
        );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {
            institutionalScore,
            advScoreOk,
            trendQuality,
            structureQuality,
            flowQuality,
            liquidityQuality,
            aiQuality,
            advCryptoReady
        };
    }
}
