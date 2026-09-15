/****************************************************************************************
 * File:
 * AJTypes.ts
 *
 * Purpose:
 * Canonical contracts shared by the AJ v2 runtime, engine pipeline,
 * confidence engine, authority layer and execution engine.
 *
 * Responsibility:
 * Defines payloads, runtime results and shared interfaces only.
 * No calculations or business logic belong in this file.
 *
 * AJ Architecture
 * Runtime
 *      ↓
 * Payload
 *      ↓
 * Engines
 *      ↓
 * Confidence
 *      ↓
 * Authority
 *      ↓
 * Execution
 ****************************************************************************************/

import type { RuntimeContext } from "../../runtime/RuntimeContext";
import type { AJRuntimeContext } from "./AJRuntimeContext";
import type { ContextInputs } from "./context/AJContextTypes";
import type { ConfidenceInput } from "./engines/Confidence";
import type { ExecutionAuthorityInputs } from "./engines/Authority";
import type { EntryRiskInput } from "./engines/RiskQualification";
import type { StateMachineInputs } from "./core/StateMachineTypes";
import type { OptionValidationInput } from "./options/OptionValidationTypes";
import type { ExecutionResult } from "./engines/Execution";
import type { AJDebugResult } from "./debug/AJDebugBuilder";

//==========================================================
// AJ v2 ENUMS / TYPES
//==========================================================

export type ConfidenceGrade =
    | "A+"
    | "A"
    | "B"
    | "C"
    | "D"
    | "F";

export type MarketState =
    | "TRENDING"
    | "RANGING"
    | "ACCUMULATION"
    | "DISTRIBUTION"
    | "EXPANSION"
    | "COMPRESSION"
    | "UNKNOWN";

export type OrderFlowMode =
    | "REAL_VOLUME"
    | "SYNTHETIC"
    | "HYBRID"
    | "NONE";

export type TradeGrade =
    | "STRONG_BUY"
    | "BUY"
    | "WATCH"
    | "SELL"
    | "STRONG_SELL"
    | "NO_TRADE";

export type ZoneStrength =
    | "VERY_STRONG"
    | "STRONG"
    | "MEDIUM"
    | "WEAK"
    | "EXPIRED";

export type RetailTrap =
    | "NONE"
    | "LIKELY"
    | "BUYERS_TRAPPED"
    | "SELLERS_TRAPPED";

//==========================================================
// DECISION RESULT
//==========================================================

export interface DecisionResult {

    context: AJContextResult;

    authority: unknown;

    state: unknown;

    option: unknown;

}

//==========================================================
// PAYLOAD
//==========================================================

export interface AJIndicatorPayload {

    //--------------------------------------------------
    // ROUTER
    //--------------------------------------------------

    tradeDirectionFinal: number;

    //--------------------------------------------------
    // AJ v2
    //--------------------------------------------------

    confidenceLong?: number;

    confidenceShort?: number;

    confidenceValue?: number;

    confidenceGrade?: ConfidenceGrade;

    marketState?: MarketState | string;

    marketRegime?: string;

    orderFlowMode?: OrderFlowMode | string;

    orderFlowStrength?: number;

    riskQualified?: boolean;

    riskGrade?: string;

    //--------------------------------------------------
    // LEGACY
    //--------------------------------------------------

    candles?: any[];

    symbol?: string;

    timeframe?: string;

    //--------------------------------------------------
    // PIPELINE
    //--------------------------------------------------

    runtime: RuntimeContext;

    ajRuntime: AJRuntimeContext;

    contextInputs: ContextInputs;

    scoreInputs: ConfidenceInput;

    authorityInputs: ExecutionAuthorityInputs;

    riskInputs: EntryRiskInput;

    stateInputs: StateMachineInputs;

    optionInputs: OptionValidationInput;

}

//==========================================================
// CONTEXT RESULT
//==========================================================

export interface AJContextResult {

    //--------------------------------------------------
    // CONTEXT
    //--------------------------------------------------

    ctxLong: boolean;

    ctxShort: boolean;

    //--------------------------------------------------
    // BACKWARD COMPATIBILITY
    //--------------------------------------------------

    longScore: number;

    shortScore: number;

    tradeScore: number;

    tradeDirectionFinal: number;

    //--------------------------------------------------
    // AJ v2
    //--------------------------------------------------

