/****************************************************************************************
 * File:
 * AIConfidenceEngine.ts
 *
 * Path:
 * src/runtime/ai/AIConfidenceEngine.ts
 *
 * AJ v2 - Institutional AI Confidence & Trade Qualification Engine
 *
 * Purpose
 * -------
 * AIConfidenceEngine is the canonical confidence evaluation engine of the
 * AJ v2 institutional trading framework. It consolidates intelligence from
 * trend analysis, market structure, liquidity, execution readiness, and
 * institutional participation into a single normalized AI confidence score.
 *
 * Rather than generating trading signals, AIConfidenceEngine measures the
 * overall quality and reliability of an already qualified trading setup. It
 * converts multiple runtime components into an institutional confidence grade
 * and execution recommendation that can be consumed consistently by the
 * decision and execution layers.
 *
 * AIConfidenceEngine represents the final confidence evaluation stage before
 * AJDecisionEngine and Trade Authority determine whether execution should be
 * permitted.
 *
 * Responsibilities
 * ----------------
 * • Evaluate trend confidence.
 * • Evaluate market structure confidence.
 * • Evaluate liquidity confidence.
 * • Evaluate execution readiness.
 * • Evaluate institutional participation.
 * • Normalize overall AI confidence.
 * • Assign institutional confidence grades.
 * • Generate execution recommendations.
 * • Produce normalized AIConfidenceResult.
 *
 * Functional Areas
 * ----------------
 *
 * Trend Confidence
 * • EMA alignment.
 * • VWAP confirmation.
 * • ADX trend validation.
 * • RSI directional confirmation.
 *
 * Market Structure Confidence
 * • Break of Structure (BOS).
 * • Change of Character (CHOCH).
 * • Fair Value Gap (FVG).
 * • Institutional market structure.
 *
 * Liquidity Confidence
 * • Liquidity sweep validation.
 * • Stop hunt detection.
 * • Liquidity-based qualification.
 *
 * Execution Confidence
 * • Final trade direction.
 * • Runtime trade score.
 * • Runtime engine state.
 * • Institutional execution readiness.
 *
 * Institutional Confidence
 * ------------------------
 * • Institutional directional confirmation.
 * • AI trend alignment.
 * • Smart Money displacement.
 * • Context confidence contribution.
 *
 * Confidence Aggregation
 * ----------------------
 * The engine combines multiple confidence components into a single weighted
 * institutional confidence score.
 *
 * Default AJ v2 Weighting
 *
 * • Trend Confidence ............... 20%
 * • Structure Confidence ........... 25%
 * • Liquidity Confidence ........... 15%
 * • Execution Confidence ........... 20%
 * • Institutional Confidence ....... 20%
 *
 * Final Confidence
 * ----------------
 * The combined weighted score is normalized to a range of 0–100 and becomes
 * the official AI Confidence value used throughout AJ v2.
 *
 * Confidence Grades
 * -----------------
 *
 * Grade A
 * • Institutional-quality setup.
 * • Very high probability.
 *
 * Grade B
 * • High-confidence setup.
 * • Execution generally permitted.
 *
 * Grade C
 * • Acceptable confidence.
 * • Requires additional confirmation.
 *
 * Grade D
 * • Weak institutional confidence.
 * • Execution discouraged.
 *
 * Recommendation Engine
 * ---------------------
 *
 * STRONG_LONG
 * • High confidence bullish setup.
 *
 * LONG
 * • Valid bullish opportunity.
 *
 * WAIT
 * • Insufficient institutional confidence.
 *
 * SHORT
 * • Valid bearish opportunity.
 *
 * STRONG_SHORT
 * • High confidence bearish setup.
 *
 * Inputs
 * ------
 * AIConfidenceEngine consumes AJRuntimeContext including:
 *
 * Trend Intelligence
 * • EMA
 * • VWAP
 * • RSI
 * • ADX
 *
 * Market Structure
 * • BOS
 * • CHOCH
 * • FVG
 * • Market Structure Bias
 *
 * Liquidity Intelligence
 * • Liquidity Sweeps
 * • Stop Hunt Detection
 *
 * Execution Intelligence
 * • Trade Direction
 * • Trade Score
 * • Engine State
 *
 * Institutional Intelligence
 * • Institutional Long
 * • Institutional Short
 * • Trend Qualification
 * • Displacement
 * • Context Confidence
 *
 * Outputs
 * -------
 * AIConfidenceResult provides:
 *
 * Component Scores
 * • Trend Confidence
 * • Structure Confidence
 * • Liquidity Confidence
 * • Execution Confidence
 * • Institutional Confidence
 *
 * Final Assessment
 * • AI Confidence
 * • Confidence Grade
 * • Trade Recommendation
 *
 * Upstream Dependencies
 * ---------------------
 * AIConfidenceEngine consumes normalized runtime intelligence from:
 *
 * • AJRuntimeContextBuilder
 * • ContextEngine
 * • MarketStructureEngine
 * • OrderFlowEngine
 * • LiquidityEngine
 * • BreakoutEngine
 * • AIEngine
 * • RuntimeParameters
 *
 * Downstream Consumers
 * --------------------
 * AIConfidenceResult is consumed by:
 *
 * • AJContextEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • Runtime Adapter
 * • Execution Engine
 * • Strategy Dashboard
 * • Runtime Diagnostics
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Pure confidence evaluation engine.
 * • Deterministic scoring model.
 * • Weighted institutional confidence.
 * • Runtime parameter driven.
 * • Market-independent implementation.
 * • No signal generation.
 * • No execution authority.
 * • No state management.
 * • No lifecycle management.
 * • No order placement.
 * • Immutable output.
 * • Backward compatible.
 * • Phase 15.5 compliant.
 *
 * Institutional Features
 * ----------------------
 * • Multi-factor confidence aggregation.
 * • Institutional trend validation.
 * • Smart Money structure qualification.
 * • Liquidity quality assessment.
 * • Execution readiness evaluation.
 * • Institutional participation scoring.
 * • Weighted confidence normalization.
 * • Confidence grading.
 * • Recommendation engine.
 * • Runtime parameter integration.
 *
 * AJ v2 Pipeline
 *
 * AJRuntimeContextBuilder
 *            │
 *            ▼
 *      ContextEngine
 *            │
 *            ▼
 *  MarketStructureEngine
 *            │
 *            ▼
 *     OrderFlowEngine
 *            │
 *            ▼
 *     LiquidityEngine
 *            │
 *            ▼
 *      BreakoutEngine
 *            │
 *            ▼
 *         AIEngine
 *            │
 *            ▼
 *   AIConfidenceEngine
 *            │
 *            ▼
 *    AIConfidenceResult
 *            │
 *            ▼
 *     AJDecisionEngine
 *            │
 *            ▼
 *  Trade Authority Engine
 *            │
 *            ▼
 *     Execution Engine
 *
 * Notes
 * -----
 * • AIConfidenceEngine is not a machine learning model.
 * • It performs deterministic institutional confidence evaluation using
 *   weighted runtime intelligence.
 * • It does not generate Buy/Sell signals.
 * • It does not determine market direction.
 * • It does not authorize execution.
 * • It does not manage positions or trade lifecycle.
 * • AIConfidenceResult represents the normalized institutional confidence
 *   layer that bridges AI qualification and execution authority within
 *   the AJ v2 architecture.
 *
 ****************************************************************************************/

