/******************************************************************************
 * File:
 * AJDecisionSnapshot.ts
 *
 * Path:
 * src/indicators/AJIndicator/debug/AJDecisionSnapshot.ts
 *
 * AJ v2 - Canonical Decision Snapshot
 *
 * Purpose
 * ---------------------------------------------------------------------------
 * Immutable snapshot of the completed AJ decision pipeline.
 *
 * Responsibilities
 * ---------------------------------------------------------------------------
 * • Single source of truth for Debug UI
 * • Consumed by AJDebugBuilder
 * • Consumed by DebugEngine
 * • Consumed by Pipeline Diagnostics
 * • No business logic
 * • No calculations
 *
 * Notes
 * ---------------------------------------------------------------------------
 * This object is created exactly once by AJDecisionEngine after every engine
 * has completed execution.
 ******************************************************************************/

import type { AJRuntimeContext } from "../AJRuntimeContext";
import type { ContextResult } from "../context/AJContextResult";
import type { ConfidenceResult } from "../engines/Confidence/ConfidenceResult";
import type { ExecutionAuthorityResult } from "../engines/Authority";
import type { ExecutionResult } from "../engines/Execution";
import type { AJIndicatorResult } from "../AJTypes";

//------------------------------------------------------
// Optional Engine Results
//------------------------------------------------------

export interface AIConfidenceResult {
    [key: string]: unknown;
}

export interface SMCResult {
    [key: string]: unknown;
}

export interface MarketStateResult {
    [key: string]: unknown;
}

export interface StateMachineResult {
    [key: string]: unknown;
}

export interface OptionValidationResult {
    [key: string]: unknown;
}

export interface AJPipelineTrace {
    [key: string]: unknown;
}

//======================================================
// AJ DECISION SNAPSHOT
//======================================================

export interface AJDecisionSnapshot {

    //--------------------------------------------------
    // RUNTIME
    //--------------------------------------------------

    readonly runtime: AJRuntimeContext;

    //--------------------------------------------------
    // ENGINE RESULTS
    //--------------------------------------------------

    readonly context: ContextResult;

    readonly confidence: ConfidenceResult;

    readonly authority: ExecutionAuthorityResult;

    readonly execution: ExecutionResult;

    readonly state?: StateMachineResult;

    readonly option?: OptionValidationResult;

    //--------------------------------------------------
    // OPTIONAL ENGINE OUTPUTS
    //--------------------------------------------------

    readonly ai?: AIConfidenceResult;

    readonly smc?: SMCResult;

    readonly marketState?: MarketStateResult;
	
	//--------------------------------------------------
    // CANONICAL AUTHORIZATION
    //--------------------------------------------------

    readonly authorization?: {

        approved: boolean;

        requestedMode: string;

        effectiveMode: string;

        environment: string;

        marketProfile: string;

        strategyProfile: string;

        baseScore: number;

        finalConfidence: number;

        requiredConfidence: number;

        riskScore: number;

        requiredRisk: number;

        executionScore: number;

        requiredExecution: number;

        blockers: string[];

        warnings: string[];

        marketRegime: string;

        syncState: string;
    };

    //--------------------------------------------------
    // PIPELINE
    //--------------------------------------------------

    readonly diagnostics?:
        AJIndicatorResult["pipelineDiagnostics"];

    readonly trace?:
        AJPipelineTrace;

}