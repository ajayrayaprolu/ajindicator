/****************************************************************************************
 * File:
 * ExecutionTypes.ts
 *
 * Path:
 * src/runtime/execution/ExecutionTypes.ts
 *
 * AJ v2 - Execution Context Contract
 *
 * Purpose
 * -------
 * ExecutionTypes defines the canonical execution contracts used throughout
 * the AJ v2 Institutional Trading Framework.
 *
 * This file provides the shared execution context exchanged between the
 * runtime, execution, lifecycle and trade management layers. It
 * centralizes execution-related metadata without performing any business
 * logic, calculations or decision making.
 *
 * The ExecutionContext represents the complete runtime state of an active
 * trade, including execution parameters, market structure, order flow,
 * lifecycle information and strategy configuration.
 *
 * Responsibilities
 * ----------------
 * • Define execution state contracts.
 * • Define position management metadata.
 * • Define execution price contracts.
 * • Define risk management parameters.
 * • Define breakout context.
 * • Define institutional market structure context.
 * • Define order flow context.
 * • Define trend context.
 * • Define AI execution metadata.
 * • Define re-entry context.
 * • Define trade lifecycle metadata.
 * • Define session context.
 * • Define strategy configuration flags.
 * • Provide immutable execution contracts.
 *
 * Functional Areas
 * ----------------
 *
 * Engine Context
 * • EngineState.
 * • Trade direction.
 *
 * Position Management
 * • Position size.
 * • Remaining position.
 *
 * Price Context
 * • Entry price.
 * • Current price.
 * • High.
 * • Low.
 * • Close.
 *
 * Risk Management
 * • Stop-loss.
 * • Profit Target 1.
 * • Profit Target 2.
 * • Profit Target 3.
 * • ATR.
 *
 * Breakout Context
 * • Breakout confirmation.
 * • Breakout strength.
 * • Failed breakout detection.
 *
 * Institutional Market Structure
 * • BOS confirmation.
 * • CHOCH confirmation.
 * • Opposite BOS.
 * • Opposite CHOCH.
 *
 * Order Flow
 * • CVD bullish state.
 * • CVD bearish state.
 * • CVD strength.
 *
 * Trend Context
 * • EMA direction.
 * • EMA slope.
 * • VWAP direction.
 *
 * AI Context
 * • AI confidence.
 * • Institutional score.
 *
 * Re-Entry Context
 * • Re-entry count.
 * • Re-entry cooldown.
 * • Bars since exit.
 *
 * Trade Lifecycle
 * • Bars in trade.
 * • Maximum holding period.
 * • Trade age.
 *
 * Session Context
 * • Session high.
 * • Session low.
 * • Day high.
 * • Day low.
 *
 * Strategy Configuration
 * • Options strategy.
 * • Scalping strategy.
 * • Swing strategy.
 * • Paper trading mode.
 *
 * Inputs
 * ------
 * ExecutionTypes does not consume runtime data.
 *
 * It defines shared contracts populated by the runtime and execution
 * pipeline.
 *
 * Outputs
 * -------
 * ExecutionTypes exports:
 *
 * Shared Runtime Contract
 * • ExecutionContext
 *
 * ExecutionContext provides:
 *
 * Engine
 * • Engine state
 * • Trade direction
 *
 * Position
 * • Position size
 * • Remaining position
 *
 * Pricing
 * • Entry price
 * • Current price
 * • High
 * • Low
 * • Close
 *
 * Risk
 * • Stop-loss
 * • Profit targets
 * • ATR
 *
 * Institutional Context
 * • Breakout
 * • BOS
 * • CHOCH
 * • CVD
 * • EMA
 * • VWAP
 * • AI
 *
 * Lifecycle
 * • Re-entry
 * • Trade age
 * • Holding period
 *
 * Session
 * • Session range
 * • Daily range
 *
 * Strategy
 * • Trading mode flags
 *
 * Upstream Dependencies
 * ---------------------
 * ExecutionContext is populated from outputs produced by:
 *
 * • RuntimeContextBuilder
 * • AJRuntimeContext
 * • MarketStructureEngine
 * • BreakoutEngine
 * • OrderFlowEngine
 * • AIConfidenceEngine
 * • ExecutionAuthority
 * • ExecutionEngine
 * • RuntimeExecutionEngine
 *
 * Downstream Consumers
 * --------------------
 * ExecutionContext is consumed by:
 *
 * • RuntimeExecutionEngine
 * • LifecycleEngine
 * • TradeManagement
 * • ReEntryEngine
 * • TrailingEngine
 * • ExitEngine
 * • Position Manager
 * • Performance Analytics
 * • Runtime Dashboard
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Contract-only implementation.
 * • Immutable execution context.
 * • No business logic.
 * • No calculations.
 * • No execution authorization.
 * • No signal generation.
 * • No trade qualification.
 * • No position management logic.
 * • Strongly typed runtime contract.
 * • Backward-compatible execution interface.
 *
 * AJ v2 Execution Pipeline
 *
 * RuntimeContextBuilder
 *        │
 *        ▼
 * AJRuntimeContext
 *        │
 *        ▼
 * AIConfidenceEngine
 *        │
 *        ▼
 * ExecutionAuthority
 *        │
 *        ▼
 * ExecutionEngine
 *        │
 *        ▼
 * RuntimeExecutionEngine
 *        │
 *        ▼
 * ExecutionContext
 *        │
 *        ▼
 * LifecycleEngine
 *        │
 *        ▼
 * TradeManagement
 *        │
 *        ▼
 * ReEntryEngine
 *        │
 *        ▼
 * TrailingEngine
 *        │
 *        ▼
 * ExitEngine
 *
 * Notes
 * -----
 * • ExecutionTypes defines execution contracts only.
 * • It performs no calculations.
 * • It performs no market analysis.
 * • It performs no confidence evaluation.
 * • It performs no execution authorization.
 * • It performs no trade execution.
 * • It performs no lifecycle management.
 * • It performs no position management.
 * • It transports execution state between runtime components.
 * • ExecutionContext represents the canonical execution transport contract
 *   used throughout the AJ v2 Institutional Trading Framework.
 ****************************************************************************************/

