/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderFlow/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 OrderFlow engine.
 *
 * Responsibility:
 * Provides a single entry point for importing the OrderFlow engine,
 * input contracts, and result contracts throughout the AJ platform.
 *
 * AJ v2 Architecture
 *
 * MarketStateEngine
 *          │
 *          ▼
 * OrderFlowEngine
 *          │
 *          ▼
 * MarketStructureEngine
 *
 ****************************************************************************************/

//======================================================
// ENGINE
//======================================================

export { OrderFlowEngine } from "./OrderFlowEngine";

//======================================================
// TYPES
//======================================================

export type {
    OrderFlowInput
} from "./OrderFlowTypes";

//======================================================
// RESULT
//======================================================

export type {
    OrderFlowResult
} from "./OrderFlowResult";