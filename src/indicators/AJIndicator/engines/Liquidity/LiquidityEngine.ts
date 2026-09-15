/****************************************************************************************
 * File:
 * LiquidityEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Liquidity/LiquidityEngine.ts
 *
 * Purpose:
 * Detects institutional liquidity behavior from raw price action.
 *
 * Responsibilities
 * • Liquidity Sweeps
 * • Stop Hunts
 * • Retail Traps
 * • Equal Highs
 * • Equal Lows
 * • Liquidity Voids
 * • Fake Breakouts
 * • Buy-Side / Sell-Side Liquidity
 * • Internal / External Liquidity
 *
 * Internal / External Liquidity Model
 * -----------------------------------
 * External liquidity = liquidity at the outer boundaries of the
 * active dealing/range context.
 *
 * Internal liquidity = liquidity formed inside that outer range.
 *
 * This engine performs detection only.
 * No confidence scoring or execution logic belongs here.
 *				    MARKET DATA
 *                         │
 *                         ▼
 *                MARKET STRUCTURE
 *                         │
 *              ┌──────────┴──────────┐
 *              │                     │
 *              ▼                     ▼
 *       STRUCTURE CONTEXT       LIQUIDITY ENGINE
 *                                    │
 *                    ┌───────────────┼────────────────┐
 *                    │               │                │
 *                    ▼               ▼                ▼
 *                BSL / SSL      INTERNAL /       RANGE LIQUIDITY
 *                               EXTERNAL
 *                    │
 *                    ▼
 *             LIQUIDITY POOLS
 *                    │
 *        ┌───────────┼────────────┐
 *        │           │            │
 *        ▼           ▼            ▼
 *      SWEEP        RUN       TAPPED/UNTAPPED
 *        │           │            │
 *        └───────────┼────────────┘
 *                    ▼
 *             LIQUIDITY DRAW
 *                    │
 *                    ▼
 *             TARGET LIQUIDITY
 *                    │
 *                    ▼
 *          PREMIUM / DISCOUNT
 *                    │
 *                    ▼
 *           BOS / CHOCH RESPONSE
 *                    │
 *                    ▼
 *          DISPLACEMENT / MOMENTUM
 *                    │
 *                    ▼
 *              OB / FVG
 *                    │
 *                    ▼
 *             AI / SMC CONTEXT
 *                    │
 *                    ▼
 *              RISK ENGINE
 *                    │
 *                    ▼
 *          EXECUTION AUTHORITY
 *		  
 *****************************************************************************************/

import type { Candle } from "../../../../types/Candle";
import type { LiquidityResult } from "./LiquidityResult";

export class LiquidityEngine {

    private static readonly LOOKBACK = 20;

    private static readonly EQUAL_LEVEL_TOLERANCE = 0.0015;

