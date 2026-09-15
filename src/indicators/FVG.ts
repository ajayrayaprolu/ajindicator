/****************************************************************************************
 * File:
 * FVG.ts
 *
 * Path:
 * src/indicators/FVG.ts
 *
 * AJ v2 - Institutional Fair Value Gap (FVG) Detection Engine
 *
 * Purpose
 * -------
 * FVG is the canonical Fair Value Gap detection engine of the AJ v2
 * institutional trading framework.
 *
 * The engine detects bullish and bearish Fair Value Gaps using the
 * three-candle institutional imbalance model and evaluates the quality,
 * lifecycle, mitigation status and confidence of each imbalance.
 *
 * Rather than generating trading signals, this engine identifies
 * institutional price inefficiencies that may become future reaction
 * zones for Smart Money participation.
 *
 * Responsibilities
 * ----------------
 * • Detect bullish Fair Value Gaps.
 * • Detect bearish Fair Value Gaps.
 * • Calculate FVG boundaries.
 * • Calculate midpoint.
 * • Calculate gap size.
 * • Calculate percentage size.
 * • Detect partial fills.
 * • Detect full mitigation.
 * • Track FVG lifecycle.
 * • Calculate displacement.
 * • Evaluate premium / discount positioning.
 * • Produce institutional confidence.
 * • Return immutable FVGResult.
 *
 * Functional Areas
 * ----------------
 *
 * Bullish Fair Value Gap
 * • Three-candle bullish imbalance detection.
 * • Gap upper/lower boundaries.
 * • Direction assignment.
 *
 * Bearish Fair Value Gap
 * • Three-candle bearish imbalance detection.
 * • Gap upper/lower boundaries.
 * • Direction assignment.
 *
 * Gap Metrics
 * • Gap size.
 * • Gap midpoint.
 * • Relative percentage size.
 * • Distance from current price.
 *
 * Mitigation Analysis
 * • Partial fill detection.
 * • Full mitigation detection.
 * • Fill percentage calculation.
 *
 * Lifecycle Management
 * • Active gap.
 * • Valid gap.
 * • Invalidated gap.
 *
 * Institutional Analysis
 * • Premium zone detection.
 * • Discount zone detection.
 * • Candle displacement.
 * • Institutional strength.
 * • Institutional confidence.
 *
 * Inputs
 * ------
 * FVG consumes:
 *
 * • OHLC candle history.
 * • Current candle.
 * • Previous two candles.
 *
 * Outputs
 * -------
 * FVGResult provides:
 *
 * Detection
 * • detected
 * • bullish
 * • bearish
 * • direction
 *
 * Geometry
 * • upper
 * • lower
 * • midpoint
 * • size
 * • sizePercent
 *
 * Mitigation
 * • mitigated
 * • partiallyFilled
 * • fillPercent
 *
 * Lifecycle
 * • valid
 * • active
 * • invalidated
 *
 * Institutional Metrics
 * • displacement
 * • premiumZone
 * • discountZone
 * • distanceFromPrice
 * • strength
 * • confidence
 *
 * Upstream Dependencies
 * ---------------------
 * FVG consumes normalized candle data from:
 *
 * • Candle history
 * • Market data feed
 * • Runtime candle stream
 *
 * Downstream Consumers
 * --------------------
 * FVGResult is consumed by:
 *
 * • MarketStructureEngine
 * • LiquidityEngine
 * • ContextEngine
 * • AIConfidenceEngine
 * • AJRuntimeContextBuilder
 * • AJRuntimeContext
 * • ExecutionAuthority
 * • Strategy Dashboard
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Pure imbalance detection engine.
 * • Deterministic implementation.
 * • Immutable output.
 * • No signal generation.
 * • No trade execution.
 * • No position management.
 * • No runtime mutation.
 * • Market-independent implementation.
 * • Backward compatible.
 *
 * AJ v2 Pipeline
 *
 * Candle Stream
 *        │
 *        ▼
 *   FVG Detection
 *        │
 *        ▼
 *  Gap Evaluation
 *        │
 *        ▼
 * Lifecycle Analysis
 *        │
 *        ▼
 * Institutional Metrics
 *        │
 *        ▼
 *     FVGResult
 *        │
 *        ▼
 * MarketStructureEngine
 *        │
 *        ▼
 * LiquidityEngine
 *        │
 *        ▼
 * AIConfidenceEngine
 *
 * Notes
 * -----
 * • FVG detects institutional price imbalances only.
 * • It does not determine market direction.
 * • It does not generate Buy/Sell signals.
 * • It does not authorize execution.
 * • It does not calculate risk.
 * • It does not manage orders or positions.
 * • FVGResult represents the canonical Fair Value Gap output used
 *   throughout the AJ v2 institutional trading framework.
 ****************************************************************************************/
import type { Candle } from "../types/Candle";

export interface FVGResult {

