/****************************************************************************************
 * File:
 * OrderFlowEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderFlow/OrderFlowEngine.ts
 *
 * Purpose:
 * AJ v2 Order Flow Engine.
 *
 * This engine replaces the legacy CVD-only implementation.
 *
 * It automatically detects whether reliable volume exists.
 *
 * If reliable volume exists:
 *      -> Real Order Flow (CVD)
 *
 * Otherwise:
 *      -> Synthetic Institutional Order Flow
 *
 * No user configuration is required.
 *
 * AJ v2 Architecture
 *
 * Raw Market Data
 *      │
 *      ▼
 * MarketStateEngine
 *      │
 *      ▼
 * OrderFlowEngine
 *      │
 *      ▼
 * MarketStructureEngine
 *
 ****************************************************************************************/

import type { OrderFlowInput } from "./OrderFlowTypes";
import type { OrderFlowResult } from "./OrderFlowResult";

export class OrderFlowEngine {

    //==================================================
    // Evaluate
    //==================================================

    evaluate(
        input: OrderFlowInput
    ): OrderFlowResult {

        //--------------------------------------------------
        // REAL VOLUME AVAILABLE?
        //--------------------------------------------------

        const hasRealVolume =
            this.hasReliableVolume(input);

        //--------------------------------------------------
        // REAL ORDER FLOW
        //--------------------------------------------------

        if (hasRealVolume) {

            return this.evaluateRealOrderFlow(input);

        }

        //--------------------------------------------------
        // SYNTHETIC ORDER FLOW
        //--------------------------------------------------

        return this.evaluateSyntheticOrderFlow(input);

    }

    //==================================================
    // REAL VOLUME DETECTION
    //==================================================

    private hasReliableVolume(
        input: OrderFlowInput
    ): boolean {

        if (!input.useVolume)
            return false;

        if (input.volume <= 0)
            return false;

        if (input.averageVolume <= 0)
            return false;

        if (input.volume === input.averageVolume)
            return false;

        if (input.isIndex)
            return false;

        if (input.syntheticOnly)
            return false;

        return true;

    }

    //==================================================
    // REAL ORDER FLOW
    //==================================================

    private evaluateRealOrderFlow(
        input: OrderFlowInput
    ): OrderFlowResult {

        const delta =

            input.buyVolume -

            input.sellVolume;

        const total =

            Math.max(

                input.buyVolume +

                input.sellVolume,

                1

            );

        const imbalance =

            (delta / total) * 100;
		
		//--------------------------------------------------
		// CUMULATIVE DELTA (CURRENT SNAPSHOT)
		//--------------------------------------------------
		
		const cumulativeDelta = delta;
		
		//--------------------------------------------------
		// MARKET PARTICIPATION
		//--------------------------------------------------
		
		const marketParticipation =
			Math.min(
				100,
				(input.volume /
					Math.max(input.averageVolume, 1)) * 100
			);

        const bullish =
            imbalance >= 10;

        const bearish =
            imbalance <= -10;

        const neutral =
            !bullish &&
            !bearish;

        const absorption =

            Math.abs(imbalance) < 8;

        const exhaustion =

            Math.abs(imbalance) > 60;

        const confidence =

            Math.min(

                100,

                Math.abs(imbalance) * 1.5

            );

        return {

            mode: "REAL",

            usingRealVolume: true,

            usingSyntheticFlow: false,

            bullish,

            bearish,

            neutral,

			delta,
			
			cumulativeDelta,
			
			strength: Math.abs(imbalance),
			
			marketParticipation,

            confidence,

            imbalance,

            absorption,

            exhaustion,

            buyingPressure:

                Math.max(delta, 0),

            sellingPressure:

                Math.max(-delta, 0),

            syntheticScore: 0,

            volumeReliable: true,

            explanation:

                "Real institutional order flow"

        };

    }

    //==================================================
    // SYNTHETIC ORDER FLOW
    //==================================================

    private evaluateSyntheticOrderFlow(
        input: OrderFlowInput
    ): OrderFlowResult {

        //--------------------------------------------------
        // Price Pressure
        //--------------------------------------------------

        let score = 0;
		
		//--------------------------------------------------
		// SYNTHETIC CVD
		//--------------------------------------------------
		
		const cumulativeDelta = 0;
		
		const marketParticipation = 0;

        //--------------------------------------------------
        // BOS
        //--------------------------------------------------

        if (input.bosBull)
            score += 20;

        if (input.bosBear)
            score -= 20;

        //--------------------------------------------------
        // CHOCH
        //--------------------------------------------------

        if (input.chochBull)
            score += 15;

        if (input.chochBear)
            score -= 15;

        //--------------------------------------------------
        // FVG
        //--------------------------------------------------

        if (input.fvgBull)
            score += 10;

        if (input.fvgBear)
            score -= 10;

        //--------------------------------------------------
        // Sweep
        //--------------------------------------------------

        if (input.sweepLow)
            score += 15;

        if (input.sweepHigh)
            score -= 15;

        //--------------------------------------------------
        // EMA
        //--------------------------------------------------

        if (input.emaBull)
            score += 10;

        if (input.emaBear)
            score -= 10;

        //--------------------------------------------------
        // VWAP
        //--------------------------------------------------

        if (input.vwapBull)
            score += 10;

        if (input.vwapBear)
            score -= 10;

        //--------------------------------------------------
        // RSI
        //--------------------------------------------------

        if (input.rsi >= 60)
            score += 5;

        if (input.rsi <= 40)
            score -= 5;

        //--------------------------------------------------
        // ADX
        //--------------------------------------------------

        if (input.adx >= 25)
            score *= 1.20;

        //--------------------------------------------------
        // ATR Expansion
        //--------------------------------------------------

        if (input.atrExpansion)
            score *= 1.10;

        //--------------------------------------------------
        // Normalize
        //--------------------------------------------------

        score =

            Math.max(

                -100,

                Math.min(100, score)

            );

        const bullish =
            score >= 20;

        const bearish =
            score <= -20;

        const neutral =
            !bullish &&
            !bearish;

        const confidence =
            Math.abs(score);

        return {

            mode: "SYNTHETIC",

            usingRealVolume: false,

            usingSyntheticFlow: true,

            bullish,

            bearish,

            neutral,

			delta: score,
			
			cumulativeDelta,
			
			strength: Math.abs(score),
			
			marketParticipation,

            confidence,

            imbalance: score,

            absorption: false,

            exhaustion: false,

            buyingPressure:

                Math.max(score, 0),

            sellingPressure:

                Math.max(-score, 0),

            syntheticScore: score,

            volumeReliable: false,

            explanation:

                "Synthetic institutional order flow"

        };

    }

}