/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketStructure/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Market Structure Engine.
 *
 * This file serves as the single entry point for all Market Structure
 * contracts, engine implementations and result types.
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
 ****************************************************************************************/

//--------------------------------------------------
// ENGINE
//--------------------------------------------------

export { MarketStructureEngine } from "./MarketStructureEngine";

//--------------------------------------------------
// RESULT
//--------------------------------------------------

export type { MarketStructureResult } from "./MarketStructureResult";

//--------------------------------------------------
// TYPES
//--------------------------------------------------

export type {
    MarketBias,
    BOSStrength,
    StructureSide,
    MarketStructureType,
    StructureEvent,
    BOSInformation,
    CHOCHInformation,
    InternalStructure,
    ExternalStructure,
    MarketStructureConfig
} from "./MarketStructureTypes";

export {
    DEFAULT_MARKET_STRUCTURE_CONFIG
} from "./MarketStructureTypes";