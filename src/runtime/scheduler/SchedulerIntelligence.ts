//======================================================
// src\runtime\scheduler\SchedulerIntelligence.ts
// Part 1
// Phase 13
// Intelligent Execution Scheduling
//======================================================

import { MarketRegime } from "../RuntimeTypes";

//======================================================
// INPUT
//======================================================

export interface SchedulerIntelligenceInput {

    marketRegime: MarketRegime;

    atr: number;

    aiConfidence: number;

    executionConfidence: number;

    executionAllowed: boolean;

    volatility: number;

}

//======================================================
// RESULT
//======================================================

export interface SchedulerIntelligenceResult {

    executeNow: boolean;

    delayBars: number;

    skipBars: number;

    volatilityScore: number;

    timingScore: number;

    schedulingScore: number;

    recommendation: string;

}

//======================================================
// ENGINE
//======================================================

export class SchedulerIntelligence {

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
    // VOLATILITY SCORE
    //--------------------------------------------------

    private static volatilityScore(
        volatility: number
    ): number {

        return this.clamp(
            volatility * 100,
            0,
            100
        );

    }

    //--------------------------------------------------
    // REGIME TIMING
    //--------------------------------------------------

    private static regimeTiming(
        regime: MarketRegime
    ): number {

        switch (regime) {

            case MarketRegime.TRENDING:
                return 90;

            case MarketRegime.BREAKOUT:
                return 95;

            case MarketRegime.REVERSAL:
                return 70;

            case MarketRegime.RANGING:
                return 45;

            default:
                return 60;

        }

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        input: SchedulerIntelligenceInput
    ): SchedulerIntelligenceResult {

        //--------------------------------------------------
        // SCORES
        //--------------------------------------------------

        const volatilityScore =
            this.volatilityScore(
                input.volatility
            );

        const timingScore =
            this.regimeTiming(
                input.marketRegime
            );

        const schedulingScore =
            this.clamp(
                timingScore * 0.40 +
                input.aiConfidence * 0.25 +
                input.executionConfidence * 0.25 +
                volatilityScore * 0.10,
                0,
                100
            );

        //--------------------------------------------------
        // DEFAULTS
        //--------------------------------------------------

        let executeNow =
            input.executionAllowed;

        let delayBars = 0;

        let skipBars = 0;

        let recommendation =
            "EXECUTE";

        //--------------------------------------------------
        // HIGH VOLATILITY
        //--------------------------------------------------

        if (volatilityScore >= 85) {

            delayBars = 1;

            recommendation = "WAIT_HIGH_VOLATILITY";

        }

        //--------------------------------------------------
        // RANGING MARKET
        //--------------------------------------------------

        if (
            input.marketRegime === MarketRegime.RANGING &&
            schedulingScore < 60
        ) {

            skipBars = 2;

            executeNow = false;

            recommendation = "SKIP_RANGE";

        }

        //--------------------------------------------------
        // LOW EXECUTION CONFIDENCE
        //--------------------------------------------------

        if (
            input.executionConfidence < 50
        ) {

            executeNow = false;

            delayBars = Math.max(delayBars, 1);

            recommendation = "WAIT_CONFIRMATION";

        }

        //--------------------------------------------------
        // EXECUTION NOT ALLOWED
        //--------------------------------------------------

        if (!input.executionAllowed) {

            executeNow = false;

            recommendation = "BLOCKED";

        }

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            executeNow,

            delayBars,

            skipBars,

            volatilityScore,

            timingScore,

            schedulingScore,

            recommendation

        };

    }

}
