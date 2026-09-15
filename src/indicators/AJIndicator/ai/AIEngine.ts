/****************************************************************************************
 * File:
 * AIEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/ai/AIEngine.ts
 *
 * AJ v2 - Institutional AI Routing & Trade Qualification Engine
 *
 * Purpose
 * -------
 * AIEngine is the canonical AI routing engine of the AJ v2 institutional
 * trading framework. It evaluates multiple institutional confirmations and
 * market-quality filters to produce an AI confidence score, determine the
 * preferred trade direction, and classify whether the current setup is
 * suitable for execution.
 *
 * Rather than generating trading signals directly, AIEngine acts as an
 * institutional qualification layer between Context Analysis and Decision
 * Making. It aggregates trend confirmation, order flow, displacement,
 * breakout continuation, liquidity sweep continuation, and market quality
 * filters into a normalized AI routing result.
 *
 * AIEngine is intentionally independent of execution authority, position
 * management, and lifecycle management. Its sole responsibility is to score
 * and classify trade quality from an institutional AI perspective.
 *
 * Responsibilities
 * ----------------
 * • Evaluate institutional long opportunities.
 * • Evaluate institutional short opportunities.
 * • Calculate AI confidence scores.
 * • Determine preferred trading direction.
 * • Apply market quality filters.
 * • Apply institutional penalty filters.
 * • Classify execution mode.
 * • Produce normalized AIEngineResult.
 * • Preserve deterministic routing behaviour.
 *
 * Functional Areas
 * ----------------
 *
 * Direction Evaluation
 * • Long score calculation.
 * • Short score calculation.
 * • Best directional routing.
 * • Tie resolution using upstream context.
 *
 * Trend Intelligence
 * • AI bullish trend confirmation.
 * • AI bearish trend confirmation.
 *
 * Institutional Confirmation
 * • VWAP confirmation.
 * • CVD confirmation.
 * • Institutional confluence.
 *
 * Smart Money Confirmation
 * • Bullish displacement.
 * • Bearish displacement.
 * • Break-follow continuation.
 * • Sweep-follow continuation.
 *
 * Market Quality Filters
 * • Market quality validation.
 * • Weak body detection.
 * • Weak premium rejection.
 *
 * Institutional Risk Filters
 * --------------------------
 * • Trap detection.
 * • Sideways market rejection.
 * • Weak structure rejection.
 * • Quality degradation penalties.
 *
 * AI Scoring Model
 * ----------------
 * The engine combines multiple institutional confirmations into separate
 * Long and Short AI scores before selecting the strongest directional bias.
 *
 * Positive Factors
 * • AI Trend
 * • VWAP Alignment
 * • CVD Confirmation
 * • Institutional Displacement
 * • Breakout Follow-through
 * • Liquidity Sweep Follow-through
 * • Market Quality Confirmation
 *
 * Negative Factors
 * • Institutional Trap Detection
 * • Sideways Market
 * • Weak Candle Body
 * • Weak Premium Structure
 *
 * Routing Classification
 * ----------------------
 * SAFE ENTRY
 * • High-confidence institutional setup.
 * • Full execution permitted.
 *
 * FAST SCALP
 * • Moderate institutional confirmation.
 * • Reduced confidence execution.
 *
 * WAIT
 * • Partial institutional confirmation.
 * • Continue monitoring.
 *
 * BLOCK
 * • Institutional filters reject execution.
 * • No trade qualification.
 *
 * Inputs
 * ------
 * AIEngineInputs provides:
 *
 * • Trade direction context
 * • AI trend analysis
 * • VWAP confirmation
 * • CVD confirmation
 * • Institutional displacement
 * • Break-follow signals
 * • Sweep-follow signals
 * • Market quality filters
 * • Institutional penalties
 *
 * Outputs
 * -------
 * AIEngineResult provides:
 *
 * Scoring
 * • Long AI score
 * • Short AI score
 * • Best AI score
 * • Preferred direction
 *
 * Routing
 * • Safe Entry
 * • Fast Scalp
 * • Core Pass
 *
 * Diagnostics
 * • Routing mode
 * • Qualification reason
 *
 * Upstream Dependencies
 * ---------------------
 * AIEngine consumes normalized intelligence produced by:
 *
 * • ContextEngine
 * • MarketStructureEngine
 * • OrderFlowEngine
 * • BreakoutEngine
 * • LiquidityEngine
 * • AI Pattern Recognition
 * • AJRuntimeContextBuilder
 *
 * Downstream Consumers
 * --------------------
 * AIEngineResult is consumed by:
 *
 * • AIConfidenceEngine
 * • AJContextEngine
 * • AJDecisionEngine
 * • Trade Authority Engine
 * • Runtime Adapter
 * • Execution Engine
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle
 * • Pure AI routing engine
 * • Deterministic scoring
 * • Institutional-first evaluation
 * • Rule-based AI qualification
 * • No execution authority
 * • No state management
 * • No lifecycle management
 * • No risk management
 * • No position sizing
 * • No order placement
 * • Immutable output
 * • Backward compatible
 * • Phase 15.5 compliant
 *
 * Institutional Features
 * ----------------------
 * • Multi-factor institutional scoring.
 * • Trend-weighted routing.
 * • VWAP confirmation.
 * • CVD confirmation.
 * • Smart Money displacement.
 * • Breakout continuation confirmation.
 * • Liquidity sweep continuation.
 * • Institutional trap rejection.
 * • Sideways market filtering.
 * • Weak candle rejection.
 * • Premium quality validation.
 * • Safe Entry qualification.
 * • Fast Scalp classification.
 * • Core Pass evaluation.
 *
 * AJ v2 Pipeline
 *
 * ContextEngine
 *       │
 *       ▼
 * MarketStructureEngine
 *       │
 *       ▼
 * OrderFlowEngine
 *       │
 *       ▼
 * BreakoutEngine
 *       │
 *       ▼
 * LiquidityEngine
 *       │
 *       ▼
 * AIEngine
 *       │
 *       ▼
 * AIEngineResult
 *       │
 *       ▼
 * AIConfidenceEngine
 *       │
 *       ▼
 * AJContextEngine
 *       │
 *       ▼
 * AJDecisionEngine
 *       │
 *       ▼
 * Trade Authority Engine
 *       │
 *       ▼
 * Execution Engine
 *
 * Notes
 * -----
 * • AIEngine is not a machine learning model.
 * • It is a deterministic institutional routing engine based on weighted
 *   market confirmations.
 * • AIEngine does not generate Buy/Sell orders.
 * • AIEngine does not perform execution management.
 * • AIEngine does not manage trade lifecycle.
 * • AIEngine does not calculate confidence grades; those responsibilities
 *   belong to AIConfidenceEngine.
 * • AIEngineResult serves as normalized institutional AI intelligence for
 *   downstream confidence, decision, and execution modules.
 *
 ****************************************************************************************/

