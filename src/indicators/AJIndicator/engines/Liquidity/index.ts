/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Liquidity/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Liquidity Engine.
 *
 * This file provides the canonical entry point for all Liquidity Engine
 * components, including the engine implementation, result contract,
 * shared types, and default configuration.
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
 ****************************************************************************************/

//--------------------------------------------------
// ENGINE
//--------------------------------------------------

export { LiquidityEngine } from "./LiquidityEngine";

//--------------------------------------------------
// RESULT
//--------------------------------------------------

export type {
    LiquidityResult
} from "./LiquidityResult";

//--------------------------------------------------
// TYPES
//--------------------------------------------------

export type {
    LiquidityBias,
    LiquiditySide,
    SweepType,
    RetailTrapType,
    StopHuntType,
    LiquidityState,
    LiquiditySignal,
    LiquidityLevel,
    RetailTrap,
    StopHunt,
    LiquidityVoid,
    FakeBreakout,
    LiquidityConfig
} from "./LiquidityTypes";

//--------------------------------------------------
// DEFAULT CONFIGURATION
//--------------------------------------------------

export {
    DEFAULT_LIQUIDITY_CONFIG
} from "./LiquidityTypes";