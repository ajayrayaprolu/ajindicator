/****************************************************************************************
 * File:
 * TradeManagementTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/TradeManagementTypes.ts
 *
 * Purpose:
 * Canonical institutional trade management contracts for AJ v2.
 *
 * This file defines the shared contracts used by the Trade Management
 * Engine to manage institutional positions after execution.
 *
 * Responsibilities:
 * -----------------
 * • Position sizing
 * • Scale-in management
 * • Scale-out management
 * • Partial exits
 * • Break-even management
 * • Trailing eligibility
 * • Portfolio-aware risk updates
 * • Live position metrics
 * • Trade lifecycle metadata
 *
 * This file performs NO calculations.
 * It only defines reusable trade management contracts.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Execution Engine
 *      ↓
 * Lifecycle Engine
 *      ↓
 * Trade Management
 *          ├── Position Management
 *          ├── Scale In
 *          ├── Scale Out
 *          ├── Break Even
 *          ├── Partial Exit
 *          └── Risk Updates
 *
 ****************************************************************************************/

//======================================================
// INPUT
//======================================================

export interface TradeManagementInput {

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirection:number;

    entryPrice:number;

    currentPrice:number;

    //--------------------------------------------------
    // LEVELS
    //--------------------------------------------------

    stopLoss:number;

    tp1:number;

    tp2:number;

    tp3:number;

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    high:number;

    low:number;

    atr:number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize:number;

    remainingPosition:number;

    averageEntryPrice?:number;

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    barsInTrade:number;

    maxHoldingBars:number;

    tradeAge:number;

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    inPosition:boolean;

    positionOpen:boolean;

    positionClosed:boolean;

    //--------------------------------------------------
    // TARGET STATUS
    //--------------------------------------------------

    tp1Hit:boolean;

    tp2Hit:boolean;

    tp3Hit:boolean;

    stopLossHit:boolean;

    //--------------------------------------------------
    // STRATEGY
    //--------------------------------------------------

    isScalping:boolean;

    isSwingTrade:boolean;

    isOptionsTrade:boolean;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    accountRiskPercent?:number;

    riskScore?:number;

    confidence?:number;

}

//======================================================
// TRADE PROGRESS
//======================================================

export interface TradeProgress {

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    tp1Hit:boolean;

    tp2Hit:boolean;

    tp3Hit:boolean;

    slHit:boolean;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    remainingPosition:number;

    realizedPosition:number;

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    tradeActive:boolean;

    tradeCompleted:boolean;

    tradeClosed:boolean;

    //--------------------------------------------------
    // MANAGEMENT
    //--------------------------------------------------

    breakEvenActive:boolean;

    trailingAllowed:boolean;

    trailingActive:boolean;

}

//======================================================
// SCALE IN
//======================================================

export interface ScaleInState {

    enabled:boolean;

    executed:boolean;

    additionalQuantity:number;

    averageEntryPrice:number;

}

//======================================================
// SCALE OUT
//======================================================

export interface ScaleOutState {

    enabled:boolean;

    executed:boolean;

    exitQuantity:number;

    remainingPosition:number;

}

//======================================================
// PARTIAL EXIT
//======================================================

export interface PartialExit {

    exitPercent:number;

    exitQuantity:number;

    remainingPosition:number;

    realizedPnL?:number;

}

//======================================================
// BREAK EVEN
//======================================================

export interface BreakEvenState {

    enabled:boolean;

    activated:boolean;

    breakEvenPrice:number;

}

//======================================================
// LIVE RISK
//======================================================

export interface TradeRiskState {

    currentRisk:number;

    rewardRiskRatio:number;

    unrealizedPnL:number;

    realizedPnL:number;

    drawdown:number;

}

//======================================================
// PORTFOLIO
//======================================================

export interface PortfolioExposure {

    totalExposure:number;

    availableCapital:number;

    marginUsed:number;

    leverage:number;

    riskUtilization:number;

}