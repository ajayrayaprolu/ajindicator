//======================================================
// src/runtime/regime/RegimeDetector.ts
// Institutional Market Regime Detection
//======================================================

import type {AJRuntimeContext} from "../../indicators/AJIndicator/AJRuntimeContext";
import {RuntimeParameters} from "../config/RuntimeParameters";

//======================================================
// MARKET REGIME
//======================================================
export const AIMarketRegime = {
    UNKNOWN: "UNKNOWN",
    TRENDING: "TRENDING",
    RANGING: "RANGING",
    BREAKOUT: "BREAKOUT",
    REVERSAL: "REVERSAL",
    ACCUMULATION: "ACCUMULATION",
    DISTRIBUTION: "DISTRIBUTION",
    EXPANSION: "EXPANSION",
    CONTRACTION: "CONTRACTION",
    VOLATILE: "VOLATILE"
} as const;

export type AIMarketRegime =
    typeof AIMarketRegime[keyof typeof AIMarketRegime];

//======================================================
// REGIME RESULT
//======================================================

export interface RegimeResult {

    regime:
        AIMarketRegime;

    confidence:
        number;

    trendStrength:
        number;

    volatility:
        number;

    institutionalBias:
        number;

    tradingAllowed:
        boolean;

}

//======================================================
// REGIME DETECTOR
//======================================================

export class RegimeDetector {

    //--------------------------------------------------
    // NORMALIZE
    //--------------------------------------------------

    private static normalize(

        value: number

    ): number {

        return Math.max(

            0,

            Math.min(

                100,

                Math.round(value)

            )

        );

    }

    //--------------------------------------------------
    // TREND STRENGTH
    //--------------------------------------------------
    
    private static trendStrength(
    
        runtime: AJRuntimeContext
    
    ): number {
    
        const parameters =
    
            RuntimeParameters.forChart(
                runtime.symbol
            );
    
        let score = 0;
    
        if (runtime.emaBull || runtime.emaBear)
            score += 35;
    
        if (runtime.vwapBull || runtime.vwapBear)
            score += 20;
    
        if (runtime.adxTrend)
            score +=
                parameters.adxTrendThreshold >= 25
                    ? 30
                    : 25;
    
        if (
            runtime.aiTrendLong ||
            runtime.aiTrendShort
        )
            score += 15;
    
        return this.normalize(score);
    
    }

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    private static volatility(

        runtime: AJRuntimeContext

    ): number {

        let score = 0;

        if (
            runtime.atr > 0
        ) {

            score += 50;

        }

        if (
            runtime.stopHuntDetected
        ) {

            score += 25;

        }

        if (
            runtime.liquiditySweepLow ||
            runtime.liquiditySweepHigh
        ) {

            score += 25;

        }

        return this.normalize(score);

    }

    //--------------------------------------------------
    // INSTITUTIONAL BIAS
    //--------------------------------------------------

    private static institutionalBias(

        runtime: AJRuntimeContext

    ): number {

        if (
            runtime.aiInstitutionalLong
        ) {

            return 100;

        }

        if (
            runtime.aiInstitutionalShort
        ) {

            return -100;

        }

        return 0;

    }
	
    //--------------------------------------------------
    // CLASSIFY
    //--------------------------------------------------
    
    private static classify(
    
        runtime: AJRuntimeContext,
        trendStrength: number,
        volatility: number
    
    ): AIMarketRegime {
    
        const parameters =
    
            RuntimeParameters.forChart(
                runtime.symbol
            );
    
        //--------------------------------------------------
        // BREAKOUT
        //--------------------------------------------------
    
        if (
            (
                runtime.bosBull ||
                runtime.bosBear
            ) &&
            trendStrength >= parameters.minimumTrendConfidence
        ) {
    
            return AIMarketRegime.BREAKOUT;
    
        }
    
        //--------------------------------------------------
        // REVERSAL
        //--------------------------------------------------
    
        if (
            runtime.chochBull ||
            runtime.chochBear
        ) {
    
            return AIMarketRegime.REVERSAL;
    
        }
    
        //--------------------------------------------------
        // TRENDING
        //--------------------------------------------------
    
        if (
            trendStrength >= parameters.minimumTrendConfidence &&
            runtime.adxTrend
        ) {
    
            return AIMarketRegime.TRENDING;
    
        }
    
        //--------------------------------------------------
        // ACCUMULATION
        //--------------------------------------------------
    
        if (
            runtime.liquiditySweepLow &&
            runtime.insideBar
        ) {
    
            return AIMarketRegime.ACCUMULATION;
    
        }
    
        //--------------------------------------------------
        // DISTRIBUTION
        //--------------------------------------------------
    
        if (
            runtime.liquiditySweepHigh &&
            runtime.insideBar
        ) {
    
            return AIMarketRegime.DISTRIBUTION;
    
        }
    
        //--------------------------------------------------
        // EXPANSION
        //--------------------------------------------------
    
        if (
            volatility >= 80 &&
            trendStrength >= 60
        ) {
    
            return AIMarketRegime.EXPANSION;
    
        }
    
        //--------------------------------------------------
        // CONTRACTION
        //--------------------------------------------------
    
        if (
            runtime.insideBar &&
            volatility <= 40
        ) {
    
            return AIMarketRegime.CONTRACTION;
    
        }
    
        //--------------------------------------------------
        // VOLATILE
        //--------------------------------------------------
    
        if (
            volatility >= 85
        ) {
    
            return AIMarketRegime.VOLATILE;
    
        }
    
        //--------------------------------------------------
        // RANGING
        //--------------------------------------------------
    
        if (
            runtime.insideBar
        ) {
    
            return AIMarketRegime.RANGING;
    
        }
    
        //--------------------------------------------------
        // UNKNOWN
        //--------------------------------------------------
    
        return AIMarketRegime.UNKNOWN;
    
    }

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    private static confidence(

        trendStrength: number,
        volatility: number,
        bias: number

    ): number {

        return this.normalize(

            trendStrength * 0.45 +
            volatility * 0.25 +
            Math.abs(bias) * 0.30

        );

    }
    
    //--------------------------------------------------
    // TRADING ALLOWED
    //--------------------------------------------------
    
    private static tradingAllowed(
    
        runtime: AJRuntimeContext,
        regime:AIMarketRegime,
        confidence:number
    
    ): boolean {
    
        const parameters =
    
            RuntimeParameters.forChart(
                runtime.symbol
            );
    
        if (
            confidence <
            parameters.minimumConfidence
        )
            return false;
    
        switch (regime) {
    
            case AIMarketRegime.TRENDING:
            case AIMarketRegime.BREAKOUT:
            case AIMarketRegime.REVERSAL:
            case AIMarketRegime.ACCUMULATION:
            case AIMarketRegime.DISTRIBUTION:
            case AIMarketRegime.EXPANSION:
                return true;
    
            default:
                return false;
    
        }
    
    }

    //--------------------------------------------------
    // DETECT
    //--------------------------------------------------

    static detect(

        runtime: AJRuntimeContext

    ): RegimeResult {

        const trendStrength =

            this.trendStrength(runtime);

        const volatility =

            this.volatility(runtime);

        const institutionalBias =

            this.institutionalBias(runtime);

        const regime =

            this.classify(
                runtime,
                trendStrength,
                volatility
            );

        const confidence =

            this.confidence(
                trendStrength,
                volatility,
                institutionalBias
            );

        return {

            regime,

            confidence,

            trendStrength,

            volatility,

            institutionalBias,

            tradingAllowed:
            
                this.tradingAllowed(
                    runtime,
                    regime,
                    confidence
                )

        };

    }

}
