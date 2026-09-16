/****************************************************************************************
 * File:
 * \src\indicators\AJIndicator\AJRuntimeContextBuilder.ts
 *
 * Purpose:
 * Builds the AJRuntimeContext from raw market data only.
 * This builder is responsible for collecting and normalizing indicator outputs
 * before they are consumed by the AJ v2 engine pipeline.
 *
 * Responsibilities:
 * - Calculate raw indicator values
 * - Assemble runtime context
 * - Populate neutral/default values for future engines
 * - Never perform trading decisions or confidence calculations
 *
 * AJ v2 Pipeline:
 *
 * Raw Market Data
 *      │
 *      ▼
 * AJRuntimeContextBuilder
 *      │
 *      ▼
 * MarketState
 *      │
 *      ▼
 * OrderFlow
 *      │
 *      ▼
 * MarketStructure
 *      │
 *      ▼
 * Liquidity
 *      │
 *      ▼
 * OrderBlock
 *      │
 *      ▼
 * Trend
 *      │
 *      ▼
 * PriceAction
 *      │
 *      ▼
 * Momentum
 *      │
 *      ▼
 * Volatility
 *      │
 *      ▼
 * MultiTimeframe
 *      │
 *      ▼
 * RiskQualification
 *      │
 *      ▼
 * Confidence
 *      │
 *      ▼
 * TradeAuthority
 *      │
 *      ▼
 * Execution
 *
 * IMPORTANT
 * ----------
 * This class MUST remain calculation-light.
 * It prepares runtime inputs only.
 * Trading intelligence belongs inside individual engines.
 ****************************************************************************************/

import type { RuntimeContext } from "../../runtime/RuntimeContext";
import type { AJRuntimeContext } from "./AJRuntimeContext";

import { RuntimeParameters } from "../../runtime/config/RuntimeParameters";

// AI evaluation moved to AIConfidenceEngine.
import { AJPipelineTrace } from "./debug/AJPipelineTrace";

import { EMA } from "../EMA";
import { VWAP } from "../VWAP";
import { ATR } from "../ATR";
import { RSI } from "../RSI";
import { ADX } from "../ADX/ADX";
import { CVD } from "../CVD";
import { InsideBar } from "../InsideBar";
import { BOS } from "../BOS";
import { CHOCH } from "../CHOCH";
import { FVG } from "../FVG";
import { LiquiditySweep } from "../LiquiditySweep";
import { OrderBlockEngine } from "./engines/OrderBlock/OrderBlockEngine";
import { AJLoggingGate } from "./debug/AJLoggingGate";
import {
    SmartTradeSyncEngine
} from "../../runtime/sync/SmartTradeSyncEngine";
//==============================================================
// AJ Runtime Context Builder
//==============================================================

export class AJRuntimeContextBuilder {

	//----------------------------------------------------------
	// ZONE MEMORY
	//
	// Persists institutional zones across ticks, per symbol.
	// See RV-23 in build() for why this exists.
	//----------------------------------------------------------

	private static zoneCache =
		new Map<
			string,
			{
				demandZones: any[];
				supplyZones: any[];
				fvgZones: any[];
				liquidityZones: any[];
				orderBlockZones: any[];
			}
		>();

	//----------------------------------------------------------
	// Legacy alias
	//----------------------------------------------------------
	
	// Legacy normalizeScore removed.
	// Use normalize() directly.
	
	//==========================================================
	// SLOPE
	//==========================================================
	
	private static calculateSlope(
	
		values: number[]
	
	): number {
	
		if (values.length < 2) {
	
			return 0;
	
		}
	
		return (
	
			values.at(-1)!
	
			-
	
			values.at(-2)!
	
		);
	
	}
	
	//==========================================================
	// MARKET STATE HELPERS
	//==========================================================
	
	private static classifyMarketState(
	
		adx: number,
	
		rsi: number,
	
		atr: number,
	
		emaBull: boolean,
	
		emaBear: boolean
	
	): AJRuntimeContext["marketState"] {
	
		const bullish =
			emaBull;
	
		const bearish =
			emaBear;
	
		const ranging =
			adx < 20;
	
		const expanding =
			atr > 0 && adx >= 25;
	
		const compressing =
			atr <= 0;
	
		const accumulation =
			ranging && rsi > 50;
	
		const distribution =
			ranging && rsi < 50;
	
		let regime = "RANGE";
		let trend = "NEUTRAL";
		let phase = "BALANCE";
		let volatilityState = "NORMAL";
	
		if (bullish) {
			regime = "TREND";
			trend = "BULLISH";
		} else if (bearish) {
			regime = "TREND";
			trend = "BEARISH";
		}
	
		if (expanding) {
			phase = "EXPANSION";
			volatilityState = "EXPANDING";
		}
	
		if (compressing) {
			phase = "COMPRESSION";
			volatilityState = "COMPRESSING";
		}
	
		return {
	
			regime,
	
			trend,
	
			phase,
	
			bullish,
	
			bearish,
	
			ranging,
	
			expanding,
	
			compressing,
	
			accumulation,
	
			distribution,
	
			volatilityState
	
		};
	
	}
	
	//----------------------------------------------------------
	// Legacy compatibility helpers removed.
	//
	// Confidence, execution scoring and institutional
	// calculations are now owned by downstream AJ v2 engines.
	//----------------------------------------------------------
	
	//==========================================================
	// INDICATOR CACHE
	//==========================================================

	private static buildIndicatorCache(
	
		candles: RuntimeContext["candles"]
	
	) {
	
		const closes =
	
			candles.map(
	
				candle => candle.close
	
			);
	
		return {
	
			emaFast:
	
				EMA.calculate(
	
					closes,
	
					9
	
				),
	
			emaSlow:
	
				EMA.calculate(
	
					closes,
	
					21
	
				),
	
			vwap:
	
				VWAP.calculate(
	
					candles
	
				),
	
			atr:
	
				ATR.calculate(
	
					candles,
	
					14
	
				),
	
			rsi:
	
				RSI.calculate(
	
					closes,
	
					14
	
				),
	
			adx:
	
				ADX.calculate(
	
					candles
	
				)
	
		};
	
	}
	
	//==========================================================
	// BUILD CONTEXT
	//==========================================================
	
