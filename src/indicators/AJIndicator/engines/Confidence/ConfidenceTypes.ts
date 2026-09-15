/****************************************************************************************
 * File:
 * ConfidenceTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Confidence/ConfidenceTypes.ts
 *
 * Purpose:
 * Canonical input contract for the AJ v2 Institutional Confidence Engine.
 *
 * Responsibilities:
 * -----------------
 * • Defines every input consumed by the Confidence Engine.
 * • Aggregates outputs from Trend, Momentum, Market Structure,
 *   Liquidity, Order Flow, Volatility, Multi-Timeframe and
 *   Risk Qualification engines.
 * • Contains contracts only.
 *
 * No calculations belong in this file.
 *
 * AJ Architecture
 *
 * Trend
 * Momentum
 * Market Structure
 * Liquidity
 * Order Flow
 * Volatility
 * Multi-Timeframe
 * Risk Qualification
 *          │
 *          ▼
 *     Confidence Engine
 ****************************************************************************************/

//======================================================
// TREND
//======================================================

export interface TrendConfidence {

    direction:number;

    strength:number;

    quality?:number;

}

//======================================================
// MOMENTUM
//======================================================

export interface MomentumConfidence {

    direction:number;

    strength:number;

    impulseStrength?:number;

    breakoutStrength?:number;

}

//======================================================
// MARKET STRUCTURE
//======================================================

export interface MarketStructureConfidence {

    bosDirection:number;

    chochDirection:number;

    orderBlockAligned:boolean;

    fvgAligned:boolean;

    liquiditySweepConfirmed:boolean;

    structureQuality?:number;

}

//======================================================
// ORDER FLOW
//======================================================

export interface OrderFlowConfidence {

    direction:number;

    strength:number;

    cvdConfirmed:boolean;

    volumeStrength?:number;

    quality?:number;

}

//======================================================
// VOLATILITY
//======================================================

export interface VolatilityConfidence {

    acceptable:boolean;

    atrQuality?:number;

    regime?:

        | "TRENDING"

        | "RANGING"

        | "CHOPPY"

        | "VOLATILE";

}

//======================================================
// MULTI-TIMEFRAME
//======================================================

export interface MultiTimeframeConfidence {

    aligned:boolean;

    alignment:number;

    dominantAligned:boolean;

    higherTrendConfirmed:boolean;

    institutionalAlignment:number;

}

//======================================================
// RISK QUALIFICATION
//======================================================

export interface RiskQualificationConfidence {

    tradeAllowed:boolean;

    riskScore:number;

}

//======================================================
// CONFIDENCE INPUT
//======================================================

export interface ConfidenceInput {

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    chartId?:string;

    symbol?:string;

    timeframe?:string;

    tradeDirection:number;

    authorityDecision?:

        | "BUY"

        | "SELL"

        | "WAIT";

    //--------------------------------------------------
    // ENGINE OUTPUTS
    //--------------------------------------------------

    trend:TrendConfidence;

    momentum:MomentumConfidence;

    marketStructure:MarketStructureConfidence;

    orderFlow:OrderFlowConfidence;

    volatility:VolatilityConfidence;

    multiTimeframe:MultiTimeframeConfidence;

    riskQualification:RiskQualificationConfidence;

    //--------------------------------------------------
    // OPTIONAL METADATA
    //--------------------------------------------------

    timestamp?:number;

    session?:string;

    market?:string;

}