    confidenceLong?: number;

    confidenceShort?: number;

    confidenceValue?: number;

    confidenceGrade?: ConfidenceGrade;

    tradeGrade?: TradeGrade;

    marketState?: MarketState | string;

    marketRegime?: string;

    orderFlowMode?: OrderFlowMode | string;

    retailTrap?: RetailTrap;

    riskQualified?: boolean;

    //--------------------------------------------------
    // LEGACY
    //--------------------------------------------------

    contextScore: number;

    confluenceScore: number;

}

//==========================================================
// DECISION RESULT
//==========================================================

export interface AJDecisionResult {

    context: AJContextResult;

    authority: unknown;

    state: unknown;

    option: unknown;

    direction: number;

    tradeDirectionFinal: number;

    canExecute: boolean;

    executionAllowed: boolean;

    longSignal: boolean;

    shortSignal: boolean;

    tradeScore: number;

    entryPrice: number;

    stopLoss: number | null;

    tp1: number | null;

    tp2: number | null;

    tp3: number | null;

    optionSymbol?: string;

}
//==========================================================
// INDICATOR RESULT
//==========================================================

export interface AJIndicatorResult {

    //--------------------------------------------------
    // LIFECYCLE
    //--------------------------------------------------

    lifecycleState: string | number;

    //--------------------------------------------------
    // ACTIVE MODE
    //--------------------------------------------------

    tradeMode: string;

    //--------------------------------------------------
    // PIPELINE
    //--------------------------------------------------

    context: AJContextResult;

    authority: DecisionResult["authority"];

    state: DecisionResult["state"];

    option: DecisionResult["option"];

    decision: DecisionResult;

    execution: ExecutionResult;
	
	pipelineDiagnostics?: {

    context?: unknown;

    confidence?: unknown;

    authority?: unknown;

    state?: unknown;

    execution?: unknown;

	};

    //--------------------------------------------------
    // SIGNALS
    //--------------------------------------------------

    direction: number;

    dashboardDirection: number;

    longSignal: boolean;

    shortSignal: boolean;

    tradeDirectionFinal: number;

    //--------------------------------------------------
    // CONFIDENCE (AJ v2)
    //--------------------------------------------------

    confidenceLong?: number;

    confidenceShort?: number;

    confidenceValue?: number;

    confidenceGrade?: ConfidenceGrade;

    tradeGrade?: TradeGrade;

    riskQualified?: boolean;

    riskGrade?: string;

    marketState?: MarketState | string;

    marketRegime?: string;

    orderFlowMode?: OrderFlowMode | string;

    //--------------------------------------------------
    // LEGACY
    //--------------------------------------------------

    tradeScore: number;

    confidence: number;

    executionAllowed: boolean;

    canExecute: boolean;

    //--------------------------------------------------
    // LEVELS
    //--------------------------------------------------

    entryPrice: number;

    stopLoss: number | null;

    tp1: number | null;

    tp2: number | null;

    tp3: number | null;

    //--------------------------------------------------
    // RE-ENTRY
    //--------------------------------------------------

    reEntryPrice?: number | null;

    reEntryStopLoss?: number | null;

    //--------------------------------------------------
    // OPTION
    //--------------------------------------------------

    optionSymbol: string;

    optionType: string;

    strike: number;

    //--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    debug?: AJDebugResult;

    //--------------------------------------------------
    // RUNTIME
    //--------------------------------------------------

    runtimeResult?: any;

    decisionResult?: any;

    stats?: any;

    overlays?: any;

    //--------------------------------------------------
    // ZONES
    //--------------------------------------------------

    demandZones?: any[];

    supplyZones?: any[];

    fvgZones?: any[];

    liquidityZones?: any[];

    orderBlockZones?: any[];

    targetZones?: any[];

    neutralZones?: any[];

    //--------------------------------------------------
    // VISUALS
    //--------------------------------------------------

    markers?: any[];

    priceLines?: any[];

    runtimePanel?: any;

    //--------------------------------------------------
    // LEGACY INDICATORS
    //--------------------------------------------------

    ema?: any[];

    vwap?: any[];

    rsi?: any[];

    atr?: any[];

    adx?: any[];

    //--------------------------------------------------
    // ENTRY
    //--------------------------------------------------

    entryTime?: number;

}