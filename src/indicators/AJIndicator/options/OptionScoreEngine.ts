/****************************************************************************************
 * File:
 * OptionScoreEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/options/OptionScoreEngine.ts
 *
 * AJ v2 - Institutional Option Qualification Engine
 *
 * Purpose
 * -------
 * OptionScoreEngine is the canonical institutional option qualification
 * engine within the AJ v2 trading framework.
 *
 * The engine evaluates whether an option contract satisfies institutional
 * quality requirements by combining market trend, Smart Money structure,
 * order flow, liquidity participation, volume confirmation, premium
 * validation, implied volatility suitability and AI confidence into a
 * normalized qualification score.
 *
 * This engine does NOT generate trading signals or authorize execution.
 * Its responsibility is limited to determining whether a candidate option
 * contract is suitable for institutional trading.
 *
 * Responsibilities
 * ----------------
 * • Evaluate institutional trend quality.
 * • Evaluate Smart Money structure quality.
 * • Evaluate order flow participation.
 * • Evaluate relative volume strength.
 * • Validate option premium range.
 * • Validate implied volatility suitability.
 * • Incorporate AI confidence contribution.
 * • Produce normalized option quality score.
 * • Determine institutional option readiness.
 * • Return immutable OptionScoreResult.
 *
 * Functional Areas
 * ----------------
 *
 * Trend Qualification
 * • EMA alignment.
 * • VWAP alignment.
 * • Trend quality scoring.
 *
 * Smart Money Qualification
 * • Inside Bar validation.
 * • Break of Structure (BOS).
 * • Change of Character (CHOCH).
 * • Fair Value Gap (FVG).
 * • Liquidity Sweep confirmation.
 *
 * Order Flow Qualification
 * • Cumulative Delta (CVD).
 * • Institutional participation quality.
 *
 * Volume Qualification
 * • Relative volume analysis.
 * • Volume versus SMA(20).
 *
 * Premium Qualification
 * • Minimum premium validation.
 * • Maximum premium validation.
 * • Institutional premium suitability.
 *
 * Volatility Qualification
 * • Implied Volatility Rank (IV Rank).
 * • Volatility suitability assessment.
 *
 * AI Qualification
 * • AI confidence contribution.
 * • Institutional weighting.
 *
 * Final Qualification
 * • Normalized score (0–100).
 * • Institutional readiness.
 *
 * Inputs
 * ------
 * OptionScoreEngine consumes:
 *
 * • Trend state
 * • EMA alignment
 * • VWAP alignment
 * • CVD order flow
 * • Inside Bar status
 * • BOS
 * • CHOCH
 * • Fair Value Gap
 * • Liquidity Sweep
 * • Relative volume
 * • Option premium
 * • Premium limits
 * • Implied Volatility Rank
 * • AI confidence
 *
 * Outputs
 * -------
 * OptionScoreResult provides:
 *
 * Qualification Score
 * • optionScore
 *
 * Quality Metrics
 * • trendQuality
 * • structureQuality
 * • orderFlowQuality
 * • volumeQuality
 * • premiumQuality
 * • aiQuality
 *
 * Validation
 * • premiumValid
 * • ivValid
 * • ready
 *
 * Upstream Dependencies
 * ---------------------
 * OptionScoreEngine consumes outputs from:
 *
 * • Trend Engine
 * • Market Structure Engine
 * • Order Flow Engine
 * • Liquidity Engine
 * • AIConfidenceEngine
 * • Option Market Data
 *
 * Downstream Consumers
 * --------------------
 * OptionScoreResult is consumed by:
 *
 * • OptionValidationEngine
 * • AJDecisionEngine
 * • RuntimeExecutionEngine
 * • Strategy Dashboard
 * • Option Analytics
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Deterministic scoring model.
 * • Immutable output.
 * • Pure qualification engine.
 * • No runtime mutation.
 * • No order execution.
 * • No position sizing.
 * • No stop-loss calculation.
 * • No target calculation.
 * • No lifecycle management.
 * • No trailing management.
 * • No re-entry management.
 * • Backward-compatible calculate() entry point.
 *
 * AJ v2 Pipeline
 *
 * Market Structure
 *        │
 *        ▼
 * Trend Engine
 *        │
 *        ▼
 * Order Flow Engine
 *        │
 *        ▼
 * Liquidity Engine
 *        │
 *        ▼
 * AIConfidenceEngine
 *        │
 *        ▼
 * OptionScoreEngine
 *        │
 *        ▼
 * OptionValidationEngine
 *        │
 *        ▼
 * AJDecisionEngine
 *
 * Notes
 * -----
 * • OptionScoreEngine evaluates option contract quality only.
 * • It does not determine trade direction.
 * • It does not generate BUY or SELL signals.
 * • It does not authorize execution.
 * • It does not calculate execution risk.
 * • It does not perform order placement.
 * • It does not manage active positions.
 * • OptionScoreResult represents the canonical institutional option
 *   qualification output within the AJ v2 architecture.
 ****************************************************************************************/

