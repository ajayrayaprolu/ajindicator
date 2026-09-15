/****************************************************************************************
 * File:
 * LifecycleTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Lifecycle/LifecycleTypes.ts
 *
 * Purpose:
 * Canonical lifecycle contracts for the AJ v2 institutional trading engine.
 *
 * This file defines the shared lifecycle contracts consumed by the
 * Lifecycle Engine and downstream execution components.
 *
 * Responsibilities:
 * -----------------
 * • Define lifecycle transition contracts
 * • Define lifecycle diagnostics contracts
 * • Define lifecycle state contracts
 * • Provide a single canonical lifecycle model
 * • Support structured diagnostics and state management
 *
 * This file performs NO calculations.
 * It only defines reusable lifecycle data structures.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Authority
 *      ↓
 * Execution Engine
 *      ↓
 * Trade Management
 *      ↓
 * Lifecycle Engine
 *          ├── State Transition
 *          ├── Lifecycle Diagnostics
 *          ├── Trade Lifecycle
 *          └── Runtime State
 *
 ****************************************************************************************/

import type { EngineState } from "../../core/EngineState";
import type { LifecycleTransitionReason } from "./LifecycleState";

//======================================================
// LIFECYCLE TRANSITION
//======================================================

export interface LifecycleTransition {

    //--------------------------------------------------
    // STATE TRANSITION
    //--------------------------------------------------

    from: EngineState;

    to: EngineState;

    //--------------------------------------------------
    // REASON
    //--------------------------------------------------

    reason: LifecycleTransitionReason;

}

//======================================================
// LIFECYCLE DIAGNOSTICS
//======================================================

export interface LifecycleDiagnostics {

    //--------------------------------------------------
    // TRANSITION
    //--------------------------------------------------

    transitionReason: LifecycleTransitionReason;
    transitionExecuted: boolean;

    //--------------------------------------------------
    // STATES
    //--------------------------------------------------

    previousState: EngineState;
    nextState: EngineState;

}

//======================================================
// EXECUTION LIFECYCLE
//======================================================

/**
 * Canonical lifecycle state shared between the
 * Execution Engine and Lifecycle Engine.
 */
export interface ExecutionLifecycle {

    //--------------------------------------------------
    // STATE
    //--------------------------------------------------

    currentState: EngineState;
    nextState: EngineState;

    //--------------------------------------------------
    // TIME
    //--------------------------------------------------

    barsInTrade: number;
    maxHoldingBars: number;
    tradeAge: number;

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    canEnter: boolean;
    inPosition: boolean;
    positionClosed: boolean;
    breakEvenActive: boolean;
    trailingActive: boolean;

	//--------------------------------------------------
	// RE-ENTRY
	//--------------------------------------------------
	
	reEntryEligible: boolean;
	reEntryCount: number;
	remainingAttempts: number;
	barsSinceExit: number;
}

//======================================================
// END OF FILE
//======================================================