//======================================================
// LearningStabilityEngine.ts
// Part 1
// Phase 13
// Learning Stability & Confidence Engine
//======================================================

import type { LearningSnapshot } from "./AdaptiveLearning";
import type { AdaptiveLearningResult } from "./AdaptiveLearningEngine";
import type { ParameterDriftResult } from "./ParameterDriftEngine";

//======================================================
// RESULT
//======================================================

export interface LearningStabilityResult {

    stabilityScore: number;

    consistencyScore: number;

    confidenceScore: number;

    adaptationAllowed: boolean;

    freezeLearning: boolean;

    stabilityLevel: "LOW" | "MEDIUM" | "HIGH";

    recommendation: string;

}

//======================================================
// ENGINE
//======================================================

export class LearningStabilityEngine {

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
    // CONSISTENCY SCORE
    //--------------------------------------------------

    private static consistencyScore(
        snapshot: LearningSnapshot
    ): number {

        let score = 100;

        score -= snapshot.lossStreak * 10;

        score += snapshot.winStreak * 5;

        return this.clamp(
            score,
            0,
            100
        );

    }

    //--------------------------------------------------
    // CONFIDENCE SCORE
    //--------------------------------------------------

    private static confidenceScore(
        learning: AdaptiveLearningResult
    ): number {

        return this.clamp(
            learning.learningScore,
            0,
            100
        );

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // STABILITY LEVEL
    //--------------------------------------------------

    private static stabilityLevel(
        score: number
    ): "LOW" | "MEDIUM" | "HIGH" {

        if (score >= 80)
            return "HIGH";

        if (score >= 60)
            return "MEDIUM";

        return "LOW";

    }

    //--------------------------------------------------
    // RECOMMENDATION
    //--------------------------------------------------

    private static recommendation(
        adaptationAllowed: boolean,
        freezeLearning: boolean
    ): string {

        if (freezeLearning)
            return "FREEZE_PARAMETERS";

        if (adaptationAllowed)
            return "ALLOW_ADAPTATION";

        return "MONITOR";
    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        snapshot: LearningSnapshot,
        learning: AdaptiveLearningResult,
        drift: ParameterDriftResult
    ): LearningStabilityResult {

        //--------------------------------------------------
        // SCORES
        //--------------------------------------------------

        const consistencyScore =
            this.consistencyScore(snapshot);

        const confidenceScore =
            this.confidenceScore(learning);

        const stabilityScore =
            this.clamp(
                consistencyScore * 0.40 +
                confidenceScore * 0.40 +
                (100 - Math.abs(drift.driftScore) * 2) * 0.20,
                0,
                100
            );

        //--------------------------------------------------
        // ADAPTATION CONTROL
        //--------------------------------------------------

        const adaptationAllowed =
            stabilityScore >= 65 &&
            !drift.driftDetected;

        const freezeLearning =
            stabilityScore < 40 ||
            snapshot.lossStreak >= 5;

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            stabilityScore,

            consistencyScore,

            confidenceScore,

            adaptationAllowed,

            freezeLearning,

            stabilityLevel:
                this.stabilityLevel(stabilityScore),

            recommendation:
                this.recommendation(
                    adaptationAllowed,
                    freezeLearning
                )

        };

    }

}
