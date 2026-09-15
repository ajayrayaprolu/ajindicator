//=================================================================
//src/runtime/optimization/AdaptiveLearning.ts
//=================================================================
//Purpose of this file : //Learn from completed trades //Maintain rolling performance statistics //Adjust confidence weights //Track regime performance
//Track option performance //Build execution history //Prepare future ML integration //Typical responsibilities: //Win/loss tracking //Regime success rates
//Confidence calibration //False breakout detection //AI score calibration //Long vs Short statistics //Part 2 will contain: //Confidence adjustment calculation
//Best/Worst regime detection //Recommendation engine //buildSnapshot() //getConfidenceAdjustment() //Class completion

//======================================================
// AdaptiveLearning.ts — Part 1
// Phase 11: // Adaptive Learning Engine
//======================================================

import type { RuntimeResult } from "../RuntimeResult";
import {MarketRegime} from "../RuntimeTypes";

//======================================================
// LEARNING SNAPSHOT
//======================================================

export interface LearningSnapshot {

    //--------------------------------------------------
    // CHART
    //--------------------------------------------------

    chartId:string;
	
    //--------------------------------------------------
    // TRADES
    //--------------------------------------------------
    totalTrades: number;
    wins: number;
    losses: number;
    breakeven: number;
    //--------------------------------------------------
    // PERFORMANCE
    //--------------------------------------------------
    winRate: number;
    avgTradeScore: number;
    avgAIConfidence: number;
    avgExecutionConfidence: number;
    //--------------------------------------------------
    // REGIME
    //--------------------------------------------------
    bestRegime: MarketRegime;
    worstRegime: MarketRegime;
    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    confidenceAdjustment: number;
    //--------------------------------------------------
    // RECOMMENDATION
    //--------------------------------------------------
    recommendation:
        string;

    //--------------------------------------------------
    // STREAKS
    //--------------------------------------------------

    winStreak: number;
    lossStreak: number;
}

//======================================================
// INTERNAL STATS
//======================================================

    interface LearningStatistics {
    
        totalTrades:number;
        wins:number;
        losses:number;
        breakeven:number;
    
        tradeScoreSum:number;
        aiConfidenceSum:number;
        executionConfidenceSum:number;
    
        winStreak:number;
        lossStreak:number;
    
        regimeStats: Map<MarketRegime,{
            trades:number;
            wins:number;
        }>;
    }

//======================================================
// ADAPTIVE LEARNING
//======================================================

export class AdaptiveLearning {

    //--------------------------------------------------
    // LEARNING DATABASE
    //--------------------------------------------------
    private static stats: LearningStatistics = {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        tradeScoreSum: 0,
        aiConfidenceSum: 0,
        executionConfidenceSum:
            0,

        winStreak: 0,

        lossStreak: 0,
        regimeStats: new Map()
    };

    //--------------------------------------------------
    // RESET
    //--------------------------------------------------

    static reset(): void {
        this.stats = {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            breakeven: 0,
            tradeScoreSum: 0,
            aiConfidenceSum: 0,
            executionConfidenceSum:
            0,

        winStreak: 0,

        lossStreak: 0,
            regimeStats: new Map()
        };
    }

    //--------------------------------------------------
    // RECORD RESULT
    //--------------------------------------------------

    static record(
        result: RuntimeResult
    ): void {
        this.stats.totalTrades++;
        this.stats.tradeScoreSum += result.tradeScore;
        this.stats.aiConfidenceSum += result.aiConfidence;
        this.stats.executionConfidenceSum += result.executionConfidence;
        if (
            result.tp1Hit ||
            result.tp2Hit ||
            result.tp3Hit
        ) {
            this.stats.wins++;

            this.stats.winStreak=(this.stats.winStreak??0)+1;

            this.stats.lossStreak=0;
        }
        else if (
            result.slHit
        ) {
            this.stats.losses++;

            this.stats.lossStreak=(this.stats.lossStreak??0)+1;

            this.stats.winStreak=0;
        }
        else {
            this.stats.breakeven++;

            this.stats.winStreak=0;

            this.stats.lossStreak=0;
        }

        //--------------------------------------------------
        // REGIME STATS
        //--------------------------------------------------

        const regime = result.marketRegime as MarketRegime;
        const existing = this.stats.regimeStats.get(regime) ?? {trades: 0, wins: 0};
        existing.trades++;
        if (
            result.tp1Hit ||
            result.tp2Hit ||
            result.tp3Hit
        ) {
            existing.wins++;
        }
        this.stats.regimeStats.set(
            regime,
            existing
        );
    }
	
