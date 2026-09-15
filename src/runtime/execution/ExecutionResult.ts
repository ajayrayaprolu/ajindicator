//runtime/execution/
//        ExecutionEngine.ts
//        ExecutionResult.ts          <-- NEW (Platform)
//
//indicators/AJIndicator/execution/
//            ExecutionEngine.ts
//            ExecutionResult.ts      <-- Institutional
//======================================================
//======================================================
// Runtime ExecutionResult for Generic Platform Execution Contract
// This is the finalized platform contract: ✅ Imports EngineState from src/types/EngineState.ts
//✅ Contains only generic execution lifecycle ✅ No trailing ✅ No break-even ✅ No re-entry ✅ No execution score ✅ No institutional confidence
//✅ No exit reason ✅ No analytics ✅ No dependency on AJIndicato
//======================================================
//======================================================
// src/runtime/execution/ExecutionResult.ts
// Canonical Platform Runtime Execution Result
// Generic execution lifecycle only
//======================================================

import { EngineState } from "../../core/EngineState";

//======================================================
// PLATFORM EXECUTION RESULT
//======================================================

export interface RuntimeExecutionResult {

    //--------------------------------------------------
    // ENTRY
    //--------------------------------------------------

    canEnter: boolean;
    inPosition: boolean;

    //--------------------------------------------------
    // TARGET STATUS
    //--------------------------------------------------

    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    stopLossHit: boolean;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionClosed: boolean;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    closeTrade: boolean;

    //--------------------------------------------------
    // PLATFORM STATE
    //--------------------------------------------------

    currentState: EngineState;
    nextState: EngineState;

}
