/************************************************************************************************
 * File:
 * AJDebugBuilder.ts
 *
 * Purpose:
 * Builds the unified developer debug model for AJ Institutional Indicator.
 *
 * This class does NOT calculate trading logic.
 * It is a presentation adapter that converts the canonical AJ v2 pipeline
 * outputs into a Pine-style debug dashboard, console tables and overlay
 * diagnostics.
 *
 * AJDebugBuilder is the single source of truth for every developer-facing
 * debug view.
 *
 * Responsibilities
 *
 * • Collect outputs from every completed pipeline stage
 * • Normalize runtime values into a common debug model
 * • Generate Pine-compatible debug metrics
 * • Build console/debug overlay tables
 * • Produce lifecycle diagnostics
 * • Display execution readiness
 * • Display routing decisions
 * • Display AI / SMC / Authority status
 * • Display pipeline execution state
 *
 * AJDebugBuilder never performs:
 *
 * • score calculations
 * • confidence calculations
 * • AI logic
 * • SMC logic
 * • authority decisions
 * • state transitions
 * • execution logic
 *
 * Those belong exclusively to their respective engines.
 *
 * ==============================================================================================
 *
 * AJ v2 Debug Pipeline
 *
 *                      AJDecisionEngine
 *                              │
 *                              ▼
 *                     ContextResult
 *                              │
 *                              ▼
 *                  ConfidenceResult
 *                              │
 *                              ▼
 *                        AIResult
 *                              │
 *                              ▼
 *                       SMCResult
 *                              │
 *                              ▼
 *                  AuthorityResult
 *                              │
 *                              ▼
 *                    StateResult
 *                              │
 *                              ▼
 *                    Runtime (ajRuntime)
 *                              │
 *                              ▼
 *                  AJDecisionSnapshot
 *                              │
 *                              ▼
 *                 Pipeline Diagnostics
 *                              │
 *                              ▼
 *                     AJDebugBuilder
 *                              │
 *                              ▼
 *                 AJDebugResult (Debug Model)
 *                              │
 *            ┌─────────────────┼──────────────────┐
 *            ▼                 ▼                  ▼
 *      Debug Overlay     Console Output     Developer Logs
 *
 * ==============================================================================================
 *
 * Canonical AJ v2 Inputs
 *
 * contextResult
 * confidenceResult
 * aiResult
 * smcResult
 * authorityResult
 * stateResult
 * payload.ajRuntime
 * AJPipelineTrace
 * pipelineDiagnostics
 *
 * AJDebugBuilder should consume ONLY these canonical outputs.
 *
 * Legacy execution/risk/option placeholders should not be used as primary
 * data sources. They may only be used temporarily during migration until
 * their dedicated AJ v2 engines are introduced.
 *
 ************************************************************************************************/

import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
import { AJRuntimeParameters } from "@/indicators/AJIndicator/config/AJRuntimeParameters";
import type { AJDecisionSnapshot } from "./AJDecisionSnapshot";

//======================================================
// DEBUG CONTRACT
//======================================================

export interface AJDebugReasonGate {
    label:string;
    value:string;
    passed:boolean;
}

export interface AJDebugTradeReasons {
    summary:string;
    gates:AJDebugReasonGate[];
    positiveFactors:string[];
    negativeFactors:string[];
}

export interface AJDebugResult {

    //--------------------------------------------------
    // TRADE MODE ROUTER
    //--------------------------------------------------

    tradeEngineMode:string;
    routerMode:string;

    //--------------------------------------------------
    // PINE ENGINE STATE
    //--------------------------------------------------
    state:string;
    stateText:string;
	symbol:string;

    //--------------------------------------------------
    // TRADE MODE ROUTER
    //--------------------------------------------------
    requestedTradeEngineMode?:string;

    effectiveCalculationMode?:string;

    intelligentModeEnabled?:boolean;

    intelligentModeReason?:string;

    intelligentMarketRegime?:string;

    //--------------------------------------------------
    // DIRECTION VARIABLES
    //--------------------------------------------------
    direction:number;
    directionText:string;
    bias:number;

    //--------------------------------------------------
    // PIPELINE FLAGS
    //--------------------------------------------------
    scoreReady:boolean;
    contextReady:boolean;
    breakoutReady:boolean;
    executionReady:boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    confidence:number;
    aiConfidence:number;
    institutionalConfidence:number;

    //--------------------------------------------------
    // TRADE STATUS
    //--------------------------------------------------
    tradeActive:boolean;
    blockReason:string;

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------
    regime:string;

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    optionSymbol:string;
    atmStrike:string;
    itmStrike:string;
    otmStrike:string;