	//--------------------------------------------------
    // CONFIDENCE ADJUSTMENT
    //--------------------------------------------------

    static getConfidenceAdjustment():
        number {
        if (
            this.stats.totalTrades < 10
        ) {
            return 0;
        }
        const winRate =
            (this.stats.wins / this.stats.totalTrades) * 100;
        if (
            winRate >= 80
        ) {
            return 10;
        }
        if (
            winRate >= 70
        ) {
            return 5;
        }
        if (
            winRate <= 40
        ) {
            return -10;
        }
        if (
            winRate <= 50
        ) {
            return -5;
        }
        return 0;
    }

    //--------------------------------------------------
    // BEST REGIME
    //--------------------------------------------------

    private static getBestRegime():
        MarketRegime {
        let best: MarketRegime = MarketRegime.UNKNOWN;
        let bestRate =
            -1;
        for (
            const [
                regime,
                stats
            ]
            of this.stats.regimeStats
        ) {
            const rate =
                stats.trades === 0
                    ? 0
                    : stats.wins / stats.trades;
            if (
                rate > bestRate
            ) {
                bestRate = rate;
                best = regime;
            }
        }
        return best;
    }

    //--------------------------------------------------
    // WORST REGIME
    //--------------------------------------------------

    private static getWorstRegime():
        MarketRegime {
        let worst: MarketRegime = MarketRegime.UNKNOWN;
        let worstRate =
            Number.MAX_VALUE;
        for (
            const [
                regime,
                stats
            ]
            of this.stats.regimeStats
        ) {
            const rate =
                stats.trades === 0
                    ? 0
                    : stats.wins / stats.trades;
            if (
                rate < worstRate
            ) {
                worstRate = rate;
                worst = regime;
            }
        }
        return worst;
    }

    //--------------------------------------------------
    // SNAPSHOT
    //--------------------------------------------------

    static buildSnapshot():
        LearningSnapshot {
        const total =
            Math.max(
                1,
                this.stats.totalTrades
            );
        const winRate =
            Math.round(
                (this.stats.wins / total) * 100
            );
        const confidenceAdjustment =
            this.getConfidenceAdjustment();
        let recommendation =
            "MODEL STABLE";
        if (
            confidenceAdjustment >= 10
        ) {
            recommendation =
                "INCREASE AGGRESSION";
        }
        else if (
            confidenceAdjustment >= 5
        ) {
            recommendation =
                "SLIGHTLY INCREASE RISK";
        }
        else if (
            confidenceAdjustment <= -10
        ) {
            recommendation =
                "REDUCE RISK SIGNIFICANTLY";
        }
        else if (
            confidenceAdjustment <= -5
        ) {
            recommendation =
                "REDUCE POSITION SIZE";
        }

        return {
            chartId: "GLOBAL",
            totalTrades: this.stats.totalTrades,
            wins: this.stats.wins,
            losses: this.stats.losses,
            breakeven: this.stats.breakeven,
            winRate,
            avgTradeScore: Math.round(this.stats.tradeScoreSum / total),
            avgAIConfidence: Math.round(this.stats.aiConfidenceSum / total),
            avgExecutionConfidence: Math.round(this.stats.executionConfidenceSum / total),
            bestRegime: this.getBestRegime(),
            worstRegime: this.getWorstRegime(),
            confidenceAdjustment,
            recommendation,
            winStreak: this.stats.winStreak,
            lossStreak: this.stats.lossStreak
        };
    }
}




