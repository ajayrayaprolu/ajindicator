/****************************************************************************************
 * File:
 * RiskTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/RiskTypes.ts
 *
 * Purpose:
 * Canonical input contract for the AJ v2 Institutional Risk Model.
 *
 * Responsibilities:
 * -----------------
 * • Defines every input required for institutional position sizing.
 * • Consumes outputs from Authority, Confidence, Risk Qualification,
 *   Trend, Momentum, Volatility, Multi-Timeframe and Entry Planning.
 * • Contains contracts only.
 *
 * No calculations belong in this file.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Risk Qualification
 *      ↓
 * Entry Risk Engine
 *      ↓
 * Risk Model
 *          ├── Position Size
 *          ├── Risk Amount
 *          ├── Capital Allocation
 *          ├── Portfolio Exposure
 *          ├── Margin Usage
 *          └── Risk Diagnostics
 ****************************************************************************************/

//======================================================
// RISK MODEL INPUT
//======================================================

export interface RiskInput {

    //--------------------------------------------------
    // ACCOUNT
    //--------------------------------------------------

    accountSize: number;

    availableCapital?: number;

    riskPercent: number;

    maxRiskPercent?: number;

    //--------------------------------------------------
    // PORTFOLIO
    //--------------------------------------------------

    portfolioExposure?: number;

    openPositions?: number;

    correlationScore?: number;

    //--------------------------------------------------
    // AUTHORITY
    //--------------------------------------------------

    authorityDecision?:
        | "BUY"
        | "SELL"
        | "WAIT";

    authorityApproved?: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence?: number;

    confidenceGrade?: string;

    //--------------------------------------------------
    // RISK QUALIFICATION
    //--------------------------------------------------

    riskQualified?: boolean;

    riskScore?: number;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    entryPrice: number;

    stopLoss: number;

    tradeDirection?: number;

    //--------------------------------------------------
    // ENTRY PLAN
    //--------------------------------------------------

    tp1?: number;

    tp2?: number;

    tp3?: number;

    rewardRiskRatio?: number;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    trendStrength?: number;

    trendQuality?: number;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    momentumScore?: number;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atr: number;

    volatilityScore?: number;

    //--------------------------------------------------
    // MULTI-TIMEFRAME
    //--------------------------------------------------

    mtfAlignment?: number;

    dominantTimeframe?: string;

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    leverage?: number;

    marginAvailable?: number;

    slippagePercent?: number;

    //--------------------------------------------------
    // MODE
    //--------------------------------------------------

    isOptionsMode: boolean;

    isScalping: boolean;

    isSwingTrade?: boolean;

    isPaperTrade?: boolean;

    //--------------------------------------------------
    // METADATA
    //--------------------------------------------------

    symbol?: string;

    timeframe?: string;

    timestamp?: number;

}