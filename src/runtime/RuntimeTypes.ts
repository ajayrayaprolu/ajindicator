/****************************************************************************************
 * File:
 * RuntimeTypes.ts
 *
 * Path:
 * src/runtime/RuntimeTypes.ts
 *
 * AJ v2 - Runtime Type & State Contract
 *
 * Purpose
 * -------
 * RuntimeTypes defines the canonical runtime contracts shared by every
 * runtime component within the AJ v2 Institutional Trading Framework.
 *
 * This file centralizes the enums, metadata structures, execution
 * snapshots, runtime state definitions and configuration contracts used by
 * the runtime orchestration layer.
 *
 * It serves as the common language between RuntimeEngine,
 * AJRuntimeAdapter, AJHost, IndicatorHost, StrategyHost and other runtime
 * services without containing any execution logic or business rules.
 *
 * Responsibilities
 * ----------------
 * • Define runtime lifecycle states.
 * • Define runtime execution modes.
 * • Define market regime classifications.
 * • Define runtime cache metadata.
 * • Define runtime AI metrics.
 * • Define execution snapshot contracts.
 * • Define runtime state contracts.
 * • Define runtime configuration contracts.
 * • Provide immutable runtime type definitions.
 *
 * Functional Areas
 * ----------------
 *
 * Runtime Lifecycle
 * • RuntimeStatus enumeration.
 * • Runtime execution lifecycle.
 * • Processing state transitions.
 *
 * Market Classification
 * • MarketRegime enumeration.
 * • Market environment classification.
 * • Regime transport contract.
 *
 * Execution Modes
 * • Normal mode.
 * • Scalping mode.
 * • Swing mode.
 * • Options mode.
 * • Crypto mode.
 *
 * Runtime Cache
 * • Symbol metadata.
 * • Timeframe metadata.
 * • Last processed candle.
 * • Payload synchronization.
 * • Runtime caching information.
 *
 * Runtime Metrics
 * • AI confidence.
 * • Institutional score.
 * • Execution confidence.
 * • Trend confidence.
 * • Structure confidence.
 * • Liquidity confidence.
 * • Context confidence.
 * • Market regime.
 * • Execution readiness.
 * • Recommendation metadata.
 *
 * Execution Snapshot
 * • Entry information.
 * • Stop-loss information.
 * • Profit targets.
 * • Position status.
 * • Break-even state.
 * • Trailing state.
 * • Re-entry state.
 * • Exit state.
 *
 * Runtime State
 * • EngineState.
 * • RuntimeStatus.
 * • ExecutionMode.
 * • MarketRegime.
 *
 * Runtime Configuration
 * • Runtime caching.
 * • Incremental updates.
 * • AI optimization.
 * • Portfolio mode.
 * • Multi-timeframe processing.
 * • Walk-forward execution.
 * • Debug configuration.
 *
 * Inputs
 * ------
 * RuntimeTypes does not consume runtime data.
 *
 * It provides shared contracts used throughout the AJ v2 runtime
 * infrastructure.
 *
 * Outputs
 * -------
 * RuntimeTypes exports:
 *
 * Enumerations
 * • RuntimeStatus
 * • MarketRegime
 * • ExecutionMode
 *
 * Runtime Contracts
 * • RuntimeCache
 * • RuntimeMetrics
 * • RuntimeExecutionSnapshot
 * • RuntimeState
 * • RuntimeConfig
 *
 * Upstream Dependencies
 * ---------------------
 * RuntimeTypes depends only on:
 *
 * • EngineState
 *
 * No runtime services or business engines are referenced.
 *
 * Downstream Consumers
 * --------------------
 * RuntimeTypes is consumed by:
 *
 * • RuntimeEngine
 * • AJRuntimeAdapter
 * • AJRuntimeContextBuilder
 * • AJHost
 * • IndicatorHost
 * • StrategyHost
 * • RuntimeExecutionEngine
 * • LifecycleEngine
 * • TradeManagement
 * • ReEntryEngine
 * • TrailingEngine
 * • ExitEngine
 * • Runtime monitoring services
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Contract-only implementation.
 * • No business logic.
 * • No calculations.
 * • Immutable type definitions.
 * • Shared runtime vocabulary.
 * • Runtime-independent contracts.
 * • Engine-independent contracts.
 * • Strong typing across runtime components.
 * • Backward-compatible runtime interfaces.
 *
 * AJ v2 Runtime Pipeline
 *
 * RuntimeEngine
 *        │
 *        ▼
 * AJRuntimeAdapter
 *        │
 *        ▼
 * AJHost
 *        │
 *        ▼
 * IndicatorHost
 *        │
 *        ▼
 * StrategyHost
 *        │
 *        ▼
 * RuntimeExecutionEngine
 *        │
 *        ▼
 * LifecycleEngine
 *        │
 *        ▼
 * TradeManagement
 *
 * Notes
 * -----
 * • RuntimeTypes defines runtime contracts only.
 * • It performs no calculations.
 * • It performs no runtime orchestration.
 * • It performs no signal generation.
 * • It performs no execution authorization.
 * • It performs no trade execution.
 * • It performs no position management.
 * • It provides the canonical runtime type system used throughout the
 *   AJ v2 Institutional Trading Framework.
 ****************************************************************************************/

