/****************************************************************************************
 * File:
 * AJExecutionEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/AJExecutionEngine.ts
 *
 * Purpose:
 * --------
 * 
 * Central orchestration pipeline for the AJ v2 Institutional
 * Execution Layer.
 * 
 * This engine coordinates every execution subsystem and merges
 * their outputs into the canonical ExecutionResult.
 * 
 * Responsibilities:
 * -----------------
 * 
 * Consume the canonical ExecutionContext.
 * Invoke ExecutionEngine.
 * Invoke RuntimeExecutionEngine.
 * Invoke TradeManagement.
 * Invoke LifecycleEngine.
 * Invoke TrailingEngine.
 * Invoke ExitEngine.
 * Invoke ReEntryEngine.
 * Merge subsystem outputs.
 * Produce the canonical ExecutionResult.
 * 
 * This engine DOES NOT:
 * ---------------------
 * 
 * Validate entries.
 * Build execution plans.
 * Calculate execution risk.
 * Calculate execution targets.
 * Calculate position sizing.
 * Perform authority validation.
 * Calculate confidence.
 * Execute broker orders.
 * 
 * AJ v2 Execution Architecture
 * 
 *                  AJDecisionEngine
 *                         │
 *                         ▼
 *                 ExecutionContext
 *                         │
 *                         ▼
 *                AJExecutionEngine
 *                         │
 *         ┌───────────────┼────────────────┐
 *         ▼               ▼                ▼
 *  ExecutionEngine   RuntimeExecutionEngine  TradeManagement
 *         │                │                │
 *         ├────────────────┼────────────────┤
 *         ▼                ▼                ▼
 *  LifecycleEngine    TrailingEngine     ExitEngine
 *         │
 *         ▼
 *  ReEntryEngine
 *         │
 *         ▼
 *  Merge All Results
 *         │
 *         ▼
 *  ExecutionResult
 ******************************************************************************************/

import type { ExecutionContext } from "./engines/Execution";
import type { ExecutionResult } from "./engines/Execution/ExecutionResult";

import {
    ExecutionEngine,
    TradeManagement,
    TrailingEngine,
    ExitEngine,
    ReEntryEngine
} from "./engines/Execution";

import {
    LifecycleEngine
} from "./engines/Lifecycle/LifecycleEngine";

import {
    ExecutionEngine as RuntimeExecutionEngine
} from "../../runtime/execution/ExecutionEngine";

export class AJExecutionEngine {

    //--------------------------------------------------
    // EXECUTION ORCHESTRATION
    //--------------------------------------------------

    evaluate(
        context: ExecutionContext
    ): ExecutionResult {

        //--------------------------------------------------
        // EXECUTION PLANNING
        //--------------------------------------------------

        const planning =
            new ExecutionEngine().evaluate(context);

        //--------------------------------------------------
        // RUNTIME EXECUTION
        //--------------------------------------------------

        const runtime =
            RuntimeExecutionEngine.evaluate({
                state: context.state,
                tradeDirection: context.tradeDir,
                entryPrice: context.entryPrice,
                currentPrice: context.currentPrice,
                high: context.high,
                low: context.low,
                stopLoss: context.slPrice,
                tp1: context.tp1,
                tp2: context.tp2,
                tp3: context.tp3,
                positionSize: context.positionSize,
                barIndex: context.barIndex,
                entryBarIndex: context.entryBarIndex
            });

        //--------------------------------------------------
        // TRADE MANAGEMENT
        //--------------------------------------------------

        const trade =
            TradeManagement.evaluate(
                context,
                runtime
            );

		//--------------------------------------------------
		// TRAILING
		//--------------------------------------------------
		
		const trailing =
			TrailingEngine.evaluate(
				context,
				trade
			);
		
		//--------------------------------------------------
		// EXIT
		//--------------------------------------------------
		
		const exit =
			ExitEngine.evaluate(
				context,
				trade,
				runtime
			);
		
		//--------------------------------------------------
		// RE-ENTRY
		//--------------------------------------------------
		
		const reEntry =
			ReEntryEngine.evaluate(
				context,
				trade
			);
		
		//--------------------------------------------------
		// LIFECYCLE
		//--------------------------------------------------
		
		const lifecycle =
			LifecycleEngine.evaluate(
				context,
				trade,
				exit,
				reEntry
			);
		
        //--------------------------------------------------
        // BUILD CANONICAL EXECUTION RESULT
        //--------------------------------------------------

        return {
			
            //--------------------------------------------------
            // EXECUTION PLANNING
            //--------------------------------------------------

            ...planning,
			
            //--------------------------------------------------
            // RUNTIME
            //--------------------------------------------------

            inPosition:
                runtime.inPosition,

            tp1Hit:
                trade.tp1Hit,

            tp2Hit:
                trade.tp2Hit,

            tp3Hit:
                trade.tp3Hit,

			stopLossHit:
				trade.stopLossHit,
			
			positionClosed:
				trade.tp3Hit ||
				trade.stopLossHit,

            //--------------------------------------------------
            // RE-ENTRY
            //--------------------------------------------------

            ...reEntry,

            //--------------------------------------------------
            // POSITION MANAGEMENT
            //--------------------------------------------------

            remainingPosition:
                trade.remainingPosition,

            partialExitQty:
                undefined,

            //--------------------------------------------------
            // TRAILING
            //--------------------------------------------------

            ...trailing,

            //--------------------------------------------------
            // EXIT
            //--------------------------------------------------

            ...exit,

			//--------------------------------------------------
			// LIFECYCLE
			//--------------------------------------------------
			
			lifecycle,
			
			//--------------------------------------------------
			// EXECUTION DIAGNOSTICS
			//--------------------------------------------------
			
			diagnostics: {
				authorityApproved: planning.diagnostics?.authorityApproved ?? false,
				authorityAction: planning.executionAction,
				executionReady: planning.executionApproved,
				validTrade: planning.canEnter,
				executionPlanApproved: planning.executionApproved,
				confidenceApproved: (planning.confidence ?? 0) > 0,
				riskApproved: (planning.riskScore ?? 0) > 0,
				mtfApproved: true,
				trendApproved: true,
				momentumApproved: true,
				failedGates: [],
				confidence: planning.confidence ?? 0,
				riskScore: planning.riskScore ?? 0,
				executionScore: planning.executionScore ?? 0,
				positionRisk: planning.diagnostics?.positionRisk ?? 0,
				rewardRisk: planning.diagnostics?.rewardRisk ?? 0
			}

        };
    }
}

