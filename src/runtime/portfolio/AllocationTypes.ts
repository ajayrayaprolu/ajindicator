/****************************************************************************************
 * File:
 * AllocationTypes.ts
 *
 * Path:
 * src/runtime/portfolio/AllocationTypes.ts
 *
 * AJ v2 - Portfolio Allocation Contract
 *
 * Purpose
 * -------
 * AllocationTypes defines the canonical portfolio allocation contracts used
 * throughout the AJ v2 Institutional Trading Framework.
 *
 * This file centralizes the shared contracts exchanged between the execution,
 * portfolio management, capital allocation and position sizing layers.
 *
 * It provides strongly typed representations of allocation signals,
 * allocation inputs and allocation results without performing any business
 * logic, portfolio calculations or capital allocation decisions.
 *
 * AllocationTypes serves as the transport layer between institutional trade
 * qualification and portfolio deployment, ensuring consistent communication
 * across all portfolio-related components.
 *
 * Responsibilities
 * ----------------
 * • Define allocation signal contracts.
 * • Define allocation input contracts.
 * • Define allocation result contracts.
 * • Define portfolio deployment metadata.
 * • Define capital allocation metadata.
 * • Define position sizing metadata.
 * • Preserve backward-compatible allocation fields.
 * • Provide immutable allocation contracts.
 *
 * Functional Areas
 * ----------------
 *
 * Allocation Signal
 * • Trade direction.
 * • Trade confidence.
 * • Trade score.
 * • Execution authorization.
 * • Entry price.
 * • Stop-loss.
 * • Profit targets.
 *
 * Allocation Input
 * • Trading symbol.
 * • Market regime.
 * • Confidence.
 * • Trade score.
 * • Account equity.
 * • Available capital.
 * • Risk percentage.
 *
 * Allocation Result
 * • Allocation percentage.
 * • Capital deployment.
 * • Position size.
 * • Leverage.
 * • Allocation approval.
 * • Portfolio recommendation.
 *
 * Compatibility Support
 * • Allocation strength.
 * • Position size percentage.
 *
 * Inputs
 * ------
 * AllocationTypes does not consume runtime or market data.
 *
 * It defines shared contracts populated by execution, portfolio and
 * capital allocation components.
 *
 * Outputs
 * -------
 * AllocationTypes exports:
 *
 * Shared Contracts
 * • AllocationSignal
 * • AllocationInput
 * • AllocationResult
 *
 * AllocationSignal provides:
 * • Trade qualification information.
 * • Execution readiness metadata.
 * • Entry and risk parameters.
 *
 * AllocationInput provides:
 * • Portfolio allocation context.
 * • Account information.
 * • Risk constraints.
 *
 * AllocationResult provides:
 * • Recommended allocation percentage.
 * • Capital deployment amount.
 * • Position size.
 * • Leverage.
 * • Approval status.
 * • Portfolio recommendation.
 *
 * Upstream Dependencies
 * ---------------------
 * Allocation contracts are populated from outputs produced by:
 *
 * • AIConfidenceEngine
 * • ExecutionAuthority
 * • ExecutionEngine
 * • RuntimeExecutionEngine
 * • PortfolioManager
 * • RiskManagementEngine
 *
 * Downstream Consumers
 * --------------------
 * Allocation contracts are consumed by:
 *
 * • CapitalAllocationEngine
 * • PositionSizingEngine
 * • PortfolioRiskManager
 * • RuntimeExecutionEngine
 * • TradeManagement
 * • Portfolio Dashboard
 * • Performance Analytics
 * • Reporting Services
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Contract-only implementation.
 * • Immutable allocation contracts.
 * • No business logic.
 * • No capital allocation calculations.
 * • No position sizing calculations.
 * • No portfolio optimization.
 * • No execution authorization.
 * • No trade execution.
 * • No runtime mutation.
 * • Strongly typed portfolio interfaces.
 * • Backward-compatible shared contracts.
 *
 * AJ v2 Portfolio Allocation Pipeline
 *
 * AIConfidenceEngine
 *        │
 *        ▼
 * ExecutionAuthority
 *        │
 *        ▼
 * ExecutionEngine
 *        │
 *        ▼
 * AllocationSignal
 *        │
 *        ▼
 * CapitalAllocationEngine
 *        │
 *        ▼
 * PositionSizingEngine
 *        │
 *        ▼
 * AllocationResult
 *        │
 *        ▼
 * RuntimeExecutionEngine
 *        │
 *        ▼
 * TradeManagement
 *
 * Notes
 * -----
 * • AllocationTypes defines shared portfolio allocation contracts only.
 * • It performs no portfolio allocation calculations.
 * • It performs no capital allocation optimization.
 * • It performs no position sizing calculations.
 * • It performs no execution authorization.
 * • It performs no trade execution.
 * • It performs no portfolio management.
 * • It performs no risk calculations.
 * • AllocationSignal, AllocationInput and AllocationResult represent the
 *   canonical portfolio allocation transport contracts used throughout the
 *   AJ v2 Institutional Trading Framework.
 ****************************************************************************************/

import type { MarketRegime } from "../RuntimeTypes";

//======================================================
// SIGNAL
//======================================================

export interface AllocationSignal {
    direction: number;
    tradeScore: number;
    confidence: number;
    executionAllowed: boolean;
    entryPrice: number;
    stopLoss: number;
    tp1: number;
    tp2: number;
    tp3: number;
	
    //--------------------------------------------------
    // Phase 12 Compatibility
    //--------------------------------------------------
    allocationStrength?: number;
    positionSizePct?: number;
}

//======================================================
// INPUT
//======================================================

export interface AllocationInput {

    symbol: string;
    marketRegime: MarketRegime;
    confidence: number;
    tradeScore: number;
    accountEquity: number;
    availableCapital: number;
    riskPercent: number;
	
    //--------------------------------------------------
    // Phase 12 Compatibility
    //--------------------------------------------------
    allocationStrength?: number;
    positionSizePct?: number;

}

//======================================================
// RESULT
//======================================================

export interface AllocationResult {
    allocationPercent: number;
    capitalToDeploy: number;
    positionSize: number;
    leverage: number;
    approved: boolean;
    recommendation: string;
	
    //--------------------------------------------------
    // Phase 12 Compatibility
    //--------------------------------------------------
    allocationStrength?: number;
    positionSizePct?: number;

}

