/****************************************************************************************
 * File:
 * BreakoutEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/context/BreakoutEngine.ts
 *
 * AJ v2 - Institutional Breakout Evaluation Engine
 *
 * Purpose
 * -------
 * BreakoutEngine is the canonical breakout detection engine of the AJ v2
 * trading framework. It evaluates whether price has produced a valid,
 * institutionally qualified breakout using Inside Bar (IB) structure,
 * market range boundaries, and ATR-normalized breakout strength.
 *
 * The engine is specifically designed to distinguish genuine institutional
 * breakouts from weak retail breakouts by applying minimum breakout quality
 * thresholds before allowing downstream trade qualification.
 *
 * It supports market-specific execution logic while preserving a common
 * BreakoutResult contract for all downstream engines.
 *
 * Responsibilities
 * ----------------
 * • Detect Inside Bar (IB) breakouts.
 * • Detect market range breakouts.
 * • Calculate ATR-normalized breakout strength.
 * • Reject weak or false breakout signals.
 * • Apply institutional breakout quality thresholds.
 * • Support India-specific execution rules.
 * • Support Crypto-specific execution hierarchy.
 * • Determine breakout execution mode.
 * • Produce a normalized BreakoutResult.
 * • Preserve backward compatibility with AJ v2 runtime.
 *
 * Functional Areas
 * ----------------
 *
 * Inside Bar Analysis
 * • Detect active Inside Bar structure.
 * • Track IB High and IB Low.
 * • Validate Inside Bar lifecycle.
 * • Detect bullish IB breakout.
 * • Detect bearish IB breakout.
 *
 * Range Breakout Analysis
 * • Calculate highest market range.
 * • Calculate lowest market range.
 * • Detect bullish range breakout.
 * • Detect bearish range breakout.
 *
 * ATR-Normalized Breakout Quality
 * • Normalize breakout distance using ATR.
 * • Measure breakout strength independent of price.
 * • Reject insignificant breakouts.
 * • Improve institutional breakout quality.
 *
 * Institutional Breakout Qualification
 * • Minimum IB breakout threshold.
 * • Minimum range breakout threshold.
 * • False breakout rejection.
 * • Weak breakout filtering.
 *
 * Market-Specific Execution Logic
 * -------------------------------
 *
 * India Market
 * • Inside Bar execution only.
 * • Institutional breakout confirmation.
 * • Strict structural validation.
 * • IB-first execution model.
 *
 * Crypto Spot Market
 * • Inside Bar priority.
 * • Range breakout fallback.
 * • Relaxed execution hierarchy.
 * • Higher volatility tolerance.
 *
 * Options Mode
 * • Disable breakout execution.
 * • Preserve market structure evaluation.
 * • Allow options-specific routing logic.
 *
 * Breakout Evaluation Flow
 * ------------------------
 *
 * 1. Read market structure.
 * 2. Update active Inside Bar.
 * 3. Calculate market range.
 * 4. Detect directional breakouts.
 * 5. Calculate ATR-normalized breakout strength.
 * 6. Apply institutional quality thresholds.
 * 7. Reject weak breakouts.
 * 8. Apply market-specific execution rules.
 * 9. Produce BreakoutResult.
 *
 * Inputs
 * ------
 * BreakoutInput provides:
 *
 * • OHLC values
 * • Inside Bar state
 * • Historical highs
 * • Historical lows
 * • ATR
 * • Market type
 * • Option mode
 * • Previous IB state
 *
 * Outputs
 * -------
 * BreakoutResult provides:
 *
 * • Long breakout
 * • Short breakout
 * • Execution mode
 * • Range High
 * • Range Low
 * • Inside Bar High
 * • Inside Bar Low
 * • Inside Bar validity
 *
 * Upstream Dependencies
 * ---------------------
 * BreakoutEngine consumes normalized runtime data from:
 *
 * • Candle Engine
 * • ATR Engine
 * • Inside Bar Engine
 * • RuntimeContextBuilder
 * • Market Data Feed
 *
 * Downstream Consumers
 * --------------------
 * BreakoutResult is consumed by:
 *
 * • ContextEngine
 * • MarketStructureEngine
 * • AJRuntimeContextBuilder
 * • AJContextEngine
 * • ConfidenceEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • Execution Engine
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle
 * • Pure evaluation engine
 * • Deterministic calculations
 * • ATR-normalized breakout evaluation
 * • Institutional-first logic
 * • Market-aware execution hierarchy
 * • No indicator calculations
 * • No scoring logic
 * • No confidence calculations
 * • No trading decisions
 * • No execution management
 * • Immutable output
 * • Backward compatible
 * • Phase 15.5 compliant
 *
 * Institutional Improvements
 * --------------------------
 * • ATR-normalized breakout quality evaluation.
 * • Institutional breakout confirmation thresholds.
 * • Weak breakout rejection.
 * • False breakout filtering.
 * • India IB-first execution model.
 * • Crypto IB → Range fallback hierarchy.
 * • Stable execution mode routing.
 * • Backward-compatible BreakoutResult contract.
 *
 * AJ v2 Pipeline
 *
 * Market Data
 *      │
 *      ▼
 * Inside Bar Engine
 *      │
 *      ▼
 * ATR Engine
 *      │
 *      ▼
 * BreakoutEngine
 *      │
 *      ▼
 * BreakoutResult
 *      │
 *      ▼
 * AJRuntimeContextBuilder
 *      │
 *      ▼
 * ContextEngine
 *      │
 *      ▼
 * AJContextEngine
 *      │
 *      ▼
 * ConfidenceEngine
 *      │
 *      ▼
 * AJDecisionEngine
 *      │
 *      ▼
 * Authority Engine
 *      │
 *      ▼
 * Execution Engine
 *
 * Notes
 * -----
 * • BreakoutEngine evaluates breakout validity only.
 * • It does not determine trade direction or confidence.
 * • It does not generate buy/sell decisions.
 * • It does not perform risk management.
 * • BreakoutResult represents normalized breakout intelligence for
 *   downstream institutional context evaluation.
 *
 ****************************************************************************************/