import type { AJRuntimeContext } from "../AJRuntimeContext";
import { RuntimeParameters } from "../../../runtime/config/RuntimeParameters";

//======================================================
// AI CONFIDENCE RESULT
//======================================================

export interface AIConfidenceResult {

    //--------------------------------------------------
    // COMPONENT SCORES
    //--------------------------------------------------

    trendConfidence:
        number;

    structureConfidence:
        number;

    liquidityConfidence:
        number;

    executionConfidence:
        number;

	institutionalConfidence:
		number;
	
	orderFlowConfidence:
		number;
	
	riskQualificationConfidence:
		number;

    //--------------------------------------------------
    // FINAL
    //--------------------------------------------------

    aiConfidence:
        number;

    confidenceGrade:
        "A" | "B" | "C" | "D";

    recommendation:
        "STRONG_LONG" |
        "LONG" |
        "WAIT" |
        "SHORT" |
        "STRONG_SHORT";

}

//======================================================
// AI CONFIDENCE ENGINE
//======================================================

export class AIConfidenceEngine {

    //--------------------------------------------------
    // NORMALIZE
    //--------------------------------------------------

    private static normalize(

        value: number

    ): number {

        return Math.max(

            0,

            Math.min(

                100,

                Math.round(

                    value

                )

            )

        );

    }

