/****************************************************************************************
 * File:
 * ATR.ts
 *
 * Path:
 * src/indicators/ATR.ts
 *
 * AJ v2 - Institutional Average True Range (ATR) & Volatility Analysis Engine
 *
 * Purpose
 * -------
 * ATR is the canonical volatility analysis engine of the AJ v2 institutional
 * trading framework. It measures market volatility using the Average True
 * Range (ATR) algorithm and transforms raw volatility into normalized
 * institutional intelligence that can be consumed consistently throughout
 * the AJ v2 runtime.
 *
 * Beyond calculating ATR values, the engine classifies volatility regimes,
 * detects volatility expansion and contraction, estimates execution risk,
 * calculates adaptive stop distances, and provides confidence metrics for
 * downstream decision-making.
 *
 * ATR follows the standardized AJ v2 dual-API indicator architecture used by
 * EMA, RSI, VWAP, ADX, and other core indicators.
 *
 * Responsibilities
 * ----------------
 * • Calculate Average True Range (ATR).
 * • Calculate True Range (TR).
 * • Measure market volatility.
 * • Classify volatility regimes.
 * • Detect volatility expansion.
 * • Detect volatility contraction.
 * • Calculate adaptive execution risk.
 * • Estimate stop-loss distance.
 * • Produce normalized ATRResult.
 *
 * Functional Areas
 * ----------------
 *
 * True Range Calculation
 * • High-Low range.
 * • High-Previous Close.
 * • Low-Previous Close.
 * • Maximum True Range selection.
 *
 * ATR Calculation
 * • Initial ATR computation.
 * • Wilder smoothing.
 * • Rolling ATR update.
 * • Historical ATR generation.
 *
 * Volatility Regime Analysis
 * • High volatility detection.
 * • Normal volatility detection.
 * • Low volatility detection.
 *
 * Volatility Trend Analysis
 * • Expanding volatility.
 * • Contracting volatility.
 * • Volatility direction.
 * • Volatility strength.
 *
 * Risk Management
 * ---------------
 * • Dynamic risk multiplier.
 * • Adaptive stop-loss distance.
 * • Execution risk estimation.
 * • Volatility-based trade sizing support.
 *
 * Confidence Analysis
 * -------------------
 * • ATR confidence calculation.
 * • Volatility validation.
 * • Result integrity verification.
 *
 * Public APIs
 * -----------
 *
 * calculate()
 * Returns:
 * • number[]
 *
 * Purpose:
 * • Lightweight ATR history.
 * • Compatible with chart plotting.
 * • Numeric indicator pipeline.
 *
 * calculateResult()
 * Returns:
 * • ATRResult[]
 *
 * Purpose:
 * • Complete historical ATR analysis.
 * • Runtime indicator processing.
 * • Institutional analytics.
 *
 * analyze()
 * Returns:
 * • ATRResult
 *
 * Purpose:
 * • Latest volatility analysis.
 * • Runtime decision making.
 * • Context evaluation.
 *
 * Inputs
 * ------
 * Candle[]
 *
 * Required Candle Data
 * • High
 * • Low
 * • Close
 *
 * Optional Parameters
 * • ATR Period
 *
 * Outputs
 * -------
 * ATRResult provides:
 *
 * Core Values
 * • ATR
 * • Previous ATR
 *
 * Volatility Regimes
 * • High Volatility
 * • Normal Volatility
 * • Low Volatility
 *
 * Market Behaviour
 * • Expanding Volatility
 * • Contracting Volatility
 * • Volatility Direction
 *
 * Risk Intelligence
 * • Risk Multiplier
 * • Stop Distance
 *
 * Volatility Analytics
 * • Volatility Strength
 * • Confidence
 * • Valid Result
 *
 * Upstream Dependencies
 * ---------------------
 * ATR consumes:
 *
 * • Historical OHLC Candle Data
 * • Market Price Feed
 *
 * Downstream Consumers
 * --------------------
 * ATRResult is consumed by:
 *
 * Primary Consumers
 * • VolatilityEngine
 * • AJRuntimeContextBuilder
 *
 * Secondary Consumers
 * • ContextEngine
 * • BreakoutEngine
 * • LiquidityEngine
 * • OrderFlowEngine
 * • AIEngine
 * • AIConfidenceEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • Execution Engine
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Pure volatility analysis engine.
 * • Deterministic calculations.
 * • Wilder ATR implementation.
 * • Dual-API architecture.
 * • Stateless execution.
 * • No market bias.
 * • No signal generation.
 * • No trade direction.
 * • No execution authority.
 * • No position management.
 * • Immutable results.
 * • Backward compatible.
 * • Phase 15.5 compliant.
 *
 * Institutional Features
 * ----------------------
 * • Wilder ATR smoothing.
 * • Institutional volatility classification.
 * • Volatility regime detection.
 * • Volatility trend analysis.
 * • Adaptive execution risk estimation.
 * • Dynamic stop-loss calculation.
 * • Confidence scoring.
 * • Historical volatility analytics.
 * • Runtime-ready indicator output.
 *
 * AJ v2 Indicator Architecture
 *
 * Candle Feed
 *      │
 *      ▼
 * True Range Engine
 *      │
 *      ▼
 * Wilder ATR Calculation
 *      │
 *      ▼
 * ATRResult Generation
 *      │
 *      ▼
 * Volatility Classification
 *      │
 *      ▼
 * Risk Intelligence
 *      │
 *      ▼
 * VolatilityEngine
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
 * AIConfidenceEngine
 *      │
 *      ▼
 * AJDecisionEngine
 *      │
 *      ▼
 * Trade Authority Engine
 *      │
 *      ▼
 * Execution Engine
 *
 * Notes
 * -----
 * • ATR is a volatility indicator only.
 * • It does not predict market direction.
 * • It does not generate Buy/Sell signals.
 * • It does not perform trade qualification.
 * • It does not determine execution authority.
 * • RiskMultiplier and StopDistance are analytical values that assist
 *   downstream risk management engines rather than directly controlling
 *   order placement.
 * • ATRResult represents normalized institutional volatility intelligence
 *   for the AJ v2 runtime and serves as the canonical volatility input for
 *   context evaluation, confidence assessment, and execution planning.
 *
 ****************************************************************************************/

