//======================================================
// ResearchParameterOptimizer.ts
// Part 1 ResearchParameterOptimizer → decides what parameters should be explored.
// Phase 14
// Research Parameter Optimization Engine
//======================================================

import type { AdaptiveLearningResult } from "./AdaptiveLearningEngine";
import type { ParameterDriftResult } from "./ParameterDriftEngine";
import type { LearningStabilityResult } from "./LearningStabilityEngine";

//======================================================
// PARAMETER CANDIDATE
//======================================================

export interface ResearchParameterCandidate {

    executionThreshold: number;

    minimumConfidence: number;

    positionMultiplier: number;

    atrMultiplier: number;

    riskReward: number;

    score: number;

}

//======================================================
// RESULT
//======================================================

export interface ResearchParameterResult {

    candidates: ResearchParameterCandidate[];

    bestCandidate: ResearchParameterCandidate;

    optimizationScore: number;

    recommendation: string;

}

//======================================================
// ENGINE
//======================================================

export class ResearchParameterOptimizer {

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
    // BUILD CANDIDATE
    //--------------------------------------------------

    private static buildCandidate(

        executionThreshold: number,

        minimumConfidence: number,

        positionMultiplier: number,

        atrMultiplier: number,

        riskReward: number

    ): ResearchParameterCandidate {

        return {

            executionThreshold,

            minimumConfidence,

            positionMultiplier,

            atrMultiplier,

            riskReward,

            score: 0

        };

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static optimize(

        learning: AdaptiveLearningResult,

        drift: ParameterDriftResult,

        stability: LearningStabilityResult

    ): ResearchParameterResult {

        //--------------------------------------------------
        // BASE CANDIDATES
        //--------------------------------------------------

        const candidates: ResearchParameterCandidate[] = [

            this.buildCandidate(60, 60, 1.00, 1.00, 2.0),

            this.buildCandidate(65, 65, 0.90, 1.10, 2.5),

            this.buildCandidate(55, 55, 1.10, 0.90, 1.8),

            this.buildCandidate(70, 70, 0.80, 1.20, 3.0)

        ];

        //--------------------------------------------------
        // SCORE CANDIDATES
        //--------------------------------------------------

        for (const candidate of candidates) {

            let score = 50;

            score += learning.learningScore * 0.30;

            score += stability.stabilityScore * 0.30;

            score += (100 - Math.abs(drift.driftScore) * 2) * 0.40;

            if (candidate.executionThreshold <= 60)
                score += 3;

            if (candidate.riskReward >= 2)
                score += 2;

            candidate.score = this.clamp(
                Math.round(score),
                0,
                100
            );

        }

        //--------------------------------------------------
        // BEST CANDIDATE
        //--------------------------------------------------

        const bestCandidate =
            candidates.reduce(
                (best, current) =>
                    current.score > best.score
                        ? current
                        : best
            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            candidates,

            bestCandidate,

            optimizationScore:
                bestCandidate.score,

            recommendation:
                bestCandidate.score >= 80
                    ? "PROMOTE"
                    : bestCandidate.score >= 60
                        ? "TEST"
                        : "REJECT"

        };

    }

}