    //--------------------------------------------------
    // TREND SCORE
    //--------------------------------------------------
    
    private static trendScore(
    
        runtime: AJRuntimeContext
    
    ): number {
    
        const parameters =
    
            RuntimeParameters.forChart(
                runtime.symbol
            );
    
        let score = 0;
    
        if (
            runtime.emaBull ||
            runtime.emaBear
        ) {
            score += 30;
        }
    
        if (
            runtime.vwapBull ||
            runtime.vwapBear
        ) {
            score += 20;
        }
    
        if (
            runtime.adxTrend
        ) {
            score +=
                parameters.adxTrendThreshold >= 25
                    ? 30
                    : 25;
        }
    
        if (
            runtime.rsiBull ||
            runtime.rsiBear
        ) {
            score += 20;
        }
    
        return this.normalize(score);
    
    }

    //--------------------------------------------------
    // STRUCTURE SCORE
    //--------------------------------------------------

    private static structureScore(

        runtime: AJRuntimeContext

    ): number {

        let score = 0;

        if (
            runtime.bosBull ||
            runtime.bosBear
        ) {
            score += 35;
        }

        if (
            runtime.chochBull ||
            runtime.chochBear
        ) {
            score += 25;
        }

        if (
            runtime.fvgBull ||
            runtime.fvgBear
        ) {
            score += 20;
        }

		if (
			runtime.aiMarketStructureBull ||
			runtime.aiMarketStructureBear
		) {
			score += 20;
		}
		
		if (
			runtime.orderBlock?.bullish ||
			runtime.orderBlock?.bearish
		) {
			score += 15;
		}

        return this.normalize(score);

    }

    //--------------------------------------------------
    // LIQUIDITY SCORE
    //--------------------------------------------------

    private static liquidityScore(

        runtime: AJRuntimeContext

    ): number {

        let score = 40;

        if (
            runtime.liquiditySweepLow ||
            runtime.liquiditySweepHigh
        ) {
            score += 30;
        }

        if (
            runtime.stopHuntDetected
        ) {
            score += 30;
        }

        return this.normalize(score);

    }

    //--------------------------------------------------
    // EXECUTION SCORE
    //--------------------------------------------------
    
    private static executionScore(
    
        runtime: AJRuntimeContext
    
    ): number {
    
		void RuntimeParameters.forChart(
			runtime.symbol
		);
    
        let score = 0;
    
        if (
            runtime.tradeDirectionFinal !== 0
        ) {
            score += 25;
        }
    
		//--------------------------------------------------
		// EXECUTION READINESS
		//
		// ExecutionAuthority owns execution approval.
		// AIConfidenceEngine measures execution quality only.
		//--------------------------------------------------
		
		if (runtime.executionReady) {
			score += 25;
		}
    
        if (
            runtime.engineState !== undefined
        ) {
            score += 25;
        }
    
        if (
            runtime.aiInstitutionalLong ||
            runtime.aiInstitutionalShort
        ) {
            score += 25;
        }
    
        return this.normalize(score);
    
    }

    //--------------------------------------------------
    // INSTITUTIONAL SCORE
    //--------------------------------------------------
	
	//--------------------------------------------------
	// ORDER FLOW SCORE
	//--------------------------------------------------
	
