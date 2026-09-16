/****************************************************************************************
 * File:
 * ContextEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/context/ContextEngine.ts
 *
 * AJ v2 - Canonical Institutional Context Engine
 *
 * Purpose
 * -------
 * ContextEngine is the canonical market-analysis engine of the AJ v2
 * institutional trading pipeline. It converts normalized ContextInputs into
 * a fully evaluated ContextResult by aggregating institutional evidence from
 * trend, momentum, order flow, market structure, liquidity, fair value gaps,
 * volatility, and multi-timeframe alignment.
 *
 * This engine does not perform raw indicator calculations. It evaluates the
 * intelligence already prepared by upstream runtime builders and specialized
 * analysis engines, producing a single market context used throughout the
 * remainder of the AJ v2 pipeline.
 *
 * Responsibilities
 * ----------------
 * • Evaluate institutional market trend.
 * • Evaluate market momentum and breakout quality.
 * • Evaluate EMA trend quality.
 * • Evaluate VWAP alignment.
 * • Evaluate Order Flow / CVD strength.
 * • Evaluate BOS and CHOCH market structure.
 * • Evaluate Fair Value Gap quality.
 * • Evaluate liquidity sweep strength.
 * • Evaluate multi-timeframe alignment.
 * • Evaluate market volatility state.
 * • Calculate weighted institutional context scores.
 * • Calculate confluence and overall market quality.
 * • Build confidence metrics.
 * • Build validation results for every evaluation stage.
 * • Produce diagnostics for Phase 15.5 runtime validation.
 * • Preserve backward compatibility with legacy routing.
 * • Produce the canonical ContextResult contract.
 *
 * Functional Areas
 * ----------------
 * Trend Analysis
 * • Trend direction
 * • Trend strength
 * • Trend alignment
 * • EMA slope evaluation
 *
 * Momentum Analysis
 * • Breakout strength
 * • Breakout confirmation
 * • Momentum scoring
 *
 * Moving Average Analysis
 * • EMA qualification
 * • VWAP qualification
 * • Directional alignment
 *
 * Order Flow Analysis
 * • CVD evaluation
 * • Institutional buying/selling pressure
 * • Order flow scoring
 *
 * Market Structure Analysis
 * • BOS evaluation
 * • CHOCH evaluation
 * • Structure scoring
 *
 * Liquidity Analysis
 * • Liquidity sweep evaluation
 * • Liquidity grab confirmation
 * • Liquidity strength scoring
 *
 * Fair Value Gap Analysis
 * • Bullish FVG quality
 * • Bearish FVG quality
 * • FVG scoring
 *
 * Multi-Timeframe Analysis
 * • Higher timeframe trend agreement
 * • Alignment scoring
 *
 * Volatility Analysis
 * • Volatility score
 * • Volatility state classification
 *
 * Institutional Analysis
 * • Institutional score
 * • Context score
 * • Confluence score
 * • Overall market score
 *
 * Confidence Layer
 * ----------------
 * • Long confidence
 * • Short confidence
 * • Confidence value
 * • Confidence grade
 * • Trade grade
 *
 * Validation Layer
 * ----------------
 * • Trend validation
 * • Momentum validation
 * • EMA validation
 * • VWAP validation
 * • Order Flow validation
 * • Structure validation
 * • Liquidity validation
 * • Fair Value Gap validation
 * • Volatility validation
 * • Multi-Timeframe validation
 * • Institutional validation
 *
 * Diagnostics
 * -----------
 * • Validation summary
 * • Passed/failed checks
 * • Overall quality grade
 * • Runtime diagnostic summary
 *
 * Inputs
 * ------
 * • ContextInputs
 *   - Trend information
 *   - EMA information
 *   - VWAP information
 *   - Order Flow / CVD information
 *   - Market Structure information
 *   - Fair Value Gap information
 *   - Liquidity information
 *   - Breakout information
 *   - Multi-Timeframe information
 *   - Institutional metrics
 *   - Optional volatility and momentum metrics
 *
 * Outputs
 * -------
 * • ContextResult
 *   - Complete institutional market context
 *   - Legacy compatibility fields
 *   - Validation objects
 *   - Diagnostics
 *
 * Downstream Consumers
 * --------------------
 * • AJContextEngine (Context Orchestrator)
 * • ConfidenceEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • State Machine
 * • Runtime Adapter
 * • Dashboard / Diagnostics
 *
 * Upstream Dependencies
 * ---------------------
 * ContextInputs is populated from:
 * • AJRuntimeContextBuilder
 * • MarketStructureEngine
 * • LiquidityEngine
 * • OrderFlowEngine
 * • BreakoutEngine
 * • VolatilityEngine
 * • AIEngine
 * • AIConfidenceEngine
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle
 * • Pure evaluation engine
 * • No raw indicator calculations
 * • No runtime construction
 * • No execution logic
 * • No trading authority
 * • No position management
 * • No order management
 * • Deterministic evaluation
 * • Immutable output
 * • Backward compatible
 * • Phase 15.5 compliant
 *
 * AJ v2 Pipeline
 *
 * AJRuntimeContextBuilder
 *           │
 *           ▼
 *      ContextInputs
 *           │
 *           ▼
 *      ContextEngine
 *           │
 *           ▼
 *      ContextResult
 *           │
 *           ▼
 *     AJContextEngine
 *           │
 *           ▼
 *    ConfidenceEngine
 *           │
 *           ▼
 *    AJDecisionEngine
 *           │
 *           ▼
 *    Authority Engine
 *           │
 *           ▼
 *     Execution Engine
 *
 ****************************************************************************************/

