//======================================================
// src\runtime\scheduler\ExecutionTimingOptimizer.ts
// Part 1
// Phase 13
// Intelligent Execution Timing Optimizer
//======================================================

import { MarketRegime } from "../RuntimeTypes";
import type { SchedulerIntelligenceResult } from "./SchedulerIntelligence";

//======================================================
// INPUT
//======================================================

export interface ExecutionTimingInput {

    scheduler: SchedulerIntelligenceResult;

    marketRegime: MarketRegime;

    aiConfidence: number;

    executionConfidence: number;

    barIndex: number;

    atr: number;

}

//======================================================
// RESULT
//======================================================

export interface ExecutionTimingResult {

    executeNow: boolean;

    executionDelayBars: number;

    nextEligibleBar: number;

    timingScore: number;

    microDelay: number;

    cadence: "FAST" | "NORMAL" | "SLOW";

    recommendation: string;

}

//======================================================
// OPTIMIZER
//======================================================

export class ExecutionTimingOptimizer {

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
    // CADENCE
    //--------------------------------------------------

    private static cadence(
        regime: MarketRegime
    ): "FAST" | "NORMAL" | "SLOW" {

        switch (regime) {

            case MarketRegime.BREAKOUT:
                return "FAST";

            case MarketRegime.TRENDING:
                return "FAST";

            case MarketRegime.REVERSAL:
                return "NORMAL";

            case MarketRegime.RANGING:
                return "SLOW";

            default:
                return "NORMAL";

        }

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static optimize(
        input: ExecutionTimingInput
    ): ExecutionTimingResult {

        //--------------------------------------------------
        // TIMING SCORE
        //--------------------------------------------------

        const timingScore =
            this.clamp(
                input.scheduler.schedulingScore * 0.40 +
                input.aiConfidence * 0.30 +
                input.executionConfidence * 0.30,
                0,
                100
            );

        //--------------------------------------------------
        // DEFAULTS
        //--------------------------------------------------

        let executeNow =
            input.scheduler.executeNow;

        let executionDelayBars =
            input.scheduler.delayBars;

        let microDelay = 0;

        let recommendation = "EXECUTE";

        //--------------------------------------------------
        // MICRO DELAY
        //--------------------------------------------------

        if (timingScore < 60) {

            microDelay = 250;

            recommendation = "WAIT";

        }

        if (timingScore < 45) {

            executionDelayBars++;

            executeNow = false;

            recommendation = "DELAY";

        }

        //--------------------------------------------------
        // HIGH ATR
        //--------------------------------------------------

        if (input.atr > 2) {

            microDelay += 150;

        }

        //--------------------------------------------------
        // NEXT BAR
        //--------------------------------------------------

        const nextEligibleBar =
            input.barIndex +
            executionDelayBars +
            input.scheduler.skipBars;

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            executeNow,

            executionDelayBars,

            nextEligibleBar,

            timingScore,

            microDelay,

            cadence:
                this.cadence(
                    input.marketRegime
                ),

            recommendation

        };

    }

}