export interface OptionScoreInputs {

    //--------------------------------------------------
    // ENABLE
    //--------------------------------------------------

    optionsAllowed: boolean;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    emaBull: boolean;

    emaBear: boolean;

    vwapBull?: boolean;

    vwapBear?: boolean;

    //--------------------------------------------------
    // ORDER FLOW
    //--------------------------------------------------

    cvdBull: boolean;

    cvdBear: boolean;

    //--------------------------------------------------
    // STRUCTURE
    //--------------------------------------------------

    ibValid: boolean;

    bosBull?: boolean;

    bosBear?: boolean;

    chochBull?: boolean;

    chochBear?: boolean;

    fvgBull?: boolean;

    fvgBear?: boolean;

    liquiditySweepBull?: boolean;

    liquiditySweepBear?: boolean;

    //--------------------------------------------------
    // VOLUME
    //--------------------------------------------------

    volume: number;

    volumeSma20: number;

    //--------------------------------------------------
    // PREMIUM
    //--------------------------------------------------

    optionPremium?: number;

    minPremium?: number;

    maxPremium?: number;

    //--------------------------------------------------
    // IMPLIED VOLATILITY
    //--------------------------------------------------

    ivRank?: number;

    //--------------------------------------------------
    // AI
    //--------------------------------------------------

    aiConfidence?: number;

}

export interface OptionScoreResult {

    //--------------------------------------------------
    // SCORE
    //--------------------------------------------------

    optionScore: number;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    trendQuality: number;

    structureQuality: number;

    orderFlowQuality: number;

    volumeQuality: number;

    premiumQuality: number;

    aiQuality: number;

    //--------------------------------------------------
    // VALIDATION
    //--------------------------------------------------

    premiumValid: boolean;

    ivValid: boolean;

    ready: boolean;

}

export class OptionScoreEngine {

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    calculate(

        input: OptionScoreInputs

    ): OptionScoreResult | null {

        //--------------------------------------------------
        // OPTIONS DISABLED
        //--------------------------------------------------

        if (

            !input.optionsAllowed

        ) {

            return null;

        }

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

            input.ibValid

        ) {

            structureQuality += 10;

        }

        if (

            input.bosBull ||

            input.bosBear

        ) {

            structureQuality += 15;

        }

        if (

            input.chochBull ||

            input.chochBear

        ) {

            structureQuality += 10;

        }

        if (

            input.fvgBull ||

            input.fvgBear

        ) {

            structureQuality += 10;

        }

        if (

            input.liquiditySweepBull ||

            input.liquiditySweepBear

        ) {

            structureQuality += 10;

        }

        //--------------------------------------------------
        // ORDER FLOW
        //--------------------------------------------------

        let orderFlowQuality = 0;

        if (

            input.cvdBull ||

            input.cvdBear

        ) {

            orderFlowQuality += 15;

        }

        //--------------------------------------------------
        // VOLUME
        //--------------------------------------------------

        let volumeQuality = 0;

        if (

            input.volume >

            input.volumeSma20

        ) {

            const ratio =

                input.volume /

                Math.max(

                    input.volumeSma20,

                    1

                );

            volumeQuality =

                Math.min(

                    ratio * 10,

                    15

                );

        }

        //--------------------------------------------------
        // PREMIUM
        //--------------------------------------------------

        const premium =

            input.optionPremium ??

            0;

        const minPremium =

            input.minPremium ??

            0;

        const maxPremium =

            input.maxPremium ??

            Number.MAX_VALUE;

        const premiumValid =

            premium >= minPremium &&

            premium <= maxPremium;

        let premiumQuality = 0;

        if (

            premiumValid

        ) {

            premiumQuality = 10;

        }

        //--------------------------------------------------
        // IV
        //--------------------------------------------------

        const ivRank =

            input.ivRank ??

            50;

        const ivValid =

            ivRank >= 20 &&

            ivRank <= 80;

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

        let optionScore =

            trendQuality +

            structureQuality +

            orderFlowQuality +

            volumeQuality +

            premiumQuality +

            aiQuality;

        if (

            !ivValid

        ) {

            optionScore -= 10;

        }

        optionScore =

            Math.max(

                0,

                Math.min(

                    optionScore,

                    100

                )

            );

        //--------------------------------------------------
        // READY
        //--------------------------------------------------

        const ready =

            optionScore >= 60 &&

            premiumValid &&

            ivValid;

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            optionScore,

            trendQuality,

            structureQuality,

            orderFlowQuality,

            volumeQuality,

            premiumQuality,

            aiQuality,

            premiumValid,

            ivValid,

            ready

        };

    }

}