import type { ContextInputs } from "./AJContextTypes";
import type { ContextResult, ContextValidation } from "./AJContextResult";
import { AJLoggingGate } from "../debug/AJLoggingGate";
//==============================================================

export class ContextEngine {

    //--------------------------------------------------
    // CONTEXT ENGINE
    //--------------------------------------------------

    evaluate(
        input: ContextInputs
    ): ContextResult {

        //--------------------------------------------------
        // TREND
        //--------------------------------------------------

        const trendLong =
            input.emaBull &&
            input.aiTrendLong &&
            input.htfBullTrend;

        const trendShort =
            input.emaBear &&
            input.aiTrendShort &&
            input.htfBearTrend;

        const trendDirection =
            trendLong
                ? "BULLISH"
                : trendShort
                    ? "BEARISH"
                    : "NEUTRAL";

        const trendStrength =
            Math.min(
                100,
                Math.round(
                    (
                        Math.abs(input.emaSlope) * 20 +
                        input.aiConfidence +
                        input.mtfAlignmentScore
                    ) / 3
                )
            );

        const trendScore =
            trendLong || trendShort
                ? trendStrength
                : Math.round(trendStrength * 0.50);

        //--------------------------------------------------
        // EMA
        //--------------------------------------------------

        const emaLongGate =
            input.emaBull;

        const emaShortGate =
            input.emaBear;

        const emaScore =
            Math.min(
                100,
                Math.round(
                    (Math.abs(input.emaSlope) * 25) +
                    (emaLongGate || emaShortGate ? 50 : 0)
                )
            );

        //--------------------------------------------------
        // VWAP
        //--------------------------------------------------

        const vwapLongGate =
            !input.useVWAP ||
            input.vwapBull;

        const vwapShortGate =
            !input.useVWAP ||
            input.vwapBear;

        const vwapScore =
            input.useVWAP
                ? (
                    input.vwapAligned
                        ? 100
                        : 50
                )
                : 100;

        //--------------------------------------------------
        // ORDER FLOW
        //--------------------------------------------------

        const cvdLongGate =
            !input.useCVD ||
            input.cvdBull;

        const cvdShortGate =
            !input.useCVD ||
            input.cvdBear;

        const orderFlowScore =
            input.useCVD
                ? Math.min(
                    100,
                    Math.round(input.cvdStrength)
                )
                : 50;

        //--------------------------------------------------
        // MARKET STRUCTURE
        //--------------------------------------------------

        const structureScore =
            Math.min(
                100,
                (
                    Number(input.smcBosBull || input.smcBosBear) * 35 +
                    Number(input.smcChochBull || input.smcChochBear) * 35 +
                    Math.max(
                        input.bullFvgQuality,
                        input.bearFvgQuality
                    ) * 0.30
                )
            );

        //--------------------------------------------------
        // WEIGHTED INSTITUTIONAL SCORES
        //--------------------------------------------------

        const longScore =
            Number(emaLongGate) * 20 +
            Number(vwapLongGate) * 15 +
            Number(cvdLongGate) * 15 +
            Number(input.smcBosBull) * 15 +
            Number(input.smcChochBull) * 10 +
            Number(input.htfBullTrend) * 10 +
            (input.aiTrendLong ? 15 : 0);

        const shortScore =
            Number(emaShortGate) * 20 +
            Number(vwapShortGate) * 15 +
            Number(cvdShortGate) * 15 +
            Number(input.smcBosBear) * 15 +
            Number(input.smcChochBear) * 10 +
            Number(input.htfBearTrend) * 10 +
            (input.aiTrendShort ? 15 : 0);

		//--------------------------------------------------
		// CONTEXT (TEST MODE)
		//--------------------------------------------------
		
		// Production = 60
		// Test = 5 (or 20 for maximum sensitivity)
		
		const MIN_DIRECTION_SCORE = 5;
		
		const scoreDifference = longScore - shortScore;
		
		const ctxLong =
				scoreDifference >= MIN_DIRECTION_SCORE;
		
		const ctxShort =
				scoreDifference <= -MIN_DIRECTION_SCORE;
		
		AJLoggingGate.table({
			longScore,
			shortScore,
			scoreDifference: longScore - shortScore,
			ctxLong,
			ctxShort
		});
		
		//--------------------------------------------------
		// RV-07D SCORE COMPOSITION (Temporary)
		//--------------------------------------------------
		
		const scoreComposition = {
		
			ema: {
				long: Number(emaLongGate) * 20,
				short: Number(emaShortGate) * 20
			},
		
			vwap: {
				long: Number(vwapLongGate) * 15,
				short: Number(vwapShortGate) * 15
			},
		
			cvd: {
				long: Number(cvdLongGate) * 15,
				short: Number(cvdShortGate) * 15
			},
		
			bos: {
				long: Number(input.smcBosBull) * 15,
				short: Number(input.smcBosBear) * 15
			},
		
			choch: {
				long: Number(input.smcChochBull) * 10,
				short: Number(input.smcChochBear) * 10
			},
		
			htf: {
				long: Number(input.htfBullTrend) * 10,
				short: Number(input.htfBearTrend) * 10
			},
		
			aiTrend: {
				long: input.aiTrendLong ? 15 : 0,
				short: input.aiTrendShort ? 15 : 0
			}
		
		};
		
		//--------------------------------------------------
		// LEGACY ROUTING
		//--------------------------------------------------
		
		const tradeDirectionFinal =
			ctxLong && !ctxShort
				? 1
				: ctxShort && !ctxLong
					? -1
					: 0;
		
		const tradeScore =
			Math.max(
				longScore,
				shortScore
			);

		//--------------------------------------------------
		// INSIDE BAR SCORE
		//
		// Wired from AJRuntimeContextBuilder's InsideBar output,
		// which reached ajRuntime but was never included in
		// ContextInputs or ContextResult — the debug dashboard's
		// INSIDE column always showed a hardcoded 0. Not folded
		// into contextScore/overallScore, to avoid changing
		// existing trading behavior — display-only for now.
		//--------------------------------------------------

		const insideBarAligned =
			(tradeDirectionFinal > 0 && input.insideBarBreakoutLong) ||
			(tradeDirectionFinal < 0 && input.insideBarBreakoutShort);

		const insideBarScore =
			insideBarAligned
				? 100
				: input.insideBarDetected
					? 40
					: 0;

		//--------------------------------------------------
		// BOOST SCORE
		//
		// scoreInputs.scoreLongBoost / scoreShortBoost in
		// AJPayloadBuilder.ts are hardcoded 0 and read by nothing —
		// dead placeholders, not a real mechanic. Repurposed here to
		// show the AI-trend confirmation bonus (scoreComposition.
		// aiTrend) already contributing to longScore/shortScore
		// above, for whichever direction won — the closest real
		// "extra confluence" bump the engine currently computes.
		//--------------------------------------------------

		const boostScore =
			tradeDirectionFinal > 0
				? scoreComposition.aiTrend.long
				: tradeDirectionFinal < 0
					? scoreComposition.aiTrend.short
					: 0;

        //--------------------------------------------------
        // AJ v2 SCORES
        //--------------------------------------------------

        const contextScore =
            Math.round(
                (
                    trendScore +
                    emaScore +
                    vwapScore +
                    orderFlowScore +
                    structureScore
                ) / 5
            );

        const confluenceScore =
            Math.round(
                (
                    contextScore +
                    input.institutionalScore +
                    input.confluenceScore
                ) / 3
            );
		
		//--------------------------------------------------
        // MOMENTUM
        //--------------------------------------------------

        const breakoutScore =
            Math.min(
                100,
                Math.round(
                    input.breakoutStrength
                )
            );

        const momentumScore =
            Math.min(
                100,
                Math.round(
                    (
                        breakoutScore +
                        (input.momentumScore ?? 50) +
                        input.aiConfidence
                    ) / 3
                )
            );

        const momentumAligned =
            breakoutScore >= 60 &&
            input.breakoutConfirmed;

        //--------------------------------------------------
        // FAIR VALUE GAP
        //--------------------------------------------------

        const fvgScore =
            Math.round(
                (
                    input.bullFvgQuality +
                    input.bearFvgQuality
                ) / 2
            );

        //--------------------------------------------------
        // LIQUIDITY
        //--------------------------------------------------

        const liquidityScore =
            Math.min(
                100,
                Math.round(
                    input.liquiditySweepStrength
                )
            );

        //--------------------------------------------------
        // MULTI-TIMEFRAME
        //--------------------------------------------------

        const multiTimeframeAligned =
            input.mtfAlignmentScore >= 70 &&
            (
                input.htfBullTrend ||
                input.htfBearTrend
            );

        //--------------------------------------------------
        // VOLATILITY
        //--------------------------------------------------

        const volatilityScore =
            Math.min(
                100,
                Math.round(
                    input.volatilityScore ??
                    50
                )
            );

        let volatilityState:
            "LOW" |
            "NORMAL" |
            "HIGH" |
            "EXTREME";

        if (volatilityScore >= 85) {

            volatilityState = "EXTREME";

        } else if (volatilityScore >= 70) {

            volatilityState = "HIGH";

        } else if (volatilityScore <= 30) {

            volatilityState = "LOW";

        } else {

            volatilityState = "NORMAL";

        };

        //--------------------------------------------------
        // SESSION
        //--------------------------------------------------

        const sessionState =
            "UNKNOWN" as const;

        const sessionQualified =
            true;

        //--------------------------------------------------
        // INSTITUTIONAL
        //--------------------------------------------------

        const institutionalScore =
            Math.round(
                (
                    input.institutionalScore +
                    trendScore +
                    structureScore +
                    orderFlowScore +
                    liquidityScore
                ) / 5
            );

        const overallScore =
            Math.round(
                (
                    contextScore +
                    momentumScore +
                    institutionalScore +
                    confluenceScore
                ) / 4
            );

        //--------------------------------------------------
        // CONTEXT DIRECTIONS
        //--------------------------------------------------

        const contextDirection =
            ctxLong
                ? "BULLISH"
                : ctxShort
                    ? "BEARISH"
                    : "NEUTRAL";

        const trendAligned =
            contextDirection === trendDirection;

        //--------------------------------------------------
        // RISK QUALIFICATION
        //--------------------------------------------------

        const riskQualified =
            overallScore >= 70 &&
            trendAligned &&
            momentumAligned &&
            multiTimeframeAligned;
		
		//--------------------------------------------------
        // CONFIDENCE
        //--------------------------------------------------

        const confidenceLong =
            Math.round(
                (
                    longScore +
                    trendScore +
                    orderFlowScore
                ) / 3
            );

        const confidenceShort =
            Math.round(
                (
                    shortScore +
                    trendScore +
                    orderFlowScore
                ) / 3
            );

        const confidenceValue =
            Math.max(
                confidenceLong,
                confidenceShort
            );

        //--------------------------------------------------
        // CONFIDENCE GRADE
        //--------------------------------------------------

        const confidenceGrade =
            confidenceValue >= 90
                ? "A"
                : confidenceValue >= 75
                    ? "B"
                    : confidenceValue >= 60
                        ? "C"
                        : "D";

        //--------------------------------------------------
        // TRADE GRADE
        //--------------------------------------------------

        const tradeGrade =
            overallScore >= 90
                ? "STRONG_BUY"
                : overallScore >= 75
                    ? "BUY"
                    : overallScore >= 60
                        ? "WATCH"
                        : "NO_TRADE";

        //--------------------------------------------------
        // MARKET STATE
        //--------------------------------------------------

        const marketState =
            trendDirection === "BULLISH"
                ? "BULLISH"
                : trendDirection === "BEARISH"
                    ? "BEARISH"
                    : "RANGING";

        //--------------------------------------------------
        // MARKET REGIME
        //--------------------------------------------------

        const marketRegime =
            volatilityState === "EXTREME"
                ? "HIGH_VOLATILITY"
                : multiTimeframeAligned
                    ? "TRENDING"
                    : "RANGING";

        //--------------------------------------------------
        // ORDER FLOW MODE
        //--------------------------------------------------

        const orderFlowMode =
            orderFlowScore >= 70
                ? "INSTITUTIONAL"
                : orderFlowScore >= 40
                    ? "BALANCED"
                    : "WEAK";

        //--------------------------------------------------
        // RETAIL TRAP
        //--------------------------------------------------

        const retailTrap =
            input.liquidityGrabConfirmed
                ? "LIKELY"
                : "NONE";
		
		//--------------------------------------------------
        // VALIDATION HELPERS
        //--------------------------------------------------

		const buildValidation = (
		
			passed: boolean,
		
			score: number,
		
			message: string
		
		): ContextValidation => ({
		
			passed,
		
			score,
		
			status:
		
				passed
					? ("PASS" as const)
					: ("FAIL" as const),
		
			message
		
		});

        //--------------------------------------------------
        // VALIDATIONS
        //--------------------------------------------------

        const trendValidation =
            buildValidation(
                trendAligned,
                trendScore,
                trendAligned
                    ? "Trend aligned"
                    : "Trend misaligned"
            );

        const momentumValidation =
            buildValidation(
                momentumAligned,
                momentumScore,
                momentumAligned
                    ? "Momentum confirmed"
                    : "Weak momentum"
            );

        const emaValidation =
            buildValidation(
                emaScore >= 60,
                emaScore,
                emaScore >= 60
                    ? "EMA qualified"
                    : "EMA weak"
            );

        const vwapValidation =
            buildValidation(
                vwapScore >= 60,
                vwapScore,
                vwapScore >= 60
                    ? "VWAP aligned"
                    : "VWAP not aligned"
            );

        const orderFlowValidation =
            buildValidation(
                orderFlowScore >= 60,
                orderFlowScore,
                orderFlowScore >= 60
                    ? "Institutional order flow"
                    : "Weak order flow"
            );

        const structureValidation =
            buildValidation(
                structureScore >= 60,
                structureScore,
                structureScore >= 60
                    ? "Structure confirmed"
                    : "Weak structure"
            );

        const liquidityValidation =
            buildValidation(
                liquidityScore >= 60,
                liquidityScore,
                liquidityScore >= 60
                    ? "Liquidity confirmed"
                    : "Weak liquidity"
            );

        const fvgValidation =
            buildValidation(
                fvgScore >= 60,
                fvgScore,
                fvgScore >= 60
                    ? "FVG qualified"
                    : "Poor FVG quality"
            );

        const volatilityValidation =
            buildValidation(
                volatilityScore >= 40,
                volatilityScore,
                volatilityState
            );

        const multiTimeframeValidation =
            buildValidation(
                multiTimeframeAligned,
                input.mtfAlignmentScore,
                multiTimeframeAligned
                    ? "HTF aligned"
                    : "HTF conflict"
            );

        const institutionalValidation =
            buildValidation(
                institutionalScore >= 70,
                institutionalScore,
                institutionalScore >= 70
                    ? "Institutional quality confirmed"
                    : "Institutional quality weak"
            );

        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

        const validationResults = [

            trendValidation,

            momentumValidation,

            emaValidation,

            vwapValidation,

            orderFlowValidation,

            structureValidation,

            liquidityValidation,

            fvgValidation,

            volatilityValidation,

            multiTimeframeValidation,

            institutionalValidation

        ];

        const totalChecks =
            validationResults.length;

        const passedChecks =
            validationResults.filter(
                validation => validation.passed
            ).length;

        const failedChecks =
            totalChecks -
            passedChecks;

        let overallGrade:
            "A+" |
            "A" |
            "B" |
            "C" |
            "D";

        const passRate =
            passedChecks /
            totalChecks;

        if (passRate >= 0.95) {

            overallGrade = "A+";

        } else if (passRate >= 0.85) {

            overallGrade = "A";

        } else if (passRate >= 0.70) {

            overallGrade = "B";

        } else if (passRate >= 0.50) {

            overallGrade = "C";

        } else {

            overallGrade = "D";

        }

        const diagnostics = {

            totalChecks,

            passedChecks,

            failedChecks,

            overallGrade,

            summary:
                `${passedChecks}/${totalChecks} validation checks passed`

        };
		
        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        const result: ContextResult = {

            //==================================================
            // PRIMARY CONTEXT
            //==================================================

            ctxLong,

            ctxShort,

            tradeDirectionFinal,

            contextDirection,

            //==================================================
            // TREND
            //==================================================

            trendDirection,

            trendScore,

            trendStrength,

            trendAligned,

            //==================================================
            // MOMENTUM
            //==================================================

            momentumScore,

            momentumAligned,

            breakoutScore,

            breakoutConfirmed:
                input.breakoutConfirmed,

            //==================================================
            // EMA
            //==================================================

            emaBull:
                input.emaBull,

            emaBear:
                input.emaBear,

            emaSlope:
                input.emaSlope,

            emaScore,

            //==================================================
            // VWAP
            //==================================================

            vwapBull:
                input.vwapBull,

            vwapBear:
                input.vwapBear,

            vwapAligned:
                input.vwapAligned,

            vwapScore,

            //==================================================
            // ORDER FLOW
            //==================================================

            cvdBull:
                input.cvdBull,

            cvdBear:
                input.cvdBear,

            cvdStrength:
                input.cvdStrength,

            orderFlowScore,

            //==================================================
            // MARKET STRUCTURE
            //==================================================

            bosBull:
                input.smcBosBull,

            bosBear:
                input.smcBosBear,

            chochBull:
                input.smcChochBull,

            chochBear:
                input.smcChochBear,

            structureScore,

            //==================================================
            // FAIR VALUE GAP
            //==================================================

            bullFvgQuality:
                input.bullFvgQuality,

            bearFvgQuality:
                input.bearFvgQuality,

            fvgScore,

            //==================================================
            // LIQUIDITY
            //==================================================

            liquiditySweepStrength:
                input.liquiditySweepStrength,

            liquidityGrabConfirmed:
                input.liquidityGrabConfirmed,

            liquidityScore,

            //==================================================
            // MULTI TIMEFRAME
            //==================================================

            htfBullTrend:
                input.htfBullTrend,

            htfBearTrend:
                input.htfBearTrend,

            mtfAlignmentScore:
                input.mtfAlignmentScore,

            multiTimeframeAligned,

            //==================================================
            // VOLATILITY
            //==================================================

            volatilityScore,

            volatilityState,

            //==================================================
            // SESSION
            //==================================================

            sessionState,

            sessionQualified,

            //==================================================
            // INSTITUTIONAL
            //==================================================

            institutionalScore,

            contextScore,

            confluenceScore,

            overallScore,

			//==================================================
            // LEGACY COMPATIBILITY
            //==================================================

            longScore,

            shortScore,

            tradeScore,

            insideBarScore,

            boostScore,

            confidenceLong,

            confidenceShort,

            confidenceValue,

            confidenceGrade,

            tradeGrade,

            marketState,

            marketRegime,

            orderFlowMode,

            retailTrap,

            riskQualified,

            //==================================================
            // VALIDATION
            //==================================================

            trendValidation,

            momentumValidation,

            emaValidation,

            vwapValidation,

            orderFlowValidation,

            structureValidation,

            liquidityValidation,

            fvgValidation,

            volatilityValidation,

            multiTimeframeValidation,

            institutionalValidation,

            //==================================================
            // PHASE 15.5 DIAGNOSTICS
            //==================================================

			diagnostics
			
		};
			
		//--------------------------------------------------
		// RV-06 RUNTIME CONTEXT EVALUATION
		//--------------------------------------------------
		
		const validationPassed =
			result.trendDirection === trendDirection &&
			result.structureScore === structureScore &&
			result.momentumScore === momentumScore &&
			result.orderFlowScore === orderFlowScore &&
			result.institutionalScore === institutionalScore &&
			result.marketRegime === marketRegime;
		
		AJLoggingGate.group("[CONTEXT RESULT]");
		
		AJLoggingGate.log("Symbol:", "<See RV-06 PAYLOAD TRANSPORT>");
		AJLoggingGate.log("Timeframe:", "<See RV-06 PAYLOAD TRANSPORT>");
		
		//--------------------------------------------------
		// TREND
		//--------------------------------------------------
		
		AJLoggingGate.table({
			trend: {
		
				emaBull: input.emaBull,
				emaBear: input.emaBear,
		
				aiTrendLong: input.aiTrendLong,
				aiTrendShort: input.aiTrendShort,
		
				htfBullTrend: input.htfBullTrend,
				htfBearTrend: input.htfBearTrend,
		
				trendLongGate: trendLong,
				trendShortGate: trendShort,
		
				trendDirectionSource: trendDirection,
				contextTrend: result.trendDirection,
				match: result.trendDirection === trendDirection
			}
		});
		
		//--------------------------------------------------
		// MARKET STRUCTURE
		//--------------------------------------------------
		
		AJLoggingGate.table({
			marketStructure: {
		
				bosSource: {
					bull: input.smcBosBull,
					bear: input.smcBosBear
				},
		
				chochSource: {
					bull: input.smcChochBull,
					bear: input.smcChochBear
				},
		
				structureSource: structureScore,
				contextStructureScore: result.structureScore,
				match: result.structureScore === structureScore
		
			}
		});
		
		//--------------------------------------------------
		// MOMENTUM
		//--------------------------------------------------
		
		AJLoggingGate.table({
			momentum:{
		
				breakoutStrength: input.breakoutStrength,
				breakoutConfirmed: input.breakoutConfirmed,
				momentumSource:	momentumScore,
				aiConfidence: input.aiConfidence,
				contextMomentum: result.momentumScore,
				match: result.momentumScore === momentumScore
			}
		});
				
		//--------------------------------------------------
		// ORDER FLOW
		//--------------------------------------------------
		
		AJLoggingGate.table({
			orderFlow: {
				cvdBull: input.cvdBull,
				cvdBear: input.cvdBear,
				cvdStrength: input.cvdStrength,
				orderFlowSource: orderFlowScore,
				contextOrderFlow: result.orderFlowScore,
				match: result.orderFlowScore === orderFlowScore
			}
		});
		
		//--------------------------------------------------
		// INSTITUTIONAL
		//--------------------------------------------------
		
		AJLoggingGate.table({
			institutional: {
				institutionalScoreSource: input.institutionalScore,
				confluenceScoreSource: input.confluenceScore,
				institutionalSource: institutionalScore,
				contextInstitutional: result.institutionalScore,
				match: result.institutionalScore === institutionalScore
			}
		});
		
		//--------------------------------------------------
		// MARKET REGIME
		//--------------------------------------------------
		
		AJLoggingGate.table({
			marketRegime:{
				volatilityState,
				mtfAligned:	multiTimeframeAligned,
				marketRegimeSource:	marketRegime,
				contextRegime: result.marketRegime,
				match: result.marketRegime === marketRegime
			}
		});
		
		//--------------------------------------------------
		// RV-07D SCORE COMPOSITION
		//--------------------------------------------------
		
		AJLoggingGate.group("[RV-07D SCORE COMPOSITION]");
		
		AJLoggingGate.table({
			ema: scoreComposition.ema,
			vwap: scoreComposition.vwap,
			bos: scoreComposition.bos,
			choch: scoreComposition.choch,
			cvd: scoreComposition.cvd,
			htf: scoreComposition.htf,
			aiTrend: scoreComposition.aiTrend
		
		});
		
		AJLoggingGate.table({
			totals: {
				longScore,
				shortScore,
				scoreDifference: longScore - shortScore,
				tradeDirectionFinal
			}
		});
		
		//--------------------------------------------------
		// RV-06 + RV-07D VALIDATION
		//--------------------------------------------------
		
		const scoreValidation =
			longScore > shortScore
				? tradeDirectionFinal === 1
				: shortScore > longScore
					? tradeDirectionFinal === -1
					: tradeDirectionFinal === 0;
		
		AJLoggingGate.table({
			validation: {
				rv06Transport: validationPassed,
				rv07ScoreComposition: scoreValidation,
				overallValidation:
					validationPassed &&
					scoreValidation
						? "PASS"
						: "FAIL"
			}
		});
		
		AJLoggingGate.groupEnd();
		
		//--------------------------------------------------
		// FINAL
		//--------------------------------------------------
		
		AJLoggingGate.table({
			final: {
				contextDirection: result.contextDirection,
				contextScore: result.contextScore,
				overallScore: result.overallScore,
				riskQualified: result.riskQualified
			}
		});
		return result;
	}
}