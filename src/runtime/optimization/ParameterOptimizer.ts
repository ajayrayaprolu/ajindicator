//======================================================
// src/runtime/optimization/ParameterOptimizer.ts
// Phase 11 // Adaptive Parameter Optimization Engine // Win-rate based adaptive adjustments // Position sizing optimization // Execution threshold tuning
// Final OptimizedParameters return // Class completion // Code designed to plug directly into the Phase 11 RuntimeEngine after AdaptiveLearning and before ExecutionEngine.
// Adaptive + Research Parameter Optimization contain: // • optimize() // • Phase 11 rule optimizer // • integration // research pipeline // • apply() // • return
//======================================================

import { RuntimeParameters } from "../config/RuntimeParameters";
import { MarketRegime } from "../RuntimeTypes";

import type { LearningSnapshot } from "./AdaptiveLearning";

import type { AdaptiveLearningResult } from "./AdaptiveLearningEngine";
import type { LearningAttributionResult } from "./LearningAttributionEngine";
import type { ParameterDriftResult } from "./ParameterDriftEngine";
import type { LearningStabilityResult } from "./LearningStabilityEngine";

import { ResearchParameterOptimizer } from "./ResearchParameterOptimizer";
import { GridSearchEngine } from "./GridSearchEngine";
import { GeneticOptimizer } from "./GeneticOptimizer";

//======================================================
// OPTIMIZED PARAMETERS
//======================================================

export interface OptimizedParameters {

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    minimumConfidence: number;

    minimumTradeScore: number;

    executionThreshold: number;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    adxTrendThreshold: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atrMultiplier: number;

    stopMultiplier: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionMultiplier: number;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    riskReward: number;

    //--------------------------------------------------
    // METADATA
    //--------------------------------------------------

    optimizedBy: "RULES" | "RESEARCH";

    researchEnabled: boolean;

}

//======================================================
// PARAMETER OPTIMIZER
//======================================================

export class ParameterOptimizer {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    private static clamp(
        value: number,
        min: number,
        max: number
    ): number {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }

    //--------------------------------------------------
    // APPLY PARAMETERS
    //--------------------------------------------------
    
    private static apply(
    
        runtime: RuntimeParameters,
        parameters: OptimizedParameters
    
    ): void {
    
        runtime.minimumConfidence =
            parameters.minimumConfidence;
    
        runtime.minimumTradeScore =
            parameters.minimumTradeScore;
    
        runtime.executionThreshold =
            parameters.executionThreshold;
    
        runtime.adxTrendThreshold =
            parameters.adxTrendThreshold;
    
        runtime.atrMultiplier =
            parameters.atrMultiplier;
    
        runtime.stopMultiplier =
            parameters.stopMultiplier;
    
        runtime.positionMultiplier =
            parameters.positionMultiplier;
    
        runtime.riskReward =
            parameters.riskReward;
    
    }

    //--------------------------------------------------
    // RESEARCH PIPELINE
    //--------------------------------------------------

    private static runResearchPipeline(

        learning: AdaptiveLearningResult,

        drift: ParameterDriftResult,

        stability: LearningStabilityResult

    ) {

        //--------------------------------------------------
        // BUILD RESEARCH CANDIDATES
        //--------------------------------------------------

        const research =
            ResearchParameterOptimizer.optimize(
                learning,
                drift,
                stability
            );

        //--------------------------------------------------
        // GRID SEARCH
        //--------------------------------------------------

        const grid =
            GridSearchEngine.optimize(
                research.candidates
            );

        //--------------------------------------------------
        // GENETIC SEARCH
        //--------------------------------------------------

        const genetic =
            GeneticOptimizer.optimize(
                grid.rankedCandidates
            );

        //--------------------------------------------------
        // RETURN FINAL WINNER
        //--------------------------------------------------

        return genetic.bestCandidate;

    }

	//--------------------------------------------------
    // OPTIMIZE
    //--------------------------------------------------

