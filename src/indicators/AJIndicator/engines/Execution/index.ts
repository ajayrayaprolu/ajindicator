/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/index.ts
 *
 * Purpose:
 * Canonical export module for the AJ v2 Execution subsystem.
 *
 * Responsibilities:
 * -----------------
 * • Export all execution engines
 * • Export execution contracts
 * • Export execution result contracts
 * • Provide a single import surface for downstream engines
 *
 * Downstream Consumers:
 * ---------------------
 * • AJDecisionEngine
 * • AuthorityDecision
 * • Runtime Engine
 * • Dashboard
 * • Backtesting
 * • Strategy Engine
 * • Portfolio Engine
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Authority
 *      ↓
 * Execution
 *          ├── ExecutionEngine
 *          ├── TradeManagement
 *          ├── Trailing
 *          ├── Exit
 *          └── ReEntry
 *
 ****************************************************************************************/

//======================================================
// EXECUTION ENGINE
//======================================================

export * from "./ExecutionEngine";

//======================================================
// EXECUTION CONTRACTS
//======================================================

export * from "./ExecutionTypes";

export * from "./ExecutionResult";

//======================================================
// TRADE MANAGEMENT
//======================================================

export * from "./TradeManagement";

export * from "./TradeManagementTypes";

export * from "./TradeManagementResult";

//======================================================
// TRAILING
//======================================================

export * from "./TrailingEngine";

//======================================================
// EXIT
//======================================================

export * from "./ExitEngine";

//======================================================
// RE-ENTRY
//======================================================

export * from "./ReEntryEngine";