import type {BreakoutInput} from "./BreakoutTypes";
import type {BreakoutResult} from "./BreakoutResult";

export class BreakoutEngine {

    //--------------------------------------------------
    // HIGHEST
    //--------------------------------------------------

    private static highest(
        values: number[]
    ): number {
        return Math.max(
            ...values
        );
    }

    //--------------------------------------------------
    // LOWEST
    //--------------------------------------------------

    private static lowest(
        values: number[]
    ): number {
        return Math.min(
            ...values
        );
    }

    //--------------------------------------------------
    // BREAKOUT STRENGTH
    //--------------------------------------------------

    private static breakoutStrength(
        close: number,
        level: number,
        atr: number
    ): number {
        if (
            atr <= 0
        ) {
            return 0;
        }
        return Math.abs(
            close -
            level
        ) / atr;
    }

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    static evaluate(
        input: BreakoutInput
    ): BreakoutResult {

        //--------------------------------------------------
        // INSIDE BAR
        //--------------------------------------------------
        let ibHigh = input.ibHigh;
        let ibLow = input.ibLow;
        let ibValid = input.ibValid;

        if (
            input.insideBar
        ) {
            ibHigh =
                input.high;
            ibLow =
                input.low;
            ibValid = true;
        }

        //--------------------------------------------------
        // MARKET RANGE
        //--------------------------------------------------

        const rangeHigh =
            BreakoutEngine.highest(
                input.highs
            );

        const rangeLow =
            BreakoutEngine.lowest(
                input.lows
            );

        //--------------------------------------------------
        // BREAKOUTS
        //--------------------------------------------------

        const ibLong =
            ibValid &&
            ibHigh !== null &&
            input.close > ibHigh;

        const ibShort =
            ibValid &&
            ibLow !== null &&
            input.close < ibLow;

        const rangeLong =
            input.close >
            rangeHigh;

        const rangeShort =
            input.close <
            rangeLow;

        //--------------------------------------------------
        // STRENGTH
        //--------------------------------------------------

        const atr =
            Math.max(
                input.atr ??
                1,
                1
            );

        const ibLongStrength =
            ibHigh === null
                ? 0
                : BreakoutEngine.breakoutStrength(
                    input.close,
                    ibHigh,
                    atr
                );

        const ibShortStrength =
            ibLow === null
                ? 0
                : BreakoutEngine.breakoutStrength(
                    input.close,
                    ibLow,
                    atr
                );

        const rangeLongStrength =
            BreakoutEngine.breakoutStrength(
                input.close,
                rangeHigh,
                atr
            );

        const rangeShortStrength =
            BreakoutEngine.breakoutStrength(
                input.close,
                rangeLow,
                atr
            );

        //--------------------------------------------------
        // EXECUTION MODE
        //--------------------------------------------------

        let longBreak = false;
        let shortBreak = false;
        let execMode:
            BreakoutResult["execMode"]
            = "NONE";

        //--------------------------------------------------
        // INDIA
        //--------------------------------------------------

        if (
            input.isIndiaMarket
        ) {
            longBreak =
                ibLong;
            shortBreak =
                ibShort;
            execMode =
                "IB-STRUCTURE";
        }

        //--------------------------------------------------
        // CRYPTO
        //--------------------------------------------------

        else if (
            input.isCryptoSpot
        ) {
            if (
                ibLong ||
                ibShort
            ) {
                longBreak =
                    ibLong;
                shortBreak =
                    ibShort;
                execMode =
                    "IB-RELAXED";
            }

            else if (
                rangeLong ||
                rangeShort
            ) {
                longBreak =
                    rangeLong;
                shortBreak =
                    rangeShort;
                execMode =
                    "RANGE-FALLBACK";
            }

            else {
                execMode =
                    "NO BREAK";
            }

        }

		//--------------------------------------------------
		// BREAKOUT QUALITY
		//--------------------------------------------------
		
		const breakoutConfirmed =
		(
			ibLongStrength >= 0.20 ||
			ibShortStrength >= 0.20 ||
			rangeLongStrength >= 0.35 ||
			rangeShortStrength >= 0.35
		);
		
		//--------------------------------------------------
		// FALSE BREAKOUT REJECTION
		//--------------------------------------------------
		
		const falseBullBreakout =
			longBreak &&
			input.close <= Math.max(
				ibHigh ?? Number.NEGATIVE_INFINITY,
				rangeHigh
			);
		
		const falseBearBreakout =
			shortBreak &&
			input.close >= Math.min(
				ibLow ?? Number.POSITIVE_INFINITY,
				rangeLow
			);
		
		if (
			!breakoutConfirmed ||
			falseBullBreakout ||
			falseBearBreakout
		) {
			longBreak = false;
			shortBreak = false;
		}

        //--------------------------------------------------
        // OPTION MODE
        //--------------------------------------------------

        if (
            input.optionMirrorMode
        ) {
            longBreak = false;
            shortBreak = false;
        }

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {
            longBreak,
            shortBreak,
            execMode,
            rangeHigh,
            rangeLow,
            ibHigh,
            ibLow,
            ibValid
        };

    }

}
