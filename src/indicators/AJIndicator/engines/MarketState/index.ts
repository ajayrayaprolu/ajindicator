/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketState/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 MarketState engine.
 *
 * Responsibility:
 * Provides a single import point for the MarketState engine,
 * input types, and result contracts.
 *
 * AJ v2 Architecture:
 *
 * Raw Market Data
 *      │
 *      ▼
 * MarketStateEngine
 *      ▼
 * OrderFlowEngine
 ****************************************************************************************/

//======================================================
// ENGINE
//======================================================

export { MarketStateEngine } from "./MarketStateEngine";

//======================================================
// TYPES
//======================================================

export type {
    MarketStateInput
} from "./MarketStateTypes";

//======================================================
// RESULT
//======================================================

export type {
    MarketStateResult
} from "./MarketStateResult";