    detected: boolean;
    bullish: boolean;
    bearish: boolean;
    direction: number;
    upper: number;
    lower: number;
    midpoint: number;
    size: number;
    sizePercent: number;
    mitigated: boolean;
    partiallyFilled: boolean;
    fillPercent: number;
	valid: boolean;
	
	//--------------------------------------------------
	// FVG LIFECYCLE
	//--------------------------------------------------
	
	active: boolean;
	
	invalidated: boolean;
	
	//--------------------------------------------------
	// DISTANCE
	//--------------------------------------------------
	
	distanceFromPrice: number;
	
	displacement: number;
    premiumZone: boolean;
    discountZone: boolean;
    strength: number;
    confidence: number;

}

export class FVG {

    //--------------------------------------------------
    // PUBLIC HISTORY API
    //--------------------------------------------------

    static calculate(
        candles: Candle[]
    ): FVGResult[] {

        return this.buildResults(candles);

    }

    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------

    static analyze(
        candles: Candle[]
    ): FVGResult {

        const results =
            this.buildResults(candles);

        if (!results.length) {

            return {

                detected: false,
                bullish: false,
                bearish: false,
                direction: 0,
                upper: 0,
                lower: 0,
                midpoint: 0,
                size: 0,
                sizePercent: 0,
                mitigated: false,
                partiallyFilled: false,
                fillPercent: 0,
				valid: false,
				
				active: false,
				
				invalidated: false,
				
				distanceFromPrice: 0,
				
				displacement: 0,
                premiumZone: false,
                discountZone: false,
                strength: 0,
                confidence: 0

            };

        }

        return results[results.length - 1];

    }

    //=========================================
    // PRIVATE RESULT ENGINE
    //=========================================

    private static buildResults(
        candles: Candle[]
    ): FVGResult[] {

        if (candles.length < 3) {
            return [];
        }

        const results: FVGResult[] = [];

        const c1 = candles[candles.length - 3];
        const c2 = candles[candles.length - 2];
        const c3 = candles[candles.length - 1];

        let bullish = false;
        let bearish = false;
        let upper = 0;
        let lower = 0;

        if (c1.high < c3.low) {

            bullish = true;

            upper = c3.low;

            lower = c1.high;

        } else if (c1.low > c3.high) {

            bearish = true;

            upper = c1.low;

            lower = c3.high;

        }

        const detected =
            bullish || bearish;

        const direction =
            bullish ? 1 :
            bearish ? -1 : 0;

        const size =
            detected
                ? upper - lower
                : 0;

        const midpoint =
            detected
                ? (upper + lower) / 2
                : 0;

        const sizePercent =
            detected
                ? (size / Math.max(Math.abs(c3.close), 0.000001)) * 100
                : 0;

        let fillPercent = 0;
        let mitigated = false;
        let partiallyFilled = false;

        if (bullish) {

            if (c3.low <= midpoint) {

                partiallyFilled = true;

                fillPercent =
                    ((upper - c3.low) / Math.max(size, 0.000001)) * 100;

            }

            if (c3.low <= lower) {

                mitigated = true;

                fillPercent = 100;

            }

        }

        if (bearish) {

            if (c3.high >= midpoint) {

                partiallyFilled = true;

                fillPercent =
                    ((c3.high - lower) / Math.max(size, 0.000001)) * 100;

            }

            if (c3.high >= upper) {

                mitigated = true;

                fillPercent = 100;

            }

        }

        fillPercent =
            Math.min(
                100,
                Math.max(0, fillPercent)
            );

		const valid =
			detected &&
			!mitigated;
		
		//--------------------------------------------------
		// FVG LIFECYCLE
		//--------------------------------------------------
		
		const active =
			valid;
		
		const invalidated =
			detected &&
			mitigated;
		
		//--------------------------------------------------
		// DISTANCE FROM CURRENT PRICE
		//--------------------------------------------------
		
		const distanceFromPrice =
			detected
				? Math.min(
					Math.abs(c3.close - upper),
					Math.abs(c3.close - lower)
				)
				: 0;

        const displacement =
            Math.abs(
                c2.close -
                c2.open
            );

        const premiumZone =
            bearish &&
            c3.close > midpoint;

        const discountZone =
            bullish &&
            c3.close < midpoint;

        const strength =
            detected
                ? Math.min(
                    100,
                    sizePercent * 10 +
                    displacement
                )
                : 0;

        const confidence =
            valid
                ? Math.min(
                    100,
                    strength + 20
                )
                : 0;

        results.push({
            detected,
            bullish,
            bearish,
            direction,
            upper,
            lower,
            midpoint,
            size,
            sizePercent,
            mitigated,
            partiallyFilled,
            fillPercent,
			valid,
			
			active,
			
			invalidated,
			
			distanceFromPrice,
			
			displacement,
            premiumZone,
            discountZone,
            strength,
            confidence

        });

        return results;

    }

}