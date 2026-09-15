/****************************************************************************************
 * File:
 * OrderBlockEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderBlock/OrderBlockEngine.ts
 *
 * Purpose:
 * Detects and maintains Institutional Order Blocks for AJ v2.
 *
 * Responsibilities
 * • Bullish / Bearish Order Block detection
 * • Freshness tracking
 * • Mitigation count
 * • Touch count
 * • Reaction measurement
 * • Zone strength
 * • Higher timeframe alignment
 *
 * This engine only detects and evaluates Order Blocks.
 * It never decides trades or confidence.
 ****************************************************************************************/

import type { Candle } from "../../../../types/Candle";
import type { OrderBlockResult } from "./OrderBlockResult";

export class OrderBlockEngine {

    private static readonly LOOKBACK = 25;

    private static readonly REACTION_THRESHOLD = 0.35;

    static evaluate(
        candles: Candle[]
    ): OrderBlockResult {

        if (candles.length < 6) {
            return this.empty();
        }

		const current = candles.at(-1)!;
		
		//--------------------------------------------------
		// ORDER BLOCK DETECTION
		// Most recent confirmed OB only
		//--------------------------------------------------
		
		let bullishOrderBlock = false;
		let bearishOrderBlock = false;
		let blockHigh = 0;
		let blockLow = 0;
		let createdBarIndex: number | undefined;
		
		const scanStart =
			Math.max(
				1,
				candles.length - this.LOOKBACK - 1
			);
		
		for (
			let i = candles.length - 1;
			i >= scanStart;
			i--
		) {
			const impulse = candles[i];
			const obCandle = candles[i - 1];
		
			if (
				obCandle.close < obCandle.open &&
				impulse.close > obCandle.high
			) {
				bullishOrderBlock = true;
				bearishOrderBlock = false;
				blockHigh = obCandle.high;
				blockLow = obCandle.low;
				createdBarIndex = i - 1;
				break;
			}
		
			if (
				obCandle.close > obCandle.open &&
				impulse.close < obCandle.low
			) {
				bullishOrderBlock = false;
				bearishOrderBlock = true;
				blockHigh = obCandle.high;
				blockLow = obCandle.low;
				createdBarIndex = i - 1;
				break;
			}
		}
		
		//--------------------------------------------------
		// TOUCH COUNT
		//--------------------------------------------------
		
		let touchCount = 0;
		
		if (createdBarIndex != null) {
		
			for (
				let index = createdBarIndex + 1;
				index < candles.length;
				index++
			) {
				const candle = candles[index];
		
				if (
					candle.high >= blockLow &&
					candle.low <= blockHigh
				) {
					touchCount++;
				}
			}
		}
		
		//--------------------------------------------------
		// MITIGATION
		//--------------------------------------------------
		
		const mitigated =
			createdBarIndex != null &&
			candles
				.slice(createdBarIndex + 2)
				.some((candle) =>
					bullishOrderBlock
						? candle.close < blockLow
						: bearishOrderBlock
							? candle.close > blockHigh
							: false
				);
		
		const mitigationCount =
			mitigated
				? 1
				: 0;
        //--------------------------------------------------
        // FRESHNESS
        //--------------------------------------------------

		const fresh =
				(bullishOrderBlock || bearishOrderBlock) &&
				!mitigated;

        //--------------------------------------------------
        // REACTION
        //--------------------------------------------------

        const range =
            Math.max(
                blockHigh - blockLow,
                Number.EPSILON
            );

        const reactionDistance =
            bullishOrderBlock
                ? current.close - blockHigh
                : bearishOrderBlock
                    ? blockLow - current.close
                    : 0;

        const reactionPercent =
            Math.max(
                0,
                Math.min(
                    100,
                    (reactionDistance / range) * 100
                )
            );

        //--------------------------------------------------
        // STRENGTH
        //--------------------------------------------------

        let strength = 40;

        if (fresh)
            strength += 20;

        strength +=
            Math.min(
                reactionPercent * 0.30,
                25
            );

        strength -=
            mitigationCount * 5;

        strength =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(strength)
                )
            );

        //--------------------------------------------------
        // HTF ALIGNMENT (placeholder)
        //--------------------------------------------------

        const higherTimeframeAligned =
            strength >= 70;

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        const zoneQuality =
            fresh
                ? "FRESH"
                : mitigationCount >= 3
                    ? "WEAK"
                    : "ACTIVE";

		//--------------------------------------------------
		// ORDER BLOCK DISTANCE
		//--------------------------------------------------
		
		const orderBlockDistance =
		
			bullishOrderBlock
		
				? Math.max(
					0,
					current.close - blockHigh
				)
		
				: bearishOrderBlock
		
					? Math.max(
						0,
						blockLow - current.close
					)
		
					: 0;
		
		//--------------------------------------------------
		// ACTIVE / EXPIRED
		//--------------------------------------------------
		
		const active =
				(bullishOrderBlock || bearishOrderBlock) &&
				!mitigated;
		
		const expired =
				mitigated;

        //--------------------------------------------------
        // MARKET BIAS
        //--------------------------------------------------

        let marketBias: -1 | 0 | 1 = 0;

        if (bullishOrderBlock)
            marketBias = 1;

        if (bearishOrderBlock)
            marketBias = -1;

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

			bullishOrderBlock,
		
			bearishOrderBlock,
		
			blockHigh,
		
			blockLow,
		
			createdBarIndex,
		
			fresh,

            mitigated,
			active,
			expired,

            mitigationCount,

            touchCount,

			reactionPercent,
			
			orderBlockDistance,
			
			reactionStrength:
                reactionPercent >=
                this.REACTION_THRESHOLD * 100,

            zoneStrength: strength,

            higherTimeframeAligned,
			higherTimeframe: higherTimeframeAligned ? "ALIGNED" : "NONE",

            zoneQuality,

            marketBias,
			blockType:
				bullishOrderBlock
					? "BULLISH"
					: bearishOrderBlock
						? "BEARISH"
						: "NONE",

            confidence: strength

        };

    }

    //--------------------------------------------------
    // EMPTY RESULT
    //--------------------------------------------------

    private static empty(): OrderBlockResult {

        return {

			bullishOrderBlock: false,
		
			bearishOrderBlock: false,
		
			blockHigh: 0,
		
			blockLow: 0,
		
			fresh: false,

            mitigated: false,

            mitigationCount: 0,

            touchCount: 0,

            reactionPercent: 0,
			orderBlockDistance: 0,

            reactionStrength: false,

            zoneStrength: 0,

            higherTimeframeAligned: false,

            zoneQuality: "NONE",

            marketBias: 0,
			blockType: "NONE",
			active: false,
			expired: false,
			higherTimeframe: "NONE",

            confidence: 0

        };

    }

}