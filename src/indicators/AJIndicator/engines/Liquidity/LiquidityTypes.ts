/****************************************************************************************
 * File:
 * LiquidityTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Liquidity/LiquidityTypes.ts
 *
 * Purpose:
 * Shared contracts, enums and configuration used by the AJ v2 Liquidity Engine.
 *
 * This file contains only type definitions and default configuration.
 * No detection or trading logic should be implemented here.
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
// MARKET BIAS
//--------------------------------------------------

export type LiquidityBias =
    | -1
    | 0
    | 1;

//--------------------------------------------------
// LIQUIDITY SIDE
//--------------------------------------------------

export type LiquiditySide =
    | "BUY_SIDE"
    | "SELL_SIDE"
    | "BOTH"
    | "NONE";

//--------------------------------------------------
// SWEEP TYPE
//--------------------------------------------------

export type SweepType =
    | "NONE"
    | "BUY_SIDE"
    | "SELL_SIDE";

//--------------------------------------------------
// RETAIL TRAP TYPE
//--------------------------------------------------

export type RetailTrapType =
    | "NONE"
    | "BUYERS_TRAPPED"
    | "SELLERS_TRAPPED";

//--------------------------------------------------
// STOP HUNT TYPE
//--------------------------------------------------

export type StopHuntType =
    | "NONE"
    | "BUY_SIDE"
    | "SELL_SIDE";

//--------------------------------------------------
// LIQUIDITY STATE
//--------------------------------------------------

export type LiquidityState =
    | "NEUTRAL"
    | "BUY_SIDE_LIQUIDITY"
    | "SELL_SIDE_LIQUIDITY"
    | "STOP_HUNT"
    | "RETAIL_TRAP"
    | "LIQUIDITY_VOID"
    | "FAKE_BREAKOUT";

//--------------------------------------------------
// ACTIVE SIGNAL
//--------------------------------------------------

export type LiquiditySignal =
    | "NONE"
    | "SWEEP_HIGH"
    | "SWEEP_LOW"
    | "BUY_TRAP"
    | "SELL_TRAP"
    | "STOP_HUNT_HIGH"
    | "STOP_HUNT_LOW"
    | "VOID";

//--------------------------------------------------
// LIQUIDITY LEVEL
//--------------------------------------------------

export interface LiquidityLevel {

    price: number;

    timestamp: number;

    side: LiquiditySide;

    strength: number;

    touched: boolean;

    swept: boolean;

    mitigated: boolean;

}

//--------------------------------------------------
// RETAIL TRAP
//--------------------------------------------------

export interface RetailTrap {

    detected: boolean;

    type: RetailTrapType;

    confidence: number;

    triggerPrice: number;

}

//--------------------------------------------------
// STOP HUNT
//--------------------------------------------------

export interface StopHunt {

    detected: boolean;

    type: StopHuntType;

    confidence: number;

    liquidityTaken: number;

}

//--------------------------------------------------
// LIQUIDITY VOID
//--------------------------------------------------

export interface LiquidityVoid {

    detected: boolean;

    upper: number;

    lower: number;

    size: number;

}

//--------------------------------------------------
// FAKE BREAKOUT
//--------------------------------------------------

export interface FakeBreakout {

    detected: boolean;

    bullish: boolean;

    bearish: boolean;

    confidence: number;

}

//--------------------------------------------------
// ENGINE CONFIGURATION
//--------------------------------------------------

export interface LiquidityConfig {

    lookback: number;

    equalLevelTolerance: number;

    minimumSweepPercent: number;

    minimumConfidence: number;

    enableRetailTrapDetection: boolean;

    enableStopHuntDetection: boolean;

    enableLiquidityVoidDetection: boolean;

    enableFakeBreakoutDetection: boolean;

}

//--------------------------------------------------
// DEFAULT CONFIGURATION
//--------------------------------------------------

export const DEFAULT_LIQUIDITY_CONFIG: LiquidityConfig = {

    lookback: 20,

    equalLevelTolerance: 0.0015,

    minimumSweepPercent: 0.10,

    minimumConfidence: 60,

    enableRetailTrapDetection: true,

    enableStopHuntDetection: true,

    enableLiquidityVoidDetection: true,

    enableFakeBreakoutDetection: true

};