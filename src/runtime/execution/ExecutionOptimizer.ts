//==================================================================
//src/runtime/execution/ExecutionOptimizer.ts
//Phase 11 Institutional Execution Intelligence Layer
//==================================================================
//Below is a final production-stabilized ExecutionOptimizer.ts designed to: //remove score inflation drift
//align strictly with ParameterOptimizer + PortfolioRiskEngine //make execution gating deterministic
//ensure RuntimeEngine does not produce contradictory “allowed but unsafe” states //ExecutionOptimizer (FINAL FIX)
//Converts: //AIConfidence //Regime //Portfolio constraints //Runtime parameters //Into: //→ executionAllowed + executionScore + gating decision
//======================================================
//======================================================
// ExecutionOptimizer.ts — Part 1 (FINAL FIX)
// Phase 11 Institutional Execution Gate
//======================================================

import type { AJIndicatorResult } from "../../indicators/AJIndicator/AJTypes";

import type { AIConfidenceResult } from "../../indicators/AJIndicator/ai/AIConfidenceEngine";

import type { OptimizedParameters } from "../optimization/ParameterOptimizer";
import type { PortfolioRiskResult } from "../portfolio/PortfolioRiskResult";
import type { ExecutionOptimizationResult } from "../../indicators/AJIndicator/engines/Execution/ExecutionTypes";

import { MarketRegime } from "../RuntimeTypes";

//======================================================
// EXECUTION OPTIMIZER
//======================================================

export class ExecutionOptimizer {

    //--------------------------------------------------
    // SCORE NORMALIZATION
    //--------------------------------------------------

    private static clamp(value: number, min: number, max: number): number {

        return Math.max(min, Math.min(max, value));

    }

    //--------------------------------------------------
    // BASE EXECUTION SCORE
    //--------------------------------------------------

    private static baseScore(
        indicator: AJIndicatorResult,
        ai: AIConfidenceResult
    ): number {
        let score = 0;
        if (indicator.direction !== 0) score += 25;
        if (indicator.tradeScore >= 60) score += 25;
        if (ai.aiConfidence >= 70) score += 25;
        if (ai.executionConfidence >= 60) score += 25;
        return this.clamp(score, 0, 100);
    }

    //--------------------------------------------------
    // RISK ALIGNMENT SCORE
    //--------------------------------------------------

    private static riskScore(portfolio: PortfolioRiskResult): number {
        let score = 0;
        if (portfolio.riskAllowed) score += 50;
        if (portfolio.exposure <= 70) score += 25;
        if (portfolio.portfolioRisk <= 40) score += 25;
        return this.clamp(score, 0, 100);
    }

    //--------------------------------------------------
    // REGIME FILTER SCORE
    //--------------------------------------------------

    private static regimeScore(regime: MarketRegime): number {
        switch (regime) {
            case MarketRegime.TRENDING:
            case MarketRegime.BREAKOUT:
            case MarketRegime.REVERSAL:
                return 90;
            case MarketRegime.RANGING:
                return 50;
            default:
                return 30;
        }
    }

    //--------------------------------------------------
    // FINAL EXECUTION DECISION ENGINE Part 2 (FINAL GATING + OUTPUT CONTRACT)
    //--------------------------------------------------

    static optimize(
        indicator: AJIndicatorResult,
        ai: AIConfidenceResult,
        portfolio: PortfolioRiskResult,
        parameters: OptimizedParameters,
        regime: MarketRegime
    ): ExecutionOptimizationResult {

        //--------------------------------------------------
        // CORE SCORES
        //--------------------------------------------------

        const base = this.baseScore(indicator, ai);
        const risk = this.riskScore(portfolio);
        const regimeScore = this.regimeScore(regime);

        //--------------------------------------------------
        // PARAMETER ADJUSTMENT EFFECT
        //--------------------------------------------------

        let paramScore = 0;
        if (parameters.executionThreshold <= 60) paramScore += 20;
        if (parameters.minimumConfidence <= 60) paramScore += 20;
        if (parameters.positionMultiplier > 1) paramScore += 10;
        if (parameters.riskReward >= 2) paramScore += 10;

        //--------------------------------------------------
        // INSTITUTIONAL CONFLUENCE
        //--------------------------------------------------

        const institutionalBoost =
            (ai.institutionalConfidence >= 70 ? 15 : 0) +
            (portfolio.correlationRisk <= 40 ? 10 : 0) +
            (indicator.state === "EXECUTING" ? 10 : 0);
	
        //--------------------------------------------------
        // FINAL SCORE CALCULATION
        //--------------------------------------------------

        const executionScore =
            this.clamp(
                base * 0.35 +
                risk * 0.30 +
                regimeScore * 0.20 +
                paramScore +
                institutionalBoost,
                0,
                100
            );

        //--------------------------------------------------
        // EXECUTION GATE
        //--------------------------------------------------

        const executionAllowed =
            executionScore >= parameters.executionThreshold &&
            portfolio.riskAllowed &&
            ai.aiConfidence >= parameters.minimumConfidence &&
            indicator.direction !== 0;

        //--------------------------------------------------
        // POSITION MULTIPLIER FINALIZATION
        //--------------------------------------------------

        const recommendedPosition =
            this.clamp(
                portfolio.maxPositionSize *
                parameters.positionMultiplier *
                (executionScore / 100),
                0,
                portfolio.maxPositionSize
            );

        //--------------------------------------------------
        // RISK FILTER HARD STOP
        //--------------------------------------------------

        const hardStop =
            portfolio.portfolioRisk >= 90 ||
            portfolio.exposure >= 100 ||
            ai.confidenceGrade === "D";

        //--------------------------------------------------
        // FINAL DECISION
        //--------------------------------------------------

        const recommendation =
            hardStop
                ? "SKIP_TRADE"
                : executionAllowed
                    ? indicator.direction > 0
                        ? "LONG"
                        : "SHORT"
                    : "WAIT";

        //--------------------------------------------------
        // RETURN RESULT
        //--------------------------------------------------

        const result: ExecutionOptimizationResult = {
            executionScore,
            executionAllowed: executionAllowed && !hardStop,
            recommendedPosition,
            riskAdjusted: risk >= 70,
            regimeScore,
            baseScore: base,
            riskScore: risk,
            parameterScore: paramScore,
			confidenceScore: ai.aiConfidence,
            institutionalBoost,
            recommendation
        };

        return result;
    }

}

