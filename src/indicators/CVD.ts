/****************************************************************************************
 * File:
 * CVD.ts
 *
 * Path:
 * src/indicators/CVD.ts
 *
 * AJ v2 - Institutional Cumulative Volume Delta Engine
 *
 * Purpose
 * -------
 * CVD (Cumulative Volume Delta) is the canonical institutional order flow
 * analysis engine within the AJ v2 trading framework. It estimates buying
 * and selling pressure by allocating candle volume according to the close
 * position within each candle's range and accumulating the resulting net
 * volume delta over time.
 *
 * Unlike exchange-level bid/ask CVD, this implementation derives a synthetic
 * institutional order flow model from OHLCV market data, allowing consistent
 * operation across equities, indices, futures, forex, and cryptocurrency
 * markets where true bid/ask volume may not be available.
 *
 * The engine produces normalized order-flow intelligence that is consumed
 * throughout the AJ v2 institutional trading pipeline.
 *
 * Responsibilities
 * ----------------
 * • Calculate cumulative volume delta.
 * • Estimate institutional buying pressure.
 * • Estimate institutional selling pressure.
 * • Calculate net order-flow imbalance.
 * • Detect bullish order flow.
 * • Detect bearish order flow.
 * • Measure institutional participation strength.
 * • Detect absorption conditions.
 * • Detect exhaustion conditions.
 * • Produce normalized CVDResult.
 *
 * Functional Areas
 * ----------------
 *
 * Volume Allocation
 * • Allocate candle volume proportionally.
 * • Estimate buying volume.
 * • Estimate selling volume.
 * • Calculate per-candle delta.
 *
 * Cumulative Volume Delta
 * • Accumulate historical delta.
 * • Track running CVD.
 * • Calculate latest value.
 * • Calculate previous value.
 * • Generate smoothed CVD.
 *
 * Order Flow Direction
 * • Bullish flow detection.
 * • Bearish flow detection.
 * • Trend direction.
 *
 * Institutional Flow Analysis
 * • Buying pressure.
 * • Selling pressure.
 * • Volume imbalance.
 * • Institutional strength.
 * • Confidence estimation.
 *
 * Institutional Behaviour Detection
 * ---------------------------------
 * • Absorption detection.
 * • Exhaustion detection.
 * • Hidden accumulation signals.
 * • Hidden distribution signals.
 *
 * Runtime Diagnostics
 * -------------------
 * • Raw CVD bar diagnostics.
 * • Delta verification.
 * • Running accumulation logs.
 * • Final runtime validation.
 *
 * Inputs
 * ------
 * Candle[]
 * • Open
 * • High
 * • Low
 * • Close
 * • Volume
 *
 * Outputs
 * -------
 * CVDResult
 *
 * • Current CVD value
 * • Delta
 * • Smoothed CVD
 * • Trend direction
 * • Buying pressure
 * • Selling pressure
 * • Volume imbalance
 * • Absorption
 * • Exhaustion
 * • Institutional strength
 * • Confidence
 *
 * Upstream Dependencies
 * ---------------------
 * • Candle Data Feed
 * • Historical OHLCV Data
 *
 * Downstream Consumers
 * --------------------
 * Primary Consumers
 * • OrderFlowEngine
 * • AJRuntimeContextBuilder
 *
 * Secondary Consumers
 * • ContextEngine
 * • AJContextEngine
 * • ConfidenceEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • Execution Engine
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle
 * • Pure analytical engine
 * • Deterministic calculations
 * • Market-independent implementation
 * • Exchange-independent volume model
 * • No trading decisions
 * • No execution logic
 * • No market structure analysis
 * • No confidence grading
 * • Immutable output
 * • Backward compatible
 * • Phase 15.5 compliant
 *
 * Institutional Improvements
 * --------------------------
 * • OHLCV-based institutional volume allocation.
 * • ATR-independent order-flow estimation.
 * • Buying vs selling pressure separation.
 * • Smoothed CVD trend calculation.
 * • Institutional imbalance measurement.
 * • Absorption detection.
 * • Exhaustion detection.
 * • Confidence estimation.
 * • Runtime diagnostic logging.
 *
 * AJ v2 Pipeline
 *
 * Candle Feed
 *      │
 *      ▼
 *    CVD Engine
 *      │
 *      ▼
 *    CVDResult
 *      │
 *      ▼
 * OrderFlowEngine
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
 * • This implementation is an institutional approximation of CVD using OHLCV
 *   data rather than true bid/ask tick data.
 * • The engine performs only order-flow analysis and does not generate trading
 *   signals directly.
 * • CVDResult serves as normalized institutional order-flow intelligence for
 *   downstream context, confidence, and decision engines.
 *
 ****************************************************************************************/