export interface AIEngineInputs {

    //--------------------------------------------------
    // DIRECTION
    //--------------------------------------------------

    tradeDirectionFinal:number;

    //--------------------------------------------------
    // SCALPER TOGGLE
    // RV-AI-01
    //--------------------------------------------------

    aiScalperEnabled?: boolean;

	strategyProfile?:
		"SAFE" |
		"SWING" |
		"SCALPER";

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    aiTrendLong:boolean;
    aiTrendShort:boolean;

    //--------------------------------------------------
    // CONFIRMATION
    //--------------------------------------------------

    vwapBull:boolean;
    vwapBear:boolean;

    cvdBull:boolean;
    cvdBear:boolean;

    //--------------------------------------------------
    // DISPLACEMENT
    //--------------------------------------------------

    aiBullDisplacement:boolean;
    aiBearDisplacement:boolean;

    //--------------------------------------------------
    // BREAK FOLLOW
    //--------------------------------------------------

    aiBreakFollowLong:boolean;
    aiBreakFollowShort:boolean;

    //--------------------------------------------------
    // SWEEP FOLLOW
    //--------------------------------------------------

    aiSweepThenLong:boolean;
    aiSweepThenShort:boolean;

    //--------------------------------------------------
    // QUALITY FILTERS
    //--------------------------------------------------

