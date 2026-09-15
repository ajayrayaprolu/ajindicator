/****************************************************************************************
 * File:
 * LifecycleResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Lifecycle/LifecycleResult.ts
 *
 * Purpose:
 * Canonical institutional lifecycle result contract for the AJ v2
 * trading engine.
 *
 * This contract represents the complete output produced by the
 * Lifecycle Engine after evaluating the current trade state,
 * execution state, exit conditions, trailing state and re-entry state.
 *
 * Responsibilities:
 * -----------------
 * • Lifecycle state transitions
 * • Trade state information
 * • Execution state information
 * • Lifecycle management flags
 * • Exit status
 * • Transition diagnostics
 * • Runtime lifecycle metadata
 *
 * This file performs NO calculations.
 * It only defines the reusable lifecycle result contract shared
 * across the institutional execution pipeline.
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
 *          ├── Lifecycle Status
 *          ├── Execution State
 *          └── Diagnostics
 *
 ****************************************************************************************/

import type { EngineState } from "../../core/EngineState";
import type { LifecycleDiagnostics } from "./LifecycleTypes";

//======================================================
// LIFECYCLE RESULT
//======================================================

export interface LifecycleResult {

    //--------------------------------------------------
    // ENGINE STATE
    //--------------------------------------------------

    currentState: EngineState;
    nextState: EngineState;
    stateChanged: boolean;

    //--------------------------------------------------
    // TRADE STATUS
    //--------------------------------------------------

    tradeActive: boolean;
    tradeClosed: boolean;
    tradeCancelled: boolean;

	//--------------------------------------------------
	// EXIT STATUS
	//--------------------------------------------------
	
	timeoutExit: boolean;
	emergencyExit: boolean;
	forceExit: boolean;

    //--------------------------------------------------
    // EXECUTION STATUS
    //--------------------------------------------------

    pending: boolean;
    executed: boolean;
    managing: boolean;

    //--------------------------------------------------
    // LIFECYCLE FLAGS
    //--------------------------------------------------

	trailingActive: boolean;
	breakEvenActive: boolean;

	//--------------------------------------------------
	// RE-ENTRY STATUS
	//--------------------------------------------------
	
	reEntry: boolean;
	reEntryEligible: boolean;
	reEntryTriggered: boolean;
	remainingAttempts: number;
	reentryPrice: number;
	reEntryStopLoss: number;
	cooldownPassed: boolean;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------
    diagnostics?: LifecycleDiagnostics;

    //--------------------------------------------------
    // EXTENSIONS
    //--------------------------------------------------
    metadata?: Record<string, unknown>;
    notes?: string[];
}

//======================================================
// END OF FILE
//======================================================