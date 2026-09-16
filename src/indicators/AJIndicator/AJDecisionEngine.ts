/****************************************************************************************
 * File:
 * AJDecisionEngine.ts
 *
 * Purpose:
 * Central orchestration pipeline for the AJ Institutional Indicator.
 * Coordinates every engine in the frozen AJ v2 architecture while keeping
 * each engine responsible for a single concern.
 *
 * Responsibility:
 * - Execute engines in pipeline order
 * - Pass runtime context between engines
 * - Collect engine outputs
 * - Build the final AJIndicatorResult
 *
 * This class DOES NOT perform trading calculations directly.
 * All business logic belongs inside the individual engines.
 *
 * AJ v2 Pipeline
 * ===================
 * Runtime Context
 *      │
 *      ▼
 * Context
 *      │
 *      ▼
 * Market State
 *      │
 *      ▼
 * Order Flow
 *      │
 *      ▼
 * Market Structure
 *      │
 *      ▼
 * Liquidity
 *      │
 *      ▼
 * Order Block
 *      │
 *      ▼
 * Trend
 *      │
 *      ▼
 * Price Action
 *      │
 *      ▼
 * Momentum
 *      │
 *      ▼
 * Volatility
 *      │
 *      ▼
 * Multi-Timeframe
 *      │
 *      ▼
 * Risk Qualification
 *      │
 *      ▼
 * Confidence
 *      │
 *      ▼
 * Authority
 *      │
 *      ▼
 * State Machine
 *      │
 *      ▼
 * Execution
 ****************************************************************************************/

import type {
    AJIndicatorPayload,
    AJIndicatorResult
} from "./AJTypes";

import { AJContextEngine } from "./AJContextEngine";
import { ConfidenceEngine } from "./engines/Confidence";
import { AIEngine } from "./ai/AIEngine";
import { SMCEngine } from "./smc/SMCEngine";
import { EngineState } from "./core/EngineState";
import { StateMachine } from "./core/StateMachine";
import { ExecutionAuthority } from "./engines/Authority";
import { ExecutionEngine } from "./engines/Execution/ExecutionEngine";
import type { ExecutionContext } from "./engines/Execution/ExecutionTypes";
import { OptionRecommendation } from "./options/OptionRecommendation";
import { AJDashboardAdapter } from "../../dashboard/AJDashboardAdapter";
import { AJPipelineTrace } from "./debug/AJPipelineTrace";
import { AJLoggingGate } from "./debug/AJLoggingGate";
import type { AJDecisionSnapshot } from "./debug/AJDecisionSnapshot";
import { AJDebugBuilder } from "./debug/AJDebugBuilder";
import { RuntimeParameters } from "../../runtime/config/RuntimeParameters";
import { AJRuntimeParameters } from "./config/AJRuntimeParameters";
import { CryptoScoreEngine } from "./crypto/CryptoScoreEngine";
import { SmartTradeSyncEngine } from "../../runtime/sync/SmartTradeSyncEngine";
import { RiskQualificationEngine } from "./engines/RiskQualification";

//=========================================================================================

export class AJDecisionEngine {

    //--------------------------------------------------
    // CORE PIPELINE ENGINES
    //--------------------------------------------------

    /**
     * Stage 1
     * Context / Legacy compatibility
     */
    private readonly contextEngine =
        new AJContextEngine();

    /**
     * Stage 2
     * AI Decision Engine
     */
    private readonly aiEngine =
        new AIEngine();

    /**
     * Stage 3
     * SMC Decision Engine
     */
    private readonly smcEngine =
        new SMCEngine();

    /**
     * Stage 4
     * Execution Authority
     */
    private readonly authorityEngine =
        new ExecutionAuthority();

	/**
     * Stage 5
     * Pine-compatible lifecycle state machine
     */
    private readonly stateMachine =
        new StateMachine();

    /**
     * Stage 6
     * Execution planning engine
     */
    private readonly executionEngine =
        new ExecutionEngine();
		
	private readonly cryptoScoreEngine =
        new CryptoScoreEngine();
    //--------------------------------------------------
    // TRADE PLAN LOCK
    //
    // Once a trade is ARMED, entry/SL/TP1-3 must freeze at
    // the price they were computed at that moment - not keep
    // re-deriving from the live price every cycle. Without
    // this, every candle silently redraws the trade plan,
    // which is why entries/levels and the AJ Advisory verdict
    // (which reads the same live-recomputed state) kept
    // changing on every tick instead of holding a locked plan
    // until the trade reaches SCAN/CLOSED again.
    //--------------------------------------------------

	private static tradePlanLock: any = {};
	
	/**
	* Last executed trade snapshot.
	*
	* This is intentionally separate from tradePlanLock.
	*
	* tradePlanLock:
	*   controls the ACTIVE trade plan.
	*
	* lastTradeSnapshot:
	*   preserves the last executed trade's ENTRY / SL / TP1-3
	*   after the lifecycle reaches CLOSED/LOCKED.
	*
	* The dashboard must continue displaying this snapshot until
	* another trade is actually executed.
	*/
	private static lastTradeSnapshot: any = {};

