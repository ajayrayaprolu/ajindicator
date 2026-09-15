/****************************************************************************************
 * File:
 * AJPayloadBuilder.ts
 *
 * Purpose:
 * Converts AJRuntimeContext into the transport payload consumed by the
 * AJ engine pipeline. This builder performs only data mapping and keeps
 * all trading decisions inside their dedicated engines.
 *
 * Responsibility:
 * • Build Context payload
 * • Build Confidence payload
 * • Preserve backward compatibility
 * • No trading logic
 *
 * AJ Architecture
 * Runtime
 *      ↓
 * Payload Builder
 *      ↓
 * Engines
 *      ↓
 * Confidence
 *      ↓
 * Authority
 *      ↓
 * Execution
 ****************************************************************************************/

import type { RuntimeContext } from "../../runtime/RuntimeContext";
import type { AJRuntimeContext } from "./AJRuntimeContext";
import type { AJIndicatorPayload } from "./AJTypes";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
import { AJRuntimeParameters } from "@/indicators/AJIndicator/config/AJRuntimeParameters";
import { EngineDiagnosticBuilder } from "./debug/EngineDiagnostic";
//============================================================================

export class AJPayloadBuilder {

    static build(
        runtime: RuntimeContext,
        ajRuntime: AJRuntimeContext
    ): AJIndicatorPayload {

        //--------------------------------------------------
        // CONTEXT INPUTS
        //--------------------------------------------------

        const contextInputs = {

            //--------------------------------------------------
            // ROUTER
            //--------------------------------------------------

            tradeDirectionFinal:
                ajRuntime.tradeDirectionFinal,

            aiBestDir:
                ajRuntime.tradeDirectionFinal,

            //--------------------------------------------------
            // MARKET STATE (AJ v2)
            //--------------------------------------------------

            marketState:
                ajRuntime.marketState,

            marketRegime:
                ajRuntime.marketRegime,

            //--------------------------------------------------
            // ORDER FLOW
            //--------------------------------------------------

            orderFlowMode:
                ajRuntime.orderFlow?.source ?? "NONE",

            orderFlowStrength:
                ajRuntime.orderFlow?.confidence ?? 0,

            orderFlowBull:
                ajRuntime.orderFlow?.bullish ?? false,

            orderFlowBear:
                ajRuntime.orderFlow?.bearish ?? false,

            //--------------------------------------------------
            // EMA
            //--------------------------------------------------

            emaBull:
                ajRuntime.emaBull,

            emaBear:
                ajRuntime.emaBear,

            emaSlope:
                ajRuntime.ema20Slope,

            //--------------------------------------------------
            // VWAP
            //--------------------------------------------------

            useVWAP: true,

            vwapBull:
                ajRuntime.vwapBull,

            vwapBear:
                ajRuntime.vwapBear,

			vwapAligned:
				ajRuntime.vwapAligned,

            //--------------------------------------------------
            // ORDER FLOW (Backward Compatibility)
            //--------------------------------------------------

            useCVD: true,

            cvdBull:
                ajRuntime.cvdBull,

            cvdBear:
                ajRuntime.cvdBear,

            cvdStrength:
                ajRuntime.cvdStrength,

            //--------------------------------------------------
            // AI
            //--------------------------------------------------

            aiTrendLong:
                ajRuntime.aiTrendLong,

            aiTrendShort:
                ajRuntime.aiTrendShort,

            aiBullDisplacement:
                ajRuntime.aiBullDisplacement,

            aiBearDisplacement:
                ajRuntime.aiBearDisplacement,

            aiSweepThenLong:
                ajRuntime.liquiditySweepLow,

            aiSweepThenShort:
                ajRuntime.liquiditySweepHigh,

            aiBreakFollowLong:
                ajRuntime.bosBull,

            aiBreakFollowShort:
                ajRuntime.bosBear,

            aiConfidence:
                ajRuntime.aiConfidence,

            //--------------------------------------------------
            // MARKET STRUCTURE
            //--------------------------------------------------

            bullishStructure:
                ajRuntime.marketStructure?.bullish ?? false,

            bearishStructure:
                ajRuntime.marketStructure?.bearish ?? false,

            //--------------------------------------------------
            // ORDER BLOCK
            //--------------------------------------------------

            orderBlockState:
                ajRuntime.orderBlock?.zoneStrength ?? "NONE",

            orderBlockStrength:
                ajRuntime.orderBlock?.strength ?? 0,

            orderBlockFresh:
                ajRuntime.orderBlock?.fresh ?? false,

            //--------------------------------------------------
            // RETAIL TRAP
            //--------------------------------------------------

            retailTrap:

                ajRuntime.liquidity?.retailTrapLong ||
				ajRuntime.liquidity?.retailTrapShort,

            //--------------------------------------------------
            // SMC
            //--------------------------------------------------

            smcSweepLow:
                ajRuntime.liquiditySweepLow,

            smcSweepHigh:
                ajRuntime.liquiditySweepHigh,

            smcBosBull:
                ajRuntime.bosBull,

            smcBosBear:
                ajRuntime.bosBear,

            smcChochBull:
                ajRuntime.chochBull,

            smcChochBear:
                ajRuntime.chochBear,

            smcBullFvgRetest:
                ajRuntime.fvgBull,

            smcBearFvgRetest:
                ajRuntime.fvgBear,

            //--------------------------------------------------
            // FVG
            //--------------------------------------------------

            bullFvgQuality:

                ajRuntime.fvgBull
                    ? ajRuntime.structureConfidence
                    : 0,

            bearFvgQuality:

                ajRuntime.fvgBear
                    ? ajRuntime.structureConfidence
                    : 0,

            //--------------------------------------------------
            // LIQUIDITY
            //--------------------------------------------------

			liquiditySweepStrength:
                ajRuntime.sweepStrength,

            liquidityGrabConfirmed:
                ajRuntime.stopHuntDetected,

            //--------------------------------------------------
            // INSIDE BAR
            //--------------------------------------------------

            insideBarDetected:
                ajRuntime.insideBar,

            insideBarBreakoutLong:
                ajRuntime.insideBarBreakoutLong,

            insideBarBreakoutShort:
                ajRuntime.insideBarBreakoutShort,

            //--------------------------------------------------
            // BREAKOUT
            //--------------------------------------------------

            breakoutStrength:
                ajRuntime.bosStrength,

			breakoutConfirmed:
				ajRuntime.marketStructure?.breakoutConfirmed ?? false,

            //--------------------------------------------------
            // HIGHER TIMEFRAME
            //--------------------------------------------------

            htfBullTrend:
                ajRuntime.aiTrendLong,

            htfBearTrend:
                ajRuntime.aiTrendShort,

            mtfAlignmentScore:
                ajRuntime.mtfAlignment,

            //--------------------------------------------------
            // CONFIDENCE
            //--------------------------------------------------

            confidenceLong:
                ajRuntime.scoreLong,

            confidenceShort:
                ajRuntime.scoreShort,

            confidenceGrade: undefined,

            contextConfidence:
                ajRuntime.contextConfidence,

            institutionalScore:
                ajRuntime.institutionalScore,

            confluenceScore:
                ajRuntime.executionConfidence,

            //--------------------------------------------------
            // RISK
            //--------------------------------------------------

            riskGrade:
                ajRuntime.riskQualification?.grade ?? "",

            //--------------------------------------------------
            // OPTIONAL
            //--------------------------------------------------

            volatilityScore:
                ajRuntime.atr,

            momentumScore:
                ajRuntime.adx,

            regimeScore:
                ajRuntime.contextConfidence

        };

        //--------------------------------------------------
        // CONFIDENCE INPUTS
        //--------------------------------------------------
		//--------------------------------------------------
		// RV-07A CONFIDENCE INPUT TRACE
		//--------------------------------------------------
		
		AJLoggingGate.group("[CONFIDENCE INPUT TRACE]");
		
		AJLoggingGate.log("Stage:", "AJPayloadBuilder");
		
		AJLoggingGate.table({
			routing: {
				runtimeTradeDirection:
					ajRuntime.tradeDirectionFinal,
		
				runtimeSymbol:
					ajRuntime.symbol,
		
				runtimeTimeframe:
					ajRuntime.timeframe,
		
				authorityDecision:
					"<not mapped>",
		
				ctxLong:
					ajRuntime.ctxLong,
		
				ctxShort:
					ajRuntime.ctxShort
			}
		});
		
		AJLoggingGate.groupEnd();

		const scoreInputs = {
	
			//--------------------------------------------------
			// CANONICAL CONFIDENCE INPUT
			//--------------------------------------------------
		
			chartId:
				runtime.symbol,
		
			symbol:
				ajRuntime.symbol,
		
			timeframe:
				ajRuntime.timeframe,
		
			tradeDirection:
				ajRuntime.tradeDirectionFinal,
		
			//--------------------------------------------------
			// TREND
			//--------------------------------------------------
		
			trend: {
	
			direction:
				ajRuntime.tradeDirectionFinal,
	
			strength:
				ajRuntime.adx,
	
			quality:
				ajRuntime.trendConfidence
	
			},
		
			//--------------------------------------------------
			// MOMENTUM
			//--------------------------------------------------
		
			momentum: {
		
				direction:
					ajRuntime.aiTrendLong
						? 1
						: ajRuntime.aiTrendShort
							? -1
							: 0,
		
				strength:
					ajRuntime.adx,
		
				impulseStrength:
					ajRuntime.adx,
		
				breakoutStrength:
					ajRuntime.bosStrength
		
			},
		
			//--------------------------------------------------
			// MARKET STRUCTURE
			//--------------------------------------------------
		
			marketStructure: {
				bosDirection:
					ajRuntime.bosBull
						? 1
						: ajRuntime.bosBear
							? -1
							: 0,
			
				chochDirection:
					ajRuntime.chochBull
						? 1
						: ajRuntime.chochBear
							? -1
							: 0,
			
				orderBlockAligned:
					ajRuntime.tradeDirectionFinal > 0
						? (
							ajRuntime.orderBlock?.bullish ??
							ajRuntime.orderBlockBull ??
							false
						)
						: ajRuntime.tradeDirectionFinal < 0
							? (
								ajRuntime.orderBlock?.bearish ??
								ajRuntime.orderBlockBear ??
								false
							)
							: false,
			
				fvgAligned:
					ajRuntime.tradeDirectionFinal > 0
						? ajRuntime.fvgBull
						: ajRuntime.tradeDirectionFinal < 0
							? ajRuntime.fvgBear
							: false,
			
				liquiditySweepConfirmed:
					ajRuntime.tradeDirectionFinal > 0
						? ajRuntime.liquiditySweepLow
						: ajRuntime.tradeDirectionFinal < 0
							? ajRuntime.liquiditySweepHigh
							: (
								ajRuntime.liquiditySweepLow ||
								ajRuntime.liquiditySweepHigh
							),
			
				structureQuality:
					ajRuntime.structureConfidence
			},
		
			//--------------------------------------------------
			// ORDER FLOW
			//--------------------------------------------------
		
			orderFlow: {
		
				direction:
					ajRuntime.orderFlow?.bullish
						? 1
						: ajRuntime.orderFlow?.bearish
							? -1
							: 0,
		
				strength:
					ajRuntime.orderFlow?.confidence ?? 0,
		
				cvdConfirmed:
					ajRuntime.cvdBull ||
					ajRuntime.cvdBear,
		
				volumeStrength:
					ajRuntime.cvdStrength,
		
				quality:
					ajRuntime.orderFlow?.confidence ?? 0
		
			},
		
			//--------------------------------------------------
			// VOLATILITY
			//--------------------------------------------------
		
			volatility: {
				acceptable: true,
				atrQuality:
					ajRuntime.atr,
				regime: "TRENDING" as const
			},
		
			//--------------------------------------------------
			// MULTI-TIMEFRAME
			//--------------------------------------------------
		
			multiTimeframe: {
		
				aligned:
					ajRuntime.mtfAlignment > 0,
		
				alignment:
					ajRuntime.mtfAlignment,
		
				dominantAligned:
					ajRuntime.mtfAlignment > 0,
		
				higherTrendConfirmed:
					ajRuntime.aiTrendLong ||
					ajRuntime.aiTrendShort,
		
				institutionalAlignment:
					ajRuntime.mtfAlignment
		
			},
		
			//--------------------------------------------------
			// RISK QUALIFICATION
			//--------------------------------------------------
		
			riskQualification: {
		
				tradeAllowed:
					ajRuntime.riskQualification?.qualified ?? false,
		
				riskScore:
					ajRuntime.executionConfidence
		
			},
	
			//--------------------------------------------------
			// Legacy compatibility
			//--------------------------------------------------
	
				scoreLongBoost: 0,
				scoreShortBoost: 0,
	
				//--------------------------------------------------
				// AI
				//--------------------------------------------------
	
				aiTrendLong:
					ajRuntime.aiTrendLong,
	
				aiTrendShort:
					ajRuntime.aiTrendShort,
	
				aiScoreLong:
					ajRuntime.aiScoreLong,
	
				aiScoreShort:
					ajRuntime.aiScoreShort,
	
				aiBestScore:
					ajRuntime.aiBestScore,
	
				aiBestDir:
					ajRuntime.aiBestDir,
	
				aiSafeEntry:
					ajRuntime.aiSafeEntry,
	
				aiFastScalp:
					ajRuntime.aiFastScalp,
	
				aiCorePass:
					ajRuntime.aiCorePass,
	
				//--------------------------------------------------
				// CONFIDENCE
				//--------------------------------------------------
	
				executionConfidence:
					ajRuntime.executionConfidence,
	
				institutionalConfidence:
					ajRuntime.institutionalScore,
	
				confidenceLong:
					ajRuntime.confidence?.confidence ?? ajRuntime.executionConfidence,
	
				confidenceShort:
					ajRuntime.confidence?.confidence ?? ajRuntime.executionConfidence,
	
				confidenceGrade: "",
	
				//--------------------------------------------------
				// SMC
				//--------------------------------------------------
	
				smcBosBull:
					ajRuntime.bosBull,
	
				smcBosBear:
					ajRuntime.bosBear,
	
				smcChochBull:
					ajRuntime.chochBull,
	
				smcChochBear:
					ajRuntime.chochBear,
	
				smcBullFvgRetest:
					ajRuntime.fvgBull,
	
				smcBearFvgRetest:
					ajRuntime.fvgBear,
	
				smcSweepLow:
					ajRuntime.liquiditySweepLow,
	
				smcSweepHigh:
					ajRuntime.liquiditySweepHigh,
	
				aiBullDisplacement:
					ajRuntime.aiBullDisplacement,
	
				aiBearDisplacement:
					ajRuntime.aiBearDisplacement,
	
				aiSweepThenLong:
					ajRuntime.aiSweepThenLong,
	
				aiSweepThenShort:
					ajRuntime.aiSweepThenShort,
	
				aiBreakFollowLong:
					ajRuntime.aiBreakFollowLong,
	
				aiBreakFollowShort:
					ajRuntime.aiBreakFollowShort,
	
				//--------------------------------------------------
				// ADVANCED CRYPTO
				//--------------------------------------------------
	
				advancedCrypto:
					ajRuntime.enableAdvancedCrypto,
	
				cryptoTrendStrong:
					ajRuntime.emaBull ||
					ajRuntime.emaBear,
	
				cryptoVolumeStrong:
					ajRuntime.cvdBull ||
					ajRuntime.cvdBear,
	
				cryptoMomentumBull:
					ajRuntime.aiTrendLong,
	
				cryptoMomentumBear:
					ajRuntime.aiTrendShort
			};

		//--------------------------------------------------
		// AUTHORITY INPUTS
		//--------------------------------------------------
			
		const authorityInputs = {
			
			tradeDirection: ajRuntime.tradeDirectionFinal,
			
			//--------------------------------------------------
			// Confidence
			// Transport only.
			//
			// ConfidenceEngine owns:
			// - tradeGrade
			// - confidenceClass
			// - tradeQualified
			// - institutionalGrade
			// - evidence
			// - diagnostics
			//--------------------------------------------------
			
			confidence:
				ajRuntime.confidence,
			
			trend: {
				direction: ajRuntime.tradeDirectionFinal,
				strength: ajRuntime.adx,
				quality: ajRuntime.trendConfidence
			},
			
			momentum: {
				direction: ajRuntime.tradeDirectionFinal,
				strength: ajRuntime.adx,
				impulseStrength: ajRuntime.adx,
				breakoutStrength: ajRuntime.bosStrength
			},
			
			marketStructure: {
				bosDirection: ajRuntime.bosBull ? 1 : ajRuntime.bosBear ? -1 : 0,
				chochDirection: ajRuntime.chochBull ? 1 : ajRuntime.chochBear ? -1 : 0,
				
			orderBlockAligned:
				ajRuntime.tradeDirectionFinal > 0
					? !!ajRuntime.orderBlock?.bullish
					: ajRuntime.tradeDirectionFinal < 0
						? !!ajRuntime.orderBlock?.bearish
						: false,
			
			fvgAligned:
				ajRuntime.tradeDirectionFinal > 0
					? ajRuntime.fvgBull
					: ajRuntime.tradeDirectionFinal < 0
						? ajRuntime.fvgBear
						: false,
			
			liquiditySweepConfirmed:
				ajRuntime.tradeDirectionFinal > 0
					? ajRuntime.liquiditySweepLow
					: ajRuntime.tradeDirectionFinal < 0
						? ajRuntime.liquiditySweepHigh
						: false,
						
				structureQuality:
					ajRuntime.structureConfidence
			},
			
			orderFlow: {
	
				direction:
					ajRuntime.orderFlow?.bullish
						? 1
						: ajRuntime.orderFlow?.bearish
							? -1
							: 0,
			
				strength:
					ajRuntime.orderFlow?.confidence ?? 0,
			
				cvdConfirmed:
					ajRuntime.cvdBull ||
					ajRuntime.cvdBear,
			
				volumeStrength:
					ajRuntime.cvdStrength,
			
				quality:
					ajRuntime.orderFlow?.confidence ?? 0
			
			},
			
			liquidity: {
			
				sweepConfirmed:
					ajRuntime.liquiditySweepLow ||
					ajRuntime.liquiditySweepHigh,
			
				stopHunt:
					ajRuntime.stopHuntDetected,
			
				strength:
					ajRuntime.sweepStrength,
			
				retailTrap:
					(ajRuntime.liquidity?.retailTrapLong ?? false) ||
					(ajRuntime.liquidity?.retailTrapShort ?? false)
			
			},
			
			volatility: {
				acceptable: true,
				atrQuality: ajRuntime.atr,
				regime: "TRENDING" as const
			},
			
			multiTimeframe: {
				aligned: ajRuntime.mtfAlignment > 0,
				alignment: ajRuntime.mtfAlignment,
				dominantAligned: ajRuntime.mtfAlignment > 0,
				higherTrendConfirmed:
					ajRuntime.aiTrendLong ||
					ajRuntime.aiTrendShort,
				institutionalAlignment:
					ajRuntime.mtfAlignment
			},
			
			riskQualification: {
				tradeAllowed:
					ajRuntime.riskQualification?.qualified ?? false,
				riskScore:
					ajRuntime.executionConfidence
			},
			
			executionReady:
				ajRuntime.executionReady,
			
			tradeAlreadyRunning:
				ajRuntime.execution?.inPosition ??
				ajRuntime.positionOpen,
			
			sessionAllowed: true,
			
			marketState: "OPEN" as const,
	
			//--------------------------------------------------
			// ACTIVE MODES
			//--------------------------------------------------
	
			modeAI:
				ajRuntime.enableAITradeSafety,
	
			modeAISMC:
				ajRuntime.enableAISMCMode,
	
			//--------------------------------------------------
			// CONFIDENCE ENGINE
			//--------------------------------------------------
	
			confidenceLong:
				ajRuntime.confidence?.confidence ?? ajRuntime.executionConfidence,
	
			confidenceShort:
				ajRuntime.confidence?.confidence ?? ajRuntime.executionConfidence,
	
			confidenceGrade: undefined,
	
			confidenceValue:
				ajRuntime.executionConfidence,
	
			//--------------------------------------------------
			// AI
			//--------------------------------------------------
	
			aiScoreLong:
				ajRuntime.aiScoreLong,
	
			aiScoreShort:
				ajRuntime.aiScoreShort,
	
			aiBestScore:
				ajRuntime.aiBestScore,
	
			aiBestDir:
				ajRuntime.aiBestDir,
	
			aiSafeEntry:
				ajRuntime.aiSafeEntry,
	
			aiFastScalp:
				ajRuntime.aiFastScalp,
	
			aiCorePass:
				ajRuntime.aiCorePass,
	
			//--------------------------------------------------
			// SMC
			//--------------------------------------------------
	
			smcHybridLong:
				ajRuntime.aiInstitutionalLong,
	
			smcHybridShort:
				ajRuntime.aiInstitutionalShort,
	
			smcCorePass:
				ajRuntime.aiSmcPass,
	
			//--------------------------------------------------
			// BACKWARD COMPATIBILITY
			//--------------------------------------------------
	
			ctxLong: false,
			ctxShort: false,
			tradeScore: 0,
			longScore: 0,
			shortScore: 0,
			tradeDirectionFinal: 0,
	
			//--------------------------------------------------
			// RISK
			//--------------------------------------------------
	
			riskGrade:
				ajRuntime.riskQualification?.grade ?? "",
	
			riskQualified:
				ajRuntime.riskQualification?.qualified ?? false,
	
			//--------------------------------------------------
			// EXECUTION
			//--------------------------------------------------
	
			executionConfidence:
				ajRuntime.executionConfidence,
	
			institutionalConfidence:
				ajRuntime.institutionalScore,
	
			//--------------------------------------------------
			// ADVANCED CRYPTO
			//--------------------------------------------------
	
			advancedCrypto:
				ajRuntime.enableAdvancedCrypto,
	
			cryptoTrendStrong:
				ajRuntime.emaBull ||
				ajRuntime.emaBear,
	
			cryptoVolumeStrong:
				ajRuntime.cvdBull ||
				ajRuntime.cvdBear,
	
			//--------------------------------------------------
			// PLATFORM FLAGS
			//--------------------------------------------------
	
			amdAllowExecution:
				ajRuntime.tradeDirectionFinal !== 0,
			indiaVixEntryOk:
				true
		};
	
		//--------------------------------------------------
		// STATE INPUTS
		//--------------------------------------------------
	
		const stateInputs = {
			runtime,
			ajRuntime,
	
			//--------------------------------------------------
			// AUTHORITY SNAPSHOT
			//--------------------------------------------------
	
			authorityResult: {
				authorityDecision: "WAIT" as const,
				authorityApproved: false,
				executionAllowed: false,
				authorityText: "",
				approvalReasons: [],
				rejectionReasons: [],
				passedChecks: 0,
				failedChecks: 0,
				trendAligned: false,
				momentumAligned: false,
				structureAligned: false,
				institutionalConfluence: false,
			
				diagnostics: {
					confidence: ajRuntime.executionConfidence,
					riskScore: ajRuntime.riskQualification?.riskScore ?? 0,
					passedChecks: 0,
					failedChecks: 0,
					approvalRatio: 0,
					trendAligned: false,
					momentumAligned: false,
					structureAligned: false,
					institutionalConfluence: false
				},
				
				diagnostic: EngineDiagnosticBuilder.create({
					engine: "ExecutionAuthority",
					status: "SKIPPED",
					decision: "WAIT",
					reasons: [],
					metrics: {}
				}),

			},
	
			//--------------------------------------------------
			// ENGINE STATE
			//--------------------------------------------------
	
			engineState: ajRuntime.engineState,
			signalBar: -1,
			signalTimeout: 10,
			barIndex: ajRuntime.barIndex,
			bias: ajRuntime.tradeDirectionFinal,
			lastBias: 0,
	
			//--------------------------------------------------
			// ACTIVE MODE
			//--------------------------------------------------
	
			enableAITradeSafety:
				ajRuntime.enableAITradeSafety,
	
			enableAISMCMode:
				ajRuntime.enableAISMCMode,
	
			tradeLifecycleLocked:
				ajRuntime.tradeLifecycleLocked,
	
			//--------------------------------------------------
			// CONTEXT
			//--------------------------------------------------
	
			ctxLong:
				ajRuntime.ctxLong,
	
			ctxShort:
				ajRuntime.ctxShort,
	
			//--------------------------------------------------
			// MARKET STATE
			//--------------------------------------------------
	
			marketState:
				ajRuntime.marketState,
	
			marketRegime:
				ajRuntime.marketRegime,
	
			//--------------------------------------------------
			// ORDER FLOW
			//--------------------------------------------------
	
			orderFlowBull:
				ajRuntime.orderFlow?.bullish ?? false,
	
			orderFlowBear:
				ajRuntime.orderFlow?.bearish ?? false,
	
			orderFlowStrength:
				ajRuntime.orderFlow?.confidence ?? 0,
	
			//--------------------------------------------------
			// AI
			//--------------------------------------------------
	
			aiTrendLong: ajRuntime.aiTrendLong,
			aiTrendShort: ajRuntime.aiTrendShort,
	
			aiInstitutionalLong:
				ajRuntime.aiInstitutionalLong,
	
			aiInstitutionalShort:
				ajRuntime.aiInstitutionalShort,
	
			aiMarketStructureBull:
				ajRuntime.aiMarketStructureBull,
	
			aiMarketStructureBear:
				ajRuntime.aiMarketStructureBear,
	
			//--------------------------------------------------
			// CONFIDENCE READINESS
			//
			// Transport only.
			//
			// Readiness is computed by downstream engines.
			// Builder forwards the latest runtime snapshot.
			//--------------------------------------------------
			
			//--------------------------------------------------
			// AJ v2 Compatibility Placeholder
			//--------------------------------------------------
			
			common_originalCoreReady: false,
			common_aiCoreReady: false,
			common_aiSmcCoreReady: false,
	
			//--------------------------------------------------
			// EXECUTION
			//--------------------------------------------------

			executionAllowed:
				ajRuntime.executionReady,
			
			executionAcknowledged:
				ajRuntime.execution?.executionAcknowledged ?? false,
			
			// RV-STATE-01
			// AI/AI_SMC's 60/65 gate never scaled with
			// developerRuntimeOverride, unlike every other
			// AJRuntimeParameters threshold (confidenceThreshold,
			// authorityConfidenceThreshold, etc. already flip
			// prod<->dev). Observed tradeScore sits ~35 - well
			// under 60/65 - so AI/AI_SMC could never even reach
			// SCAN -> ARMED in dev mode, before the AI/SMC core-pass
			// gates (fixed separately) were ever exercised. In dev
			// mode, use the same lenient gate SCORE mode already
			// tests successfully with; production values unchanged.
			minimumTradeScore:
				AJRuntimeParameters.developerRuntimeOverride
					? 3
					: ajRuntime.tradeEngineMode === "AI_SMC"
						? 65
						: ajRuntime.tradeEngineMode === "AI"
							? 60
							: 3,
			
			canEnter:
				ajRuntime.executionReady,
			
			entryPrice:
				ajRuntime.entryPrice,
			
			positionOpen:
				ajRuntime.positionOpen,
			
			positionClosed:
				!(ajRuntime.positionOpen ?? false),
			
			//--------------------------------------------------
			// ROUTER (Backward Compatibility)
			//--------------------------------------------------
	
			tradeDirectionFinal:
				ajRuntime.tradeDirectionFinal,
	
			tradeScore:
				ajRuntime.tradeScore,
	
			//--------------------------------------------------
			// RISK QUALIFICATION
			//--------------------------------------------------
	
			riskQualified:
				ajRuntime.riskQualification?.qualified ?? false,
	
			riskGrade:
				ajRuntime.riskQualification?.grade ?? "",
	
			//--------------------------------------------------
			// OPTIONS
			//--------------------------------------------------
	
			isOptionsMode: false,
			isMirrorOptionChart: false,
			optionIndexTruthOk: true,
	
			indexTruthDir:
				ajRuntime.tradeDirectionFinal,
	
			//--------------------------------------------------
			// ADVANCED CRYPTO
			//--------------------------------------------------

			advCryptoMode:
				ajRuntime.enableAdvancedCrypto,

			isAdvCryptoSymbol:
				/^(BTC|ETH|SOL|XRP|BNB|ADA|DOGE|AVAX|DOT|LINK|LTC|TRX|MATIC|XAU)(USD|USDT|USDC|INR)?$/i
					.test(
						String(ajRuntime.symbol ?? "")
							.replace(/^[A-Z]+:/i, "")
							.replace(/[^A-Z0-9]/gi, "")
					) ||
				/^(EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|USDCHF|NZDUSD|EURGBP|EURJPY|GBPJPY|XAUUSD|GOLD)$/i
					.test(
						String(ajRuntime.symbol ?? "")
							.replace(/^[A-Z]+:/i, "")
							.replace(/[^A-Z0-9]/gi, "")
					),

			advCryptoReady:
				ajRuntime.advCryptoReady ?? true,

			//--------------------------------------------------
			// STRATEGY PROFILE
			//--------------------------------------------------

			smcProfile:
				ajRuntime.smcProfile ?? "SCALPER"
		
		};
	
		//--------------------------------------------------
		// RISK INPUTS
		//--------------------------------------------------
	
		const riskInputs = {
				
			authorityDecision: "WAIT" as const,
			authorityApproved: false,
	
			//--------------------------------------------------
			// POSITION
			//--------------------------------------------------
	
			entryPrice:
	
				ajRuntime.entryPrice,
	
			tradeDirectionFinal:
	
				ajRuntime.tradeDirectionFinal,
	
			//--------------------------------------------------
			// ENGINE STATE
			//--------------------------------------------------
	
			engineState:
				String(ajRuntime.engineState),
			//--------------------------------------------------
			// MARKET
			//--------------------------------------------------
	
			atr:
	
				ajRuntime.atr,
	
			currentPrice:
	
				runtime.current.close,
	
			high:
	
				runtime.current.high,
	
			low:
	
				runtime.current.low,
	
			//--------------------------------------------------
			// CONFIDENCE
			//--------------------------------------------------
	
			confidence:
				ajRuntime.executionConfidence,
			
			confidenceGrade: "",
	
			//--------------------------------------------------
			// RISK QUALIFICATION
			//--------------------------------------------------
	
			riskQualified:
				ajRuntime.riskQualification?.qualified ?? false,
	
			riskGrade:
				ajRuntime.riskQualification?.grade ?? "",
	
			//--------------------------------------------------
			// POSITION SIZE
			//--------------------------------------------------
	
			positionSize:
				ajRuntime.positionSize,
	
			//--------------------------------------------------
			// MODES
			//--------------------------------------------------
	
			isScalping:
				ajRuntime.smcProfile === "SCALPER",
			
			isAdvancedMode:
				ajRuntime.enableAdvancedCrypto,
			
			isOptionsMode:
				/(CE|PE)$/i.test(
					String(ajRuntime.symbol ?? "")
				)
	
		};
	
		//--------------------------------------------------
		// OPTION INPUTS
		//--------------------------------------------------
	
		const strikeStep =
			ajRuntime.symbol.includes("BANK")
				? 100
				: 50;
	
		const atmStrike =
			Math.round(
				runtime.current.close /
				strikeStep
			) *
	
			strikeStep;
	
		const optionType =
			ajRuntime.tradeDirectionFinal > 0
				? "CE"
				: ajRuntime.tradeDirectionFinal < 0
					? "PE"
					: "";
	
		const optionInputs = {
	
			//--------------------------------------------------
			// MODE
			//--------------------------------------------------
	
			isOptionsMode: true,
			isOptionChart: false,
			greekOptionMode: false,
			greekExecOk: true,
	
			//--------------------------------------------------
			// DIRECTION
			//--------------------------------------------------
	
			masterBias: ajRuntime.tradeDirectionFinal,
			direction: ajRuntime.tradeDirectionFinal,
	
			//--------------------------------------------------
			// LIVE PRICE
			//--------------------------------------------------
	
			spotPrice: runtime.current.close,
	
			//--------------------------------------------------
			// STRIKE
			//--------------------------------------------------
	
			smartStrike: atmStrike,
			strikeFromSymbol: atmStrike,
			strike: atmStrike,
			strikeStep: strikeStep,
			currentOptionType: optionType,
	
			//--------------------------------------------------
			// SYMBOL
			//--------------------------------------------------
	
			underlying: ajRuntime.symbol,
	
			//--------------------------------------------------
			// ENGINE STATE
			//--------------------------------------------------
	
			engineState:
				String(ajRuntime.engineState),
		};
	
		//--------------------------------------------------
		// RETURN PAYLOAD
		//--------------------------------------------------
	
		const payload: AJIndicatorPayload = {
	
			//--------------------------------------------------
			// FINAL DIRECTION
			//--------------------------------------------------
	
			tradeDirectionFinal:
				ajRuntime.tradeDirectionFinal ??
				0,
	
			//--------------------------------------------------
			// CONFIDENCE (AJ v2)
			//--------------------------------------------------
	
			confidenceLong:
				ajRuntime.confidence?.confidence ?? ajRuntime.executionConfidence,
	
			confidenceShort:
				ajRuntime.confidence?.confidence ?? ajRuntime.executionConfidence,
	
			confidenceGrade: undefined,
	
			confidenceValue:
				ajRuntime.executionConfidence,
	
			//--------------------------------------------------
			// MARKET STATE
			//--------------------------------------------------
	
			marketState: ajRuntime.marketState?.trend,
			marketRegime: ajRuntime.marketRegime,
	
			//--------------------------------------------------
			// ORDER FLOW
			//--------------------------------------------------
	
			orderFlowMode:
				ajRuntime.orderFlow?.source ?? "NONE",
	
			orderFlowStrength:
				ajRuntime.orderFlow?.confidence ?? 0,
	
			//--------------------------------------------------
			// RISK
			//--------------------------------------------------
	
			riskQualified:
				ajRuntime.riskQualification?.qualified ?? false,
	
			riskGrade:
				ajRuntime.riskQualification?.grade ?? "",
	
			//--------------------------------------------------
			// ORIGINAL PAYLOADS
			//--------------------------------------------------
	
			runtime,
			ajRuntime,
			contextInputs,
			scoreInputs,
			stateInputs,
			authorityInputs,
			riskInputs,
			optionInputs
			
		};
			
		//--------------------------------------------------
		// RV-06 PAYLOAD TRANSPORT (Temporary)
		//--------------------------------------------------
		
		AJLoggingGate.group("[RV-06 PAYLOAD TRANSPORT]");
		AJLoggingGate.log("Symbol:", ajRuntime.symbol);
		AJLoggingGate.log("Timeframe:", ajRuntime.timeframe);

		AJLoggingGate.table({
		
				runtime: {
					symbol: runtime.symbol,
					timeframe: ajRuntime.timeframe,
					match: runtime.symbol === ajRuntime.symbol
				},
				
			contextInputs: {
				emaBull: contextInputs.emaBull,
				cvdBull: contextInputs.cvdBull,
				institutionalScore: contextInputs.institutionalScore
			},
			
			payload: {
				runtimeAttached: payload.runtime !== undefined,
				ajRuntimeAttached: payload.ajRuntime !== undefined,
				contextInputsAttached: payload.contextInputs !== undefined
			}
		
		});

		//--------------------------------------------------
		// RV-07A PAYLOAD TRACE
		//--------------------------------------------------
		
		AJLoggingGate.group("[CONFIDENCE INPUT TRACE]");
		
		AJLoggingGate.log("Stage:", "AJPayloadBuilder -> Payload");
		
		AJLoggingGate.table({
			scoreInputs: {
			
				tradeDirection:
					scoreInputs.tradeDirection,
			
				authorityDecision:
					"<Not Present In ConfidenceInput>",
			
				symbol:
					scoreInputs.symbol,
			
				timeframe:
					scoreInputs.timeframe
			}
		});
		
		AJLoggingGate.groupEnd();
		return payload;
    }
}