import { EngineState } from "../../core/EngineState";

export interface ExecutionContext {

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    state: EngineState;
    tradeDir: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;
    remainingPosition?: number;

    //--------------------------------------------------
    // PRICES
    //--------------------------------------------------

    entryPrice: number;
    currentPrice: number;
    high: number;
    low: number;
    close?: number;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    slPrice: number;
    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atr: number;

    //--------------------------------------------------
    // BREAKOUT
    //--------------------------------------------------

    breakoutConfirmed?: boolean;
    breakoutStrength?: number;
    failedBreakout?: boolean;

    //--------------------------------------------------
    // MARKET STRUCTURE
    //--------------------------------------------------

    bosBull?: boolean;
    bosBear?: boolean;
    chochBull?: boolean;
    chochBear?: boolean;
    oppositeBos?: boolean;
    oppositeChoch?: boolean;

    //--------------------------------------------------
    // CVD
    //--------------------------------------------------

    cvdBull?: boolean;
    cvdBear?: boolean;
    cvdStrength?: number;

    //--------------------------------------------------
    // EMA / VWAP
    //--------------------------------------------------

    emaBull?: boolean;
    emaBear?: boolean;
    emaSlope?: number;
    vwapBull?: boolean;
    vwapBear?: boolean;

    //--------------------------------------------------
    // AI
    //--------------------------------------------------

    aiConfidence?: number;
    institutionalScore?: number;

    //--------------------------------------------------
    // RE-ENTRY
    //--------------------------------------------------

    reEntryCount?: number;
    reEntryCooldown?: number;
    barsSinceExit?: number;

    //--------------------------------------------------
    // TRADE LIFECYCLE
    //--------------------------------------------------

    barsInTrade?: number;
    maxHoldingBars?: number;
    tradeAge?: number;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionHigh?: number;
    sessionLow?: number;
    dayHigh?: number;
    dayLow?: number;

    //--------------------------------------------------
    // FLAGS
    //--------------------------------------------------

    isOptionsTrade?: boolean;
    isScalping?: boolean;
    isSwingTrade?: boolean;
    isPaperTrade?: boolean;

}