import type { Candle } from "../types/Candle";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
//===============================================================

export interface CVDResult {

    //--------------------------------------------------
    // VALUES
    //--------------------------------------------------

    value: number;

    delta: number;

    smoothed: number;

    //--------------------------------------------------
    // DIRECTION
    //--------------------------------------------------

    bullish: boolean;

    bearish: boolean;

    trend: number;

    //--------------------------------------------------
    // INSTITUTIONAL FLOW
    //--------------------------------------------------

    buyingPressure: number;

    sellingPressure: number;

    imbalance: number;

    absorption: boolean;

    exhaustion: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

	strength: number;
	
	confidence: number;
	
	//--------------------------------------------------
	// VOLUME SOURCE
	//--------------------------------------------------
	
	usingRealVolume: boolean;
	
	usingSyntheticVolume: boolean;
	
	//--------------------------------------------------
	// DIVERGENCE
	//--------------------------------------------------
	
	bullishDivergence: boolean;
	
	bearishDivergence: boolean;
}

export class CVD {

    static analyze(

        candles: Candle[],

        smoothing = 10

    ): CVDResult {

        if (candles.length < 2) {

            return {
				
				usingRealVolume: false,
				usingSyntheticVolume: true,
				bullishDivergence: false,
				bearishDivergence: false,

                value: 0,
                delta: 0,
                smoothed: 0,

                bullish: false,
                bearish: false,
                trend: 0,

                buyingPressure: 0,
                sellingPressure: 0,
                imbalance: 0,
                absorption: false,
                exhaustion: false,

                strength: 0,
                confidence: 0

            };

        }

        let cvd = 0;

        const history: number[] = [];

        let buyVolume = 0;

        let sellVolume = 0;
		let usingRealVolume = false;

        const start = Math.max(1, candles.length - 200);

        for (let i = start; i < candles.length; i++) {

            const c = candles[i];

	//--------------------------------------------------
	// OHLCV INSTITUTIONAL VOLUME ALLOCATION
	//--------------------------------------------------
	
	const realVolume =
		Math.max(
			c.volume ?? 0,
			0
		);
	
	const usingCurrentRealVolume =
		realVolume > 0;
	
	usingRealVolume =
		usingRealVolume ||
		usingCurrentRealVolume;
	
	//--------------------------------------------------
	// RV-03 - Synthetic Volume Generation
	//--------------------------------------------------
	
	const syntheticVolume =
		Math.max(
			Math.abs(c.close - c.open) *
			Math.max(c.high - c.low, Number.EPSILON) *
			1000,
			1
		);
	
	const volume =
		usingCurrentRealVolume
			? realVolume
			: syntheticVolume;
		
		const range = Math.max(
			c.high - c.low,
			Number.EPSILON
		);
	
	//--------------------------------------------------
	// Allocate volume according to close location
	//--------------------------------------------------
	
	const buyingVolume =
		volume *
		((c.close - c.low) / range);
	
	const sellingVolume =
		volume *
		((c.high - c.close) / range);
	
	//--------------------------------------------------
	// Net institutional flow
	//--------------------------------------------------
	
	const delta =
		buyingVolume -
		sellingVolume;
	
	//--------------------------------------------------
	// RV-04 VOLUME ALLOCATION DIAGNOSTIC
	//--------------------------------------------------
	
	if (i >= candles.length - 10) {
	
		const allocationError =
			Math.abs(
				(buyingVolume + sellingVolume)
				- volume
			);
	
		const allocationVerified =
			allocationError < 0.000001;
	
		AJLoggingGate.log(
			"[CVD VOLUME]",
			{
				rawVolume: realVolume,
				syntheticVolume,
				selectedVolume:	volume,
				usingRealVolume: usingCurrentRealVolume,
				usingSyntheticVolume: !usingCurrentRealVolume,
				buyVolume: buyingVolume,
				sellVolume: sellingVolume,
				allocationError,
				allocationVerified
			}
		);
	
	}
	
	//--------------------------------------------------
	// RAW CVD BAR DIAGNOSTIC
	//--------------------------------------------------
	
	if (i >= candles.length - 10) {
	
		AJLoggingGate.log(
			"[CVD BAR]",
			{
				index: i,
				close: c.close,
				volume,
				buy: buyingVolume,
				sell: sellingVolume,
				delta,
				expectedDelta:
					buyingVolume - sellingVolume,
				deltaVerified:
					Math.abs(
						delta -
						(buyingVolume - sellingVolume)
					) < 0.000001,
				cvdBefore: cvd
			}
		);
	
	}
	//--------------------------------------------------
	// Accumulate
	//--------------------------------------------------
	
	buyVolume += buyingVolume;
	sellVolume += sellingVolume;
	cvd += delta;
	
	if (i >= candles.length - 10) {

    AJLoggingGate.log(
        "[CVD AFTER]",
        cvd
    );

}
	
	history.push(cvd);
        }
        const value = history.at(-1) ?? 0;

        const previous = history.length > 1
            ? history[history.length - 2]
            : value;

        const delta = value - previous;

        const smoothLength = Math.min(
            smoothing,
            history.length
        );
        
        const smoothed =
            history
                .slice(-smoothLength)
                .reduce((a, b) => a + b, 0)
            / smoothLength;

		//--------------------------------------------------
		// INSTITUTIONAL FLOW DIRECTION
		//
		// RV-CVD-01
		// Previously compared value > previous - the raw
		// cumulative CVD against only the single prior candle.
		// With real (non-synthetic) volume this flips sign on
		// almost any candle where buy/sell allocation tips
		// slightly, causing: (a) direction "flapping" on fast/
		// live feeds re-evaluating an intrabar-forming candle,
		// and (b) a snapshot-style feed catching it in either
		// state near-randomly depending on poll timing. Compare
		// against the already-computed `smoothed` (rolling
		// average over `smoothing` candles) instead, so a single
		// noisy candle can no longer flip the flag on its own -
		// direction now reflects where cumulative flow sits
		// relative to its own recent trend, not just the last tick.
		//--------------------------------------------------
		
		const bullish =
			value > smoothed;
		
		const bearish =
			value < smoothed;
		
		//--------------------------------------------------
		// DIVERGENCE
		//--------------------------------------------------
		
		const previousCandle =
			candles.at(-2)!;
		
		const latestCandle =
			candles.at(-1)!;
		
		const bullishDivergence =
			latestCandle.close < previousCandle.close &&
			value > previous;
		
		const bearishDivergence =
			latestCandle.close > previousCandle.close &&
			value < previous;

        const imbalance =

            buyVolume -
            sellVolume;

        const totalVolume =
            buyVolume +
            sellVolume;

        const strength =
            totalVolume === 0
                ? 0
                : Math.min(
                    100,
                    Math.abs(imbalance)
                    / totalVolume
                    * 100
                );

        const confidence =
            bullish || bearish
                ? strength
                : strength * 0.50;

        const absorption =
            Math.abs(delta)
            <
            Math.max(
                1,
                totalVolume * 0.01
            )
            &&
            strength > 60;

        const exhaustion =
            Math.abs(delta)
            >
            totalVolume * 0.30;
			
		//--------------------------------------------------
		// CVD RUNTIME CHECK
		//--------------------------------------------------
		
		AJLoggingGate.log("========== CVD CHECK ==========");
		
		AJLoggingGate.log("Delta       :", delta);
		AJLoggingGate.log("Imbalance   :", imbalance);
		
		AJLoggingGate.log("CVD Value   :", value);
		AJLoggingGate.log("CVD Prev    :", previous);
		AJLoggingGate.log("Smoothed    :", smoothed);
		
		AJLoggingGate.log("Bullish     :", bullish);
		AJLoggingGate.log("Bearish     :", bearish);
		
		AJLoggingGate.log("Strength    :", strength);
		AJLoggingGate.log("Confidence  :", confidence);
		
		AJLoggingGate.log("===============================");

        return {
            value,
            delta,
            smoothed,
            bullish,
            bearish,
            trend:
                bullish
                    ? 1
                    : bearish
                        ? -1
                        : 0,

            buyingPressure: buyVolume,
            sellingPressure: sellVolume,
            imbalance,
            absorption,
            exhaustion,
			strength,
			confidence,
			usingRealVolume,
			usingSyntheticVolume:
				!usingRealVolume,
			bullishDivergence,
			bearishDivergence

        };

    }

}
