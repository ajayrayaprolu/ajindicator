/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/index.ts
 *
 * Purpose:
 * Public barrel exports for the AJ v2 Institutional Authority subsystem.
 *
 * Responsibilities:
 * -----------------
 * • Exposes the Authority Decision engine.
 * • Exposes the Execution Authority engine.
 * • Exposes all Authority contracts.
 * • Provides a single import location for the complete Authority layer.
 *
 * No business logic belongs in this file.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Trend
 *      ↓
 * Momentum
 *      ↓
 * Market Structure
 *      ↓
 * Liquidity
 *      ↓
 * Order Flow
 *      ↓
 * Volatility
 *      ↓
 * Multi-Timeframe
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 *      ↓
 * Execution
 ****************************************************************************************/

//======================================================
// AUTHORITY DECISION ENGINE
//======================================================

export * from "./AuthorityDecision";

//======================================================
// AUTHORITY DECISION CONTRACTS
//======================================================

export * from "./AuthorityDecisionTypes";
export * from "./AuthorityDecisionResult";

//======================================================
// EXECUTION AUTHORITY ENGINE
//======================================================

export * from "./ExecutionAuthority";

//======================================================
// EXECUTION AUTHORITY CONTRACTS
//======================================================

export * from "./ExecutionAuthorityTypes";
export * from "./ExecutionAuthorityResult";
