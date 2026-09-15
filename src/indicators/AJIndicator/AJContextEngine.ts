/****************************************************************************************
 * File:
 * AJContextEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/AJContextEngine.ts
 *
 * Purpose:
 * Canonical Context Orchestration Engine for the AJ Institutional Indicator.
 *
 * AJContextEngine is a lightweight orchestration layer that combines the
 * Market Context Engine with the Confidence Engine to produce the
 * Pine-compatible context and scoring output required by the remainder of
 * the institutional decision pipeline.
 *
 * This engine exists to preserve a clean separation between:
 *
 *   • Market Context generation
 *   • Confidence / score calculation
 *   • Pipeline compatibility
 *
 * It intentionally contains no trading rules or market analysis logic.
 *
 * Responsibilities:
 * 
 * -----------------
 * • Execute the ContextEngine.
 * • Produce the canonical ContextResult.
 * • Execute the ConfidenceEngine using the canonical payload supplied by AJDecisionEngine.
 * • Merge context with confidence results.
 * • Preserve Pine Script parity for legacy routing.
 * • Provide a single compatibility layer for AJDecisionEngine.
 *
 * This engine DOES NOT:
 * ---------------------
 * • Detect trends.
 * • Detect liquidity.
 * • Detect market structure.
 * • Calculate order blocks.
 * • Execute AI logic.
 * • Execute SMC logic.
 * • Make trading decisions.
 * • Execute trades.
 *
 * Those responsibilities belong to their dedicated engines.
 *
 * AJ v2 Pipeline
 *
 * Runtime Context
 *        │
 *        ▼
 * ContextEngine
 *        │
 *        ▼
 * ConfidenceEngine
 *        │
 *        ▼
 * AJContextEngine
 *        │
 *        ▼
 * AJDecisionEngine
 *
 * Design Principles:
 * ------------------
 * • Single Responsibility Principle.
 * • Pure orchestration.
 * • Immutable pipeline output.
 * • No duplicated business logic.
 * • Pine-compatible routing.
 * • Platform independent.
 * • Phase-ready for future confidence enhancements.
 *
 * Inputs:
 * -------
 * • ContextInputs
 * • ConfidenceInput
 *
 * Outputs:
 * --------
 * • ContextResult
 * • ConfidenceResult
 * • Combined Context + Confidence routing object
 *
 * Downstream Consumers:
 * ---------------------
 * • AJDecisionEngine
 * • AI Engine
 * • SMC Engine
 * • Authority Engine
 * • State Machine
 * • Runtime Adapter
 *
 * Phase:
 * -------
 * Phase 15 – Institutional Context Orchestration
 *
 * Future Enhancements:
 * --------------------
 * Phase 16:
 * • Confidence explanation model.
 * • Confidence visualization.
 * • Score contribution breakdown.
 * • Educational diagnostics.
 * • Market mood annotations.
 * • Confidence history tracking.
 ****************************************************************************************/

//======================================================
// src/indicators/AJIndicator/AJContextEngine.ts
// Canonical Context Orchestrator
//======================================================

import { ContextEngine } from "./context/ContextEngine";
import { ConfidenceEngine } from "./engines/Confidence";

import type { ContextInputs } from "./context/AJContextTypes";
import type { AJContextResult } from "./AJTypes";
import type { ConfidenceInput } from "./engines/Confidence";

//======================================================
// AJ CONTEXT ENGINE
//======================================================

export class AJContextEngine {

    //--------------------------------------------------
    // SUB ENGINES
    //--------------------------------------------------

    private readonly contextEngine =
        new ContextEngine();

	// ConfidenceEngine is currently used statically.

    //--------------------------------------------------
    // CONTEXT + CONFIDENCE
    //--------------------------------------------------

	evaluate(
		contextInputs: ContextInputs,
		confidenceInput: ConfidenceInput
	): AJContextResult {

        //--------------------------------------------------
        // BUILD MARKET CONTEXT
        //--------------------------------------------------

		const context =
			this.contextEngine.evaluate(
				contextInputs
			);
		
		//--------------------------------------------------
		// RV-07 FINAL FIX
		// CANONICAL PROPAGATION
		//--------------------------------------------------
		
		confidenceInput.tradeDirection =
			context.tradeDirectionFinal;
		
		//--------------------------------------------------
		// CONFIDENCE
		//--------------------------------------------------
		
		const confidenceResult =
			ConfidenceEngine.evaluate(
				confidenceInput
			);
		
		//--------------------------------------------------
		// RV-07E TRACE (Temporary)
		//--------------------------------------------------
		
		console.group("[RV-07E TRACE]");
		//--------------------------------------------------
		// CONTEXT PRODUCER
		//--------------------------------------------------
		
		console.table({
		
			contextEngine: {
		
				ctxLong:
					context.ctxLong,
		
				ctxShort:
					context.ctxShort,
		
				contextTradeDirection:
					context.tradeDirectionFinal
		
			}
		
		});
		//--------------------------------------------------
		// ROUTING RESULT
		//--------------------------------------------------
		console.table({
		
			routing: {
		
				canonicalTradeDirection:
					context.tradeDirectionFinal,
		
				confidenceTradeDirection:
					confidenceInput.tradeDirection,
		
				directionsMatch:
					context.tradeDirectionFinal ===
					confidenceInput.tradeDirection,
		
				ctxLong:
					context.ctxLong,
		
				ctxShort:
					context.ctxShort
		
			}
		
		});
		//--------------------------------------------------
		// CONFIDENCE RESULT
		//--------------------------------------------------
		console.table({
		
			confidenceEngine: {
		
				receivedTradeDirection:
					confidenceInput.tradeDirection,
		
				receivedAuthorityDecision:
					confidenceInput.authorityDecision,
		
				confidence:
					confidenceResult.confidence,
		
				confidenceGrade:
					confidenceResult.confidenceGrade,
		
				recommendation:
					confidenceResult.recommendation,
		
				tradeQualified:
					confidenceResult.tradeQualified,
		
				evidenceCount:
					confidenceResult.evidence.length
		
			}
		
		});

		console.groupEnd();

		//--------------------------------------------------
		// RETURN CANONICAL OUTPUT
		//--------------------------------------------------
		
		return {

            ...context,

            // RV-09A
            // REMOVED the longScore/shortScore/tradeScore
            // overrides that used to sit here. context already
            // carries the correct weighted longScore/shortScore
            // (e.g. 85/15) and tradeScore = Math.max(longScore,
            // shortScore) via the ...context spread above — the
            // 3 deleted lines were replacing all of that with
            // contextScore (same number for BOTH long and short)
            // and confluenceScore (silently ~contextScore/3,
            // since institutionalScore and confluenceScore are
            // both hardcoded 0 upstream). stateInputs.tradeScore
            // in AJDecisionEngine.ts is StateMachine's ONLY score
            // gate for SCAN -> ARMED, so this needs to be real.

            // RV-07G
            // Forward the canonical value ContextEngine already
            // computed instead of re-deriving it here. The old
            // re-derivation (ctxLong ? 1 : ctxShort ? -1 : 0) had
            // no guard against ctxLong and ctxShort both being
            // true, so it could disagree with context.tradeDirectionFinal,
            // which correctly resolves that conflicting case to 0.
			
            tradeDirectionFinal:
                    context.tradeDirectionFinal

        };

    }

}