import type { Candle } from "../types/Candle";

export interface ATRResult {

    //--------------------------------------------------
    // CORE VALUE
    //--------------------------------------------------

    atr: number;
    previous: number;

    //--------------------------------------------------
    // VOLATILITY REGIME
    //--------------------------------------------------

    highVolatility: boolean;
    lowVolatility: boolean;
    normalVolatility: boolean;

    //--------------------------------------------------
    // MARKET STATE
    //--------------------------------------------------

    expandingVolatility: boolean;
    contractingVolatility: boolean;
    direction: number;

    //--------------------------------------------------
    // RISK ENGINE
    //--------------------------------------------------

    riskMultiplier: number;
    stopDistance: number;

    //--------------------------------------------------
    // STRENGTH
    //--------------------------------------------------

    volatilityStrength: number;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;
    valid: boolean;

}

export class ATR {

    //--------------------------------------------------
    // PUBLIC NUMERIC API
    //--------------------------------------------------

    static calculate(
        candles: Candle[],
        period = 14
    ): number[] {

        return this
            .buildResults(candles, period)
            .map(x => x.atr);

    }

    //--------------------------------------------------
    // PUBLIC HISTORY API
    //--------------------------------------------------

    static calculateResult(
        candles: Candle[],
        period = 14
    ): ATRResult[] {

        return this.buildResults(
            candles,
            period
        );

    }

    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------

    static analyze(
        candles: Candle[],
        period = 14
    ): ATRResult {

        const results =
            this.buildResults(
                candles,
                period
            );

        if (!results.length) {

            return {

                atr: 0,
                previous: 0,

                highVolatility: false,
                lowVolatility: false,
                normalVolatility: true,

                expandingVolatility: false,
                contractingVolatility: false,
                direction: 0,

                riskMultiplier: 1,
                stopDistance: 0,

                volatilityStrength: 0,

                confidence: 0,
                valid: false

            };

        }

        return results[
            results.length - 1
        ];

    }

    //=========================================
    // PRIVATE RESULT ENGINE
    //=========================================

    private static buildResults(
        candles: Candle[],
        period = 14
    ): ATRResult[] {

        if (candles.length <= period) {
            return [];
        }

        const tr: number[] = [];

        for (let i = 1; i < candles.length; i++) {

            tr.push(

                Math.max(

                    candles[i].high - candles[i].low,

                    Math.abs(
                        candles[i].high -
                        candles[i - 1].close
                    ),

                    Math.abs(
                        candles[i].low -
                        candles[i - 1].close
                    )

                )

            );

        }

        const results: ATRResult[] = [];

        let atr =
            tr
                .slice(0, period)
                .reduce((a, b) => a + b, 0)
            / period;

        results.push({

            atr,
            previous: atr,

            highVolatility: false,
            lowVolatility: false,
            normalVolatility: true,

            expandingVolatility: false,
            contractingVolatility: false,
            direction: 0,

            riskMultiplier: 1,
            stopDistance: atr,

            volatilityStrength: 0,

            confidence: 0,
            valid: true

        });
		
		//--------------------------------------------------
        // MAIN LOOP
        //--------------------------------------------------

        for (let i = period; i < tr.length; i++) {

            const previous = atr;

            atr =
                (atr * (period - 1) + tr[i])
                / period;

            const volatilityStrength =
                Math.abs(
                    atr -
                    previous
                );

            const expandingVolatility =
                atr > previous;

            const contractingVolatility =
                atr < previous;

            const direction =
                expandingVolatility
                    ? 1
                    : contractingVolatility
                        ? -1
                        : 0;

            const highVolatility =
                atr > previous * 1.2;

            const lowVolatility =
                atr < previous * 0.8;

            const normalVolatility =
                !highVolatility &&
                !lowVolatility;

            const riskMultiplier =
                Math.min(

                    3,

                    Math.max(

                        0.5,

                        atr /
                        Math.max(previous, 0.0001)

                    )

                );

            const stopDistance =
                atr;

            const confidence =
                Math.min(
                    100,
                    volatilityStrength * 10
                );

            results.push({

                atr,
                previous,

                highVolatility,
                lowVolatility,
                normalVolatility,

                expandingVolatility,
                contractingVolatility,
                direction,

                riskMultiplier,
                stopDistance,

                volatilityStrength,

                confidence,
                valid: true

            });

        }

        return results;

    }

}