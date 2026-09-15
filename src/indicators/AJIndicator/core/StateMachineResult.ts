//\src\indicators\AJIndicator\core\StateMachineResult.ts
//======================================================
// StateMachineResult.ts
// Complete Replacement
// Canonical State Machine Output Contract
//======================================================

import { EngineState } from "../core/EngineState";

export interface StateMachineResult {

    //--------------------------------------------------
    // ROUTING
    //--------------------------------------------------

    routeAISMC: boolean;
    routeAI: boolean;
    routeOriginal: boolean;

    //--------------------------------------------------
    // READINESS
    //--------------------------------------------------

    stateScanReady: boolean;
    stateConfirmReady: boolean;
    confirmEvent: boolean;
    genericReady: boolean;

    //--------------------------------------------------
    // MARKET ROUTING
    //--------------------------------------------------

    cryptoReady_SCAN: boolean;
    cryptoReady_CONFIRM: boolean;
    indiaReady_SCAN: boolean;
    indiaReady_CONFIRM: boolean;

    //--------------------------------------------------
    // OPTION MIRROR
    //--------------------------------------------------

    indexTradeRunning: boolean;
    masterTradeMirror: boolean;

    //--------------------------------------------------
    // ENGINE STATE
    //--------------------------------------------------

    engineState: EngineState;

    //--------------------------------------------------
    // STATE MEMORY
    //--------------------------------------------------

    signalBar: number | null;
    lastBias: number;
    bias: number;

    //--------------------------------------------------
    // STATE TRANSITIONS
    //--------------------------------------------------

    enteredScan: boolean;
    enteredArmed: boolean;
    enteredConfirmed: boolean;
    enteredExecuted: boolean;
    enteredManage: boolean;
    enteredClosed: boolean;

    //--------------------------------------------------
    // FINAL STATUS
    //--------------------------------------------------

    stateChanged: boolean;
    readyForExecution: boolean;

}
