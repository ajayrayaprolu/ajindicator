/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/OrderBlock/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Order Block Engine.
 *
 * This file serves as the single entry point for all Order Block Engine
 * components, including the engine implementation, result contract,
 * shared types and default configuration.
 *
 * AJ v2 Architecture
 *
 * MarketState
 *      │
 *      ▼
 * OrderFlow
 *      │
 *      ▼
 * MarketStructure
 *      │
 *      ▼
 * Liquidity
 *      │
 *      ▼
 * OrderBlock
 *      │
 *      ▼
 * Trend
 ****************************************************************************************/

//--------------------------------------------------
// ENGINE
//--------------------------------------------------

export { OrderBlockEngine } from "./OrderBlockEngine";

//--------------------------------------------------
// RESULT
//--------------------------------------------------

export type {
    OrderBlockResult
} from "./OrderBlockResult";

//--------------------------------------------------
// TYPES
//--------------------------------------------------

export type {
    OrderBlockBias,
    OrderBlockType,
    OrderBlockQuality,
    OrderBlockStatus,
    ReactionQuality,
    HigherTimeframe,
    OrderBlockZone,
    OrderBlockStatistics,
    OrderBlockConfig
} from "./OrderBlockTypes";

//--------------------------------------------------
// DEFAULT CONFIGURATION
//--------------------------------------------------

export {
    DEFAULT_ORDER_BLOCK_CONFIG
} from "./OrderBlockTypes";