	static build(
	
		runtime: RuntimeContext
	
	): AJRuntimeContext {
	
		//------------------------------------------------------
		// PIPELINE INITIALIZATION
		//------------------------------------------------------
	
		const candles =
			runtime.candles;
	
		const current =
			runtime.current;
	
		const previous =
			runtime.previous;
	
		//------------------------------------------------------
		// RUNTIME CONFIGURATION
		//------------------------------------------------------
	
		const runtimeConfig =
			RuntimeParameters.forChart(
				runtime.chartId
			);
	
		const runtimeSymbol =
			(runtime.symbol ?? "")
				.toUpperCase();
	
		//------------------------------------------------------
		// PIPELINE TRACE
		//------------------------------------------------------
	
		AJPipelineTrace.begin(
	
			runtime.symbol,
	
			{
				symbol:	runtime.symbol,
				timeframe:	runtime.timeframe,
				chartId: runtime.symbol,
				barIndex: runtime.barIndex,
				timestamp: runtime.timestamp,
				tradeMode: runtimeConfig.tradeEngineMode
			}
	
		);
	
		//------------------------------------------------------
		// ASSET CLASSIFICATION
		//------------------------------------------------------
	
		const isBTCSymbol =
	
			runtimeSymbol.includes("BTCUSDT") ||
			runtimeSymbol.includes("BTCUSD") ||
			runtimeSymbol.includes("XBTUSD") ||
			runtimeSymbol.startsWith("BTC");
	
		//------------------------------------------------------
		// INDICATOR CACHE
		//------------------------------------------------------
	
		const cache =
			this.buildIndicatorCache(
				candles
			);
	
		//------------------------------------------------------
		// CORE INDICATORS
		//------------------------------------------------------
	
		const emaFast =
			cache.emaFast.at(-1)
			??
			runtime.close;
	
		const emaSlow =
			cache.emaSlow.at(-1)
			??
			runtime.close;
	
		const vwap =
			cache.vwap.at(-1)
			??
			runtime.close;
	
		const atr =
			cache.atr.at(-1)
			??
			0;
	
		const rsi =
			cache.rsi.at(-1)
			??
			50;
	
		const adx =
			cache.adx.at(-1)
			??
			0;
	
		//------------------------------------------------------
		// EMA SLOPES
		//------------------------------------------------------
	
		const ema20Slope =
			this.calculateSlope(
				cache.emaFast
			);
	
		const ema50Slope =
			this.calculateSlope(
				cache.emaSlow
			);
	
		const ema200Slope = 0;
	
		//------------------------------------------------------
		// TREND
		//------------------------------------------------------
	
		const emaBull =
			emaFast >
			emaSlow;
	
		const emaBear =
			emaFast < emaSlow;
		
		void emaBear;
	
		const vwapBull =
			current.close >
			vwap;
	
		const vwapBear =
			current.close <
			vwap;
	
		const rsiBull =
			rsi >= 60;
	
		const rsiBear =
			rsi <= 40;
	
		const adxTrend =
			adx >=
			runtimeConfig.adxTrendThreshold;
	
		//------------------------------------------------------
		// RAW ENGINE OUTPUTS
		// (No decision logic here)
		//------------------------------------------------------
	
		const cvd =
			CVD.analyze(
				candles
			);
	
		const insideBar =
			InsideBar.analyze(
				candles
			);
	
		const bos =
			BOS.analyze(
				candles
			);
	
		const choch =
			CHOCH.analyze(
				candles
			);
	
		const fvg =
			FVG.analyze(
				candles
			);
	
		const liquidity =
			LiquiditySweep.analyze(
				candles
			);
	
		const orderBlockResult =
			OrderBlockEngine.evaluate(
				candles
			);
	
		//------------------------------------------------------
		// MARKET STATE
		//------------------------------------------------------
	
		const marketState =

			this.classifyMarketState(
				adx,
				rsi,
				atr,
				emaBull,
				emaBear
			);
	
		//------------------------------------------------------
		// RAW MARKET STRUCTURE
		//------------------------------------------------------
	
		const bullishStructure =
			bos.bullish &&
			!choch.bearish;
	
		const bearishStructure =
			bos.bearish &&
			!choch.bullish;
	
		//------------------------------------------------------
		// MULTI-TIMEFRAME
		// (Placeholder until MTF Engine)
		//------------------------------------------------------
	
		void previous;
		const mtfAlignment = 50;
		void mtfAlignment;
	
		//------------------------------------------------------
		// DECISION ENGINE PLACEHOLDERS
		//------------------------------------------------------
		//
		// Confidence, institutional scoring,
		// execution readiness and market regime
		// are now produced by downstream AJ v2
		// decision engines.
		//
		// RuntimeContextBuilder exposes only
		// normalized runtime evidence.
	
		//------------------------------------------------------
		// AI INPUTS
		// Runtime exposes evidence only.
		// Decision making remains downstream.
		//
		// Until the dedicated AI Trend Engine is connected,
		// expose normalized directional evidence instead of
		// hard-coded false placeholders.
		//------------------------------------------------------
		
		const aiTrendLong =
			emaBull &&
			bos.bullish;
		
		const aiTrendShort =
			emaBear &&
			bos.bearish;
	
		const aiBullDisplacement =
			bos.bullish ||
			choch.bullish;
	
		const aiBearDisplacement =
			bos.bearish ||
			choch.bearish;
	
		const aiSweepThenLong =
			liquidity.sweepLow;
	
		const aiSweepThenShort =
			liquidity.sweepHigh;
	
		const aiBreakFollowLong =
			bos.bullish;
	
		const aiBreakFollowShort =
			bos.bearish;
	
		const aiInstitutionalLong = false;
	
		const aiInstitutionalShort = false;
	
		//------------------------------------------------------
		// CONFIDENCE PLACEHOLDERS
		// ConfidenceEngine owns these in Phase 2.
		//------------------------------------------------------
	
		const confidenceLong = 0;
	
		const confidenceShort = 0;
	
		//------------------------------------------------------
		// Backward compatibility
		//------------------------------------------------------
	
		const scoreLong = confidenceLong;
		void scoreLong;
	
		const scoreShort = confidenceShort;
		void scoreShort;
	
		//------------------------------------------------------
		// Direction placeholder
		//------------------------------------------------------
	
		const confidenceDirection = 0;
	
		void confidenceDirection;
	
		//------------------------------------------------------
		// AI PLACEHOLDERS
		//------------------------------------------------------
		//
		// AI evaluation has moved to the
		// downstream AIConfidenceEngine.
		//
		// RuntimeContextBuilder only exposes
		// raw market evidence.
	
		//------------------------------------------------------
		// ROUTING PLACEHOLDER
		//------------------------------------------------------
	
		void 0;
	
		//------------------------------------------------------
		// INSTITUTIONAL PLACEHOLDERS
		//------------------------------------------------------
	
		const institutionalLongScore = 0;
	
		const institutionalShortScore = 0;
	
		void 0;
	
		//------------------------------------------------------
		// FINAL DIRECTION
		// ------------------------------------------------------
		// RuntimeContextBuilder does not determine trade direction.
		//
		// This class exposes normalized market evidence only.
		//
		// tradeDirectionFinal is reserved for the Direction /
		// Trade Authority stage and is intentionally initialized
		// to NEUTRAL until that stage supplies a directional
		// decision.
		//
		// Downstream consumers must treat 0 as
		// "direction unavailable", not "sideways market".
		//------------------------------------------------------
		
		const tradeDirectionFinal = 0;
		
		//------------------------------------------------------
		// RV-07B TRADE DIRECTION TRACE (Temporary)
		//------------------------------------------------------
		
		AJLoggingGate.group("[RV-07B TRADE DIRECTION TRACE]");
		
		AJLoggingGate.log("Symbol:", runtime.symbol);
		AJLoggingGate.log("Timeframe:", runtime.timeframe);
		
		AJLoggingGate.log("tradeDirectionFinal:", tradeDirectionFinal);
		
		AJLoggingGate.table({
			directionEvidence: {
				emaBull,
				emaBear,
		
				bosBull: bos.bullish,
				bosBear: bos.bearish,
		
				chochBull: choch.bullish,
				chochBear: choch.bearish,
		
				cvdBull: cvd.bullish,
				cvdBear: cvd.bearish,
		
				aiTrendLong,
				aiTrendShort
			}
		});
		
		AJLoggingGate.log(
			"Direction Status:",
			tradeDirectionFinal === 0
				? "NOT DERIVED"
				: tradeDirectionFinal === 1
					? "LONG"
					: "SHORT"
		);
		
		AJLoggingGate.groupEnd();
	
		//------------------------------------------------------
		// SMC ZONES
		//
		// RV-23
		// Previously rebuilt from scratch every tick with at most
		// one entry, only when bos.bullish/liquidity.sweepLow etc.
		// were true on that exact candle. Since build() runs fresh
		// each update (not incrementally), a zone existed for ~1
		// tick before the array was emptied again â€” effectively
		// never visible on chart. Replaced with a persistent
		// per-symbol cache: new zones are appended, old ones are
		// pruned when price closes through them (mitigation) or
		// after MAX_ZONE_AGE_BARS with no mitigation (expiry).
		// MAX_ZONES_PER_TYPE caps unbounded growth.
		//------------------------------------------------------

		const cachedZones =
			AJRuntimeContextBuilder.zoneCache.get(
				runtime.symbol
			)
			??
			{
				demandZones: [],
				supplyZones: [],
				fvgZones: [],
				liquidityZones: [],
				orderBlockZones: []
			};

		const MAX_ZONE_AGE_BARS = 50;

		// RV-30
		// Was 10 â€” stacking up to 10 overlapping historical zones per
		// type (worse after the RV-29 backfill scanned 100 candles)
		// produced the cluttered stacked-band look. Pine's version
		// only ever shows the single latest BUYER/SELLER zone. Match
		// that: keep just the most recent zone per type.
		const MAX_ZONES_PER_TYPE = 1;

		//--------------------------------------------------
		// BACKFILL FROM EXISTING HISTORY
		//
		// RV-29
		// Zones were only ever created from the live/newest candle
		// going forward, so a fresh page load or refresh started
		// with zero zones and no way to see structure that already
		// existed in the loaded history. Backfill once per symbol,
		// scanning the last 100 candles for BOS/FVG/sweep patterns
		// that already happened, so zones appear immediately instead
		// of only after new live patterns occur post-load.
		//--------------------------------------------------

		const isFirstBuildForSymbol =
			cachedZones.demandZones.length === 0 &&
			cachedZones.supplyZones.length === 0 &&
			cachedZones.fvgZones.length === 0 &&
			cachedZones.liquidityZones.length === 0 &&
			cachedZones.orderBlockZones.length === 0;

		if (isFirstBuildForSymbol && candles.length > 20) {

			const backfillStart =
				Math.max(0, candles.length - 100);

			for (let i = backfillStart + 3; i < candles.length; i++) {

				const slice =
					candles.slice(0, i + 1);

				const hBos = BOS.analyze(slice);
				const hFvg = FVG.analyze(slice);
				const hLiq = LiquiditySweep.analyze(slice);
				const hOb = OrderBlockEngine.evaluate(slice);
const hCandle = slice[slice.length - 1];

const hObCandle =
    slice[
        Math.max(
            0,
            hOb.createdBarIndex ??
                slice.length - 2
        )
    ] ?? hCandle;

				if (hBos.bullish || hLiq.sweepLow) {
					cachedZones.demandZones.push({
						id: `demand-${runtime.symbol}-${i}-backfill`,
						type: "demand",
						from: hCandle.time,
						to: current.time,
						high: hCandle.high,
						low: hCandle.low,
						color: "rgba(0, 255, 136, 0.15)",
						borderColor: "rgba(0, 255, 136, 0.6)",
						opacity: 0.15,
						label: "BUYER Zone",
						strength: hLiq.strength,
						barIndex: i
					});
				}

				if (hBos.bearish || hLiq.sweepHigh) {
					cachedZones.supplyZones.push({
						id: `supply-${runtime.symbol}-${i}-backfill`,
						type: "supply",
						from: hCandle.time,
						to: current.time,
						high: hCandle.high,
						low: hCandle.low,
						color: "rgba(255, 51, 51, 0.15)",
						borderColor: "rgba(255, 51, 51, 0.6)",
						opacity: 0.15,
						label: "SELLER Zone",
						strength: hLiq.strength,
						barIndex: i
					});
				}

				if (hFvg.bullish || hFvg.bearish) {
					cachedZones.fvgZones.push({
						id: `fvg-${runtime.symbol}-${i}-backfill`,
						type: "fvg",
						from: hCandle.time,
						to: current.time,
						high: hFvg.upper,
						low: hFvg.lower,
						color: hFvg.bullish ? "rgba(0, 191, 255, 0.15)" : "rgba(255, 170, 0, 0.15)",
						borderColor: hFvg.bullish ? "rgba(0, 191, 255, 0.6)" : "rgba(255, 170, 0, 0.6)",
						opacity: 0.15,
						label: "FVG",
						bullish: hFvg.bullish,
						barIndex: i
					});
				}

				if (hLiq.stopHuntDetected) {
					cachedZones.liquidityZones.push({
						id: `liquidity-${runtime.symbol}-${i}-backfill`,
						type: "liquidity",
						from: hCandle.time,
						to: current.time,
						high: hCandle.high,
						low: hCandle.low,
						color: "rgba(255, 215, 0, 0.15)",
						borderColor: "rgba(255, 215, 0, 0.6)",
						opacity: 0.15,
						label: "LIQUIDITY",
						strength: hLiq.strength,
						barIndex: i
					});
				}

				if (
						(hOb.bullishOrderBlock || hOb.bearishOrderBlock) &&
						hOb.blockHigh > hOb.blockLow &&
						hOb.blockLow > 0
				) {
						cachedZones.orderBlockZones = [{
								id: `orderblock-${runtime.symbol}-${i}-${hOb.bullishOrderBlock ? "bull" : "bear"}`,
								type: hOb.bullishOrderBlock
										? "demand"
										: "supply",
								from: hObCandle.time,
								to: current.time,
								
								high: hObCandle.high,
								low: hObCandle.low,
								color: hOb.bullishOrderBlock
										? "rgba(138, 43, 226, 0.15)"
										: "rgba(255, 105, 180, 0.15)",
								borderColor: hOb.bullishOrderBlock
										? "rgba(138, 43, 226, 0.7)"
										: "rgba(255, 105, 180, 0.7)",
								opacity: 0.15,
								label: hOb.bullishOrderBlock
										? "Bullish OB"
										: "Bearish OB",
								barIndex: i
						}];
				}
			}

			cachedZones.orderBlockZones = cachedZones.orderBlockZones.slice(-1);
			cachedZones.demandZones = cachedZones.demandZones.slice(-MAX_ZONES_PER_TYPE);
			cachedZones.supplyZones = cachedZones.supplyZones.slice(-MAX_ZONES_PER_TYPE);
			cachedZones.fvgZones = cachedZones.fvgZones.slice(-MAX_ZONES_PER_TYPE);
			cachedZones.liquidityZones = cachedZones.liquidityZones.slice(-MAX_ZONES_PER_TYPE);
		}

		//--------------------------------------------------
		// APPEND NEW ZONES THIS TICK
		//
		// RV-25
		//
		// RV-25
		// Zones previously used startTime/endTime/type:"DEMAND"
		// (uppercase) with no id/color â€” InstitutionalZonePrimitive
		// requires id, from, to (not startTime/endTime), color, and
		// a lowercase type ("demand"/"supply"/"fvg"/"liquidity").
		// Every field below now matches that contract exactly.
		//--------------------------------------------------

		// RV-26
		// current.time + 100 is a future timestamp with no
		// corresponding candle on the chart's time scale.
		// lightweight-charts' timeToCoordinate() returns null for
		// times outside the plotted series, which silently aborted
		// every zone's draw() call. Using current.time itself keeps
		// both endpoints inside the actual plotted range.
		const zoneEndTime =
			current.time;

		if (
    bos.bullish ||
    liquidity.sweepLow
) {
    const buyerCandle =
        candles[
            Math.max(
                0,
                runtime.barIndex - 1
            )
        ] ?? current;

    cachedZones.demandZones.push({
        id:
            `demand-${runtime.symbol}-${runtime.barIndex}`,

        type:
            "demand",

        from:
            buyerCandle.time,

        to:
            current.time,

        high:
            buyerCandle.high,

        low:
            buyerCandle.low,

        color:
            "rgba(0, 255, 136, 0.18)",

        borderColor:
            "rgba(0, 255, 136, 0.75)",

        opacity:
            0.18,

        label:
            "BUYER Zone",

        strength:
            liquidity.strength,

        barIndex:
            runtime.barIndex - 1
    });
}

		if (
    bos.bearish ||
    liquidity.sweepHigh
) {
    const sellerCandle =
        candles[
            Math.max(
                0,
                runtime.barIndex - 1
            )
        ] ?? current;

    cachedZones.supplyZones.push({
        id:
            `supply-${runtime.symbol}-${runtime.barIndex}`,

        type:
            "supply",

        from:
            sellerCandle.time,

        to:
            current.time,

        high:
            sellerCandle.high,

        low:
            sellerCandle.low,

        color:
            "rgba(255, 51, 51, 0.18)",

        borderColor:
            "rgba(255, 51, 51, 0.75)",

        opacity:
            0.18,

        label:
            "SELLER Zone",

        strength:
            liquidity.strength,

        barIndex:
            runtime.barIndex - 1
    });
}

		if (
			fvg.bullish ||
			fvg.bearish
		) {
			cachedZones.fvgZones.push({
				id: `fvg-${runtime.symbol}-${runtime.barIndex}`,
				type: "fvg",
				from: current.time,
				to: zoneEndTime,
				high: fvg.upper,
				low: fvg.lower,
				color:
					fvg.bullish
						? "rgba(0, 191, 255, 0.15)"
						: "rgba(255, 170, 0, 0.15)",
				borderColor:
					fvg.bullish
						? "rgba(0, 191, 255, 0.6)"
						: "rgba(255, 170, 0, 0.6)",
				opacity: 0.15,
				label: "FVG",
				bullish: fvg.bullish,
				barIndex: runtime.barIndex
			});
		}

		if (
			liquidity.stopHuntDetected
		) {
			cachedZones.liquidityZones.push({
				id: `liquidity-${runtime.symbol}-${runtime.barIndex}`,
				type: "liquidity",
				from: current.time,
				to: zoneEndTime,
				high: current.high,
				low: current.low,
				color: "rgba(255, 215, 0, 0.15)",
				borderColor: "rgba(255, 215, 0, 0.6)",
				opacity: 0.15,
				label: "LIQUIDITY",
				strength: liquidity.strength,
				barIndex: runtime.barIndex
			});
		}

		if (
			(orderBlockResult.bullishOrderBlock ||
			orderBlockResult.bearishOrderBlock) &&
			Number.isFinite(orderBlockResult.blockHigh) &&
			Number.isFinite(orderBlockResult.blockLow) &&
			orderBlockResult.blockHigh > orderBlockResult.blockLow &&
			orderBlockResult.blockLow > 0
		) {
		const obCandle =
		candles[
		Math.max(
		0,
		(orderBlockResult.createdBarIndex ??
		runtime.barIndex - 2)
		)
		] ?? current;
		
		cachedZones.orderBlockZones = [{
		id:
		`orderblock-${runtime.symbol}-${runtime.barIndex}`,
		
		type:
		orderBlockResult.bullishOrderBlock
		? "demand"
		: "supply",
		
		from:
		obCandle.time,
		
		to:
		current.time,
		
		
		high:
			obCandle.high,
		
		low:
			obCandle.low,
		
		color:
		orderBlockResult.bullishOrderBlock
		? "rgba(138, 43, 226, 0.15)"
		: "rgba(255, 105, 180, 0.15)",
		
		borderColor:
		orderBlockResult.bullishOrderBlock
		? "rgba(138, 43, 226, 0.7)"
		: "rgba(255, 105, 180, 0.7)",
		
		opacity: 0.15,
		
		label:
		orderBlockResult.bullishOrderBlock
		? "Bullish OB"
		: "Bearish OB",
		
		barIndex:
		runtime.barIndex
		}];
		}

		//--------------------------------------------------
		// PRUNE: MITIGATION + AGE EXPIRY
		//--------------------------------------------------

		const notMitigatedOrExpired = (
			zone: any,
			mitigated: boolean
		): boolean =>
			!mitigated &&
			(
				zone.barIndex == null ||
				runtime.barIndex - zone.barIndex <=
					MAX_ZONE_AGE_BARS
			);
		
		cachedZones.demandZones =
			cachedZones.demandZones
				.filter((z: any) => {
					const mitigated =
						current.low <= z.low;
		
					return notMitigatedOrExpired(
						z,
						mitigated
					);
				})
				.slice(-MAX_ZONES_PER_TYPE);
		
		cachedZones.supplyZones =
			cachedZones.supplyZones
				.filter((z: any) => {
					const mitigated =
						current.high >= z.high;
		
					return notMitigatedOrExpired(
						z,
						mitigated
					);
				})
				.slice(-MAX_ZONES_PER_TYPE);
		
		cachedZones.fvgZones =
			cachedZones.fvgZones
				.filter((z: any) =>
					notMitigatedOrExpired(
						z,
						z.bullish
							? current.low <= z.low
							: current.high >= z.high
					)
				)
				.slice(-MAX_ZONES_PER_TYPE);
		
		cachedZones.liquidityZones =
			cachedZones.liquidityZones
				.filter((z: any) =>
					notMitigatedOrExpired(
						z,
						false
					)
				)
				.slice(-MAX_ZONES_PER_TYPE);
		
		cachedZones.orderBlockZones =
			cachedZones.orderBlockZones
				.filter((z: any) => {
		
					const mitigated =
						z.type === "demand"
							? current.close < z.low
							: z.type === "supply"
								? current.close > z.high
								: false;
		
					const expired =
						z.barIndex != null &&
						runtime.barIndex - z.barIndex >
							MAX_ZONE_AGE_BARS;
		
					return !mitigated && !expired;
				})
				.slice(-1);
		
		//==========================================================
		// RV-27
		// RV-26 fixed timeToCoordinate() returning null for
		// unresolvable future timestamps by setting `to` equal to
		// `from` â€” but that made from === to on every zone, i.e.
		// zero width, invisible. Fix: extend every still-active
		// zone's `to` to the current bar on every tick, so the
		// rectangle visually stretches from its origin candle to
		// the latest candle (standard SMC zone rendering) and both
		// endpoints always resolve to real plotted bar times.
		
		const extendToCurrent = (zone: any) => ({
			...zone,
			to: current.time
		});

		cachedZones.demandZones =
			cachedZones.demandZones.map(extendToCurrent);

		cachedZones.supplyZones =
			cachedZones.supplyZones.map(extendToCurrent);

		cachedZones.fvgZones =
			cachedZones.fvgZones.map(extendToCurrent);

		cachedZones.liquidityZones =
			cachedZones.liquidityZones.map(extendToCurrent);

		cachedZones.orderBlockZones =
			cachedZones.orderBlockZones.map(extendToCurrent);

		AJRuntimeContextBuilder.zoneCache.set(
			runtime.symbol,
			cachedZones
		);

		const demandZones = cachedZones.demandZones;
		const supplyZones = cachedZones.supplyZones;
		const fvgZones = cachedZones.fvgZones;
		const liquidityZones = cachedZones.liquidityZones;
		const orderBlockZones = cachedZones.orderBlockZones;

		//--------------------------------------------------
		// RV-24 ZONE CACHE TRACE (Temporary)
		//--------------------------------------------------

		AJLoggingGate.group(`[RV-24 ZONE CACHE] ${runtime.symbol}`);

		AJLoggingGate.table({
			rawSignals: {
				bosBullish: bos.bullish,
				bosBearish: bos.bearish,
				liquiditySweepLow: liquidity.sweepLow,
				liquiditySweepHigh: liquidity.sweepHigh,
				liquidityStopHunt: liquidity.stopHuntDetected,
				fvgBullish: fvg.bullish,
				fvgBearish: fvg.bearish,
				barIndex: runtime.barIndex
			}
		});

		AJLoggingGate.table({
			zoneCounts: {
				demandZones: demandZones.length,
				supplyZones: supplyZones.length,
				fvgZones: fvgZones.length,
				liquidityZones: liquidityZones.length
			}
		});

		if (demandZones.length > 0) {
			AJLoggingGate.log("demandZones[last]:", demandZones[demandZones.length - 1]);
		}
		if (fvgZones.length > 0) {
			AJLoggingGate.log("fvgZones[last]:", fvgZones[fvgZones.length - 1]);
		}

		AJLoggingGate.groupEnd();

		//------------------------------------------------------
		// CONTEXT CONFIDENCE
		//------------------------------------------------------
		//
		// Context confidence is produced by the
		// downstream AIConfidenceEngine.
	
		//------------------------------------------------------
		// RUNTIME SNAPSHOT
		//------------------------------------------------------
		//
		// Reserved for runtime-only metadata.
		// Decision-engine outputs are no longer
		// assembled here.
	
		//------------------------------------------------------
		// PIPELINE TRACE : SCORE
		//------------------------------------------------------
		//
		// Score tracing moved to downstream
		// decision engines.
	
		//------------------------------------------------------
		// SCORE TRACE REMOVED
		//------------------------------------------------------
		//
		// Legacy score tracing removed.
	
		//------------------------------------------------------
		// PIPELINE UPDATE
		//------------------------------------------------------
		//
		// Decision-engine telemetry is now
		// published by downstream engines.
	
		//------------------------------------------------------
		// PIPELINE TRACE : RUNTIME
		//------------------------------------------------------
	
		AJPipelineTrace.stage(
			runtime.symbol,
			"runtime",
			{
				executed: true,
				passed: true,
				message: "Runtime Ready"
			}
		);
	
		//------------------------------------------------------
		// RETURN RUNTIME CONTEXT
		//------------------------------------------------------
	
		const context: AJRuntimeContext = {
	
			//--------------------------------------------------
			// MARKET
			//--------------------------------------------------
	
			symbol: runtime.symbol,
			timeframe: runtime.timeframe,
			datasource: runtime.datasource,
			chartId: runtime.symbol,
			expiry: runtime.expiry ?? "",
			candles,
			current,
			previous,
			barIndex: runtime.barIndex,
			timestamp: runtime.timestamp,
	
			//--------------------------------------------------
			// OHLCV
			//--------------------------------------------------
	
			open: current.open,
			high: current.high,
			low: current.low,
			close: current.close,
			volume: current.volume ?? 0,
	
			//--------------------------------------------------
			// CORE INDICATORS
			//--------------------------------------------------
	
			ema20: emaFast,
			ema50: emaSlow,
			ema200: 0,
			ema20Slope,
			ema50Slope,
			ema200Slope,
			vwap,
			atr,
			rsi,
			adx,
	
			//--------------------------------------------------
			// TREND
			//--------------------------------------------------
	
			emaBull,
			emaBear,
			vwapBull,
			vwapBear,
			vwapAligned: vwapBull || vwapBear,
			rsiBull,
			rsiBear,
			adxTrend,
	
			//--------------------------------------------------
			// MARKET STATE (AJ v2)
			//--------------------------------------------------
	
			marketState,
	
			//--------------------------------------------------
			// ORDER FLOW ENGINE
			//--------------------------------------------------
	
			orderFlow: {
				source:
					(current.volume ?? 0) > 0
						? "REAL"
						: "SYNTHETIC",
			
				confidence:	cvd.confidence,
				buyingPressure:	cvd.buyingPressure,
				sellingPressure: cvd.sellingPressure,
				delta: cvd.delta,
				cumulativeDelta: cvd.value,
				bullish: cvd.bullish,
				bearish: cvd.bearish
			},
	
			//--------------------------------------------------
			// MARKET STRUCTURE
			//--------------------------------------------------
	
			marketStructure: {
			
				trend:
					bullishStructure
						? "BULLISH"
						: bearishStructure
							? "BEARISH"
							: "NEUTRAL",
			
				bullish:
					bullishStructure,
			
				bearish:
					bearishStructure,
			
				strength:
					Math.max(
						bos.confidence,
						choch.confidence
					),
			
				bosConfirmed:
					bos.bullish ||
					bos.bearish,
			
				chochConfirmed:
					choch.bullish ||
					choch.bearish,
			
				internalBos:
					false,
			
				externalBos:
					bos.bullish ||
					bos.bearish,
			
				//--------------------------------------------------
				// AJ v2 compatibility
				//--------------------------------------------------
			
				breakoutConfirmed:
					(bos.bullish || bos.bearish) &&
					(choch.bullish || choch.bearish),
			
				bosDirection:
					bos.bullish
						? 1
						: bos.bearish
							? -1
							: 0,
			
				chochDirection:
					choch.bullish
						? 1
						: choch.bearish
							? -1
							: 0
			
			},
	
			//--------------------------------------------------
			// CVD
			// Legacy compatibility
			//--------------------------------------------------
	
			cvdValue: cvd.value,
			cvdDelta: cvd.delta,
			cvdBull: cvd.bullish,
			cvdBear: cvd.bearish,
			cvdStrength: cvd.strength,
	
			//--------------------------------------------------
			// INSIDE BAR
			//--------------------------------------------------
	
			insideBar: insideBar.detected,
			motherHigh: insideBar.motherHigh,
			motherLow: insideBar.motherLow,
			insideBarBreakoutLong: insideBar.breakoutLong,
			insideBarBreakoutShort: insideBar.breakoutShort,
	
			//--------------------------------------------------
			// BOS
			//--------------------------------------------------
	
			bosBull: bos.bullish,
			bosBear: bos.bearish,
			bosStrength: bos.confidence,
	
			//--------------------------------------------------
			// CHOCH
			//--------------------------------------------------
	
			chochBull: choch.bullish,
			chochBear: choch.bearish,
			chochStrength: choch.confidence,
	
			//--------------------------------------------------
			// FVG
			//--------------------------------------------------
	
			fvgBull: fvg.bullish,
			fvgBear: fvg.bearish,
			fvgUpper: fvg.upper,
			fvgLower: fvg.lower,
			fvgMitigated: fvg.mitigated,
	
			//--------------------------------------------------
			// LIQUIDITY
			//--------------------------------------------------
	
			liquiditySweepLow: liquidity.sweepLow,
			liquiditySweepHigh: liquidity.sweepHigh,
			stopHuntDetected: liquidity.stopHuntDetected,
			sweepStrength: liquidity.strength,
	
			//--------------------------------------------------
			// SMC ZONES
			//--------------------------------------------------
	
			demandZones,
			supplyZones,
			fvgZones,
			liquidityZones,
			orderBlockZones,
	
			//--------------------------------------------------
			// AI CONTEXT
			//--------------------------------------------------
	
			aiTrendLong,
			aiTrendShort,
			aiBullDisplacement,
			aiBearDisplacement,
			aiSweepThenLong,
			aiSweepThenShort,
			aiBreakFollowLong,
			aiBreakFollowShort,
			aiInstitutionalLong,
			aiInstitutionalShort,
			aiSafeEntry: false,
			aiFastScalp: false,
			aiCorePass: false,
			
			aiScoreLong: 0,
			aiScoreShort: 0,
			
			aiBestScore: 0,
			aiBestDir: 0,
			
			aiMarketQualityOk: false,
			aiWeakBody: false,
			
			aiBestDirection: 0,
			
			aiSmcPass: false,
	
			aiMarketStructureBull:
				bullishStructure,
			aiMarketStructureBear:
				bearishStructure,
	
			//--------------------------------------------------
			// SCORE
			// Legacy compatibility
			//--------------------------------------------------
	
			institutionalLongScore,
			institutionalShortScore,
			tradeDirectionFinal,
			tradeScore: 0,
			scoreLong: 0,
			scoreShort: 0,
	
			//--------------------------------------------------
			// POSITION
			//--------------------------------------------------
	
			tradeDirection:
				runtime.tradeDirection,
	
			entryPrice:
				runtime.entryPrice,
	
			stopLoss:
				runtime.stopLoss,
	
			slPrice:
				runtime.slPrice,
	
			takeProfit1:
				runtime.takeProfit1,
	
			takeProfit2:
				runtime.takeProfit2,
	
			takeProfit3:
				runtime.takeProfit3,
	
			tp1:
				runtime.tp1,
	
			tp2:
				runtime.tp2,
	
			tp3:
				runtime.tp3,
	
			currentPrice:
				runtime.currentPrice,
	
			positionSize:
				runtime.positionSize,
	
			positionOpen:
				runtime.positionOpen,
	
			inPosition:
				runtime.inPosition,
	
			//--------------------------------------------------
			// CONTEXT
			//--------------------------------------------------
	
			ctxLong: false,
			ctxShort: false,
			
			//--------------------------------------------------
			// BACKWARD COMPATIBILITY
			//--------------------------------------------------

			trendConfidence: 0,
			structureConfidence: 0,
			liquidityConfidence: 0,
			aiConfidence: 0,
			executionConfidence: 0,
			institutionalScore: 0,
			contextConfidence: 0,

			marketRegime:
				marketState?.regime ?? "UNKNOWN",

			mtfAlignment: 50,

			executionReady: false,

			//--------------------------------------------------
			// SMART TRADE SYNC
			//
			// RuntimeContextBuilder only supplies raw runtime
			// evidence. It does not invent trade score or
			// execution results.
			//--------------------------------------------------

			smartSync: {
				...SmartTradeSyncEngine.evaluate({
			
					chartId:
						runtime.chartId,
			
					symbol:
						runtime.symbol,
			
					direction:
						tradeDirectionFinal,
			
					tradeScore:
						0,
			
					confidence:
						0,
			
					barIndex:
						runtime.barIndex,
			
					mode:
						(runtimeConfig as any).syncMode ??
						"Sync OFF",
			
					syncBars:
						(runtimeConfig as any).syncBars ??
						3,
			
					desyncBars:
						(runtimeConfig as any).desyncBars ??
						2
			
				}),
			
				mode:
					((runtimeConfig as any).syncMode ?? "Sync OFF") as any
			},
	
			//--------------------------------------------------
			// PLACEHOLDER ENGINES
			//--------------------------------------------------
	
			orderBlock: {
					bullish: orderBlockResult.bullishOrderBlock,
					bearish: orderBlockResult.bearishOrderBlock,
					fresh: orderBlockResult.fresh,
					mitigated: orderBlockResult.mitigated,
					touchCount: orderBlockResult.touchCount,
					strength: orderBlockResult.zoneStrength,
					zoneStrength: orderBlockResult.zoneQuality,
					higherTimeframe: orderBlockResult.higherTimeframeAligned
			},
	
			riskQualification: {
				qualified: false,
				noTrade: false,
				grade: "NEUTRAL",
				riskScore: 0,
				trapDetected: false,
				choppyMarket: false,
				conflictingSignals: false,
				nearbyResistance: false,
				nearbySupport: false,
				reason: ""
			},
			
			//--------------------------------------------------
			// AJ v2 Compatibility
			//--------------------------------------------------
			
			riskQualificationApproved: false,
			
			orderFlowBull: cvd.bullish,
			orderFlowBear: cvd.bearish,
			orderFlowConfidence: cvd.strength,
			
			orderBlockBull: orderBlockResult.bullishOrderBlock,
			orderBlockBear: orderBlockResult.bearishOrderBlock,
	
			//--------------------------------------------------
			// RISK
			//--------------------------------------------------
	
			riskATR:
				runtime.riskATR,
	
			slBuffer:
				runtime.slBuffer,
	
			tp1RR:
				runtime.tp1RR,
	
			tp2RR:
				runtime.tp2RR,
	
			tp3RR:
				runtime.tp3RR,
	
			//--------------------------------------------------
			// OPTIONS
			//--------------------------------------------------
	
			isOptionsMode:
				runtime.isOptionsMode,
	
			isOptionChart:
				runtime.isOptionChart,
	
			isMirrorOptionChart:
				runtime.isMirrorOptionChart,
	
			underlying:
				runtime.underlying,
	
			strike:
				runtime.strike,
	
			strikeStep:
				runtime.strikeStep,
	
			currentOptionType:
				runtime.currentOptionType,
	
			greekExecOk:
				runtime.greekExecOk,
	
			greekOptionMode:
				runtime.greekOptionMode,
	
            //--------------------------------------------------
            // ACTIVE TRADE MODE
            //--------------------------------------------------

            tradeEngineMode:
                runtimeConfig.effectiveCalculationMode ??
                runtimeConfig.tradeEngineMode,

            requestedTradeEngineMode:
                runtimeConfig.requestedTradeEngineMode ??
                runtimeConfig.tradeEngineMode,

            effectiveCalculationMode:
                runtimeConfig.effectiveCalculationMode ??
                runtimeConfig.tradeEngineMode,

            intelligentModeEnabled:
                runtimeConfig.intelligentModeEnabled,

            intelligentModeReason:
                runtimeConfig.intelligentModeReason,

            intelligentMarketRegime:
                runtimeConfig.intelligentMarketRegime,

            enableAITradeSafety:
                runtimeConfig.enableAITradeSafety,

            enableAISMCMode:
                runtimeConfig.enableAISMCMode,
	
			//--------------------------------------------------
			// RUNTIME FLAGS
			//--------------------------------------------------
	
			enableAdvancedCrypto:
				runtimeConfig.enableAdvancedCrypto,
	
			cryptoBTCMode:
				runtimeConfig.enableAdvancedCrypto &&
				isBTCSymbol,
	
			//--------------------------------------------------
			// CHART SETTINGS
			//--------------------------------------------------
	
			showZones:
				runtimeConfig.showZones,
	
			showRRPosition:
				runtimeConfig.showRRPosition,
			
			//--------------------------------------------------
			// RUNTIME INTELLIGENCE
			//--------------------------------------------------
			
            runtimeIntelligence: {

                trendConfidence:
                    0,

                structureConfidence:
                    0,

                liquidityConfidence:
                    0,

                aiConfidence:
                    0,

                executionConfidence:
                    0,

                institutionalScore:
                    0,

                marketRegime:
                    marketState?.regime ??
                    runtimeConfig.intelligentMarketRegime ??
                    "UNKNOWN",

                executionReady:
                    false,

                mtfAlignment:
                    50,

                //--------------------------------------------------
                // INTELLIGENT MODE
                //--------------------------------------------------

                requestedTradeEngineMode:
                    runtimeConfig.requestedTradeEngineMode ??
                    runtimeConfig.tradeEngineMode,

                effectiveCalculationMode:
                    runtimeConfig.effectiveCalculationMode ??
                    runtimeConfig.tradeEngineMode,

                intelligentModeEnabled:
                    runtimeConfig.intelligentModeEnabled,

                intelligentModeReason:
                    runtimeConfig.intelligentModeReason,

                intelligentMarketRegime:
                    runtimeConfig.intelligentMarketRegime

            },
	
			//--------------------------------------------------
			// EXECUTION FLAGS
			//--------------------------------------------------
	
			tradeLifecycleLocked:
				runtime.tradeLifecycleLocked,
	
			useVWAP:
				runtime.useVWAP,
	
			useCVD:
				runtime.useCVD,
	
			//--------------------------------------------------
			// SESSION
			//--------------------------------------------------
	
			sessionName:
				runtime.sessionName,
	
			sessionOpen:
				runtime.sessionOpen,
	
			sessionHigh:
				runtime.sessionHigh,
	
			sessionLow:
				runtime.sessionLow,
	
			dayHigh:
				runtime.dayHigh,
	
			dayLow:
				runtime.dayLow,
	
			marketOpen:
				runtime.marketOpen,
	
			marketClose:
				runtime.marketClose,
	
			//--------------------------------------------------
			// PLATFORM
			//--------------------------------------------------
	
			exchange:
				runtime.exchange,
	
			broker:
				runtime.broker,
	
			accountId:
				runtime.accountId,
	
			currency:
				runtime.currency,
	
			tickSize:
				runtime.tickSize,
	
			lotSize:
				runtime.lotSize,
	
			pointValue:
				runtime.pointValue,
	
			pricePrecision:
				runtime.pricePrecision,
	
			quantityPrecision:
				runtime.quantityPrecision,
	
			//--------------------------------------------------
			// ORDER
			//--------------------------------------------------
	
			orderId:
				runtime.orderId,
	
			orderActive:
				runtime.orderActive,
	
			orderFilled:
				runtime.orderFilled,
	
			orderCancelled:
				runtime.orderCancelled,
	
			//--------------------------------------------------
			// POSITION
			//--------------------------------------------------
	
			positionSide:
				runtime.positionSide,
	
			unrealizedPnL:
				runtime.unrealizedPnL,
	
			realizedPnL:
				runtime.realizedPnL,
	
			//--------------------------------------------------
			// STATE
			//--------------------------------------------------
	
			state:
				runtime.state,
	
			//--------------------------------------------------
			// ENGINE STATE
			//--------------------------------------------------
	
			engineState:
				runtime.engineState
	
		};
	
		//------------------------------------------------------
		// RV-05 TRANSPORT VALIDATION (Temporary)
		//------------------------------------------------------
	
		AJLoggingGate.group(
			`[RV-05 RUNTIME CONTEXT] ${runtime.symbol}`
		);
	
		AJLoggingGate.table({
	
			ema20: {
				source: emaFast,
				runtime: context.ema20,
				match: Object.is(
					emaFast,
					context.ema20
				)
			},
	
			ema50: {
				source: emaSlow,
				runtime: context.ema50,
				match: Object.is(
					emaSlow,
					context.ema50
				)
			},
	
			vwap: {
				source: vwap,
				runtime: context.vwap,
				match: Object.is(
					vwap,
					context.vwap
				)
			},
	
			atr: {
				source: atr,
				runtime: context.atr,
				match: Object.is(
					atr,
					context.atr
				)
			},
	
			rsi: {
				source: rsi,
				runtime: context.rsi,
				match: Object.is(
					rsi,
					context.rsi
				)
			},
	
			adx: {
				source: adx,
				runtime: context.adx,
				match: Object.is(
					adx,
					context.adx
				)
			},
	
			bosBull: {
				source: bos.bullish,
				runtime: context.bosBull,
				match: Object.is(
					bos.bullish,
					context.bosBull
				)
			},
	
			chochBull: {
				source: choch.bullish,
				runtime: context.chochBull,
				match: Object.is(
					choch.bullish,
					context.chochBull
				)
			},
	
			fvgBull: {
				source: fvg.bullish,
				runtime: context.fvgBull,
				match: Object.is(
					fvg.bullish,
					context.fvgBull
				)
			},
	
			liquiditySweepLow: {
				source: liquidity.sweepLow,
				runtime: context.liquiditySweepLow,
				match: Object.is(
					liquidity.sweepLow,
					context.liquiditySweepLow
				)
			},
	
			cvdValue: {
				source: cvd.value,
				runtime: context.cvdValue,
				match: Object.is(
					cvd.value,
					context.cvdValue
				)
			},
	
			cvdDelta: {
				source: cvd.delta,
				runtime: context.cvdDelta,
				match: Object.is(
					cvd.delta,
					context.cvdDelta
				)
			},
	
			orderFlowBuyingPressure: {
				source: cvd.buyingPressure,
				runtime: context.orderFlow?.buyingPressure,
			
				match: Object.is(
					cvd.buyingPressure,
					context.orderFlow?.buyingPressure
				)
			},
	
			orderFlowSellingPressure: {
				source: cvd.sellingPressure,
				runtime: context.orderFlow?.sellingPressure,
				
				match: Object.is(
					cvd.sellingPressure,
					context.orderFlow?.sellingPressure
				)
			},
	
			orderFlowDelta: {
				source: cvd.delta,
				runtime: context.orderFlow?.delta,
				
				match: Object.is(
					cvd.delta,
					context.orderFlow?.delta
				)
			}
		});
		AJLoggingGate.groupEnd();
		return context;
	}
}








