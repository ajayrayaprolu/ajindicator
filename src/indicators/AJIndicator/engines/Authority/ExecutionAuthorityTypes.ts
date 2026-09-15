/****************************************************************************************
 * File:
 * ExecutionAuthorityTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/ExecutionAuthorityTypes.ts
 *
 * Purpose:
 * Canonical input contract for the AJ v2 Institutional Execution Authority.
 *
 * Responsibilities:
 * -----------------
 * â€¢ Defines every input consumed by the Execution Authority.
 * â€¢ Aggregates outputs from Confidence, Risk Qualification,
 * â€¢ Trend, Momentum, Market Structure, Volatility,
 * â€¢ Multi-Timeframe and Runtime.
 *
 * This file contains contracts only.
 * No calculations belong here.
 *
 * AJ Architecture
 *
 * Confidence
 * Risk Qualification
 * Trend
 * Momentum
 * Market Structure
 * Volatility
 * Multi-Timeframe
 *      │
 *      ▼
 *  Execution Authority
 ****************************************************************************************/

import type {

    ConfidenceResult

} from "../Confidence/ConfidenceResult";

//======================================================
// TREND
//======================================================

export interface AuthorityTrend {

    direction:number;

    strength:number;

    quality?:number;

}

//======================================================
// MOMENTUM
//======================================================

export interface AuthorityMomentum {

    direction:number;

    strength:number;

    impulseStrength?:number;

    breakoutStrength?:number;

}

//======================================================
// MARKET STRUCTURE
//======================================================

export interface AuthorityMarketStructure {

    bosDirection:number;

    chochDirection:number;

    orderBlockAligned:boolean;

    fvgAligned:boolean;

    liquiditySweepConfirmed:boolean;

    structureQuality?:number;

}

//======================================================
// VOLATILITY
//======================================================

export interface AuthorityVolatility {

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

export interface AuthorityMultiTimeframe {

    aligned:boolean;

    alignment:number;

    dominantAligned:boolean;

    higherTrendConfirmed:boolean;

    institutionalAlignment:number;

}

//======================================================
// RISK QUALIFICATION
//======================================================

export interface AuthorityRiskQualification {

    //--------------------------------------------------
    // Compatibility Producer
    //--------------------------------------------------

    tradeAllowed: boolean;

    riskScore: number;

    //--------------------------------------------------
    // Canonical Consumer
    //--------------------------------------------------

    approved?: boolean;

    decision?: string;

    qualificationScore?: number;

    rejectionReasons?: string[];

}

//======================================================
// ORDER FLOW
//======================================================

export interface AuthorityOrderFlow {

    direction: number;

    strength: number;

    cvdConfirmed: boolean;

    volumeStrength: number;

    quality?: number;

    //--------------------------------------------------
    // Compatibility
    //--------------------------------------------------

    confirmed?: boolean;

    bullish?: boolean;

    bearish?: boolean;

    confidence?: number;

}

//======================================================
// LIQUIDITY
//======================================================

export interface AuthorityLiquidity {

    sweepConfirmed: boolean;

    stopHunt: boolean;

    strength: number;

    retailTrap: boolean;

    //--------------------------------------------------
    // Compatibility
    //--------------------------------------------------

    confirmed?: boolean;

    confidence?: number;

}

//======================================================
// EXECUTION AUTHORITY INPUT
//======================================================

export interface ExecutionAuthorityInputs {

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirection:number;
	
    //--------------------------------------------------
    // CALCULATION MODE
    //--------------------------------------------------

    tradeEngineMode?:
        "SCORE" |
        "AI" |
        "AI_SMC";

    requestedTradeEngineMode?: string;

    effectiveCalculationMode?: string;

    intelligentModeEnabled?: boolean;

    //--------------------------------------------------
    // MODE CORE READINESS
    //--------------------------------------------------

    aiCorePass?: boolean;

    smcCorePass?: boolean;

    //--------------------------------------------------
    // ADVANCED CRYPTO
    //--------------------------------------------------

    advancedCryptoEnabled?: boolean;

    advancedCryptoApplicable?: boolean;

    advancedCryptoReady?: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence?: ConfidenceResult;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    trend:AuthorityTrend;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    momentum:AuthorityMomentum;

	//--------------------------------------------------
	// MARKET STRUCTURE
	//--------------------------------------------------
	
	marketStructure:AuthorityMarketStructure;
	
	//--------------------------------------------------
	// ORDER FLOW
	//--------------------------------------------------
	
	orderFlow:AuthorityOrderFlow;
	
	//--------------------------------------------------
	// LIQUIDITY
	//--------------------------------------------------
	
	liquidity:AuthorityLiquidity;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    volatility:AuthorityVolatility;

    //--------------------------------------------------
    // MULTI-TIMEFRAME
    //--------------------------------------------------

    multiTimeframe:AuthorityMultiTimeframe;

    //--------------------------------------------------
    // RISK QUALIFICATION
    //--------------------------------------------------

    riskQualification:AuthorityRiskQualification;

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

	executionReady?: boolean;
	
	tradeAlreadyRunning?: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionAllowed?: boolean;

    marketState?:

        | "PRE_MARKET"

        | "OPEN"

        | "HALTED"

        | "CLOSED"

        | "AFTER_HOURS";

    //--------------------------------------------------
    // OPTIONAL RUNTIME
    //--------------------------------------------------

    symbol?:string;

    timeframe?:string;

    chartId?:string;

    timestamp?:number;

}
