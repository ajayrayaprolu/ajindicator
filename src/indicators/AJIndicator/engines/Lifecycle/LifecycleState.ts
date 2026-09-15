/****************************************************************************************
 * File:
 * LifecycleState.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Lifecycle/LifecycleState.ts
 *
 * Purpose:
 * Canonical lifecycle state definitions for the AJ v2 institutional
 * trading engine.
 *
 * This file defines the reusable lifecycle transition reasons used by
 * the Lifecycle Engine to explain why a trade moved from one execution
 * state to another.
 *
 * Responsibilities:
 * -----------------
 * • Define lifecycle transition reasons
 * • Provide standardized transition diagnostics
 * • Eliminate magic strings from lifecycle logic
 * • Support structured logging and debugging
 * • Provide a reusable contract for downstream engines
 *
 * This file performs NO calculations.
 * It only defines reusable lifecycle state constants.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Authority
 *      ↓
 * Execution
 *      ↓
 * Trade Management
 *      ↓
 * Lifecycle
 *          ├── Lifecycle Engine
 *          ├── Transition Evaluation
 *          ├── State Management
 *          └── Diagnostics
 *
 ****************************************************************************************/

//======================================================
// LIFECYCLE TRANSITION REASON
//======================================================

/**
 * Canonical reasons describing why the Lifecycle Engine
 * transitioned from one execution state to another.
 */
export const LifecycleTransitionReason = {

    //--------------------------------------------------
    // NO TRANSITION
    //--------------------------------------------------

    NONE: "NONE",

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    EXECUTION_ACKNOWLEDGED: "EXECUTION_ACKNOWLEDGED",

    POSITION_OPEN: "POSITION_OPEN",

	//--------------------------------------------------
	// TRADE MANAGEMENT
	//--------------------------------------------------
	
	TARGET_REACHED: "TARGET_REACHED",
	
	BREAK_EVEN: "BREAK_EVEN",
	
	TRAILING: "TRAILING",
	
	REENTRY: "REENTRY",

    //--------------------------------------------------
    // EXITS
    //--------------------------------------------------

	EXIT: "EXIT",
	
	EMERGENCY_EXIT: "EMERGENCY_EXIT",
	
	TIMEOUT: "TIMEOUT"
	
	} as const;
	
	export type LifecycleTransitionReason =
		typeof LifecycleTransitionReason[keyof typeof LifecycleTransitionReason];

//======================================================
// END OF FILE
//======================================================

//======================================================
// END OF FILE
//======================================================