/****************************************************************************************
 * File:
 * LifecycleEngine.ts
 *
 * Path: src/indicators/AJIndicator/engines/Lifecycle/LifecycleEngine.ts
 *
 * Purpose:
 * Canonical institutional lifecycle engine for AJ v2.
 *
 * Responsibilities:
 * -----------------
 * • Control trade lifecycle transitions
 * • Maintain execution state integrity
 * • Detect entry, TP, trailing and exit transitions
 * • Handle re-entry activation
 * • Detect timeout and emergency exits
 * * This engine performs NO execution calculations.
 * It only manages lifecycle state.
 *
 * AJ Lifecycle Architecture
 * 
 * Execution Engine
 *         │
 *         ▼
 * Trade Management
 *         │
 *         ▼
 * Exit Engine
 *         │
 *         ▼
 * ReEntry Engine
 *         │
 *         ▼
 * Lifecycle Engine
 *
 ****************************************************************************************/

import { EngineState } from "../../core/EngineState";
import type { ExecutionContext } from "../Execution/ExecutionTypes";
import type { TradeManagementResult } from "../Execution/TradeManagementResult";
import type { ExitResult } from "../Execution/ExitEngine";
import type { ReEntryResult } from "../Execution/ReEntryEngine";
import type { LifecycleResult } from "./LifecycleResult";

import { LifecycleTransitionReason } from "./LifecycleState";

import type {
    LifecycleTransitionReason as LifecycleTransitionReasonType
} from "./LifecycleState";

import type {LifecycleDiagnostics} from "./LifecycleTypes";

//======================================================
// ENGINE
//======================================================

export class LifecycleEngine {

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(
        ctx: ExecutionContext,
        trade: TradeManagementResult,
		exit: ExitResult,
        reEntry: ReEntryResult
    ): LifecycleResult {

        //--------------------------------------------------
        // CURRENT
        //--------------------------------------------------

        const currentState =
            ctx.state;

        let nextState =
            currentState;

		//--------------------------------------------------
		// FLAGS
		//--------------------------------------------------
		
		let timeoutExit = false;
		
		let emergencyExit = false;
		
		let tradeCancelled = false;
		
		//--------------------------------------------------
		// TRANSITION
		//--------------------------------------------------
		
		let transitionReason: LifecycleTransitionReasonType =
			LifecycleTransitionReason.NONE;

        //--------------------------------------------------
        // CLOSED 
        //--------------------------------------------------

		if (exit.closeTrade) {
	
			transitionReason =
				LifecycleTransitionReason.EXIT;
	
			nextState =
				EngineState.CLOSED;
		}
		
		//--------------------------------------------------
		// EMERGENCY EXIT
		//--------------------------------------------------
		
		else if (exit.emergencyExit) {
	
			emergencyExit = true;
	
			transitionReason =
				LifecycleTransitionReason.EMERGENCY_EXIT;
	
			nextState =
				EngineState.CLOSED;
		}
		
		//--------------------------------------------------
		// EXECUTION ACKNOWLEDGED
		//--------------------------------------------------

		else if (
			currentState === EngineState.CONFIRMED &&
			trade.positionOpen
		) {
	
			transitionReason =
				LifecycleTransitionReason.EXECUTION_ACKNOWLEDGED;
	
			nextState =
				EngineState.EXECUTED;
		}
		
		//--------------------------------------------------
		// EXECUTED -> MANAGE
		//--------------------------------------------------
		
		else if (
			currentState === EngineState.EXECUTED &&
			trade.positionOpen
		) {
	
			transitionReason =
				LifecycleTransitionReason.POSITION_OPEN;
	
			nextState =
				EngineState.MANAGE;
		}
		
        //--------------------------------------------------
        // TIMEOUT
        //--------------------------------------------------

		else if (
			exit.reason === "TIME_EXIT"
		) {
		
			timeoutExit = true;
		
			transitionReason =
				LifecycleTransitionReason.TIMEOUT;
		
			nextState =
				EngineState.CLOSED;
		}

        //--------------------------------------------------
        // REENTRY
        //--------------------------------------------------

		else if (
			reEntry.reentryTriggered
		) {
		
			transitionReason =
				LifecycleTransitionReason.REENTRY;
		
			nextState =
				EngineState.MANAGE;
		}

        //--------------------------------------------------
        // TRAILING
        //--------------------------------------------------

		else if (
			trade.trailingAllowed ||
			trade.trailingActive
		) {
		
			transitionReason =
				LifecycleTransitionReason.TRAILING;
		
			nextState =
				EngineState.MANAGE;
		}

        //--------------------------------------------------
        // BREAK EVEN
        //--------------------------------------------------

		else if (
			trade.breakEvenActive
		) {
		
			transitionReason =
				LifecycleTransitionReason.BREAK_EVEN;
		
			nextState =
				EngineState.MANAGE;
		}

        //--------------------------------------------------
        // TARGET MANAGEMENT
        //--------------------------------------------------

		else if (
			trade.tp1Hit ||
			trade.tp2Hit ||
			trade.tp3Hit
		) {
		
			transitionReason =
				LifecycleTransitionReason.TARGET_REACHED;
		
			nextState =
				EngineState.MANAGE;
		}

        //--------------------------------------------------
        // DEFAULT
        //--------------------------------------------------

        else {
            nextState =
                currentState;
        }
		
		//--------------------------------------------------
		// DIAGNOSTICS
		//--------------------------------------------------
		
		const diagnostics: LifecycleDiagnostics = {
		
			transitionReason,
		
			transitionExecuted:
				currentState !== nextState,
		
			previousState:
				currentState,
		
			nextState
		
		};

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {
            currentState,
            nextState,
			
            stateChanged:
                currentState !==
                nextState,

            tradeActive:
                nextState !== EngineState.SCAN &&
                nextState !== EngineState.CLOSED,

            tradeClosed:
                nextState === EngineState.CLOSED,

            tradeCancelled,
            timeoutExit,
            emergencyExit,

            pending:
                nextState === EngineState.SCAN,
            executed:
                nextState === EngineState.EXECUTED,
            managing:
                nextState === EngineState.MANAGE,

			trailingActive:
				trade.trailingActive ??
				false,
			
			breakEvenActive: trade.breakEvenActive,
			
			reEntry: reEntry.reentryTriggered,
			
			forceExit: exit.reason === "FORCE_EXIT",
			
			reEntryEligible: reEntry.reentryAllowed,
			
			reEntryTriggered: reEntry.reentryTriggered,
			
			remainingAttempts: reEntry.remainingAttempts,
			
			reentryPrice: reEntry.reentryPrice,
			
			reEntryStopLoss: reEntry.reEntryStopLoss,
			
			cooldownPassed: reEntry.cooldownPassed,
			
			diagnostics
		};
    }
}