import { EngineState } from "../core/EngineState";

//======================================================
// RUNTIME STATUS
//======================================================

export const RuntimeStatus = {
    IDLE: "IDLE",
    READY: "READY",
    ANALYZING: "ANALYZING",
    EXECUTING: "EXECUTING",
    MANAGING: "MANAGING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
} as const;

export type RuntimeStatus =
    typeof RuntimeStatus[keyof typeof RuntimeStatus];

//======================================================
// MARKET REGIME
//======================================================

export const MarketRegime = {
    TRENDING: "TRENDING",
    RANGING: "RANGING",
    BREAKOUT: "BREAKOUT",
    REVERSAL: "REVERSAL",
    ACCUMULATION: "ACCUMULATION",
    DISTRIBUTION: "DISTRIBUTION",
    EXPANSION: "EXPANSION",
    CONTRACTION: "CONTRACTION",
    VOLATILE: "VOLATILE",
    UNKNOWN: "UNKNOWN"
} as const;

export type MarketRegime =
    typeof MarketRegime[keyof typeof MarketRegime];

//======================================================
// EXECUTION MODE
//======================================================

export const ExecutionMode = {
    NORMAL: "NORMAL",
    SCALPING: "SCALPING",
    SWING: "SWING",
    OPTIONS: "OPTIONS",
    CRYPTO: "CRYPTO"
} as const;

export type ExecutionMode =
    typeof ExecutionMode[keyof typeof ExecutionMode];

//======================================================
// RUNTIME CACHE
//======================================================

export interface RuntimeCache {

    symbol:
        string;

    timeframe:
        string;

    lastBarIndex:
        number;

    lastTimestamp:
        number;

    lastClose:
        number;

    lastPayloadHash:
        string;

}

//======================================================
// AI RUNTIME METRICS
//======================================================

export interface RuntimeMetrics {

    aiConfidence:
        number;

    institutionalScore:
        number;

    executionConfidence:
        number;

    trendConfidence:
        number;

    structureConfidence:
        number;

    liquidityConfidence:
        number;

    contextConfidence:
        number;

    executionReady:
        boolean;

    marketRegime:
        MarketRegime;

    recommendation:
        string;

}
//
//======================================================
// RuntimeTypes.ts
// Part 2
// Runtime execution/state/configuration interfaces
//======================================================

//======================================================
// EXECUTION SNAPSHOT
//======================================================

export interface RuntimeExecutionSnapshot {

    direction:
        number;

    entryPrice:
        number;

    stopLoss:
        number;

    tp1:
        number;

    tp2:
        number;

    tp3:
        number;

    positionOpen:
        boolean;

    tp1Hit:
        boolean;

    tp2Hit:
        boolean;

    tp3Hit:
        boolean;

    slHit:
        boolean;

    breakEvenActive:
        boolean;

    trailingActive:
        boolean;

    trailingStop:
        number;

    reentryTriggered:
        boolean;

    reentryPrice:
        number;

    closeTrade:
        boolean;

    exitReason:
        string;

}

//======================================================
// RUNTIME STATE
//======================================================

export interface RuntimeState {

    engineState:
        EngineState;

    runtimeStatus:
        RuntimeStatus;

    executionMode:
        ExecutionMode;

    marketRegime:
        MarketRegime;

}

//======================================================
// RUNTIME CONFIG
//======================================================

export interface RuntimeConfig {

    enableCaching:
        boolean;

    enableIncrementalUpdate:
        boolean;

    enableAIOptimization:
        boolean;

    enablePortfolioMode:
        boolean;

    enableMultiTimeframe:
        boolean;

    enableWalkForward:
        boolean;

    enableDebug:
        boolean;

}
