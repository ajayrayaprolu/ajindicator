/****************************************************************************************
 * File:
 * ExecutionResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/ExecutionResult.ts
 *
 * Purpose:
 * Canonical institutional execution result for AJ v2.
 *
 * This contract represents the complete output produced by the
 * Execution Engine after Authority has approved a trade.
 *
 * Responsibilities:
 * -----------------
 * • Execution status
 * • Execution plan
 * • Risk information
 * • Targets
 * • Position state
 * • Re-entry state
 * • Trade management
 * • Institutional execution metrics
 * • Runtime diagnostics
 *
 * This file contains NO execution logic.
 * It is purely a shared execution result contract.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Market Engines
 *      ↓
 * Trend / Momentum / Volatility
 *      ↓
 * Multi-Timeframe
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority Decision
 *      ↓
 * Execution Engine
 *          ├── Trailing Engine
 *          ├── Exit Engine
 *          ├── ReEntry Engine
 *          └── Trade Management
 *
 ****************************************************************************************/

import type {RuntimeExecutionResult} from "../../../../runtime/execution";

import type {
	ExecutionPlan,
	ExecutionRisk,
	ExecutionTargets,
	ExecutionDiagnostics
} from "./ExecutionTypes";

import type { LifecycleResult } from "../Lifecycle/LifecycleResult";

//======================================================
// EXECUTION RESULT
//======================================================

export interface ExecutionResult
extends RuntimeExecutionResult {

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    executionApproved:boolean;

    executionAction:
        | "BUY"
        | "SELL"
        | "WAIT";

    canEnter:boolean;

    //--------------------------------------------------
    // PLAN
    //--------------------------------------------------

    plan:ExecutionPlan;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    risk:ExecutionRisk;

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    targets:ExecutionTargets;

    //--------------------------------------------------
    // LIFECYCLE
    //--------------------------------------------------

    lifecycle?: LifecycleResult;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;
    remainingPosition: number;
    partialExitQty?: number;

    //--------------------------------------------------
    // TARGET STATUS
    //--------------------------------------------------

    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    stopLossHit: boolean;

    //--------------------------------------------------
    // BREAK EVEN
    //--------------------------------------------------

    breakEvenPrice?: number;

    //--------------------------------------------------
    // TRAILING
    //--------------------------------------------------

    trailingStop: number;

    trailingMode?:
        | "NONE"
        | "BREAKEVEN"
        | "ATR"
        | "SWING"
        | "STRUCTURE";

    trailDistance?:number;

    //--------------------------------------------------
    // TRADE MANAGEMENT
    //--------------------------------------------------

    scaleInExecuted?: boolean;
    scaleOutExecuted?: boolean;

    //--------------------------------------------------
    // EXIT
    //--------------------------------------------------

    exitReason?:
        | "NONE"
        | "STOPLOSS"
        | "TP1"
        | "TP2"
        | "TP3"
        | "TRAILING_STOP"
        | "BREAKEVEN"
        | "FAILED_BREAKOUT"
        | "REVERSAL"
        | "TIME_EXIT"
        | "FORCE_EXIT"
        | "MANUAL_EXIT";

    //--------------------------------------------------
    // EXECUTION METRICS
    //--------------------------------------------------

    executionScore: number;
    confidence: number;
    institutionalConfidence: number;
    riskScore: number;
    mtfAlignment: number;
    executionQuality: number;

    //--------------------------------------------------
    // INSTITUTIONAL DIAGNOSTICS
    //--------------------------------------------------

	diagnostics: ExecutionDiagnostics;

    //--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    metadata?:Record<string,unknown>;
    notes?:string[];

}