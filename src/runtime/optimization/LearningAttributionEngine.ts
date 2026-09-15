//======================================================
// LearningAttributionEngine.ts
// Part 1
// Phase 13
// Trade Attribution Intelligence
//======================================================

import { MarketRegime } from "../RuntimeTypes";

//======================================================
// LEARNING INPUT
//======================================================

export interface LearningAttributionInput {

    aiConfidence: number;

    executionConfidence: number;

    institutionalScore: number;

    tradeScore: number;

    executionAllowed: boolean;

    win: boolean;

    riskReward: number;

    marketRegime: MarketRegime;

}

//======================================================
// RESULT
//======================================================

export interface LearningAttributionResult {

    overallScore: number;

    aiContribution: number;

    executionContribution: number;

    institutionalContribution: number;

    tradeContribution: number;

    regimeContribution: number;

    riskContribution: number;

    dominantFactor: string;

    improvementArea: string;

}

//======================================================
// ENGINE
//======================================================

export class LearningAttributionEngine {

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
    // REGIME SCORE
    //--------------------------------------------------

    private static regimeContribution(
        regime: MarketRegime
    ): number {

        switch (regime) {

            case MarketRegime.TRENDING:
                return 90;

            case MarketRegime.BREAKOUT:
                return 85;

            case MarketRegime.REVERSAL:
                return 65;

            case MarketRegime.RANGING:
                return 45;

            default:
                return 50;

        }

    }

    //--------------------------------------------------
    // PART 2 CONTINUES
    //--------------------------------------------------
	//--------------------------------------------------
    // DOMINANT FACTOR
    //--------------------------------------------------

    private static dominantFactor(
        values: Record<string, number>
    ): string {

        return Object.entries(values)
            .sort((a, b) => b[1] - a[1])[0][0];

    }

    //--------------------------------------------------
    // IMPROVEMENT AREA
    //--------------------------------------------------

    private static improvementArea(
        values: Record<string, number>
    ): string {

        return Object.entries(values)
            .sort((a, b) => a[1] - b[1])[0][0];

    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        input: LearningAttributionInput
    ): LearningAttributionResult {

        const aiContribution =
            this.clamp(input.aiConfidence, 0, 100);

        const executionContribution =
            this.clamp(input.executionConfidence, 0, 100);

        const institutionalContribution =
            this.clamp(input.institutionalScore, 0, 100);

        const tradeContribution =
            this.clamp(input.tradeScore, 0, 100);

        const regimeContribution =
            this.regimeContribution(input.marketRegime);

        const riskContribution =
            this.clamp(input.riskReward * 20, 0, 100);

        const overallScore =
            Math.round(
                aiContribution * 0.20 +
                executionContribution * 0.20 +
                institutionalContribution * 0.20 +
                tradeContribution * 0.20 +
                regimeContribution * 0.10 +
                riskContribution * 0.10
            );

        const factors = {

            AI: aiContribution,

            EXECUTION: executionContribution,

            INSTITUTIONAL: institutionalContribution,

            TRADE: tradeContribution,

            REGIME: regimeContribution,

            RISK: riskContribution

        };

        return {

            overallScore,

            aiContribution,

            executionContribution,

            institutionalContribution,

            tradeContribution,

            regimeContribution,

            riskContribution,

            dominantFactor:
                this.dominantFactor(factors),

            improvementArea:
                this.improvementArea(factors)

        };

    }

}