    static optimize(
        regime: MarketRegime,
        snapshot: LearningSnapshot,
        learning: AdaptiveLearningResult,
        attribution: LearningAttributionResult,
        drift: ParameterDriftResult,
        stability: LearningStabilityResult,
        researchMode = false
    ): OptimizedParameters {

        //--------------------------------------------------
        // BASELINE
        //--------------------------------------------------

        const runtime =
        
            RuntimeParameters.forChart(
                snapshot.chartId
            );
        
        let minimumConfidence =
            runtime.minimumConfidence;
        
        let minimumTradeScore =
            runtime.minimumTradeScore;
        
        let executionThreshold =
            runtime.executionThreshold;
        
        let adxTrendThreshold =
            runtime.adxTrendThreshold;
        
        let atrMultiplier =
            runtime.atrMultiplier;
        
        let stopMultiplier =
            runtime.stopMultiplier;
        
        let positionMultiplier =
            runtime.positionMultiplier;
        
        let riskReward =
            runtime.riskReward;

        //--------------------------------------------------
        // MARKET REGIME
        //--------------------------------------------------

        switch (regime) {

            case MarketRegime.TRENDING:

                minimumConfidence -= 3;
                minimumTradeScore -= 5;
                executionThreshold -= 3;
                atrMultiplier = 1.70;
                riskReward = 2.50;

                break;

            case MarketRegime.BREAKOUT:

                minimumConfidence += 4;
                minimumTradeScore += 3;
                executionThreshold -= 1;
                atrMultiplier = 1.50;
                riskReward = 3.00;

                break;

            case MarketRegime.REVERSAL:

                minimumConfidence += 8;
                minimumTradeScore += 6;
                executionThreshold += 5;
                atrMultiplier = 1.30;
                riskReward = 1.80;

                break;

            case MarketRegime.RANGING:

                minimumConfidence += 10;
                minimumTradeScore += 8;
                executionThreshold += 8;
                atrMultiplier = 1.10;
                riskReward = 1.40;

                break;

            case MarketRegime.VOLATILE:

                minimumConfidence += 12;
                executionThreshold += 10;
                atrMultiplier = 1.00;
                riskReward = 1.20;
                positionMultiplier *= 0.80;

                break;

            default:
                break;

        }

        //--------------------------------------------------
        // LEARNING BIAS
        //--------------------------------------------------

        minimumConfidence +=
            learning.confidenceBias;

        minimumTradeScore +=
            Math.round(
                learning.parameterBias * 0.50
            );

        executionThreshold +=
            drift.parameterAdjustment;

        minimumConfidence +=
            drift.parameterAdjustment;

        //--------------------------------------------------
        // STABILITY CONTROL
        //--------------------------------------------------

        if (stability.freezeLearning) {

            minimumConfidence += 8;
            minimumTradeScore += 8;
            executionThreshold += 8;
            positionMultiplier *= 0.80;

        }
        else if (stability.adaptationAllowed) {

            minimumConfidence +=
                learning.parameterBias;

            executionThreshold +=
                learning.parameterBias;

        }

        //--------------------------------------------------
        // WIN RATE
        //--------------------------------------------------

        if (snapshot.winRate >= 75) {

            positionMultiplier *= 1.15;
            executionThreshold -= 3;

        }
        else if (snapshot.winRate >= 65) {

            positionMultiplier *= 1.05;
            executionThreshold -= 1;

        }
        else if (snapshot.winRate <= 35) {

            positionMultiplier *= 0.70;
            executionThreshold += 10;

        }
        else if (snapshot.winRate <= 45) {

            positionMultiplier *= 0.85;
            executionThreshold += 5;

        }

        //--------------------------------------------------
        // ATTRIBUTION
        //--------------------------------------------------

        if (
            attribution.executionContribution < 50
        ) {

            executionThreshold += 3;

        }

        if (
            attribution.aiContribution >= 80
        ) {

            minimumConfidence -= 2;

        }

        //--------------------------------------------------
        // RESEARCH PIPELINE
        //--------------------------------------------------

        let optimizedBy:
            "RULES" | "RESEARCH" = "RULES";

        if (
            researchMode &&
            stability.adaptationAllowed
        ) {

            const candidate =
                this.runResearchPipeline(
                    learning,
                    drift,
                    stability
                );

            executionThreshold =
                candidate.executionThreshold;

            minimumConfidence =
                candidate.minimumConfidence;

            positionMultiplier =
                candidate.positionMultiplier;

            atrMultiplier =
                candidate.atrMultiplier;

            riskReward =
                candidate.riskReward;

            optimizedBy =
                "RESEARCH";

        }

        //--------------------------------------------------
        // CLAMP
        //--------------------------------------------------

        minimumConfidence =
            this.clamp(
                minimumConfidence,
                45,
                90
            );

        minimumTradeScore =
            this.clamp(
                minimumTradeScore,
                40,
                95
            );

        executionThreshold =
            this.clamp(
                executionThreshold,
                45,
                90
            );

        adxTrendThreshold =
            this.clamp(
                adxTrendThreshold,
                15,
                40
            );

        atrMultiplier =
            this.clamp(
                atrMultiplier,
                0.50,
                3.00
            );

        stopMultiplier =
            this.clamp(
                stopMultiplier,
                0.50,
                3.00
            );

        positionMultiplier =
            this.clamp(
                positionMultiplier,
                0.25,
                2.00
            );

        riskReward =
            this.clamp(
                riskReward,
                1.00,
                5.00
            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        const optimized:
            OptimizedParameters = {
            minimumConfidence,
            minimumTradeScore,
            executionThreshold,
            adxTrendThreshold,
            atrMultiplier,
            stopMultiplier,
            positionMultiplier,
            riskReward,
            optimizedBy,
            researchEnabled:
                researchMode
        };

        //--------------------------------------------------
        // APPLY
        //--------------------------------------------------

        this.apply(
            runtime,
            optimized
        );

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return optimized;
    }
}
