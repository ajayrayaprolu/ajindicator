//======================================================
// \src\runtime\optimization\AdaptiveLearningEngine.ts : AdaptiveLearningEngine.ts
// Part 1 // Phase 13: // Adaptive Learning Intelligence Engine
//======================================================

import { AdaptiveLearning, type LearningSnapshot } from "./AdaptiveLearning";
import { MarketRegime } from "../RuntimeTypes";

//======================================================
// LEARNING ENGINE RESULT
//======================================================

export interface AdaptiveLearningResult {
    snapshot: LearningSnapshot;
    learningScore: number;
    confidenceBias: number;
    parameterBias: number;
    regimeBias: number;
    learningHealthy: boolean;
    recommendation: string;
}

//======================================================
// ADAPTIVE LEARNING ENGINE
//======================================================

export class AdaptiveLearningEngine {

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
    // LEARNING SCORE
    //--------------------------------------------------

    private static learningScore(
        snapshot: LearningSnapshot
    ): number {
        let score = 50;
        score += (snapshot.winRate - 50) * 0.8;
        score -= snapshot.lossStreak * 5;
        score += snapshot.winStreak * 3;
        return this.clamp(
            Math.round(score),
            0,
            100
        );

    }

    //--------------------------------------------------
    // CONFIDENCE BIAS
    //--------------------------------------------------

    private static confidenceBias(
        snapshot: LearningSnapshot
    ): number {
        if (snapshot.winRate >= 75)
            return -8;
        if (snapshot.winRate >= 65)
            return -4;
        if (snapshot.winRate <= 35)
            return 10;
        if (snapshot.winRate <= 45)
            return 5;
        return 0;

    }

    //--------------------------------------------------
    // PARAMETER BIAS
    //--------------------------------------------------

    private static parameterBias(
        snapshot: LearningSnapshot
    ): number {
        return this.clamp(
            snapshot.confidenceAdjustment,
            -15,
            15
        );

    }

    //--------------------------------------------------
    // REGIME BIAS
    //--------------------------------------------------

    private static regimeBias(
        regime: MarketRegime
    ): number {

        switch (regime) {
            case MarketRegime.TRENDING:
                return 10;
            case MarketRegime.BREAKOUT:
                return 8;
            case MarketRegime.REVERSAL:
                return -5;
            case MarketRegime.RANGING:
                return -10;
            default:
                return 0;
        }
    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	 
	//--------------------------------------------------
    // HEALTH CHECK
    //--------------------------------------------------

    private static learningHealthy(
        learningScore: number,
        snapshot: LearningSnapshot
    ): boolean {
        return (
            learningScore >= 50 &&
            snapshot.lossStreak < 5
        );

    }

    //--------------------------------------------------
    // RECOMMENDATION
    //--------------------------------------------------

    private static recommendation(
        healthy: boolean,
        score: number
    ): string {
        if (!healthy)
            return "REDUCE_RISK";
        if (score >= 80)
            return "INCREASE_EXPOSURE";
        if (score >= 60)
            return "NORMAL_OPERATION";
        return "MONITOR";
    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        regime: MarketRegime
    ): AdaptiveLearningResult {

        //--------------------------------------------------
        // SNAPSHOT
        //--------------------------------------------------
        const snapshot = AdaptiveLearning.buildSnapshot();

        //--------------------------------------------------
        // SCORES
        //--------------------------------------------------

        const learningScore = this.learningScore(snapshot);
        const confidenceBias = this.confidenceBias(snapshot);
        const parameterBias = this.parameterBias(snapshot);
        const regimeBias = this.regimeBias(regime);

        //--------------------------------------------------
        // HEALTH
        //--------------------------------------------------

        const learningHealthy =
            this.learningHealthy(
                learningScore,
                snapshot
            );

        //--------------------------------------------------
        // RECOMMENDATION
        //--------------------------------------------------

        const recommendation =
            this.recommendation(
                learningHealthy,
                learningScore
            );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {
            snapshot,
            learningScore,
            confidenceBias,
            parameterBias,
            regimeBias,
            learningHealthy,
            recommendation
        };
    }
}