     //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    evaluate(
        payload: AJIndicatorPayload
    ): AJIndicatorResult {

	AJLoggingGate.log(
		"AJDecisionEngine.evaluate()",
		payload.ajRuntime.symbol,
		payload.ajRuntime.barIndex
	);
        //--------------------------------------------------
        // PIPELINE TRACE
        //--------------------------------------------------
        
        const traceId =
            payload.ajRuntime.chartId ??
            payload.ajRuntime.symbol ??
            "GLOBAL";
        
        AJPipelineTrace.begin(
            traceId,
            {
                symbol: payload.ajRuntime.symbol,
                timeframe: payload.ajRuntime.timeframe,
                chartId: payload.ajRuntime.chartId,
                tradeMode:
                    payload.ajRuntime.tradeEngineMode ??
                    "SCORE"
            }
        );
        
        //--------------------------------------------------
        // MODE TRACE
        //
        // Mode is resolved after canonical ContextResult
        // creation below. Do not reference the decision
        // before it exists.
        //--------------------------------------------------
		
		//--------------------------------------------------
		// RV-CTX-CANONICAL
		// Canonical ContextResult creation + typed rich view
		//--------------------------------------------------
		
		const contextResult: any =
			this.contextEngine.evaluate(
				payload.contextInputs,
				payload.scoreInputs
			)

        const context: any = contextResult as any;
		
		//--------------------------------------------------
		// RV-07E
		// CANONICAL PAYLOAD NORMALIZATION
		//
		// Replace the runtime placeholder carried by the
		// transport payload with the evaluated market
		// direction produced by ContextEngine.
		//
		// Only normalize fields that belong to the
		// ConfidenceInput contract.
		//--------------------------------------------------
		
		payload.scoreInputs.tradeDirection =
			contextResult.tradeDirectionFinal;

		//--------------------------------------------------
		// RV-07F
		// CANONICAL DIRECTION SYNC
		//
		// RV-07E above normalizes payload.scoreInputs only.
		// payload.tradeDirectionFinal is the field actually
		// read by AI Engine, Authority Engine, State Machine
		// and the final router output later in this function.
		// Sync it here so every downstream stage sees the
		// same canonical value produced by ContextEngine.
		//--------------------------------------------------

		payload.tradeDirectionFinal =
			contextResult.tradeDirectionFinal;

        //--------------------------------------------------
        // RUNTIME SYNCHRONIZATION
        //--------------------------------------------------

		payload.ajRuntime.ctxLong =
			contextResult.ctxLong;
		
		payload.ajRuntime.ctxShort =
			contextResult.ctxShort;
		
		payload.ajRuntime.scoreLong =
			contextResult.longScore;
		
		payload.ajRuntime.scoreShort =
			contextResult.shortScore;

		// RV-11B â€” ajRuntime.tradeDirectionFinal/tradeScore were never
		// synced (only the top-level payload.tradeDirectionFinal was).
		// If the debug dashboard reads ajRuntime directly, this is why
		// it shows SCORE 0 / DIRECTION NONE despite real values upstream.
		payload.ajRuntime.tradeDirectionFinal =
			contextResult.tradeDirectionFinal;

		payload.ajRuntime.tradeScore =
			contextResult.tradeScore;
		
		//--------------------------------------------------
        // SMART TRADE SYNC
        //--------------------------------------------------

        const syncRuntime =
            RuntimeParameters.forChart(
                payload.ajRuntime.chartId ??
                payload.ajRuntime.symbol ??
                "GLOBAL"
            );

        const syncResult =
            SmartTradeSyncEngine.evaluate({

                chartId:
                    payload.ajRuntime.chartId,

                symbol:
                    payload.ajRuntime.symbol,

                direction:
                    contextResult.tradeDirectionFinal,

                tradeScore:
                    contextResult.tradeScore,

                confidence:
                    payload.ajRuntime.executionConfidence,

                barIndex:
                    payload.ajRuntime.barIndex,

                mode:
                    (
                        syncRuntime as any
                    ).syncMode ??
                    "Sync OFF",

                syncBars:
                    (
                        syncRuntime as any
                    ).syncBars ??
                    3,

                desyncBars:
                    (
                        syncRuntime as any
                    ).desyncBars ??
                    2

            });

        SmartTradeSyncEngine.publish({

            chartId:
                payload.ajRuntime.chartId,

            symbol:
                payload.ajRuntime.symbol,

            direction:
                contextResult.tradeDirectionFinal,

            tradeScore:
                contextResult.tradeScore,

            confidence:
                payload.ajRuntime.executionConfidence,

            barIndex:
                payload.ajRuntime.barIndex,

            timestamp:
                Date.now()

        });

		payload.ajRuntime.smartSync = {
			enabled:
				syncResult.enabled,
		
			mode:
				"Sync OFF",
		
			pair:
				syncResult.pair,
		
			available:
				syncResult.available,
		
			aligned:
				syncResult.aligned,
		
			detached:
				syncResult.detached,
		
			direction:
				syncResult.direction ?? 0,
		
			score:
				syncResult.score ?? 0,
		
			confidence:
				syncResult.confidence ?? 0,
		
			barDistance:
				syncResult.barDistance ?? 0,
		
			reason:
				syncResult.reason ?? ""
		};

        payload.ajRuntime.runtimeIntelligence = {

            ...payload.ajRuntime.runtimeIntelligence,

            syncEnabled:
                syncResult.enabled,

            syncAligned:
                syncResult.aligned,

            syncDetached:
                syncResult.detached,

            syncPair:
                syncResult.pair,

            syncReason:
                syncResult.reason

        };

		//--------------------------------------------------
        // AJ v2 Confidence Compatibility
        //
        // RV-08B
        // AJContextEngine.evaluate() already computes this result
        // internally (see its own RV-07E TRACE) but never returns it.
        // Re-deriving it here is a stopgap â€” evaluate() is a pure
        // static function, so this is identical to what AJContextEngine
        // already computed, not a second independent calculation.
        //--------------------------------------------------

		// RV-16B
		// Same fix as RV-16 below, applied to the input actually
		// consumed by ConfidenceEngine. payload.scoreInputs.trend/
		// momentum.direction were captured in AJPayloadBuilder.ts
		// from ajRuntime.tradeDirectionFinal, which is always 0 at
		// build time (AJRuntimeContextBuilder.ts leaves it as a
		// placeholder). Only payload.scoreInputs.tradeDirection was
		// ever resynced (RV-07E) â€” trend.direction/momentum.direction
		// stayed stale at 0, permanently failing ConfidenceEngine's
		// trend/momentum checks against the real direction.
		payload.scoreInputs.trend = {
			...payload.scoreInputs.trend,
			direction: payload.tradeDirectionFinal
		};

		payload.scoreInputs.momentum = {
			...payload.scoreInputs.momentum,
			direction: payload.tradeDirectionFinal
		};

		const confidenceResult =
			ConfidenceEngine.evaluate(
				payload.scoreInputs
			);

		payload.ajRuntime.confidence =
			confidenceResult;

		payload.ajRuntime.contextConfidence =
			confidenceResult.confidence;

		payload.ajRuntime.executionConfidence =
			confidenceResult.confidence;

		payload.ajRuntime.institutionalScore =
			confidenceResult.confidence;

        //--------------------------------------------------
        // PIPELINE TRACE
        //--------------------------------------------------

        AJPipelineTrace.stage(
            traceId,
            "context",
            {
                executed: true,
                passed:
                    contextResult.ctxLong ||
                    contextResult.ctxShort,
                value:
                    contextResult.tradeScore,
				message:
					contextResult.tradeDirectionFinal > 0
						? "LONG"
						: contextResult.tradeDirectionFinal < 0
							? "SHORT"
							: "NONE",
                details: {
					tradeDirection:	contextResult.tradeDirectionFinal,
					longScore: contextResult.longScore,
					shortScore:	contextResult.shortScore,
					tradeScore:	contextResult.tradeScore,
                    confidence: payload.ajRuntime.contextConfidence
                }
            }
        );
        
        //--------------------------------------------------
        // INTELLIGENT TRADE MODE CONTROLLER
        // Intelligent-mode decision
        // SCORE is the default intelligent controller.
        // AI / AI_SMC are manual overrides.
        //--------------------------------------------------

        const runtime =
            RuntimeParameters.forChart(
                payload.ajRuntime.chartId ??
                payload.ajRuntime.symbol
            );

	const intelligentModeDecision =
		runtime.resolveIntelligentMode({
	
			tradeScore:
				context.tradeScore ?? 0,
	
			trendScore:
				context.trendScore ?? 0,
	
			momentumScore:
				context.momentumScore ?? 0,
	
			structureScore:
				(contextResult as any).structureScore ?? 0,
	
			liquidityScore:
				(contextResult as any).liquidityScore ?? 0,
	
			institutionalScore:
				context.institutionalScore ?? 0,
	
			volatilityScore:
				(contextResult as any).volatilityScore ?? 0,
				
			volatilityState:
				(contextResult as any).volatilityState ?? "NORMAL",
				
			bosBull:
				!!(contextResult as any).bosBull ||
				!!(contextResult as any).bosBear,
			
			chochBull:
				!!(contextResult as any).chochBull ||
				!!(contextResult as any).chochBear,
			
			liquiditySweep:
				!!(contextResult as any).liquidityGrabConfirmed,
	
			fvgRetest:
				payload.contextInputs.smcBullFvgRetest ||
				payload.contextInputs.smcBearFvgRetest,
	
			retailTrap:
				context.retailTrap,
	
			marketRegime:
				context.marketRegime,
	
			marketState:
				context.marketState
	
		});
		
		//--------------------------------------------------
        // SMART SYNC AS INTELLIGENT EVIDENCE
        //--------------------------------------------------

        if(
            syncResult.enabled &&
            syncResult.available
        ){

            if(
                syncResult.aligned &&
                syncResult.direction ===
                    contextResult.tradeDirectionFinal
            ){

                intelligentModeDecision.reason +=
                    " | Cross-market sync aligned";

            }

            if(
                syncResult.detached
            ){

                intelligentModeDecision.reason +=
                    " | Cross-market sync detached";

            }

        }

        //--------------------------------------------------
        // RUNTIME MODE SYNCHRONIZATION
        //--------------------------------------------------

        payload.ajRuntime.tradeEngineMode =
            intelligentModeDecision.effectiveMode;

        (payload.ajRuntime as any).requestedTradeEngineMode =
            intelligentModeDecision.requestedMode;

        (payload.ajRuntime as any).effectiveCalculationMode =
            intelligentModeDecision.effectiveMode;

        (payload.ajRuntime as any).intelligentModeEnabled =
            intelligentModeDecision.intelligent;

        (payload.ajRuntime as any).intelligentModeReason =
            intelligentModeDecision.reason;

        (payload.ajRuntime as any).intelligentMarketRegime =
            intelligentModeDecision.regime;

        payload.ajRuntime.enableAITradeSafety =
            intelligentModeDecision.effectiveMode !== "SCORE";

        payload.ajRuntime.enableAISMCMode =
            intelligentModeDecision.effectiveMode === "AI_SMC";

        //--------------------------------------------------
        // PIPELINE TRACE
        //--------------------------------------------------

        AJPipelineTrace.stage(
            traceId,
            "mode" as any,
            {
                executed: true,
                passed: true,
                value:
                    intelligentModeDecision.effectiveMode === "AI_SMC"
                        ? 3
                        : intelligentModeDecision.effectiveMode === "AI"
                            ? 2
                            : 1,
                message:
                    intelligentModeDecision.intelligent
                        ? "SCORE (INTELLIGENT)"
                        : `${intelligentModeDecision.effectiveMode} (MANUAL)`,
                details: {

                    requestedMode:
                        intelligentModeDecision.requestedMode,

                    effectiveCalculation:
                        intelligentModeDecision.effectiveMode,

                    intelligent:
                        intelligentModeDecision.intelligent,

                    reason:
                        intelligentModeDecision.reason,

                    regime:
                        intelligentModeDecision.regime

                }
            }
        );

        //--------------------------------------------------
        // AI ENGINE
        //--------------------------------------------------

        const aiEnabled =
            payload.ajRuntime.tradeEngineMode === "AI" ||
            payload.ajRuntime.tradeEngineMode === "AI_SMC";

        const aiResult =
            aiEnabled

                ? this.aiEngine.evaluate({
					tradeDirectionFinal: payload.tradeDirectionFinal,

					aiScalperEnabled:
						RuntimeParameters.forChart(
							payload.ajRuntime.chartId ?? payload.ajRuntime.symbol
						).aiScalperEnabled,
					
					strategyProfile:
						RuntimeParameters.forChart(
							payload.ajRuntime.chartId ?? payload.ajRuntime.symbol
						).smcProfile,

					aiTrendLong: payload.contextInputs.aiTrendLong,
					aiTrendShort: payload.contextInputs.aiTrendShort,
					vwapBull: payload.contextInputs.vwapBull,
					vwapBear: payload.contextInputs.vwapBear,
					cvdBull: payload.contextInputs.cvdBull,
					cvdBear: payload.contextInputs.cvdBear,
					aiBullDisplacement:	payload.contextInputs.aiBullDisplacement,
					aiBearDisplacement:	payload.contextInputs.aiBearDisplacement,
					aiBreakFollowLong: payload.contextInputs.aiBreakFollowLong,
					aiBreakFollowShort:	payload.contextInputs.aiBreakFollowShort,
					aiSweepThenLong: payload.contextInputs.aiSweepThenLong,
					aiSweepThenShort: payload.contextInputs.aiSweepThenShort,
					
					aiMarketQualityOk:
						context.overallScore >= 50 &&
						context.volatilityState !== "EXTREME",
					
					aiWeakBody:
						context.momentumScore < 40,
					
					aiTrapDetected:
						context.retailTrap !== "NONE",
					
					aiSideways:
						context.marketRegime === "RANGING" ||
						context.marketRegime === "CHOPPY",
					
					aiWeakPremium:
						false
				})

                : {

                    aiScoreLong: 0,
                    aiScoreShort: 0,

                    aiBestScore: 0,
                    aiBestDir: 0,

                    aiSafeEntry: false,
                    aiFastScalp: false,

                    aiCorePass: false,

                    aiModeText: "DISABLED",

                    aiReasonText:
                        "Score Mode"

                };

        //--------------------------------------------------
        // RUNTIME SYNCHRONIZATION
        //--------------------------------------------------

        payload.ajRuntime.aiScoreLong =
            aiResult.aiScoreLong;

        payload.ajRuntime.aiScoreShort =
            aiResult.aiScoreShort;

        payload.ajRuntime.aiBestScore =
            aiResult.aiBestScore;

        payload.ajRuntime.aiBestDir =
            aiResult.aiBestDir;

        payload.ajRuntime.aiSafeEntry =
            aiResult.aiSafeEntry;

        payload.ajRuntime.aiFastScalp =
            aiResult.aiFastScalp;

        payload.ajRuntime.aiCorePass =
            aiResult.aiCorePass;

        //--------------------------------------------------
        // AJ v2 Runtime Intelligence
        //--------------------------------------------------

        payload.ajRuntime.runtimeIntelligence = {

            ...payload.ajRuntime.runtimeIntelligence,

            aiConfidence:
                payload.ajRuntime.aiConfidence,

            executionConfidence:
                payload.ajRuntime.executionConfidence,

            institutionalScore:
                payload.ajRuntime.institutionalScore,

            requestedTradeEngineMode:
                payload.ajRuntime.requestedTradeEngineMode,

            effectiveCalculationMode:
                payload.ajRuntime.effectiveCalculationMode,

            intelligentModeEnabled:
                payload.ajRuntime.intelligentModeEnabled,

            intelligentModeReason:
                payload.ajRuntime.intelligentModeReason,

            intelligentMarketRegime:
                payload.ajRuntime.intelligentMarketRegime

        };
		
		//--------------------------------------------------
        // INTELLIGENT MODE DEBUG
        //--------------------------------------------------

        AJLoggingGate.group(
            "[AJ INTELLIGENT MODE]"
        );

        AJLoggingGate.table({

            tradeMode:
                intelligentModeDecision.intelligent
                    ? "SCORE (INTELLIGENT)"
                    : `${intelligentModeDecision.effectiveMode} (MANUAL)`,

            requestedMode:
                intelligentModeDecision.requestedMode,

            effectiveCalculation:
                intelligentModeDecision.effectiveMode,

            intelligent:
                intelligentModeDecision.intelligent,

            marketRegime:
                intelligentModeDecision.regime,

            reason:
                intelligentModeDecision.reason,

            tradeScore:
                (contextResult as any).tradeScore,

            structureScore:
                (contextResult as any).structureScore,

            liquidityScore:
                (contextResult as any).liquidityScore,

            volatilityScore:
                (contextResult as any).volatilityScore,

			volatilityState:
				(contextResult as any).volatilityState ?? "NORMAL",

            bos:
				!!(contextResult as any).bosBull ||
				!!(contextResult as any).bosBear,

            choch:
				!!(contextResult as any).chochBull ||
				!!(contextResult as any).chochBear,

            liquiditySweep:
                !!(contextResult as any).liquidityGrabConfirmed,

            fvgRetest:
                payload.contextInputs.smcBullFvgRetest ||
                payload.contextInputs.smcBearFvgRetest

        });

        AJLoggingGate.groupEnd();

        //--------------------------------------------------
        // PIPELINE TRACE
        //--------------------------------------------------

        AJPipelineTrace.stage(
            traceId,
            "ai",
            {
                executed: aiEnabled,
                passed: aiResult.aiCorePass,
                value: aiResult.aiBestScore,
                message: aiResult.aiModeText,
                details: {
                    direction: aiResult.aiBestDir,
                    scoreLong: aiResult.aiScoreLong,
                    scoreShort: aiResult.aiScoreShort,
                    safeEntry: aiResult.aiSafeEntry,
                    fastScalp: aiResult.aiFastScalp,
                    corePass: aiResult.aiCorePass,
                    marketQuality: payload.ajRuntime.aiConfidence ?? false
                }
            }
        );

        //--------------------------------------------------
        // SMC
        //--------------------------------------------------
        
		const smcResult =
			payload.ajRuntime.tradeEngineMode === "AI_SMC"

        ? this.smcEngine.evaluate({

            tradeDirectionFinal:
                payload.tradeDirectionFinal,

            smcProfile:
                RuntimeParameters.forChart(
                    payload.ajRuntime.chartId ??
                    payload.ajRuntime.symbol
                ).smcProfile,

            smcBosBull:
                payload.contextInputs.smcBosBull,

            smcBosBear:
                payload.contextInputs.smcBosBear,

            smcChochBull:
                payload.contextInputs.smcChochBull,

            smcChochBear:
                payload.contextInputs.smcChochBear,

            smcBullFvgRetest:
                payload.contextInputs.smcBullFvgRetest,

            smcBearFvgRetest:
                payload.contextInputs.smcBearFvgRetest,

            smcSweepLow:
                payload.contextInputs.smcSweepLow,

            smcSweepHigh:
                payload.contextInputs.smcSweepHigh,

            aiBullDisplacement:
                payload.contextInputs.aiBullDisplacement,

            aiBearDisplacement:
                payload.contextInputs.aiBearDisplacement,

            aiBreakFollowLong:
                payload.contextInputs.aiBreakFollowLong,

            aiBreakFollowShort:
                payload.contextInputs.aiBreakFollowShort,

            aiSweepThenLong:
                payload.contextInputs.aiSweepThenLong,

            aiSweepThenShort:
                payload.contextInputs.aiSweepThenShort
        })

        : {
            smcLong: false,
            smcShort: false,
            smcCorePass: false,
            smcReason: "SKIPPED"
        };
        
        AJPipelineTrace.stage(
            traceId,
            "smc",
            {
                executed:
                    payload.ajRuntime.tradeEngineMode === "AI_SMC",
                passed:
                    smcResult.smcCorePass,
                message:
                    smcResult.smcReason
            }
        );

		//--------------------------------------------------
        // ADVANCED CRYPTO QUALIFICATION
        //--------------------------------------------------

        const cryptoSymbol =
            payload.ajRuntime.symbol ?? "";

		const normalizedAdvancedSymbol =
			cryptoSymbol
				.replace(/^[A-Z]+:/i, "")
				.replace(/[^A-Z0-9]/gi, "")
				.toUpperCase();
		
		const isAdvancedCryptoSymbol =
			/^(BTC|ETH|SOL|XRP|BNB|ADA|DOGE|AVAX|DOT|LINK|LTC|TRX|MATIC|XAU)(USD|USDT|USDC|INR)?$/
				.test(normalizedAdvancedSymbol) ||
			/^(EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|USDCHF|NZDUSD|EURGBP|EURJPY|GBPJPY|XAUUSD|GOLD)$/
				.test(normalizedAdvancedSymbol);

        const cryptoScoreResult =
            this.cryptoScoreEngine.calculate({

                chartId:
                    payload.ajRuntime.chartId ??
                    cryptoSymbol,

                advCryptoMode:
                    payload.ajRuntime.enableAdvancedCrypto,

                isAdvCryptoSymbol:
                    isAdvancedCryptoSymbol,

                tradeScore:
                    contextResult.tradeScore,

                advMinScore:
                    RuntimeParameters.forChart(
                        payload.ajRuntime.chartId ??
                        cryptoSymbol
                    ).cryptoMinimumScore,

                advTrendOk:
                    ((contextResult as any).trendScore ?? 0) >= 50,

                advRegimeOk:
                    (contextResult as any).volatilityState !== "HIGH",

                inducementBlock:
                    (contextResult as any).retailTrap !== "NONE",

				emaBull:
					!!(contextResult as any).emaBull,
				
				emaBear:
					!!(contextResult as any).emaBear,
				
				vwapBull:
					!!(contextResult as any).vwapBull,
				
				vwapBear:
					!!(contextResult as any).vwapBear,
				
				cvdBull:
					!!(contextResult as any).cvdBull,
				
				cvdBear:
					!!(contextResult as any).cvdBear,
				
				bosBull:
					!!(contextResult as any).bosBull,
				
				bosBear:
					!!(contextResult as any).bosBear,
				
				chochBull:
					!!(contextResult as any).chochBull,
				
				chochBear:
					!!(contextResult as any).chochBear,
				
                liquiditySweepBull:
                    (contextResult as any).liquidityGrabConfirmed &&
                    payload.tradeDirectionFinal > 0,

                liquiditySweepBear:
                    (contextResult as any).liquidityGrabConfirmed &&
                    payload.tradeDirectionFinal < 0,

                aiConfidence:
                    payload.ajRuntime.aiConfidence,

                volatilityScore:
                    Number((contextResult as any).volatilityScore ?? 0),

                liquidityScore:
                    Number((contextResult as any).liquidityScore ?? 0)

            });

        payload.ajRuntime.advCryptoReady =
            cryptoScoreResult.advCryptoReady;

		payload.ajRuntime.cryptoScoreResult = {
			...cryptoScoreResult
		};

        //--------------------------------------------------
        // CRYPTO TRACE
        //--------------------------------------------------

        AJPipelineTrace.stage(
            traceId,
            "crypto" as any,
            {
                executed:
                    payload.ajRuntime.enableAdvancedCrypto &&
                    isAdvancedCryptoSymbol,

                passed:
                    cryptoScoreResult.advCryptoReady,

                value:
                    cryptoScoreResult.institutionalScore,

                message:
                    cryptoScoreResult.advCryptoReady
                        ? "ADVANCED CRYPTO READY"
                        : "ADVANCED CRYPTO BLOCKED",

				details: {
					cryptoScoreResult: {
						...cryptoScoreResult
					}
				}
            }
        );
		
		//--------------------------------------------------
		// CANONICAL RISK QUALIFICATION
		//--------------------------------------------------
		
		const runtimeParameters =
			RuntimeParameters.forChart(
				payload.ajRuntime.chartId ??
				payload.ajRuntime.symbol ??
				"GLOBAL"
			);
		
		const riskQualificationResult: any = 
			RiskQualificationEngine.qualify({
				tradeDirection:
					payload.tradeDirectionFinal as -1 | 0 | 1,
		
				riskReward:
					runtimeParameters.riskReward,
		
				minimumRiskReward:
					runtimeParameters.riskReward,
		
				choppyMarket:
					payload.ajRuntime.marketRegime === "CHOPPY",
		
				nearbySupply:
					payload.ajRuntime.supplyZones
						?.some(
							(zone: any) =>
								zone?.active &&
								payload.tradeDirectionFinal > 0
						) ?? false,
		
				nearbyDemand:
					payload.ajRuntime.demandZones
						?.some(
							(zone: any) =>
								zone?.active &&
								payload.tradeDirectionFinal < 0
						) ?? false,
		
				oppositeTrend:
					(
						payload.tradeDirectionFinal > 0 &&
						payload.ajRuntime.emaBear
					) ||
					(
						payload.tradeDirectionFinal < 0 &&
						payload.ajRuntime.emaBull
					),
		
				oppositeStructure:
					(
						payload.tradeDirectionFinal > 0 &&
						payload.ajRuntime.chochBear
					) ||
					(
						payload.tradeDirectionFinal < 0 &&
						payload.ajRuntime.chochBull
					),
		
				oppositeLiquidity:
					false,
		
				volatilityAcceptable:
					context.volatilityState !== "EXTREME",
		
				sessionOpen:
					true,
		
				highImpactNews:
					false,
		
				marketEnvironment:
					payload.ajRuntime.marketRegime as any,
		
				confidence:
					payload.ajRuntime.executionConfidence,
		
				minimumConfidence:
					runtimeParameters.minimumConfidence,
		
				orderFlowQualified:
					Boolean(
						payload.ajRuntime.cvdBull ||
						payload.ajRuntime.cvdBear ||
						payload.ajRuntime.orderFlow?.bullish ||
						payload.ajRuntime.orderFlow?.bearish
					),
		
				maximumRiskExceeded:
					false
			});
		
		payload.ajRuntime.riskQualificationResult =
			riskQualificationResult;
		
		payload.ajRuntime.riskQualificationApproved =
			riskQualificationResult.approved;
		
		payload.ajRuntime.riskQualification = {
        qualified: Boolean(
            riskQualificationResult.approved ??
            riskQualificationResult.tradeAllowed
        ),

        noTrade:
            riskQualificationResult.decision === "NO_TRADE" ||
            !Boolean(
                riskQualificationResult.approved ??
                riskQualificationResult.tradeAllowed
            ),

        grade: String(
            riskQualificationResult.grade ?? "F"
        ),

		riskScore: Number(
			riskQualificationResult.riskScore ??
			riskQualificationResult.qualificationScore ??
			0
		),

        trapDetected: Boolean(
            riskQualificationResult.trapDetected
        ),

        choppyMarket: Boolean(
            riskQualificationResult.choppyMarket
        ),

        conflictingSignals: Boolean(
            riskQualificationResult.conflictingSignals
        ),

        nearbyResistance: Boolean(
            riskQualificationResult.nearbyResistance
        ),

        nearbySupport: Boolean(
            riskQualificationResult.nearbySupport
        ),

        reason: Array.isArray(
            riskQualificationResult.rejectionReasons
        )
            ? riskQualificationResult.rejectionReasons.join(", ")
            : String(
                riskQualificationResult.reason ??
                ""
            )
    };
        //--------------------------------------------------
        // AUTHORITY ENGINE
        // Phase 1
        // Final execution gate.
        // (Confidence Engine will feed this in later phases.)
        //--------------------------------------------------

		const authorityResult =
            this.authorityEngine.evaluate({

                ...payload.authorityInputs,

                //--------------------------------------------------
                // CONTEXT
                //--------------------------------------------------

                tradeDirection: payload.tradeDirectionFinal,
				
				tradeEngineMode:
                    payload.ajRuntime.tradeEngineMode,
				
				effectiveCalculationMode:
					payload.ajRuntime.effectiveCalculationMode,
				
				requestedTradeEngineMode:
					payload.ajRuntime.requestedTradeEngineMode,
				
				aiCorePass:
					aiResult.aiCorePass,
				
				smcCorePass:
					smcResult.smcCorePass,
				
				advancedCryptoEnabled:
					payload.ajRuntime.enableAdvancedCrypto,
				
				advancedCryptoApplicable:
					isAdvancedCryptoSymbol,
				
				advancedCryptoReady:
					cryptoScoreResult.advCryptoReady,

                intelligentModeEnabled:
                    payload.ajRuntime.intelligentModeEnabled,

				// RV-08C
				// RV-08B's reasoning was wrong (see chat). Only
				// `confidence` is confirmed valid on
				// ExecutionAuthorityInputs â€” the compiler itself
				// suggested it ("Did you mean to write 'confidence'?").
				// Removed the other 5 guessed fields instead of
				// whack-a-moling them one build at a time.
				// confidenceResult already carries .confidence,
				// .tradeQualified, .confidenceGrade, .evidence in
				// one object â€” likely sufficient on its own.
				
				confidence:
					confidenceResult,

				// RV-16
				// trend.direction / momentum.direction inside
				// payload.authorityInputs were captured in
				// AJPayloadBuilder.ts BEFORE RV-07F synced
				// ajRuntime.tradeDirectionFinal to the canonical
				// value â€” only the top-level tradeDirection above
				// was ever refreshed. trendAligned/structureAligned
				// therefore compared a stale 0 against the real
				// direction (1/-1) on every cycle, permanently
				// failing mandatoryGatesPassed and locking the
				// engine in ARMED. Re-sync both nested objects here.

				trend: {
					...payload.authorityInputs.trend,
					direction: payload.tradeDirectionFinal
				},

				momentum: {
					...payload.authorityInputs.momentum,
					direction: payload.tradeDirectionFinal
				},
				
				riskQualification: {
					tradeAllowed:
						!!riskQualificationResult.tradeAllowed,
				
				approved:
						!!riskQualificationResult.approved,
				
				decision: String(
					riskQualificationResult.decision ??
						(riskQualificationResult.approved ? "APPROVED" : "NO_TRADE")
				),
				
				qualificationScore:
					(riskQualificationResult.qualificationScore ?? riskQualificationResult.riskScore ?? 0),
				
				rejectionReasons:
					Array.isArray(riskQualificationResult.rejectionReasons)
						? riskQualificationResult.rejectionReasons
                : [],
				
				riskScore:
					riskQualificationResult.riskScore ?? 0
				},
            });
			
        //--------------------------------------------------
        // RUNTIME SYNCHRONIZATION
        //--------------------------------------------------

        payload.ajRuntime.authorityResult =
            authorityResult;

        payload.ajRuntime.executionReady =
            authorityResult.executionAllowed;
		
		payload.ajRuntime.runtimeIntelligence = {

			...payload.ajRuntime.runtimeIntelligence,
		
			executionReady:
				authorityResult.executionAllowed,
		
			requestedTradeEngineMode:
				payload.ajRuntime.requestedTradeEngineMode,
		
			effectiveCalculationMode:
				payload.ajRuntime.effectiveCalculationMode,
		
			intelligentModeEnabled:
				payload.ajRuntime.intelligentModeEnabled,
		
			intelligentModeReason:
				payload.ajRuntime.intelligentModeReason,
		
			intelligentMarketRegime:
				payload.ajRuntime.intelligentMarketRegime,
		
			riskGrade:
				String(riskQualificationResult.decision ?? (riskQualificationResult.approved ? "APPROVED" : "NO_TRADE")),
		
			evidence: [
				...(payload.ajRuntime.runtimeIntelligence.evidence ?? []),
				...(Array.isArray(riskQualificationResult.rejectionReasons) ? riskQualificationResult.rejectionReasons : [])
			]
		};

        //--------------------------------------------------
        // PIPELINE TRACE
        //--------------------------------------------------

        AJPipelineTrace.stage(
            traceId,
            "authority",
            {
                executed: true,
                passed: authorityResult.executionAllowed,
                value: payload.ajRuntime.executionConfidence,
                message: authorityResult.authorityText,
                details: {
                    executionAllowed: authorityResult.executionAllowed,
                    executionConfidence: payload.ajRuntime.executionConfidence,
                    institutionalConfidence: payload.ajRuntime.institutionalScore,
                    tradeDirection: payload.tradeDirectionFinal,
                    tradeScore: contextResult.tradeScore,
                    mode: payload.ajRuntime.tradeEngineMode
                }
            }
        );
		
		AJPipelineTrace.stage(
			traceId,
            "authorization" as any,
			{
				executed: true,
		
				passed:
					authorityResult.executionAllowed,
		
				value:
					payload.ajRuntime.executionConfidence,
		
				message:
					authorityResult.executionAllowed
						? "TRADE"
						: "NO_TRADE",
		
				details: {
		
					requestedMode:
						payload.ajRuntime.requestedTradeEngineMode,
		
					effectiveMode:
						payload.ajRuntime.effectiveCalculationMode,
		
					environment:
						AJRuntimeParameters.developerRuntimeOverride
							? "DEVELOPMENT"
							: "PRODUCTION",
		
					marketProfile:
						payload.ajRuntime.enableAdvancedCrypto
							? "ADVANCED_CRYPTO"
							: "NORMAL",
		
					strategyProfile:
						runtimeParameters.smcProfile,
		
					baseScore:
						context.tradeScore,
		
					finalConfidence:
						payload.ajRuntime.executionConfidence,
		
					requiredConfidence:
						AJRuntimeParameters.confidenceThreshold,
		
					riskScore:
						Number(riskQualificationResult.qualificationScore ?? riskQualificationResult.riskScore ?? 0),
		
					requiredRisk:
						(ExecutionAuthority as any).minRiskScore ??
						80,
		
					aiCorePass:
						aiResult.aiCorePass,
		
					smcCorePass:
						smcResult.smcCorePass,
		
					advancedCryptoReady:
						cryptoScoreResult.advCryptoReady,
		
					syncState:
						syncResult.enabled
							? (
								syncResult.aligned
									? "ALIGNED"
									: syncResult.detached
										? "DETACHED"
										: "MISMATCH"
							)
							: "OFF",
		
					blockers:
						authorityResult.rejectionReasons
				}
			}
		);
        
		//--------------------------------------------------
        // OPTION CHART DETECTION (hoisted)
        //
        // Needed here, before execution planning, because
        // options-buying strategy means SL/TP1/TP2/TP3 must
        // ALWAYS be built as an ascending buy-side ladder off
        // the option's own entry price - whether the loaded
        // contract is CE or PE, and regardless of whether the
        // underlying index bias is bullish or bearish. Index
        // bias only ever decides WHICH contract (CE vs PE) to
        // recommend, never the shape of the SL/TP ladder.
        //--------------------------------------------------

        const execChartSymbol =
            payload.ajRuntime.symbol ??
            "";

        const execIsOptionChart =
            /(CE|PE)$/i.test(execChartSymbol);
		
		//--------------------------------------------------
        // EXECUTION ENGINE
        //--------------------------------------------------
        const execAtr =
            payload.ajRuntime.atr || 0.0000001;
        const execSlDistance =
            Math.max(execAtr * 1.5, 0.0000001);

        const execDirection =
            execIsOptionChart
                ? 1                              // options-buy: always a long-premium ladder
                : payload.tradeDirectionFinal;   // index/stock chart: keep real bias direction

        //--------------------------------------------------
        // TRADE PLAN LOCK
        //
        // engineState from the PREVIOUS cycle (before this
        // cycle's state machine run) tells us whether a plan
        // is already locked for this chart. SCAN/CLOSED means
        // no active trade - free to recompute off the live
        // price. Anything past SCAN (ARMED/CONFIRMED/EXECUTED/
        // MANAGE) means a plan already exists - reuse it
        // untouched so entry/SL/TP never drift mid-trade.
        //--------------------------------------------------

        const lockKey =
            payload.ajRuntime.chartId ??
            payload.ajRuntime.symbol ??
            "GLOBAL";

        const previousEngineState =
            payload.ajRuntime.engineState;

        const planIsLocked =
            previousEngineState != null &&
            previousEngineState !== "SCAN" &&
            previousEngineState !== "CLOSED";

        const existingLock =
            AJDecisionEngine.tradePlanLock[lockKey];

        let execEntryPrice: number;
        let execSlPrice: number;
        let execTp1: number;
        let execTp2: number;
        let execTp3: number;
        let execEntryBarIndex: number;

        if (planIsLocked && existingLock) {

            execEntryPrice = existingLock.entryPrice;
            execSlPrice = existingLock.slPrice;
            execTp1 = existingLock.tp1;
            execTp2 = existingLock.tp2;
            execTp3 = existingLock.tp3;
            execEntryBarIndex =
                existingLock.entryBarIndex ??
                payload.ajRuntime.barIndex;

        } else {

            const hasRealEntryPrice =
                payload.riskInputs.entryPrice > 0;

            execEntryPrice =
                hasRealEntryPrice
                    ? payload.riskInputs.entryPrice
                    : NaN;

            execSlPrice =
                !hasRealEntryPrice
                    ? NaN
                    : execDirection > 0
                        ? execEntryPrice - execSlDistance
                        : execEntryPrice + execSlDistance;

            execTp1 =
                !hasRealEntryPrice
                    ? NaN
                    : execDirection > 0
                        ? execEntryPrice + execSlDistance * 1.5
                        : execEntryPrice - execSlDistance * 1.5;

            execTp2 =
                !hasRealEntryPrice
                    ? NaN
                    : execDirection > 0
                        ? execEntryPrice + execSlDistance * 2.5
                        : execEntryPrice - execSlDistance * 2.5;

            execTp3 =
                !hasRealEntryPrice
                    ? NaN
                    : execDirection > 0
                        ? execEntryPrice + execSlDistance * 4
                        : execEntryPrice - execSlDistance * 4;

            execEntryBarIndex =
                payload.ajRuntime.barIndex;

            AJDecisionEngine.tradePlanLock[lockKey] = {
                entryPrice: execEntryPrice,
                slPrice: execSlPrice,
                tp1: execTp1,
                tp2: execTp2,
                tp3: execTp3,
                entryBarIndex: execEntryBarIndex
            };

        }

        const rawExecutionState =
            payload.stateInputs.engineState;

        const executionState: EngineState =
            typeof rawExecutionState === "string" &&
            Object.values(EngineState).includes(
                rawExecutionState as EngineState
            )
                ? rawExecutionState as EngineState
                : EngineState.SCAN;

        const executionContext: ExecutionContext = {
            state: executionState,
            barIndex: payload.ajRuntime.barIndex,
            entryBarIndex: execEntryBarIndex,
            tradeMode: (payload.ajRuntime.tradeEngineMode as any) ?? "SCORE",
            authorityAction: authorityResult.authorityDecision,
            executionApproved: authorityResult.authorityApproved,
            confidence: confidenceResult.aiConfidence,
            riskApproved: 
				Boolean(riskQualificationResult.approved ?? payload.riskInputs.riskQualified),
            riskScore:
				Number(riskQualificationResult.qualificationScore ?? riskQualificationResult.riskScore ?? 0),
            mtfAgreement: payload.ajRuntime.mtfAlignment > 0,
            mtfAlignment: payload.ajRuntime.mtfAlignment,
            trendBull: authorityResult.trendAligned && execDirection > 0,
            trendBear: authorityResult.trendAligned && execDirection < 0,
            trendStrength: payload.ajRuntime.adx,
            momentumBull: authorityResult.momentumAligned && execDirection > 0,
            momentumBear: authorityResult.momentumAligned && execDirection < 0,
            momentumStrength: payload.ajRuntime.adx,
            volatilityScore: payload.ajRuntime.atr,
            atr: execAtr,
            tradeDir: execDirection,
            entryPrice: execEntryPrice,
            currentPrice: payload.riskInputs.currentPrice,
            high: payload.riskInputs.high,
            low: payload.riskInputs.low,
            inPosition: payload.riskInputs.positionSize > 0,
            positionSize: payload.riskInputs.positionSize || 1,
            slPrice: execSlPrice,
            tp1: execTp1,
            tp2: execTp2,
            tp3: execTp3,
            sessionOpen: true,
            sessionHigh: payload.riskInputs.high,
            sessionLow: payload.riskInputs.low,
            dayHigh: payload.riskInputs.high,
            dayLow: payload.riskInputs.low,
            barsInTrade: 0,
            maxHoldingBars: 999,
            tradeAge: 0,
            isScalping: payload.riskInputs.isScalping,
            isSwingTrade: false,
            isOptionsTrade: payload.riskInputs.isOptionsMode,
            isPaperTrade: true
        };

		const executionResult =
            this.executionEngine.evaluate(executionContext);

		AJPipelineTrace.stage(
            traceId,
            "execution",
            {
                executed: true,
                passed: executionResult.executionApproved,
                value: executionResult.executionScore,
                message: executionResult.executionApproved ? "APPROVED" : "BLOCKED",
                details: executionResult.diagnostics as unknown as Record<string, unknown>
            }
        );

        //--------------------------------------------------
        // OPTION RECOMMENDATION
        //
        // RV-33
        // If the chart's own symbol is already an option
        // contract (ends CE/PE), it IS the final contract -
        // never re-wrap it in a fresh recommendation.
        // OptionSymbolBuilder concatenates whatever
        // "underlying" it receives with a new strike/expiry
        // suffix, so passing an already-built contract symbol
        // through it produced strings like
        // "NSE:NIFTY26AUG24150CE 25AUG 150CE".
        //--------------------------------------------------
		// specifically makes an already-selected option chart authoritative 
		// for Option Focus instead of allowing a fresh recommendation to replace it.
		//--------------------------------------------------
		
		const chartSymbol =
			payload.ajRuntime.symbol ??
			"";
		
		const chartUnderlying =
			String(payload.ajRuntime.underlying ?? "")
				.trim()
				.toUpperCase();
		
		const chartExpiry =
			String(payload.ajRuntime.expiry ?? "")
				.trim();
		
		const chartStrike =
			Number(payload.ajRuntime.strike);
		
		const chartOptionType =
			String(
				payload.ajRuntime.currentOptionType ?? ""
			)
				.trim()
				.toUpperCase();
		
		const isOptionChart =
			Boolean(
				chartUnderlying &&
				chartExpiry &&
				Number.isFinite(chartStrike) &&
				/^(CE|PE)$/.test(chartOptionType)
			);
		
		const baseOptionResult =
			OptionRecommendation.evaluate(
				payload.optionInputs.underlying,
				payload.optionInputs.spotPrice,
				payload.tradeDirectionFinal
			);
		
		const optionResult =
			isOptionChart
				? {
			...baseOptionResult,
			
		optionSymbol:
			`${chartUnderlying} ${
				(() => {
					const match = chartExpiry.match(
						/^(\d{4})-(\d{2})-(\d{2})$/
					);
		
					if (!match) {
						return chartExpiry.toUpperCase();
					}
		
					const months = [
						"JAN", "FEB", "MAR", "APR", "MAY", "JUN",
						"JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
					];
		
					return `${match[3]}${months[Number(match[2]) - 1]}`;
				})()
			} ${chartStrike}${chartOptionType}`,
		
		recommendedOption:
			`${chartUnderlying} ${
				(() => {
					const match = chartExpiry.match(
						/^(\d{4})-(\d{2})-(\d{2})$/
					);
		
					if (!match) {
						return chartExpiry.toUpperCase();
					}
		
					const months = [
						"JAN", "FEB", "MAR", "APR", "MAY", "JUN",
						"JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
					];
		
					return `${match[3]}${months[Number(match[2]) - 1]}`;
				})()
			} ${chartStrike}${chartOptionType}`,
			
			underlying:
				chartUnderlying,
			
			expiry:
				chartExpiry,
			
			strike:
				chartStrike,
			
			optionType:
				chartOptionType as "CE" | "PE",
			
			atmStrike:
				chartStrike,
			
			itmStrike:
				chartStrike,
			
			otmStrike:
				chartStrike,
			
			atmSymbol:
				`${chartUnderlying} ${chartExpiry} ${chartStrike}${chartOptionType}`,
			
			itmSymbol:
				`${chartUnderlying} ${chartExpiry} ${chartStrike}${chartOptionType}`,
			
			otmSymbol:
				`${chartUnderlying} ${chartExpiry} ${chartStrike}${chartOptionType}`,
			
			isRecommended:
				true
		}
		: baseOptionResult;

        //--------------------------------------------------
        // INDEX BIAS PUBLISH / READ
        //
        // An option chart has no independent "index bias" -
        // its DIR must mirror whichever bias the underlying
        // index chart currently shows. Index charts publish
        // their bias every cycle; option charts read it back
        // for display only. Execution levels (entry/SL/TP)
        // are untouched - those stay driven by the option's
        // own premium price action.
        //--------------------------------------------------

        const rootSymbolMatch =
            chartSymbol
                .replace(/^[A-Z]+:/i, "")
                .match(/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY)/i);

        const rootSymbol =
            rootSymbolMatch
                ? rootSymbolMatch[1].toUpperCase()
                : "";

        if (rootSymbol && !isOptionChart) {

            AJDashboardAdapter.setIndexBias(
                rootSymbol,
                payload.tradeDirectionFinal
            );

        }

        const dashboardDirection =
            (rootSymbol && isOptionChart)
                ? (
                    AJDashboardAdapter.getIndexBias(rootSymbol) ??
                    payload.tradeDirectionFinal
                )
                : payload.tradeDirectionFinal;

        (payload.ajRuntime as any).dashboardDirection =
            dashboardDirection;

        //--------------------------------------------------
        // STATE MACHINE
        // Phase 1
        // Lifecycle controller.
        // No trading logic changes.
        //--------------------------------------------------

        const stateInputs = {

            ...payload.stateInputs,

            //--------------------------------------------------
            // Context
            //--------------------------------------------------

			tradeDirection:
				payload.tradeDirectionFinal,

			longScore:
				contextResult.longScore,
			
			shortScore:
				contextResult.shortScore,
			
			tradeScore:
				contextResult.tradeScore,
			
			tradeDirectionFinal:
				contextResult.tradeDirectionFinal,

            //--------------------------------------------------
            // Confidence (AJ v2)
            //--------------------------------------------------

            confidence:
                payload.ajRuntime.contextConfidence,

            executionConfidence:
                payload.ajRuntime.executionConfidence,

            institutionalConfidence:
                payload.ajRuntime.institutionalScore,

            //--------------------------------------------------
            // Authority
            //--------------------------------------------------

            executionAllowed:
                authorityResult.executionAllowed,

            canEnter:
                payload.riskInputs.entryPrice > 0,

			entryPrice:
                payload.riskInputs.entryPrice,

            positionOpen:
                executionResult.inPosition,

            executionAcknowledged:
                executionResult.executionApproved,

            //--------------------------------------------------
            // Trade Mode Thresholds
            //--------------------------------------------------

            minimumTradeScore:

                RuntimeParameters.forChart(
                    payload.ajRuntime.chartId ??
                    payload.ajRuntime.symbol
                ).minimumTradeScore,

            //--------------------------------------------------
            // RV-09B
            // MODE CORE READINESS
            //
            // These three were hardcoded false in AJPayloadBuilder.ts
            // and never overridden, so StateMachine's genericReady was
            // always false and ARMED could never reach CONFIRMED, in
            // any mode. aiResult/smcResult only exist here (computed
            // earlier in this same function) â€” AJPayloadBuilder.ts
            // runs before either engine, so it can't supply these.
            //
            // common_originalCoreReady is an inference: for pure
            // Confidence/Score mode there's no separate "core engine"
            // the way AI/SMC have one, so this reuses the same context
            // check SCAN already required. Adjust if your intended
            // definition differs.
            //--------------------------------------------------

            common_originalCoreReady:
                contextResult.ctxLong ||
                contextResult.ctxShort,

            common_aiCoreReady:
                aiResult.aiCorePass,

            common_aiSmcCoreReady:
                smcResult.smcCorePass,

            //--------------------------------------------------
            // AI
            //--------------------------------------------------

            aiTrendLong:
                payload.ajRuntime.aiTrendLong,

            aiTrendShort:
                payload.ajRuntime.aiTrendShort,

            aiInstitutionalLong:
                payload.ajRuntime.aiInstitutionalLong,

            aiInstitutionalShort:
                payload.ajRuntime.aiInstitutionalShort,

            aiMarketStructureBull:
                payload.ajRuntime.aiMarketStructureBull,

            aiMarketStructureBear:
                payload.ajRuntime.aiMarketStructureBear,

            //--------------------------------------------------
            // Runtime
            //--------------------------------------------------

            engineState:
                payload.stateInputs.engineState,

            barIndex:
                payload.ajRuntime.barIndex,

            bias:
                payload.tradeDirectionFinal,

            lastBias:
                payload.stateInputs.lastBias

        };

        const stateResult =
            this.stateMachine.evaluate(
                stateInputs
            );

		//--------------------------------------------------
		// TRADE SNAPSHOT
		//
		// Once the StateMachine confirms that the trade has
		// entered EXECUTED, preserve the exact execution plan.
		//
		// This snapshot survives CLOSED/LOCKED states and prevents
		// the dashboard from recalculating ENTRY / SL / TP levels
		// from subsequent candles.
		//
		// A new snapshot is created ONLY when a new trade actually
		// reaches EXECUTED.
		//--------------------------------------------------
		
		if (
			stateResult.enteredExecuted === true &&
			execEntryPrice > 0
		) {
		
			AJDecisionEngine.lastTradeSnapshot[lockKey] = {
		
				entryPrice:
					execEntryPrice,
		
				stopLoss:
					execSlPrice,
		
				tp1:
					execTp1,
		
				tp2:
					execTp2,
		
				tp3:
					execTp3,
		
				optionSymbol:
					optionResult?.optionSymbol ??
					payload.ajRuntime.symbol ??
					"",
		
				direction:
					payload.tradeDirectionFinal,
				
				entryBarIndex:
					execEntryBarIndex
		
			};
		}
		
		//--------------------------------------------------
		// COMPATIBILITY VARIABLES
		//--------------------------------------------------
		
		const tradeDirection =
			payload.tradeDirectionFinal;
		
		const executionAllowed =
			authorityResult.executionAllowed;

		//--------------------------------------------------
		// ENTRY SIGNAL EVENTS
		//
		// These are ONE-SHOT lifecycle events.
		// Do not derive BUY/SELL markers directly from
		// tradeDirection because direction can remain LONG
		// or SHORT across multiple candles.
		//--------------------------------------------------

		const longSignal =
			stateResult.enteredExecuted === true &&
			tradeDirection === 1;

		const shortSignal =
			stateResult.enteredExecuted === true &&
			tradeDirection === -1;
		
		//--------------------------------------------------
		// DASHBOARD TRADE PLAN
		//
		// ACTIVE states use the current locked execution plan.
		//
		// CLOSED/LOCKED states use the last executed trade
		// snapshot. They must NOT fall back to live candle
		// calculations.
		//--------------------------------------------------
		
		const lastTrade =
			AJDecisionEngine.lastTradeSnapshot[lockKey];
		
		const lifecycleIsClosed =
			stateResult.engineState === "CLOSED";
		
		const dashboardTradePlan =
			lifecycleIsClosed && lastTrade
		
				? lastTrade
		
				: {
					entryPrice:
						execEntryPrice,
		
					stopLoss:
						execSlPrice,
		
					tp1:
						execTp1,
		
					tp2:
						execTp2,
		
					tp3:
						execTp3
				};
	
        //--------------------------------------------------
        // Runtime Synchronization
        //--------------------------------------------------

		payload.ajRuntime.engineState =
            stateResult.engineState;

		payload.ajRuntime.executionReady =
			stateResult.readyForExecution;

		// RV-21
		// executionResult.inPosition was computed but never written
		// back onto ajRuntime.positionOpen. AJPayloadBuilder.ts derives
		// stateInputs.positionClosed from the STALE ajRuntime.positionOpen
		// (set before this cycle's execution ran), so a trade that just
		// entered MANAGE looked already closed on the very next tick,
		// firing MANAGE -> CLOSED one cycle after execution.
		
		payload.ajRuntime.positionOpen =
			executionResult.inPosition;

		//--------------------------------------------------
		// CLEAR TRADE PLAN LOCK ON RESET
		//
		// Once the state machine reports SCAN or CLOSED after
		// this cycle's transition, drop the cached plan so the
		// NEXT opportunity computes a brand new entry/SL/TP
		// from that moment's live price instead of reusing a
		// stale one from the trade that just ended.
		//--------------------------------------------------

		if (
			stateResult.engineState === "SCAN" ||
			stateResult.engineState === "CLOSED"
		) {
			delete AJDecisionEngine.tradePlanLock[lockKey];
		}

        //--------------------------------------------------
        // Pipeline Trace
        //--------------------------------------------------

		AJPipelineTrace.stage(
            traceId,
            "stateMachine",
            {

                executed: true,

                passed:
                    stateResult.readyForExecution,

                value:
                    contextResult.tradeScore,

                message:
                    EngineState[
                        stateResult.engineState
                    ],

                details: {

                    stateScanReady:
                        stateResult.stateScanReady,

                    stateConfirmReady:
                        stateResult.stateConfirmReady,

                    genericReady:
                        stateResult.genericReady,

                    readyForExecution:
                        stateResult.readyForExecution,

                    enteredArmed:
                        stateResult.enteredArmed,

                    enteredConfirmed:
                        stateResult.enteredConfirmed,

                    enteredExecuted:
                        stateResult.enteredExecuted,

                    enteredManage:
                        stateResult.enteredManage,

                    tradeDirection:
                        payload.tradeDirectionFinal,

                    executionAllowed:
                        authorityResult.executionAllowed,

                    confidence:
                        payload.ajRuntime.contextConfidence

                }

            }
        );

		//--------------------------------------------------
		// RV-14
		// PIPELINE TRACE UPDATE
		//
		// .stage() above only ever writes the nested details of
		// ONE named stage. The top-level snapshot fields
		// AJDebugBuilder.ts actually reads (trace.direction,
		// trace.longScore, trace.tradeScore, trace.lifecycle,
		// trace.aiBestScore, trace.aiBestDir) are only set once â€”
		// to their defaults, inside AJPipelineTrace.begin() â€” and
		// .update(), the only method that can change them, was
		// never called anywhere in this file. This single call
		// closes that gap.
		//--------------------------------------------------

		// RV-22
		// scoreComposition (ema/vwap/cvd/bos/choch/htf/aiTrend) is
		// computed inside ContextEngine.evaluate() but never returned
		// on ContextResult, so it never reached this file. The debug
		// dashboard's expected shape (ema, vwap, cvd, adx, context,
		// insideBar, boost) doesn't map 1:1 onto AJ v2's real engine
		// output either â€” insideBar and boost have no equivalent
		// anywhere in the current pipeline, left at 0 rather than
		// invented. Everything else below maps to a real ContextResult
		// field already present on contextResult.
		
		const scoreBreakdown = {
			ema: (contextResult as any).emaScore ?? 0,
			vwap: (contextResult as any).vwapScore ?? 0,
			cvd: (contextResult as any).orderFlowScore ?? 0,
			adx: payload.ajRuntime.adx ?? 0,
			context: contextResult.contextScore,
			insideBar: (contextResult as any).insideBarScore ?? 0,
			boost: (contextResult as any).boostScore ?? 0
		};

		AJPipelineTrace.update(
			traceId,
			{
				direction:
					tradeDirection,

				longScore:
					contextResult.longScore,

				shortScore:
					contextResult.shortScore,

				tradeScore:
					contextResult.tradeScore,

				lifecycle:
					stateResult.engineState,

				tradeMode:
					payload.ajRuntime.tradeEngineMode,

				aiScoreLong:
					aiResult.aiScoreLong,

				aiScoreShort:
					aiResult.aiScoreShort,

				aiBestScore:
					aiResult.aiBestScore,

				aiBestDir:
					aiResult.aiBestDir,

				smcCorePass:
					smcResult.smcCorePass,

				authorityApproved:
					authorityResult.authorityApproved,

				barIndex:
					payload.ajRuntime.barIndex,

				scoreBreakdown
			}
		);

        //--------------------------------------------------
        // PIPELINE DIAGNOSTICS
        //--------------------------------------------------

        const pipelineDiagnostics = {

            context:
                null,

            confidence:
                null,

            authority:
                null,

            state:
                null,

            execution:
                null

        };
		
		//--------------------------------------------------
		// AJ v2 Decision Snapshot
		//--------------------------------------------------
	
		const authorizationDiagnostics = {

			approved:
				authorityResult.executionAllowed,
		
			requestedMode:
				payload.ajRuntime.requestedTradeEngineMode ??
				"AUTO",
		
			effectiveMode:
				payload.ajRuntime.effectiveCalculationMode ??
				payload.ajRuntime.tradeEngineMode,
		
			environment:
				AJRuntimeParameters.developerRuntimeOverride ? "DEVELOPMENT" : "PRODUCTION",
		
			marketProfile:
				payload.ajRuntime.enableAdvancedCrypto
					? "ADVANCED_CRYPTO"
					: "NORMAL",
		
			strategyProfile:
				(runtimeParameters as any).smcProfile ??
				"SCALPER",
		
			baseScore:
				context.tradeScore,
		
			finalConfidence:
				payload.ajRuntime.executionConfidence,
		
			requiredConfidence:
				AJRuntimeParameters.confidenceThreshold,
		
			riskScore:
				Number(riskQualificationResult.qualificationScore ?? riskQualificationResult.riskScore ?? 0),
		
			requiredRisk:
				(ExecutionAuthority as any).minRiskScore ??
				80,
		
			executionScore:
				payload.ajRuntime.executionConfidence,
		
			requiredExecution:
				AJRuntimeParameters.executionConfidence,
		
			blockers:
				authorityResult.rejectionReasons,
		
			warnings:
				riskQualificationResult.rejectionReasons,
		
			marketRegime:
				payload.ajRuntime.marketRegime,
		
			syncState:
				syncResult.enabled
					? (
						syncResult.aligned
							? "ALIGNED"
							: syncResult.detached
								? "DETACHED"
								: "MISMATCH"
					)
					: "OFF"
		};
		
		const decisionSnapshot: AJDecisionSnapshot = {
		
			runtime:
				payload.ajRuntime,
		
			context:
				contextResult as any,
		
			confidence:
				confidenceResult,
		
			authority:
				authorityResult,
		
			execution:
				executionResult,
		
			state:
				stateResult as any,
		
			option:
				optionResult as any,
		
			ai:
				aiResult as any,
		
			smc:
				smcResult as any,
		
			diagnostics:
				pipelineDiagnostics,

			authorization:
				authorizationDiagnostics,
		
			trace:
				AJPipelineTrace.get(traceId) as any
		
		};
		
        //--------------------------------------------------
        // FINAL ROUTER OUTPUT
        // Pine Decision Router
        //--------------------------------------------------
		(payload.ajRuntime as any).decisionSnapshot =
			decisionSnapshot;
		
        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // PIPELINE RESULTS
            //--------------------------------------------------

            context: contextResult,
			authority: authorityResult,
            state: stateResult,
			option:	optionResult,
			execution: executionResult,
			pipelineDiagnostics: pipelineDiagnostics,

            decision: {
                context: contextResult,
                authority: authorityResult,
                state: stateResult,
				option:	optionResult,
            },

            //--------------------------------------------------
            // EXECUTION SUMMARY
            //--------------------------------------------------

            tradeDirectionFinal: tradeDirection,
            direction: tradeDirection,
            dashboardDirection: dashboardDirection,

            longSignal: longSignal,
            shortSignal: shortSignal,

            tradeMode:
                (
                    (payload.ajRuntime as any)
                        .intelligentModeEnabled
                )
                    ? "SCORE (INTELLIGENT)"
                    : `${payload.ajRuntime.tradeEngineMode} (MANUAL)`,

            canExecute: executionAllowed,
            executionAllowed: executionAllowed,
            lifecycleState: stateResult.engineState,

            //--------------------------------------------------
            // CONFIDENCE
            //--------------------------------------------------

            tradeScore: contextResult.tradeScore,
            confidence: payload.ajRuntime.executionConfidence,

			//--------------------------------------------------
			// TRADE PLAN
			//
			// IMPORTANT:
			// Never use payload.riskInputs.entryPrice here for the
			// dashboard because that value changes with every candle.
			//
			// dashboardTradePlan is frozen at execution and remains
			// available after CLOSED.
			//--------------------------------------------------
			
			entryPrice:
				dashboardTradePlan.entryPrice ?? null,
			
			stopLoss:
				dashboardTradePlan.stopLoss ?? null,
			
			tp1:
				dashboardTradePlan.tp1 ?? null,
			
			tp2:
				dashboardTradePlan.tp2 ?? null,
			
			tp3:
				dashboardTradePlan.tp3 ?? null,

            //--------------------------------------------------
            // OPTION OUTPUT
            //--------------------------------------------------

			optionSymbol: optionResult.optionSymbol,
            optionType: optionResult.optionType,
            strike: optionResult.strike,

            //--------------------------------------------------
            // SMC VISUAL ZONES
            //--------------------------------------------------

            demandZones: payload.ajRuntime.demandZones ?? [],

            supplyZones: payload.ajRuntime.supplyZones ?? [],

            fvgZones: payload.ajRuntime.fvgZones ?? [],

            liquidityZones: payload.ajRuntime.liquidityZones ?? [],

            orderBlockZones: payload.ajRuntime.orderBlockZones ?? [],

			// RV-31
			// targetZones/neutralZones were hardcoded [] â€” never
			// populated anywhere in the pipeline. Target Zone now
			// tracks TP3 whenever a trade plan is approved; Neutral
			// Zone shows the recent 20-bar range whenever Authority
			// is WAIT (no active trade bias).
			targetZones:
				executionResult.plan.approved && payload.ajRuntime.candles.length > 0
					? [{
						id: `target-${payload.ajRuntime.symbol}-${payload.ajRuntime.barIndex}`,
						type: "target",
						from: payload.ajRuntime.candles[
							Math.max(0, payload.ajRuntime.candles.length - 20)
						].time,
						to: payload.ajRuntime.current.time,
						high: executionResult.plan.tp3 + (execAtr * 0.15),
						low: executionResult.plan.tp3 - (execAtr * 0.15),
						color: "rgba(0, 255, 68, 0.15)",
						borderColor: "rgba(0, 255, 68, 0.7)",
						opacity: 0.15,
						label: "TARGET Zone"
					}]
					: [],

			neutralZones:
				authorityResult.authorityDecision === "WAIT" && payload.ajRuntime.candles.length > 0
					? [{
						id: `neutral-${payload.ajRuntime.symbol}-${payload.ajRuntime.barIndex}`,
						type: "neutral",
						from: payload.ajRuntime.candles[
							Math.max(0, payload.ajRuntime.candles.length - 20)
						].time,
						to: payload.ajRuntime.current.time,
						high: Math.max(
							...payload.ajRuntime.candles
								.slice(-20)
								.map((c: any) => c.high)
						),
						low: Math.min(
							...payload.ajRuntime.candles
								.slice(-20)
								.map((c: any) => c.low)
						),
						color: "rgba(255, 255, 255, 0.06)",
						borderColor: "rgba(255, 255, 255, 0.25)",
						opacity: 0.06,
						label: "NEUTRAL Zone"
					}]
					: [],

            //--------------------------------------------------
            // RUNTIME OUTPUTS
            //--------------------------------------------------

            runtimeResult:
                payload.ajRuntime,

			decisionResult: {
			
				context: contextResult,
			
				authority:
					authorityResult,
			
				state:
					stateResult,
			
				option:
					optionResult,
			
				execution:
					executionResult,
			
				risk:
					riskQualificationResult
			},

            stats: {

                marketRegime:
                    payload.ajRuntime.marketRegime,

                trendConfidence:
                    payload.ajRuntime.trendConfidence,

                structureConfidence:
                    payload.ajRuntime.structureConfidence,

                liquidityConfidence:
                    payload.ajRuntime.liquidityConfidence,

                contextConfidence:
                    payload.ajRuntime.contextConfidence,

                executionConfidence:
                    payload.ajRuntime.executionConfidence,

                institutionalConfidence:
                    payload.ajRuntime.institutionalScore

            },

            overlays: {
                runtimeIntelligence:
                    payload.ajRuntime.runtimeIntelligence

            },

			//--------------------------------------------------
			// DEBUG
			//--------------------------------------------------
			
			debug:
				AJDebugBuilder.build(decisionSnapshot)

        };
    }
}








