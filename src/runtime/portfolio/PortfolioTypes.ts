/****************************************************************************************
 * File:
 * PortfolioTypes.ts
 *
 * Path:
 * src/runtime/portfolio/PortfolioTypes.ts
 *
 * AJ v2 - Portfolio Context Contract
 *
 * Purpose
 * -------
 * PortfolioTypes defines the canonical portfolio contracts used throughout
 * the AJ v2 Institutional Trading Framework.
 *
 * This file centralizes the portfolio context exchanged between the runtime,
 * portfolio management, capital allocation and risk management layers.
 *
 * It provides a strongly typed representation of portfolio state, account
 * information, capital utilization, exposure metrics, risk constraints and
 * performance statistics without containing any business logic or portfolio
 * calculations.
 *
 * Responsibilities
 * ----------------
 * • Define portfolio market context.
 * • Define account capital contracts.
 * • Define portfolio exposure contracts.
 * • Define portfolio risk contracts.
 * • Define portfolio performance contracts.
 * • Provide backward-compatible portfolio metadata.
 * • Provide immutable portfolio context definitions.
 *
 * Functional Areas
 * ----------------
 *
 * Market Context
 * • Trading symbol.
 * • Market regime.
 *
 * Account Context
 * • Account equity.
 * • Available capital.
 * • Buying power.
 *
 * Portfolio Exposure
 * • Open positions.
 * • Portfolio exposure.
 * • Sector exposure.
 * • Correlation exposure.
 *
 * Portfolio Risk
 * • Maximum portfolio risk.
 * • Maximum position risk.
 * • Daily risk utilization.
 * • Current drawdown.
 * • Maximum drawdown.
 * • Maximum drawdown limit.
 *
 * Portfolio Performance
 * • Win rate.
 * • Profit factor.
 *
 * Compatibility Metadata
 * • Total capital.
 * • Deployed capital.
 * • Leverage.
 * • ATR.
 * • Exposure.
 * • Maximum exposure limit.
 * • ATR limits.
 * • Sector weight distribution.
 *
 * Inputs
 * ------
 * PortfolioTypes does not consume runtime or market data.
 *
 * It defines the shared portfolio contracts populated by the runtime,
 * portfolio and capital management components.
 *
 * Outputs
 * -------
 * PortfolioTypes exports:
 *
 * Shared Portfolio Contract
 * • PortfolioContext
 *
 * PortfolioContext provides:
 *
 * Market
 * • Symbol
 * • Market regime
 *
 * Account
 * • Account equity
 * • Available capital
 * • Buying power
 *
 * Portfolio
 * • Open positions
 * • Portfolio exposure
 * • Sector exposure
 * • Correlation exposure
 *
 * Risk
 * • Portfolio risk limits
 * • Position risk limits
 * • Drawdown metrics
 *
 * Performance
 * • Win rate
 * • Profit factor
 *
 * Compatibility
 * • Capital metrics
 * • Leverage
 * • ATR
 * • Exposure limits
 * • Sector allocation
 *
 * Upstream Dependencies
 * ---------------------
 * PortfolioContext is populated from outputs produced by:
 *
 * • RuntimeEngine
 * • PortfolioManager
 * • CapitalAllocationEngine
 * • RiskManagementEngine
 * • Account Services
 * • MarketStateEngine
 *
 * Downstream Consumers
 * --------------------
 * PortfolioContext is consumed by:
 *
 * • RuntimeExecutionEngine
 * • ExecutionEngine
 * • PositionSizingEngine
 * • PortfolioRiskManager
 * • CapitalAllocationEngine
 * • TradeManagement
 * • Performance Analytics
 * • Portfolio Dashboard
 * • Reporting Services
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Contract-only implementation.
 * • Immutable portfolio context.
 * • No business logic.
 * • No calculations.
 * • No portfolio optimization.
 * • No position sizing logic.
 * • No capital allocation logic.
 * • No trade execution.
 * • No runtime mutation.
 * • Strongly typed portfolio contracts.
 * • Backward-compatible shared interfaces.
 *
 * AJ v2 Portfolio Pipeline
 *
 * Account Services
 *        │
 *        ▼
 * PortfolioManager
 *        │
 *        ▼
 * CapitalAllocationEngine
 *        │
 *        ▼
 * RiskManagementEngine
 *        │
 *        ▼
 * PortfolioContext
 *        │
 *        ▼
 * RuntimeExecutionEngine
 *        │
 *        ▼
 * ExecutionEngine
 *        │
 *        ▼
 * TradeManagement
 *        │
 *        ▼
 * Portfolio Analytics
 *
 * Notes
 * -----
 * • PortfolioTypes defines portfolio contracts only.
 * • It performs no portfolio calculations.
 * • It performs no capital allocation.
 * • It performs no position sizing.
 * • It performs no risk calculations.
 * • It performs no trade execution.
 * • It performs no portfolio optimization.
 * • It performs no account management.
 * • PortfolioContext is the canonical portfolio transport contract used
 *   throughout the AJ v2 Institutional Trading Framework.
 ****************************************************************************************/

import type { MarketRegime } from "../RuntimeTypes";

//======================================================
// PORTFOLIO CONTEXT
//======================================================

export interface PortfolioContext {

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    symbol: string;
    marketRegime: MarketRegime;

    //--------------------------------------------------
    // ACCOUNT
    //--------------------------------------------------

    accountEquity: number;
    availableCapital: number;
    buyingPower: number;

    //--------------------------------------------------
    // CURRENT PORTFOLIO
    //--------------------------------------------------

    openPositions: number;
    portfolioExposure: number;
    sectorExposure: number;
    correlationExposure: number;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    maxPortfolioRisk: number;
    maxPositionRisk: number;
    dailyRiskUsed: number;
    currentDrawdown: number;
    maxDrawdown: number;
	maxDrawdownLimit?: number;

    //--------------------------------------------------
    // PERFORMANCE
    //--------------------------------------------------

    winRate: number;
    profitFactor: number;

    //--------------------------------------------------
    // Phase 12 Compatibility Fields
    //--------------------------------------------------

    totalCapital?: number;
    deployedCapital?: number;
    leverage?: number;
    atr?: number;
    exposure?: number;
    maxExposureLimit?: number;
    maxAtrLimit?: number;
    sectorWeights?: Record<string, number>;
}