    static evaluate(
        candles: Candle[]
    ): LiquidityResult {

        if (candles.length < 5) {
            return this.empty();
        }

        const current = candles.at(-1)!;

        const previous = candles.at(-2)!;

        const history =
            candles.slice(
                Math.max(
                    0,
                    candles.length - this.LOOKBACK
                ),
                candles.length - 1
            );

        if (history.length < 2) {
            return this.empty();
        }

        //==================================================
        // ACTIVE DEALING RANGE
        //==================================================
        //
        // The outer high/low of the active lookback define
        // the current external liquidity boundaries.
        //
        // Liquidity formed between these boundaries is
        // treated as internal liquidity.
        //
        //==================================================

        const rangeHigh =
            Math.max(
                ...history.map(
                    candle => candle.high
                )
            );

        const rangeLow =
            Math.min(
                ...history.map(
                    candle => candle.low
                )
            );

        //==================================================
        // SWINGS / OUTER LIQUIDITY
        //==================================================

        const sweptExternalHigh =
            current.high > rangeHigh;

        const sweptExternalLow =
            current.low < rangeLow;

        //==================================================
        // LIQUIDITY SWEEPS
        //==================================================
        //
        // Sweep = price penetrates the external liquidity
        // boundary and closes back inside the range.
        //
        // This is intentionally different from a run.
        //
        //==================================================

        const sweepHigh =
            sweptExternalHigh &&
            current.close < rangeHigh;

        const sweepLow =
            sweptExternalLow &&
            current.close > rangeLow;

        //==================================================
        // LIQUIDITY RUN
        //==================================================
        //
        // A run occurs when price takes external liquidity
        // and closes beyond that liquidity instead of
        // rejecting back into the range.
        //
        // The current LiquidityResult interface does not
        // expose a dedicated run field, so this distinction
        // is retained internally for classification logic.
        //
        //==================================================

        const liquidityRunHigh =
            sweptExternalHigh &&
            current.close >= rangeHigh;

        const liquidityRunLow =
            sweptExternalLow &&
            current.close <= rangeLow;

        //==================================================
        // STOP HUNT
        //==================================================

        const stopHuntHigh =
            sweepHigh &&
            current.close < current.open;

        const stopHuntLow =
            sweepLow &&
            current.close > current.open;

        const stopHuntDetected =
            stopHuntHigh ||
            stopHuntLow;

        //==================================================
        // RETAIL TRAPS
        //==================================================

        const retailBuyTrap =
            sweepHigh &&
            previous.close > previous.open &&
            current.close < previous.low;

        const retailSellTrap =
            sweepLow &&
            previous.close < previous.open &&
            current.close > previous.high;

        //==================================================
        // EQUAL HIGHS
        //==================================================

        let equalHigh = false;

        for (const candle of history) {

            if (
                Math.abs(
                    candle.high -
                    current.high
                ) <=
                Math.abs(current.high) *
                this.EQUAL_LEVEL_TOLERANCE
            ) {
                equalHigh = true;
                break;
            }
        }

        //==================================================
        // EQUAL LOWS
        //==================================================

        let equalLow = false;

        for (const candle of history) {

            if (
                Math.abs(
                    candle.low -
                    current.low
                ) <=
                Math.abs(current.low) *
                this.EQUAL_LEVEL_TOLERANCE
            ) {
                equalLow = true;
                break;
            }
        }

        //==================================================
        // EXTERNAL LIQUIDITY
        //==================================================
        //
        // External liquidity belongs to the outer boundary
        // of the active dealing range.
        //
        // BUY-SIDE:
        //   current price interacts with rangeHigh.
        //
        // SELL-SIDE:
        //   current price interacts with rangeLow.
        //
        // Equal highs/lows alone are NOT automatically
        // classified as external liquidity because they may
        // exist inside the larger dealing range.
        //
        //==================================================

        const externalBuySideLiquidity =
            sweptExternalHigh ||
            current.high >= rangeHigh;

        const externalSellSideLiquidity =
            sweptExternalLow ||
            current.low <= rangeLow;

        //==================================================
        // INTERNAL LIQUIDITY
        //==================================================
        //
        // Internal liquidity exists inside the outer
        // dealing range.
        //
        // Examples:
        // • Internal swing highs
        // • Internal swing lows
        // • Equal highs inside the range
        // • Equal lows inside the range
        // • Smaller consolidation ranges
        //
        //==================================================

        const currentInsideRange =
            current.high < rangeHigh &&
            current.low > rangeLow;

        const internalBuySideLiquidity =
            currentInsideRange &&
            current.high > previous.high;

        const internalSellSideLiquidity =
            currentInsideRange &&
            current.low < previous.low;

        //==================================================
        // EQUAL-LEVEL INTERNAL LIQUIDITY
        //==================================================
        //
        // Equal highs/lows that are not interacting with the
        // outer range are treated as internal liquidity.
        //
        //==================================================

        const equalHighInsideRange =
            equalHigh &&
            current.high < rangeHigh;

        const equalLowInsideRange =
            equalLow &&
            current.low > rangeLow;

        const finalInternalBuySideLiquidity =
            internalBuySideLiquidity ||
            equalHighInsideRange;

        const finalInternalSellSideLiquidity =
            internalSellSideLiquidity ||
            equalLowInsideRange;

        //==================================================
        // BUY SIDE / SELL SIDE LIQUIDITY
        //==================================================

        const buySideLiquidity =
            externalBuySideLiquidity ||
            finalInternalBuySideLiquidity;

        const sellSideLiquidity =
            externalSellSideLiquidity ||
            finalInternalSellSideLiquidity;

        //==================================================
        // LIQUIDITY VOID
        //==================================================

        const previousRange =
            previous.high -
            previous.low;

        const currentRange =
            current.high -
            current.low;

        const liquidityVoid =
            previousRange > 0 &&
            currentRange >
            previousRange * 2.0;

        //==================================================
        // FAKE BREAKOUT
        //==================================================

        const fakeBreakoutBull =
            sweptExternalHigh &&
            current.close < rangeHigh;

        const fakeBreakoutBear =
            sweptExternalLow &&
            current.close > rangeLow;

        //==================================================
        // LIQUIDITY REACTION
        //==================================================

        const bullishLiquidityReaction =
            sweepLow ||
            retailSellTrap;

        const bearishLiquidityReaction =
            sweepHigh ||
            retailBuyTrap;

        //==================================================
        // STRENGTH
        //==================================================

        let strength = 0;

        if (
            sweepHigh ||
            sweepLow
        ) {
            strength += 20;
        }

        if (stopHuntDetected) {
            strength += 20;
        }

        if (
            retailBuyTrap ||
            retailSellTrap
        ) {
            strength += 20;
        }

        if (
            equalHigh ||
            equalLow
        ) {
            strength += 15;
        }

        if (liquidityVoid) {
            strength += 15;
        }

        if (
            fakeBreakoutBull ||
            fakeBreakoutBear
        ) {
            strength += 10;
        }

        // A confirmed external liquidity run is important
        // context, but it must not automatically become a
        // trade signal.
        if (
            liquidityRunHigh ||
            liquidityRunLow
        ) {
            strength += 10;
        }

        strength =
            Math.min(
                strength,
                100
            );

        //==================================================
        // MARKET BIAS
        //==================================================

        let marketBias: -1 | 0 | 1 = 0;

        if (
            bullishLiquidityReaction
        ) {
            marketBias = 1;
        }

        if (
            bearishLiquidityReaction
        ) {
            marketBias = -1;
        }

        //==================================================
        // LIQUIDITY STATE
        //==================================================

		let liquidityState:
			"NEUTRAL" |
			"BUY_SIDE_LIQUIDITY" |
			"SELL_SIDE_LIQUIDITY" =
			"NEUTRAL";
		
		if (
			bullishLiquidityReaction &&
			!bearishLiquidityReaction
		) {
			liquidityState = "SELL_SIDE_LIQUIDITY";
		}
		
		if (
			bearishLiquidityReaction &&
			!bullishLiquidityReaction
		) {
			liquidityState = "BUY_SIDE_LIQUIDITY";
		}

        //==================================================
        // ACTIVE SIGNAL
        //==================================================

		let activeSignal:
			"NONE" |
			"SWEEP_HIGH" |
			"SWEEP_LOW" |
			"BUY_TRAP" |
			"SELL_TRAP" |
			"STOP_HUNT_HIGH" |
			"STOP_HUNT_LOW" |
			"VOID" =
			"NONE";

		if (stopHuntHigh) {
			activeSignal = "STOP_HUNT_HIGH";
		} else if (stopHuntLow) {
			activeSignal = "STOP_HUNT_LOW";
		} else if (retailBuyTrap) {
			activeSignal = "BUY_TRAP";
		} else if (retailSellTrap) {
			activeSignal = "SELL_TRAP";
		} else if (sweepHigh) {
			activeSignal = "SWEEP_HIGH";
		} else if (sweepLow) {
			activeSignal = "SWEEP_LOW";
		} else if (liquidityVoid) {
			activeSignal = "VOID";
		}

        //==================================================
        // SWEEP DISTANCE
        //==================================================

        let sweepDistance = 0;

        if (sweepHigh) {
            sweepDistance =
                Math.max(
                    0,
                    current.high -
                    rangeHigh
                );
        }

        if (sweepLow) {
            sweepDistance =
                Math.max(
                    0,
                    rangeLow -
                    current.low
                );
        }

        //==================================================
        // RETURN
        //==================================================

        return {

            sweepHigh,

            sweepLow,

            stopHuntDetected,

            stopHuntHigh,

            stopHuntLow,

            retailBuyTrap,

            retailSellTrap,

            equalHigh,

            equalLow,

            liquidityVoid,

            fakeBreakoutBull,

            fakeBreakoutBear,

            marketBias,

            //==================================================
            // INTERNAL / EXTERNAL LIQUIDITY
            //==================================================

            externalBuySideLiquidity,

            externalSellSideLiquidity,

            internalBuySideLiquidity:
                finalInternalBuySideLiquidity,

            internalSellSideLiquidity:
                finalInternalSellSideLiquidity,

            //==================================================
            // BUY / SELL SIDE LIQUIDITY
            //==================================================

            buySideLiquidity,

            sellSideLiquidity,

            liquidityState,

            activeSignal,

            liquidityScore:
                strength,

            reactionStrength:
                strength,

            sweepDistance,

            mitigationProbability:
                0,

            strength,

            confidence:
                strength
        };
    }

    //==================================================
    // EMPTY
    //==================================================

    private static empty(): LiquidityResult {

        return {

            sweepHigh: false,

            sweepLow: false,

            stopHuntDetected: false,

            stopHuntHigh: false,

            stopHuntLow: false,

            retailBuyTrap: false,

            retailSellTrap: false,

            equalHigh: false,

            equalLow: false,

            liquidityVoid: false,

            fakeBreakoutBull: false,

            fakeBreakoutBear: false,

            marketBias: 0,

            //==================================================
            // INTERNAL / EXTERNAL LIQUIDITY
            //==================================================

            externalBuySideLiquidity: false,

            externalSellSideLiquidity: false,

            internalBuySideLiquidity: false,

            internalSellSideLiquidity: false,

            //==================================================
            // BUY / SELL SIDE LIQUIDITY
            //==================================================

            buySideLiquidity: false,

            sellSideLiquidity: false,

            liquidityState:
                "NEUTRAL",

            activeSignal:
                "NONE",

            liquidityScore: 0,

            reactionStrength: 0,

            sweepDistance: 0,

            mitigationProbability: 0,

            strength: 0,

            confidence: 0
        };
    }
}