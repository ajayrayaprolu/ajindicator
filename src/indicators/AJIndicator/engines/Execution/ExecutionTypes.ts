/****************************************************************************************
 * File:
 * ExecutionTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/ExecutionTypes.ts
 *
 * Purpose:
 * Canonical execution contracts for the AJ v2 institutional trading engine.
 *
 * This file defines the shared execution contracts consumed by the
 * Execution Engine, Trade Management Engine,
 * Trailing Engine, Exit Engine and ReEntry Engine.
 *
 * Responsibilities:
 * -----------------
 * • Define execution input contracts
 * • Define execution planning contracts
 * • Define execution risk contracts
 * • Define execution target contracts
 * • Provide a single canonical execution model
 * • Shared contracts consumed by execution engines
 *
 * This file performs NO calculations.
 * It only defines reusable execution data structures.
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
 *         │
 *         ▼
 * Trade Management
 *         │
 *         ▼
 * Lifecycle Engine
 *         ├── Trailing Engine
 *         ├── Exit Engine
 *         └── ReEntry Engine
 *
 ****************************************************************************************/
//==================================================================================================
// ExecutionTypes.ts
// Canonical Execution Contracts (AJ v2)
// Block 1
//==================================================================================================

import { EngineState } from "../../core/EngineState";

//======================================================
// AUTHORITY ACTION
//======================================================

export type ExecutionAction =
    | "BUY"
    | "SELL"
    | "WAIT";

//======================================================
// EXECUTION MODE
//======================================================

export type ExecutionMode =
    | "SCORE"
    | "AI"
    | "AI_SMC";

//======================================================
// EXECUTION CONTEXT
//======================================================

export interface ExecutionContext {

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    state: EngineState;
    tradeMode: ExecutionMode;

    //--------------------------------------------------
    // AUTHORITY
    //--------------------------------------------------

    authorityAction: ExecutionAction;
    executionApproved: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;

    //--------------------------------------------------
    // RISK QUALIFICATION
    //--------------------------------------------------

    riskApproved: boolean;
    riskScore: number;

    //--------------------------------------------------
    // MULTI TIMEFRAME
    //--------------------------------------------------

    mtfAgreement: boolean;
    mtfAlignment: number;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    trendBull: boolean;
    trendBear: boolean;
    trendStrength: number;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    momentumBull: boolean;
    momentumBear: boolean;
    momentumStrength: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    volatilityScore: number;
    atr: number;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDir: number;
    entryPrice: number;
    currentPrice: number;
    high: number;
    low: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    inPosition: boolean;
    positionSize: number;

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    slPrice: number;
    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionOpen: boolean;
    sessionHigh: number;
    sessionLow: number;
    dayHigh: number;
    dayLow: number;

    //--------------------------------------------------
    // LIFECYCLE
    //--------------------------------------------------

    barsInTrade: number;
    maxHoldingBars: number;
    tradeAge: number;

    //--------------------------------------------------
    // RV-EXEC-01
    //
    // Required so RuntimeExecutionEngine can tell the entry
    // candle apart from subsequent candles - without this,
    // TP/SL detection ran against the entry candle's own
    // high/low with no memory of prior ticks, causing trades
    // to instantly cascade ARMED -> CLOSED on the same bar
    // they armed on.
    //--------------------------------------------------

    barIndex: number;
    entryBarIndex: number;

	//--------------------------------------------------
	// RE-ENTRY
	//--------------------------------------------------
	
	reEntryCount?: number;
	barsSinceExit?: number;
	reEntryCooldown?: number;
	
	//--------------------------------------------------
	// SMC
	//--------------------------------------------------
	
	bosBull?: boolean;
	bosBear?: boolean;
	chochBull?: boolean;
	chochBear?: boolean;
	liquiditySweep?: boolean;
	fvgRetest?: boolean;
	
	//--------------------------------------------------
	// RISK
	//--------------------------------------------------
	
	accountRiskPercent?: number;

    //--------------------------------------------------
    // STRATEGY FLAGS
    //--------------------------------------------------

    isScalping: boolean;
    isSwingTrade: boolean;
    isOptionsTrade: boolean;
    isPaperTrade: boolean;

}
//======================================================
// EXECUTION PLAN
//======================================================

export interface ExecutionPlan {

    //--------------------------------------------------
    // DECISION
    //--------------------------------------------------

    action: ExecutionAction;
    approved: boolean;

    //--------------------------------------------------
    // ENTRY
    //--------------------------------------------------

    entryPrice: number;
    limitPrice?: number;
    triggerPrice?: number;

    //--------------------------------------------------
    // STOPS
    //--------------------------------------------------

    stopLoss: number;
    initialStop: number;
    trailingStop: number;
    breakEvenPrice?: number;

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;
    quantity?: number;
    riskAmount?: number;
    capitalRequired?: number;

}

//======================================================
// EXECUTION RISK
//======================================================

export interface ExecutionRisk {

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    accountRiskPercent: number;
    tradeRisk: number;
    rewardRiskRatio: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atr: number;
    volatilityScore: number;

    //--------------------------------------------------
    // QUALIFICATION
    //--------------------------------------------------

    riskApproved: boolean;
    riskScore: number;

    //--------------------------------------------------
    // PROTECTION
    //--------------------------------------------------

    maxLoss: number;
    maxPositionSize: number;

}

//======================================================
// EXECUTION TARGETS
//======================================================

export interface ExecutionTargets {

    //--------------------------------------------------
    // ENTRY
    //--------------------------------------------------

    entry: number;

    //--------------------------------------------------
    // STOPS
    //--------------------------------------------------

    stopLoss: number;
    trailingStop: number;
    breakEven: number;

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    stopLossHit: boolean;

}

//======================================================
// EXECUTION DIAGNOSTICS
//======================================================

export interface ExecutionDiagnostics {

    //--------------------------------------------------
    // EXECUTION GATES
    //--------------------------------------------------

    authorityApproved: boolean;
    authorityAction: ExecutionAction;
    executionReady: boolean;
    validTrade: boolean;
    executionPlanApproved: boolean;
    confidenceApproved: boolean;
    riskApproved: boolean;
    mtfApproved: boolean;
    trendApproved: boolean;
    momentumApproved: boolean;

    //--------------------------------------------------
    // GATE FAILURES
    //--------------------------------------------------

    failedGates: string[];

    //--------------------------------------------------
    // METRICS
    //--------------------------------------------------

    confidence: number;
    riskScore: number;
    executionScore: number;
    positionRisk: number;
    rewardRisk: number;
}

//======================================================
// OPTIONAL EXECUTION OPTIMIZER
//======================================================

export interface ExecutionOptimizationResult {

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    executionAllowed: boolean;
    recommendation: string;

    //--------------------------------------------------
    // SCORES
    //--------------------------------------------------

    executionScore: number;
    baseScore: number;
    confidenceScore: number;
    riskScore: number;
    regimeScore: number;
    parameterScore: number;
    institutionalBoost: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    recommendedPosition: number;
    riskAdjusted: boolean;

}

//======================================================
// EXECUTION SUMMARY
//======================================================

export interface ExecutionSummary {

    //--------------------------------------------------
    // DECISION
    //--------------------------------------------------

    action: ExecutionAction;
    approved: boolean;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    entryPrice: number;
    stopLoss: number;
    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    confidence: number;
    riskScore: number;
    executionScore: number;

}

//======================================================
// END OF FILE
//======================================================