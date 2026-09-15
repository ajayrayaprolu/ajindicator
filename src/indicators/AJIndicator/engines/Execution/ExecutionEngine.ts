/****************************************************************************************
* File:
* ExecutionEngine.ts
*
* Path:
* src/indicators/AJIndicator/engines/Execution/ExecutionEngine.ts
*
* Purpose:
* --------
*
* Canonical Institutional Execution Adapter for AJ v2.
* This engine transforms an approved ExecutionContext into an institutional execution plan.
* It performs execution planning only and produces the planning portion of the canonical ExecutionResult.
* It does not perform runtime execution or execution lifecycle management.
* 
* Responsibilities: ExecutionEngine owns planning only
* -----------------
*
* Consume ExecutionContext.
* Validate execution prerequisites.
* Validate authority approval.
* Validate confidence.
* Validate risk qualification.
* Validate entry conditions.
* Build institutional execution plan.
* Build execution risk model.
* Build execution targets.
* Calculate execution metrics.
* Produce the execution-planning portion of the canonical ExecutionResult.
*
* This engine DOES NOT:
* ---------------------
*
* This engine does NOT:
* Execute broker orders.
* Monitor open positions.
* Track TP/SL hits.
* Manage execution lifecycle.
* Manage trailing stops.
* Manage re-entry.
* Manage exits.
* Coordinate runtime execution.
* Merge subsystem results.
* Specialized execution engines own their respective domains.
*
* ExecutionContext
*         │
*         ▼
* ExecutionEngine
*         │
*         ▼
* Execution Planning
* (plan • risk • targets • diagnostics)
*         │
*         ▼
* AJExecutionEngine
*         │
*         ├── RuntimeExecutionEngine
*         ├── TradeManagement
*         ├── LifecycleEngine
*         ├── TrailingEngine
*         ├── ExitEngine
*         ├── ReEntryEngine
*         ▼
* ExecutionResult
* 
********************************************************************************************/

import type {
    ExecutionContext,
    ExecutionPlan,
    ExecutionRisk,
    ExecutionTargets,
    ExecutionDiagnostics
} from "./ExecutionTypes";

import type {ExecutionResult} from "./ExecutionResult";
import { AJRuntimeParameters } from "@/indicators/AJIndicator/config/AJRuntimeParameters";
//======================================================
// EXECUTION ENGINE
//======================================================

