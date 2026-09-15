/****************************************************************************************
 * File:
 * EntryRiskTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/EntryRiskTypes.ts
 *
 * Purpose:
 * Canonical input contract for the AJ v2 Institutional Entry Risk Engine.
 *
 * Responsibilities:
 * -----------------
 * • Defines every input required to build an institutional trade plan.
 * • Consumes outputs from Authority, Confidence, Risk Qualification,
 *   Trend, Momentum, Volatility, Multi-Timeframe and Runtime.
 * • Contains no business logic or calculations.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Authority
 *      ↓
 * Risk Qualification
 *      ↓
 * Entry Risk Engine
 *          ├── Initial Stop Loss
 *          ├── TP1
 *          ├── TP2
 *          ├── TP3
 *          ├── Break-even Trigger
 *          ├── Trail Trigger
 *          └── Initial Risk Profile
 ****************************************************************************************/

//======================================================
// ENTRY RISK INPUT
//======================================================

export interface EntryRiskInput {

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    engineState: string;

    //--------------------------------------------------
    // AUTHORITY
    //--------------------------------------------------

    authorityDecision:
        | "BUY"
        | "SELL"
        | "WAIT";

    authorityApproved: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;

    confidenceGrade?: string;

    //--------------------------------------------------
    // RISK QUALIFICATION
    //--------------------------------------------------

    riskQualified: boolean;

    riskDecision?:
        | "TRADE"
        | "WAIT"
        | "NO_TRADE";

    riskScore?: number;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirectionFinal: number;

    entryPrice: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atr: number;

    atrMultiplier?: number;

    volatilityScore?: number;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    trendDirection?: number;

    trendStrength?: number;

    trendQuality?: number;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    momentumScore?: number;

    breakoutStrength?: number;

    impulseStrength?: number;

    //--------------------------------------------------
    // MULTI TIMEFRAME
    //--------------------------------------------------

    mtfAlignment?: number;

    dominantTimeframe?: string;

    //--------------------------------------------------
    // RUNTIME PRICE
    //--------------------------------------------------

    currentPrice: number;

    high: number;

    low: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;

    accountSize?: number;

    //--------------------------------------------------
    // RISK SETTINGS
    //--------------------------------------------------

    accountRiskPercent?: number;

    maxRiskPercent?: number;

    rewardRiskTarget?: number;

    //--------------------------------------------------
    // EXECUTION FLAGS
    //--------------------------------------------------

    allowBreakEven?: boolean;

    allowTrailing?: boolean;

    allowScaleIn?: boolean;

    allowScaleOut?: boolean;

    //--------------------------------------------------
    // STRATEGY MODE
    //--------------------------------------------------

    isScalping: boolean;

    isAdvancedMode: boolean;

    isOptionsMode: boolean;

    isSwingTrade?: boolean;

    isPaperTrade?: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionName?: string;

    sessionHigh?: number;

    sessionLow?: number;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    symbol?: string;

    timeframe?: string;

    timestamp?: number;

}