	private static orderFlowScore(
	
		runtime: AJRuntimeContext
	
	): number {
	
		let score = 0;
	
		if (runtime.orderFlow?.bullish)
			score += 40;
		
		if (runtime.orderFlow?.bearish)
			score += 40;
		
		score += Math.min(
			60,
			runtime.orderFlow?.confidence ?? 0
		);
	
		return this.normalize(score);
	
	}

    private static institutionalScore(

        runtime: AJRuntimeContext

    ): number {

        let score = 0;

        if (
            runtime.aiInstitutionalLong ||
            runtime.aiInstitutionalShort
        ) {
            score += 40;
        }

        if (
            runtime.aiTrendLong ||
            runtime.aiTrendShort
        ) {
            score += 20;
        }

        if (
            runtime.aiBullDisplacement ||
            runtime.aiBearDisplacement
        ) {
            score += 20;
        }

        score += Math.min(
            20,
            Math.round(
                runtime.contextConfidence /
                5
            )
        );

        return this.normalize(score);

    }

    //--------------------------------------------------
    // GRADE
    //--------------------------------------------------
    
    private static confidenceGrade(
    
        runtime: AJRuntimeContext,
        confidence:number
    
    ): "A" | "B" | "C" | "D" {
    
        const parameters =
    
            RuntimeParameters.forChart(
                runtime.symbol
            );
    
        if (confidence >= 85)
            return "A";
    
        if (confidence >= 70)
            return "B";
    
        if (
            confidence >=
            parameters.minimumConfidence
        )
            return "C";
    
        return "D";
    
    }

	//--------------------------------------------------
	// RECOMMENDATION
	//
	// Produces a confidence recommendation only.
	//
	// This recommendation is informational.
	// It never authorizes execution.
	//
	// ExecutionAuthority remains the only owner
	// of execution approval.
	//--------------------------------------------------

    private static recommendation(

        runtime: AJRuntimeContext,

        confidence: number

    ): AIConfidenceResult["recommendation"] {

        if (
            confidence >= 85 &&
            runtime.tradeDirectionFinal > 0
        ) {
            return "STRONG_LONG";
        }

        if (
            confidence >= 70 &&
            runtime.tradeDirectionFinal > 0
        ) {
            return "LONG";
        }

        if (
            confidence >= 85 &&
            runtime.tradeDirectionFinal < 0
        ) {
            return "STRONG_SHORT";
        }

        if (
            confidence >= 70 &&
            runtime.tradeDirectionFinal < 0
        ) {
            return "SHORT";
        }

        return "WAIT";

    }

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(

        runtime: AJRuntimeContext

    ): AIConfidenceResult {

        const trendConfidence =
            this.trendScore(runtime);

        const structureConfidence =
            this.structureScore(runtime);

        const liquidityConfidence =
            this.liquidityScore(runtime);

        const executionConfidence =
            this.executionScore(runtime);

		const institutionalConfidence =
					this.institutionalScore(runtime);
		
		//--------------------------------------------------
		// RISK QUALIFICATION
		//--------------------------------------------------
		
		const riskQualificationConfidence =
			runtime.riskQualification?.qualified
				? 100
				: 0;

		const orderFlowConfidence =
			this.orderFlowScore(runtime);
		
		const aiConfidence =
			this.normalize(
		
				trendConfidence * 0.18 +
				structureConfidence * 0.22 +
				liquidityConfidence * 0.15 +
				executionConfidence * 0.15 +
				institutionalConfidence * 0.15 +
				orderFlowConfidence * 0.10 +
				riskQualificationConfidence * 0.05
		
			);

        return {

            trendConfidence,
            structureConfidence,
            liquidityConfidence,
            executionConfidence,
			institutionalConfidence,
			orderFlowConfidence,
			riskQualificationConfidence,
			aiConfidence,

            confidenceGrade:
                this.confidenceGrade(
                    runtime,
                    aiConfidence
                ),

            recommendation:
                this.recommendation(runtime, aiConfidence)

        };

    }

}