export class ExecutionEngine {

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    evaluate(

        ctx: ExecutionContext

    ): ExecutionResult {
	
        //--------------------------------------------------
        // EXECUTION PRE-VALIDATION
        //--------------------------------------------------

        const authorityApproved =

            ctx.executionApproved &&

            (
                ctx.authorityAction === "BUY" ||

                ctx.authorityAction === "SELL"
            );

		// RV-19
        // TEST MODE. ctx.confidence (~45 typical) was checked against a
        // hardcoded production threshold of 70 here, while
        // ExecutionAuthority.ts already approved the same trade at its
        // own test-mode threshold of 10. This mismatch silently
        // re-blocked every trade Authority had just approved.
        // ctx.riskApproved reads riskQualified, which is always false
        // because RiskQualificationEngine isn't wired into the payload
        // yet (same gap as ExecutionAuthority.ts RV-12). Demoted to
        // non-blocking for test mode, consistent with RV-12/17/18.
		//--------------------------------------------------
        // RV-20
        // Both thresholds now read live from AJRuntimeParameters
        // instead of being hardcoded. When AJRuntimeParameters.
        // applyDeveloperProfile() is active, these automatically
        // relax to match whatever ExecutionAuthority.ts and
        // ConfidenceEngine.ts are using — no per-file threshold
        // edits needed when switching profiles.
        //
        // riskApproved switched from the unwired ctx.riskApproved
        // boolean (always false — RiskQualificationEngine isn't
        // wired into the payload yet) to a numeric riskScore check
        // against the same AJRuntimeParameters.riskThreshold
        // ExecutionAuthority.ts already uses for its own risk gate.
        //--------------------------------------------------

        const confidenceApproved =

            ctx.confidence >= AJRuntimeParameters.executionConfidence;

        const riskApproved =

            ctx.riskScore >= AJRuntimeParameters.riskThreshold;

        const mtfApproved =

            ctx.mtfAgreement;

        const trendApproved =
            ctx.trendBull ||
            ctx.trendBear;

        const momentumApproved =
            ctx.momentumBull ||
            ctx.momentumBear;

        //--------------------------------------------------
        // EXECUTION GATE
        //--------------------------------------------------

        const executionReady =
            authorityApproved &&
            confidenceApproved &&
            riskApproved &&
            mtfApproved &&
            trendApproved &&
            momentumApproved;

        //--------------------------------------------------
        // BASIC ENTRY VALIDATION
        //--------------------------------------------------

        const validTrade =
            ctx.tradeDir !== 0 &&
            ctx.entryPrice > 0 &&
            ctx.slPrice > 0 &&
            ctx.tp1 > 0;

		//--------------------------------------------------
		// FINAL ENTRY VALIDATION
		//--------------------------------------------------
		
		const executionPlanApproved =
			executionReady &&
			validTrade;
		
        //--------------------------------------------------
        // RUNTIME POSITION STATE
        //
        // ExecutionEngine performs planning only.
        // It must NOT convert plan approval into an
        // already-open runtime position.
        //
        // Lifecycle / runtime execution owns the actual
        // position state.
        //--------------------------------------------------

        const positionOpen =
                ctx.inPosition === true;

        const engineState =
                ctx.state;

		//--------------------------------------------------
		// GATE FAILURES
		//--------------------------------------------------
		
		const failedGates: string[] = [];
		
		if (!authorityApproved)
			failedGates.push("Authority");
		
		if (!confidenceApproved)
			failedGates.push("Confidence");
		
		if (!riskApproved)
			failedGates.push("Risk");
		
		if (!mtfApproved)
			failedGates.push("MultiTimeframe");
		
		if (!trendApproved)
			failedGates.push("Trend");
		
		if (!momentumApproved)
			failedGates.push("Momentum");
		
		if (!validTrade)
			failedGates.push("TradeValidation");

		//--------------------------------------------------
        // EXECUTION PLAN
        //--------------------------------------------------

        const plan: ExecutionPlan = {
            action: ctx.authorityAction,
            approved: executionPlanApproved,
            entryPrice: ctx.entryPrice,
            limitPrice: ctx.entryPrice,
            triggerPrice: ctx.entryPrice,
            stopLoss: ctx.slPrice,
            initialStop: ctx.slPrice,
            trailingStop: ctx.slPrice,
            breakEvenPrice: ctx.entryPrice,
            tp1: ctx.tp1,
            tp2: ctx.tp2,
            tp3: ctx.tp3,
            positionSize: ctx.positionSize,
            quantity: ctx.positionSize,
            riskAmount: Math.abs(
                    ctx.entryPrice -
                    ctx.slPrice
                ) * ctx.positionSize,

            capitalRequired:
                ctx.entryPrice *
                ctx.positionSize
        };

        //--------------------------------------------------
        // EXECUTION RISK
        //--------------------------------------------------

        const risk: ExecutionRisk = {
            accountRiskPercent:
				ctx.accountRiskPercent ?? 0,

            tradeRisk:
                Math.abs(
                    ctx.entryPrice -
                    ctx.slPrice
                ),

            rewardRiskRatio:
                Math.abs(
                    ctx.tp1 -
                    ctx.entryPrice
                ) /
                Math.max(
                    Math.abs(
                        ctx.entryPrice -
                        ctx.slPrice
                    ),
                    0.000001
                ),

            atr: ctx.atr,
            volatilityScore: ctx.volatilityScore,
            riskApproved: ctx.riskApproved,
            riskScore: ctx.riskScore,

            maxLoss:
                Math.abs(
                    ctx.entryPrice -
                    ctx.slPrice
                ) *
                ctx.positionSize,
            maxPositionSize:
                ctx.positionSize
        };

		//--------------------------------------------------
		// EXECUTION SCORE
		//--------------------------------------------------
		
		const executionScore =
			Math.round(
		
				(
		
					ctx.confidence +
		
					ctx.riskScore +
		
					(risk.rewardRiskRatio * 20)
		
				) / 3
		
			);
	
        //--------------------------------------------------
        // EXECUTION TARGETS
        //--------------------------------------------------

		const targets: ExecutionTargets = {
		
			entry: ctx.entryPrice,
		
			stopLoss: ctx.slPrice,
		
			trailingStop: ctx.slPrice,
		
			breakEven: ctx.entryPrice,
		
			tp1: ctx.tp1,
		
			tp2: ctx.tp2,
		
			tp3: ctx.tp3,
		
			tp1Hit: false,
		
			tp2Hit: false,
		
			tp3Hit: false,
		
			stopLossHit: false
		
		};
		
		//--------------------------------------------------
		// EXECUTION DIAGNOSTICS
		//--------------------------------------------------
		
		const diagnostics: ExecutionDiagnostics = {
		
			//--------------------------------------------------
			// EXECUTION GATES
			//--------------------------------------------------
		
			authorityApproved,
		
			authorityAction:
				ctx.authorityAction,
		
			executionReady,
		
			validTrade,
		
			executionPlanApproved,
		
			confidenceApproved,
		
			riskApproved,
		
			mtfApproved,
		
			trendApproved,
		
			momentumApproved,
		
			//--------------------------------------------------
			// FAILURES
			//--------------------------------------------------
		
			failedGates,
		
			//--------------------------------------------------
			// METRICS
			//--------------------------------------------------
		
			confidence:
				ctx.confidence,
		
			riskScore:
				ctx.riskScore,
		
			executionScore,
		
			positionRisk:
				risk.tradeRisk,
		
			rewardRisk:
				risk.rewardRiskRatio
		};
		

		//--------------------------------------------------
		// EXECUTION PLANNING RESULT
		//--------------------------------------------------
		
		return {
		
			//--------------------------------------------------
			// EXECUTION
			//--------------------------------------------------
		
			executionApproved:
				executionPlanApproved,
		
			executionAction:
				ctx.authorityAction,
		
			canEnter:
				executionPlanApproved,
		
			//--------------------------------------------------
			// EXECUTION PLANNING
			//--------------------------------------------------
		
			plan,
		
			risk,
		
			targets,
		
			//--------------------------------------------------
			// POSITION
			//--------------------------------------------------
			
			positionSize:
				ctx.positionSize,
			
			remainingPosition:
				ctx.positionSize,
			
            inPosition:
                    positionOpen,

            positionClosed:
                    false,

            closeTrade:
                    false,

            currentState:
                    engineState,

            nextState:
                    engineState,
		
			//--------------------------------------------------
			// TARGET STATUS
			//--------------------------------------------------
		
			tp1Hit: false,
		
			tp2Hit: false,
		
			tp3Hit: false,
		
			stopLossHit: false,
		
			//--------------------------------------------------
			// TRAILING
			//--------------------------------------------------
		
			trailingStop:
				ctx.slPrice,
		
			trailingMode:
				"NONE",
		
			//--------------------------------------------------
			// ALIGNMENT
			//--------------------------------------------------
		
			mtfAlignment:
				ctx.mtfAlignment,
		
			//--------------------------------------------------
			// EXECUTION METRICS
			//--------------------------------------------------
		
			confidence:
				ctx.confidence,
		
			institutionalConfidence:
				ctx.confidence,
		
			riskScore:
				ctx.riskScore,
		
			executionScore,
		
			executionQuality:
				executionPlanApproved
					? executionScore
					: 0,
		
			//--------------------------------------------------
			// EXECUTION DIAGNOSTICS
			//--------------------------------------------------
		
			diagnostics
		
		};
    }

}