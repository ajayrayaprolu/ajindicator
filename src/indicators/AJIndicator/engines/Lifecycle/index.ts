/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Lifecycle/index.ts
 *
 * Purpose:
 * Canonical export module for the AJ v2 Lifecycle subsystem.
 *
 * Responsibilities:
 * -----------------
 * • Export Lifecycle Engine
 * • Export lifecycle contracts
 * • Export lifecycle result contracts
 * • Export lifecycle state definitions
 * • Provide a single import surface for downstream engines
 *
 * Downstream Consumers:
 * ---------------------
 * • Execution Engine
 * • Trade Management Engine
 * • Exit Engine
 * • ReEntry Engine
 * • Runtime Engine
 * • Dashboard
 * • Backtesting
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Authority
 *      ↓
 * Execution
 *      ↓
 * Trade Management
 *      ↓
 * Lifecycle
 *          ├── LifecycleEngine
 *          ├── LifecycleState
 *          ├── LifecycleTypes
 *          └── LifecycleResult
 *
 ****************************************************************************************/

//======================================================
// LIFECYCLE ENGINE
//======================================================

export * from "./LifecycleEngine";

//======================================================
// LIFECYCLE CONTRACTS
//======================================================

export * from "./LifecycleTypes";

//======================================================
// LIFECYCLE RESULT
//======================================================

export * from "./LifecycleResult";

//======================================================
// LIFECYCLE STATE
//======================================================

export * from "./LifecycleState";