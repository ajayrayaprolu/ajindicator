//RuntimeResult the single output contract of RuntimeEngine and RuntimeResult should expose both execution layers instead of only the institutional one.
//Including :decision, runtime, context, authority, execution, option, debug
//Platform state → RuntimeContext //Institutional/AI state → AJRuntimeContext //Pipeline result → RuntimeResult
//Platform execution → RuntimeExecutionResult //Institutional execution → ExecutionResult //RuntimeEngine will populate both.
//AJRuntimeAdapter will consume the platform execution. //The UI/strategy can still consume the institutional execution when needed

//======================================================
// src/runtime/RuntimeResult.ts  : Canonical Runtime Engine Output Contract
//✅ src/types/EngineState.ts → Platform (single source of truth for runtime)
//✅ src/runtime/RuntimeContext.ts → Platform
//✅ src/runtime/RuntimeResult.ts → Platform
//✅ src/runtime/execution/* → Platform
//✅ src/indicators/AJIndicator/core/EngineState.ts → AJIndicator-specific state type
//✅ src/indicators/AJIndicator/execution/* → Institutional execution contrac
//======================================================
//======================================================
// RuntimeResult.ts
// Canonical Runtime Engine Output Contract
//======================================================

import type { AJIndicatorResult, AJContextResult, AJDecisionResult } from "../indicators/AJIndicator/AJTypes";
import type { AJRuntimeContext } from "../indicators/AJIndicator/AJRuntimeContext";
import { EngineState } from "../core/EngineState";

//======================================================
// RUNTIME RESULT
//======================================================

export interface RuntimeResult {

    //--------------------------------------------------
    // COMPLETE AJ PIPELINE
    //--------------------------------------------------

    decision: AJIndicatorResult;

    //--------------------------------------------------
    // ENRICHED RUNTIME
    //--------------------------------------------------

    runtime: AJRuntimeContext;

    //--------------------------------------------------
    // PIPELINE RESULTS
    //--------------------------------------------------
    
    context: AJContextResult;
    decisionResult: AJDecisionResult;
    execution: AJIndicatorResult["execution"];

    //--------------------------------------------------
    // SIGNALS
    //--------------------------------------------------
    
    direction: number;

    longSignal: boolean;
    shortSignal: boolean;

    tradeScore: number;
    confidence: number;

    contextScore: number;
    confluenceScore: number;

    executionAllowed: boolean;
    canExecute: boolean;

    aiConfidence: number;
    executionConfidence: number;

    marketRegime: string;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------
    
    tradeDirection: number;
    entryPrice: number;
    stopLoss: number;
    positionOpen: boolean;

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // EXECUTION STATUS
    //--------------------------------------------------

    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    slHit: boolean;

    breakEvenActive: boolean;

    trailingActive: boolean;
    trailingStop: number;

    reentryTriggered: boolean;
    reentryPrice: number;

    closeTrade: boolean;
    exitReason: string;

    //--------------------------------------------------
    // PLATFORM ENGINE STATE
    //--------------------------------------------------
    
    engineState: EngineState;
    currentState: EngineState;
    nextState: EngineState;

    //--------------------------------------------------
    // SUMMARY
    //--------------------------------------------------

    recommendation: string;

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    optionSymbol?: string;
    recommendedOption?: string;

    //--------------------------------------------------
    // EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;
    telemetry?: Record<string, unknown>;
    diagnostics?: Record<string, unknown>;
}