    //--------------------------------------------------
    // PINE STATUS DEBUG
    //--------------------------------------------------
    aiStatus:string;
    smcStatus:string;
    authorityStatus:string;

    //--------------------------------------------------
    // RAW DEBUG TEXT
    //--------------------------------------------------
    lines:string[];

    //--------------------------------------------------
    // REASON FOR TRADE (tooltip source)
    //--------------------------------------------------
    tradeReasons?:AJDebugTradeReasons;
}

//======================================================
// BUILDER
//======================================================

export class AJDebugBuilder {

	static build(
		snapshot: AJDecisionSnapshot
	): AJDebugResult {
	
		const {
		
			runtime,
			context,
			confidence,
			authority,
			execution,
			state,
			option,
			ai,
			smc,
			trace: snapshotTrace
		
		} = snapshot;
		
		const pipelineTrace =
			snapshotTrace;
		
		const chartId =
		(option as any)?.underlying
		??
		(option as any)?.symbol
		??
		(option as any)?.indexSymbol
		??
		"GLOBAL";
	
		//--------------------------------------------------
		// OPTION CHART DETECTION
		//
		// Needed before DIRECTION is resolved. Options-buy
		// strategy means the debug DIR must always read LONG
		// on a CE/PE chart - only the raw index direction
		// (kept separately below as indexDirection) still
		// carries the real bullish/bearish index bias for
		// display context.
		//--------------------------------------------------

		const debugSymbol =
			(runtime as any)?.symbol
			??
			"";

		const isOptionSymbol =
			/(CE|PE)$/i.test(debugSymbol);

		//--------------------------------------------------
		// DIRECTION
		//--------------------------------------------------

        const indexDirection =
                (runtime as any)?.dashboardDirection
                ??
                (pipelineTrace as any)?.direction
                ??
                context.tradeDirectionFinal
                ??
                (
                        context.ctxLong
                                ? 1
                                : context.ctxShort
                                        ? -1
                                        : 0
                );

        const direction =
                isOptionSymbol
                        ? 1                // options-buy: debug DIR always LONG
                        : indexDirection;  // index/stock chart: real bias direction
		
		//--------------------------------------------------
		// STATE
		//--------------------------------------------------
		
		const engineState =
			(pipelineTrace as any)?.lifecycle
			??
			(
				typeof state?.engineState === "number"
					? (
						[
							"SCAN",
							"ARMED",
							"CONFIRMED",
							"EXECUTED",
							"MANAGE",
							"CLOSED"
						][state.engineState]
						?? "SCAN"
					)
					: String(
						state?.engineState
						?? "SCAN"
					)
			);

		//--------------------------------------------------
        // RUNTIME VALUES
        //--------------------------------------------------
		
        const runtimeLongScore =
            (pipelineTrace as any)?.longScore
            ??
            context.longScore
            ??
            0;
		
        const runtimeShortScore =
            (pipelineTrace as any)?.shortScore
            ??
            context.shortScore
            ??
            0;
		
		const runtimeTradeScore =
			(pipelineTrace as any)?.tradeScore
			??
			context.tradeScore
			??
			0;

        const lifecycleState =
               engineState;

		//--------------------------------------------------
		// BLOCK REASON
		//--------------------------------------------------
		
		let blockReason = "READY";
		
		if (runtimeTradeScore <= 0)
			blockReason = "NO SCORE";
		
		else if (!authority.executionAllowed)
			blockReason = "SCORE BLOCKED";
		
		else if (!execution.canEnter)
			blockReason = "NO BREAKOUT";

		//--------------------------------------------------
		// RV-13 DEBUG BUILDER TRACE (Temporary)
		//--------------------------------------------------

		AJLoggingGate.group("[RV-13 DEBUG BUILDER]");

		AJLoggingGate.table({
			traceLookup: {
				traceFound: pipelineTrace != null,
				chartId
			}
		});

		AJLoggingGate.table({
			resolved: {
				direction,
				runtimeLongScore,
				runtimeShortScore,
				runtimeTradeScore,
				lifecycleState,
				blockReason
			}
		});

		AJLoggingGate.table({
			contextRaw: {
				ctxLong: context.ctxLong,
				ctxShort: context.ctxShort,
				contextTradeDirectionFinal: (context as any).tradeDirectionFinal,
				contextLongScore: context.longScore
			}
		});

		AJLoggingGate.groupEnd();

        //--------------------------------------------------
        // DEBUG MODEL
        //--------------------------------------------------

        const result:AJDebugResult = {

            state:
                lifecycleState,

            stateText:
                lifecycleState,

			symbol:
				(runtime as any).symbol
				??
				"",

            tradeEngineMode:
                (
                    runtime.intelligentModeEnabled
                        ? "SCORE (INTEL)"
                        : `${runtime.effectiveCalculationMode ?? runtime.tradeEngineMode ?? "SCORE"} (MANUAL)`
                ),

            requestedTradeEngineMode:
                runtime.requestedTradeEngineMode ??
                runtime.tradeEngineMode ??
                "SCORE",

            effectiveCalculationMode:
                runtime.effectiveCalculationMode ??
                runtime.tradeEngineMode ??
                "SCORE",

            intelligentModeEnabled:
                runtime.intelligentModeEnabled ??
                false,

            intelligentModeReason:
                runtime.intelligentModeReason ??
                "",

            intelligentMarketRegime:
                runtime.intelligentMarketRegime ??
                runtime.marketRegime ??
                "UNKNOWN",

            routerMode:
                (state as any).routeAISMC
                    ? "AI_SMC"
                    : (state as any).routeAI
                        ? "AI"
                        : "SCORE",

            direction:
                direction,

            directionText:
                direction > 0
                    ? "LONG"
                    : direction < 0
                        ? "SHORT"
                        : "NONE",

            bias:
                direction,

            scoreReady:
                runtimeTradeScore > 0,

            contextReady:
                context.contextScore > 0,

            breakoutReady:
                context.ctxLong || context.ctxShort,

            executionReady:
                authority.executionAllowed,

            confidence:
                runtimeTradeScore,

			aiConfidence:
				Number(
					(ai as any)?.aiBestScore
					??
					(pipelineTrace as any)?.aiBestScore
					??
					0
				),

			institutionalConfidence:
				Number(confidence.confidence ?? 0),

            tradeActive:
                runtime.positionOpen
                ?? false,

            blockReason,

            regime:
                "-",

			optionSymbol:
				(option as any)?.optionSymbol
				?? "-",

			atmStrike:
				(option as any)?.atmStrike
				?? "-",

			itmStrike:
				(option as any)?.itmStrike
				?? "-",

			otmStrike:
				(option as any)?.otmStrike
				?? "-",

			aiStatus:
				((pipelineTrace as any)?.ai?.message)
				?? "BLOCK",
			
			smcStatus:
				(smc as any)?.smcCorePass
					? "ACTIVE"
					: "NA",
			
			authorityStatus:
				((pipelineTrace as any)?.authority?.message)
				?? blockReason,

            lines:[]
        };

		//--------------------------------------------------
		// PINE STYLE DEBUG TABLE
		//--------------------------------------------------
	
		const tradeMode =
			((pipelineTrace as any)?.tradeMode)
			??
			result.routerMode;
			
		const scoreBreakdown =
			((pipelineTrace as any)?.scoreBreakdown)
			??
			{
				ema:0,
				vwap:0,
				cvd:0,
				adx:0,
				context:0,
				insideBar:0,
				boost:0
			};
	
		const longScore =
			runtimeLongScore;
	
		const shortScore =
			runtimeShortScore;
	
		const tradeScore =
			runtimeTradeScore;
	
		const indexBiasText =
			indexDirection > 0
				? "BULLISH"
				: indexDirection < 0
					? "BEARISH"
					: "NEUTRAL";

		const optionBiasText =
			isOptionSymbol
				? "BULLISH"    // buy-only: option premium bias is always long
				: null;

		const directionLabel =
			direction > 0
				? "LONG"
				: direction < 0
					? "SHORT"
					: "NONE";

        const isOptionChart =
                isOptionSymbol;

        const optionType =
                isOptionChart
                        ? (
                                /CE$/i.test(result.symbol)
                                        ? "CE"
                                        : "PE"
                          )
                        : direction > 0
                                ? "CE"
                                : direction < 0
                                        ? "PE"
                                        : "-";
	
		const volumeText =
			(context as any).volumeStatus
			??
			(
				authority.executionAllowed
					? "PASS"
					: "VALIDATING"
			);
	
		const lifecycleText =
			lifecycleState;
	
		const barText =
			String(
				(pipelineTrace as any)?.barIndex
				??
				"-"
			);
	
		const topRejectionReason =
			!authority.executionAllowed
				? (authority.rejectionReasons?.[0] ?? "No reason reported")
				: "";

		const authorityText =
			((pipelineTrace as any)?.authority?.message)
			??
			(
				authority.executionAllowed
					? "PASS"
					: topRejectionReason
			);

		//--------------------------------------------------
		// REASON FOR TRADE (tooltip source)
		//
		// Mirrors ExecutionAuthority.ts's actual
		// mandatoryGatesPassed formula: recommendation +
		// confidence threshold + trendAligned + orderFlow
		// confirmed. Everything else (momentum/structure/
		// institutional confluence) is scored but NOT
		// currently a hard gate - shown for context only.
		//--------------------------------------------------

		const reasonThreshold =
			AJRuntimeParameters.confidenceThreshold;

		const orderFlowConfirmed =
			(runtime as any)?.cvdBull === true ||
			(runtime as any)?.cvdBear === true;

		const gateConfidence =
			(confidence.aiConfidence ?? 0) >= reasonThreshold;

		const gateRecommendation =
			(confidence.recommendation ?? "NO_TRADE") !== "NO_TRADE";

		const gateTrend =
			authority.trendAligned;

		const failingMandatoryGate =
			!gateRecommendation
				? "No trade recommendation"
				: !gateConfidence
					? "Confidence below threshold"
					: !gateTrend
						? "Trend not aligned"
						: !orderFlowConfirmed
							? "Order Flow not confirmed"
							: "";

		result.tradeReasons = {

			summary:
				authority.executionAllowed
					? "READY"
					: (failingMandatoryGate || blockReason),

			gates: [
				{
					label: "Confidence (required)",
					value: `${Math.round(confidence.aiConfidence ?? 0)} / ${reasonThreshold}`,
					passed: gateConfidence
				},
				{
					label: "Recommendation (required)",
					value: confidence.recommendation ?? "NO_TRADE",
					passed: gateRecommendation
				},
				{
					label: "Trend Aligned (required)",
					value: authority.trendAligned ? "YES" : "NO",
					passed: gateTrend
				},
				{
					label: "Order Flow Confirmed (required)",
					value: orderFlowConfirmed ? "YES" : "NO",
					passed: orderFlowConfirmed
				},
				{
					label: "Momentum Aligned",
					value: authority.momentumAligned ? "YES" : "NO",
					passed: authority.momentumAligned
				},
				{
					label: "Structure Aligned",
					value: authority.structureAligned ? "YES" : "NO",
					passed: authority.structureAligned
				},
				{
					label: "Institutional Confluence",
					value: authority.institutionalConfluence ? "YES" : "NO",
					passed: authority.institutionalConfluence
				}
			],

			positiveFactors:
				confidence.positiveFactors ?? [],

			negativeFactors:
				confidence.negativeFactors ?? []

		};

		const runtimeModeLabel =
			AJRuntimeParameters.developerRuntimeOverride
				? "DEV"
				: "PROD";

		const scoreThreshold =
			AJRuntimeParameters.confidenceThreshold;

		const scoreThresholdText =
			`${tradeScore} (${runtimeModeLabel} ${
				tradeScore >= scoreThreshold ? ">" : "<"
			} ${scoreThreshold})`;
	
		const advCryptoActive =
			(runtime as any)?.enableAdvancedCrypto === true;
		
		const advBTCActive =
			(runtime as any)?.cryptoBTCMode === true;
		
        const intelligentMode =
            (runtime as any)?.intelligentModeEnabled === true;

        const effectiveMode =
            (runtime as any)?.effectiveCalculationMode
            ??
            (runtime as any)?.tradeEngineMode
            ??
            tradeMode;

        const requestedMode =
            (runtime as any)?.requestedTradeEngineMode
            ??
            (runtime as any)?.tradeEngineMode
            ??
            "SCORE";

        const tradeModeDisplay =
            intelligentMode
                ? `SCORE (INTEL) → ${effectiveMode}`
                : `${requestedMode} (MANUAL)`;
		
		const col = (
			c1:string,
			c2:string,
			c3:string,
			c4:string
		)=>
		
			"║ "
			+ c1.padEnd(10," ")
			+ "│ "
			+ c2.padEnd(14," ")
			+ "│ "
			+ c3.padEnd(10," ")
			+ "│ "
			+ c4.padEnd(14," ")
			+ "║";
		
		const sep =
		"╠═══════════╪═══════════════╪═══════════╪═══════════════╣";

		const lines:string[] = [
		
		"╔═══════════╤═══════════════╤═══════════╤═══════════════╗",
		
		col(
			"SYMBOL",
			result.symbol,
			"TRADE MODE",
			tradeModeDisplay
		),
		
		col(
			"LIFE",
			lifecycleText,
			"BAR",
			barText
		),
		
        col(
            "REQUESTED",
            requestedMode,
            "EFFECTIVE",
            effectiveMode
        ),

        col(
            "INTEL",
            intelligentMode ? "ON" : "OFF",
            "REASON",
            String(
                (runtime as any)?.intelligentModeReason ??
                "-"
            ).slice(0, 14)
        ),
		
		col(
			"ADVCRYPTO",
			advCryptoActive ? "ON" : "OFF",
			"BTC MODE",
			advBTCActive ? "ON" : "OFF"
		),
		
		sep,
		
		col(
			"Runtime",
			runtime != null ? "[OK]" : "[X]",
			"Context",
			(pipelineTrace as any)?.context?.executed? "[OK]" : "[X]"
		),
		
		col(
			"Score",
			(pipelineTrace as any)?.context?.executed? "[OK]" : "[X]",
			"AI",
			tradeMode === "SCORE"
				? "HIDDEN"
				: ((pipelineTrace as any)?.ai?.executed? "[OK]" : "[X]")
		),
		
		col(
			"SMC",
			tradeMode === "SCORE"
				? "HIDDEN"
				: ((pipelineTrace as any)?.smc?.executed? "[OK]" : "[X]"),
			"Authority",
			(pipelineTrace as any)?.authority?.executed? "[OK]" : "[X]"
		),
		
		col(
			"State",
			(pipelineTrace as any)?.stateMachine?.executed? "[OK]" : "[X]",
			"Execution",
			(pipelineTrace as any)?.execution?.executed? "[OK]" : "[X]"
		),
		
		sep,
		
		col(
			"EMA",
			String(scoreBreakdown.ema),
			"VWAP",
			String(scoreBreakdown.vwap)
		),
		
		col(
			"CVD",
			String(scoreBreakdown.cvd),
			"ADX",
			Number(scoreBreakdown.adx ?? 0).toFixed(2)
		),
		
		col(
			"CTX",
			String(scoreBreakdown.context),
			"INSIDE",
			String(scoreBreakdown.insideBar)
		),
		
		col(
			"BOOST",
			String(scoreBreakdown.boost),
			"TOTAL",
			scoreThresholdText
		),
		
		sep,
		
		col(
			"LONG",
			String(longScore),
			"SHORT",
			String(shortScore)
		),
		
		...(isOptionChart
		? [
		
//		Index/stock chart: one row → BIAS | BULLISH/BEARISH | DIR | LONG/SHORT (unchanged behavior).
//		Option (CE/PE) chart: two rows → BIAS(IDX) | <real index bias> | DIR | LONG and BIAS(OPT) | BULLISH | (blank).
		
		col(
			"BIAS(IDX)",
			indexBiasText,
			"DIR",
			directionLabel
		),

		col(
			"BIAS(OPT)",
			optionBiasText ?? "-",
			"",
			""
		)

		]
		: [

		col(
			"BIAS",
			indexBiasText,
			"DIR",
			directionLabel
		)

		]),
		

        ...(isOptionChart
        ? [

        col(
                "OPTION",
                optionType,
                "",
                ""
        )

        ]
        : [

        col(
                "OPTION",
                optionType,
                "ATM",
                String(result.atmStrike)
        ),

        col(
                "",
                "",
                "ITM",
                String(result.itmStrike)
        ),

        col(
                "",
                "",
                "OTM",
                String(result.otmStrike)
        )

        ]),
		
		col(
			"VOL",
			volumeText,
			"AUTH",
			authorityText
		),
		
		...(!authority.executionAllowed
		? [
			col(
				"REASON",
				topRejectionReason,
				"",
				""
			)
		]
		: []),
		
		...(tradeMode !== "SCORE"
		? [
		
		sep,
		
		col(
			"AI SCORE",
			String((pipelineTrace as any)?.aiBestScore?? 0),
			"AI DIR",
			((pipelineTrace as any)?.aiBestDir?? 0) > 0
				? "LONG"
				: ((pipelineTrace as any)?.aiBestDir?? 0) < 0
					? "SHORT"
					: "NONE"
		),
		
		col(
			"AI MODE",
			result.aiStatus,
			"SMC",
			result.smcStatus
		)
		
		]
		:[]),
		
		"╚═══════════╧═══════════════╧═══════════╧═══════════════╝"
		
		];
	
		result.lines = lines;
			
        return result;
    }
}