    aiMarketQualityOk:boolean;

    aiWeakBody:boolean;

    //--------------------------------------------------
    // PENALTIES
    //--------------------------------------------------

    aiTrapDetected:boolean;

    aiSideways:boolean;

    aiWeakPremium:boolean;

}

export interface AIEngineResult {

    //--------------------------------------------------
    // SCORES
    //--------------------------------------------------

    aiScoreLong:number;

    aiScoreShort:number;

    aiBestScore:number;

    aiBestDir:number;

    //--------------------------------------------------
    // ROUTER
    //--------------------------------------------------

    aiSafeEntry:boolean;

    aiFastScalp:boolean;

    aiCorePass:boolean;

    //--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    aiModeText:string;

    aiReasonText:string;

}

export class AIEngine {

    //--------------------------------------------------
    // AI ROUTER
    //--------------------------------------------------

    evaluate(

        input:AIEngineInputs

    ):AIEngineResult{

        let aiScoreLong=0;

        let aiScoreShort=0;
		
	    //--------------------------------------------------
        // TREND
        //--------------------------------------------------

        if (input.aiTrendLong)
            aiScoreLong += 2;

        if (input.aiTrendShort)
            aiScoreShort += 2;

        //--------------------------------------------------
        // VWAP
        //--------------------------------------------------

        if (input.vwapBull)
            aiScoreLong += 1;

        if (input.vwapBear)
            aiScoreShort += 1;

        //--------------------------------------------------
        // CVD
        //--------------------------------------------------

        if (input.cvdBull)
            aiScoreLong += 1;

        if (input.cvdBear)
            aiScoreShort += 1;

        //--------------------------------------------------
        // DISPLACEMENT
        //--------------------------------------------------

        if (input.aiBullDisplacement)
            aiScoreLong += 2;

        if (input.aiBearDisplacement)
            aiScoreShort += 2;

        //--------------------------------------------------
        // BREAK FOLLOW
        //--------------------------------------------------

        if (input.aiBreakFollowLong)
            aiScoreLong += 1;

        if (input.aiBreakFollowShort)
            aiScoreShort += 1;

        //--------------------------------------------------
        // SWEEP FOLLOW
        //--------------------------------------------------

        if (input.aiSweepThenLong)
            aiScoreLong += 1;

        if (input.aiSweepThenShort)
            aiScoreShort += 1;

        //--------------------------------------------------
        // MARKET QUALITY
        //--------------------------------------------------

        if (input.aiMarketQualityOk) {

            if (aiScoreLong >= aiScoreShort)
                aiScoreLong += 1;
            else
                aiScoreShort += 1;

        }

        //--------------------------------------------------
        // TRAP PENALTY
        //--------------------------------------------------

        if (input.aiTrapDetected) {

            aiScoreLong -= 3;
            aiScoreShort -= 3;

        }

        //--------------------------------------------------
        // SIDEWAYS PENALTY
        //--------------------------------------------------

        if (input.aiSideways) {

            aiScoreLong -= 2;
            aiScoreShort -= 2;

        }

        //--------------------------------------------------
        // WEAK BODY PENALTY
        //--------------------------------------------------

        if (input.aiWeakBody) {

            aiScoreLong -= 1;
            aiScoreShort -= 1;

        }

        //--------------------------------------------------
        // WEAK PREMIUM PENALTY
        //--------------------------------------------------

        if (input.aiWeakPremium) {

            aiScoreLong -= 1;
            aiScoreShort -= 1;

        }

        //--------------------------------------------------
        // CLAMP
        //--------------------------------------------------

        aiScoreLong =
            Math.max(
                0,
                aiScoreLong
            );

        aiScoreShort =
            Math.max(
                0,
                aiScoreShort
            );

        //--------------------------------------------------
        // BEST SCORE
        //--------------------------------------------------

        const aiBestScore =

            Math.max(

                aiScoreLong,

                aiScoreShort

            );

        //--------------------------------------------------
        // DIRECTION
        //--------------------------------------------------

        const aiBestDir =

            aiScoreLong > aiScoreShort

                ? 1

                : aiScoreShort > aiScoreLong

                    ? -1

                    : input.tradeDirectionFinal;

        //--------------------------------------------------
        // ROUTER
        //
        // RV-AI-01
        // Pine gates aiFastScalp behind the "AI SCALPER"
        // toggle (aiAllowFastScalp) - previously this was
        // pure score-band, so the checkbox did nothing.
        // aiCorePass threshold is ALSO relaxed when scalper
        // is enabled (5 -> 3) - this part is not a literal
        // Pine port; it's the same fix pattern as SMCEngine's
        // profile-based confirmation count, addressing the
        // observed symptom that AI mode rarely qualifies at
        // all under our smoothed/synthetic-CVD-influenced
        // inputs unless scalper relaxation is active.
        //--------------------------------------------------

		const profile =
			input.strategyProfile ??
			"SCALPER";
		
		const aiSafeEntryThreshold =
			profile === "SAFE"
				? 9
				: profile === "SWING"
					? 8
					: 8;
		
		const aiCorePassThreshold =
			input.aiScalperEnabled
				? 3
				: profile === "SAFE"
					? 6
					: profile === "SWING"
						? 5
						: 4;
		
		const aiSafeEntry =
			aiBestScore >= aiSafeEntryThreshold;
		
		const aiFastScalp =
			profile === "SCALPER" &&
			!!input.aiScalperEnabled &&
			!input.aiTrapDetected &&
			aiBestScore >= 5 &&
			aiBestScore < aiSafeEntryThreshold;

        const aiCorePass =

            aiBestScore >= aiCorePassThreshold;

        //--------------------------------------------------
        // MODE
        //--------------------------------------------------

        let aiModeText =

            "BLOCK";

        if (aiSafeEntry)

            aiModeText = "SAFE ENTRY";

        else if (aiFastScalp)

            aiModeText = "FAST SCALP";

        else if (aiBestScore >= 2)

            aiModeText = "WAIT";

        //--------------------------------------------------
        // REASON
        //--------------------------------------------------

        let aiReasonText =

            aiModeText;

        if (input.aiTrapDetected)

            aiReasonText = "TRAP";

        else if (input.aiSideways)

            aiReasonText = "SIDEWAYS";

        else if (input.aiWeakPremium)

            aiReasonText = "WEAK PREMIUM";

        else if (input.aiWeakBody)

            aiReasonText = "WEAK BODY";
      
        //--------------------------------------------------
        // RV-AI-01 TRACE
        //
        // AIEngine previously had zero console tracing,
        // unlike SMCEngine's smcReason. Adding parity so
        // both are equally visible with logging/tracing on.
        //--------------------------------------------------

        console.log(
            "[AI ENGINE]",
            {
                aiScoreLong,
                aiScoreShort,
                aiBestScore,
                aiBestDir,
                aiScalperEnabled: !!input.aiScalperEnabled,
                aiCorePassThreshold,
                aiCorePass,
                aiFastScalp,
                aiSafeEntry,
                aiModeText
            }
        );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------
        
        return {
        
            aiScoreLong,
            aiScoreShort,
            aiBestScore,
            aiBestDir,
            aiSafeEntry,
            aiFastScalp,
            aiCorePass,
            aiModeText,
            aiReasonText
        };
    }
}