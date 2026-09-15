//======================================================
// ParameterDriftEngine.ts
// Part 1
// Phase 13
// Adaptive Parameter Drift Detection Engine
//======================================================

import type { LearningSnapshot } from "./AdaptiveLearning";
import type { LearningAttributionResult } from "./LearningAttributionEngine";

//======================================================
// DRIFT RESULT
//======================================================

export interface ParameterDriftResult {

    driftScore: number;

    confidenceDrift: number;

    executionDrift: number;

    institutionalDrift: number;

    parameterAdjustment: number;

    driftDetected: boolean;

    driftDirection: "POSITIVE" | "NEGATIVE" | "STABLE";

}

//======================================================
// PARAMETER DRIFT ENGINE
//======================================================

export class ParameterDriftEngine {

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
    // CONFIDENCE DRIFT
    //--------------------------------------------------

    private static confidenceDrift(
        snapshot: LearningSnapshot
    ): number {

        return this.clamp(
            50 - snapshot.winRate,
            -50,
            50
        );

    }

    //--------------------------------------------------
    // EXECUTION DRIFT
    //--------------------------------------------------

    private static executionDrift(
        attribution: LearningAttributionResult
    ): number {

        return this.clamp(
            70 - attribution.executionContribution,
            -50,
            50
        );

    }

    //--------------------------------------------------
    // INSTITUTIONAL DRIFT
    //--------------------------------------------------

    private static institutionalDrift(
        attribution: LearningAttributionResult
    ): number {

        return this.clamp(
            70 - attribution.institutionalContribution,
            -50,
            50
        );

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // DRIFT DIRECTION
    //--------------------------------------------------

    private static direction(
        score: number
    ): "POSITIVE" | "NEGATIVE" | "STABLE" {

        if (score >= 15)
            return "NEGATIVE";

        if (score <= -15)
            return "POSITIVE";

        return "STABLE";

    }

    //--------------------------------------------------
    // PARAMETER ADJUSTMENT
    //--------------------------------------------------

    private static parameterAdjustment(
        driftScore: number
    ): number {

        if (driftScore >= 25)
            return 8;

        if (driftScore >= 15)
            return 4;

        if (driftScore <= -25)
            return -6;

        if (driftScore <= -15)
            return -3;

        return 0;

    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        snapshot: LearningSnapshot,
        attribution: LearningAttributionResult
    ): ParameterDriftResult {

        //--------------------------------------------------
        // INDIVIDUAL DRIFTS
        //--------------------------------------------------

        const confidenceDrift =
            this.confidenceDrift(snapshot);

        const executionDrift =
            this.executionDrift(attribution);

        const institutionalDrift =
            this.institutionalDrift(attribution);

        //--------------------------------------------------
        // OVERALL DRIFT
        //--------------------------------------------------

        const driftScore =
            this.clamp(
                confidenceDrift * 0.40 +
                executionDrift * 0.30 +
                institutionalDrift * 0.30,
                -50,
                50
            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        const driftDirection =
            this.direction(driftScore);

        const parameterAdjustment =
            this.parameterAdjustment(driftScore);

        const driftDetected =
            driftDirection !== "STABLE";

        return {

            driftScore,

            confidenceDrift,

            executionDrift,

            institutionalDrift,

            parameterAdjustment,

            driftDetected,

            driftDirection

        };

    }

}
