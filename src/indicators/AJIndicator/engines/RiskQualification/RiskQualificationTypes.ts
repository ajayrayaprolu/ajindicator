/****************************************************************************************
 * File:
 * RiskQualificationTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/RiskQualificationTypes.ts
 *
 * Purpose:
 * Canonical input contracts and reusable types for the AJ v2
 * Risk Qualification Engine.
 *
 * This engine performs the final market qualification before
 * Confidence and Authority. It evaluates whether current
 * market conditions are suitable for trading but does not
 * generate execution decisions.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Market Engines
 *      ↓
 * Multi-Timeframe
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 *      ↓
 * Execution
 ****************************************************************************************/

//======================================================
// FINAL DECISION
//======================================================

export type RiskDecision =
    | "TRADE"
    | "WAIT"
    | "NO_TRADE";

//======================================================
// MARKET ENVIRONMENT
//======================================================

export type MarketEnvironment =
    | "TRENDING"
    | "RANGING"
    | "CHOPPY"
    | "VOLATILE"
    | "UNKNOWN";

//======================================================
// REJECTION SEVERITY
//======================================================

export type RejectionSeverity =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

//======================================================
// TRADE DIRECTION
//======================================================

export type TradeDirection =
    | -1
    | 0
    | 1;

//======================================================
// FILTER STATUS
//======================================================

export interface RiskFilter {

    enabled: boolean;

    passed: boolean;

    weight: number;

    reason?: string;

}

//======================================================
// RISK REWARD INFORMATION
//======================================================

export interface RiskRewardInformation {

    riskReward: number;

    minimumRiskReward: number;

    acceptable: boolean;

}

//======================================================
// MARKET FILTERS
//======================================================

export interface MarketFilters {

    choppyMarket: boolean;

    nearbySupply: boolean;

    nearbyDemand: boolean;

    oppositeTrend: boolean;

    oppositeStructure: boolean;

    oppositeLiquidity: boolean;

    volatilityAcceptable: boolean;

    sessionOpen: boolean;

    highImpactNews: boolean;

}

//======================================================
// ENGINE INPUT
//======================================================

export interface RiskQualificationInput {

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirection: TradeDirection;

    //--------------------------------------------------
    // RISK / REWARD
    //--------------------------------------------------

    riskReward: number;

    minimumRiskReward: number;

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    choppyMarket: boolean;

    nearbySupply: boolean;

    nearbyDemand: boolean;

    oppositeTrend: boolean;

    oppositeStructure: boolean;

    oppositeLiquidity: boolean;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    volatilityAcceptable: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionOpen: boolean;

    //--------------------------------------------------
    // NEWS
    //--------------------------------------------------

    highImpactNews: boolean;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    marketEnvironment?: MarketEnvironment;

	//--------------------------------------------------
	// CONFIDENCE
	//--------------------------------------------------
	
	confidence?: number;
	
	minimumConfidence?: number;
	
	//--------------------------------------------------
	// ORDER FLOW
	//--------------------------------------------------
	
	orderFlowQualified?: boolean;
	
	//--------------------------------------------------
	// RISK
	//--------------------------------------------------
	
	maximumRiskExceeded?: boolean;
	
	//--------------------------------------------------
	// METADATA
	//--------------------------------------------------
	
	metadata?: Record<string, unknown>;

}

//======================================================
// ENGINE CONFIGURATION
//======================================================

export interface RiskQualificationConfiguration {

    minimumRiskReward: number;

    maximumAllowedRejections: number;

    minimumQualificationScore: number;

    allowTradingDuringNews: boolean;

    requireSessionOpen: boolean;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultRiskQualificationConfiguration: RiskQualificationConfiguration = {

    minimumRiskReward: 2.0,

    maximumAllowedRejections: 4,

    minimumQualificationScore: 70,

    allowTradingDuringNews: false,

    requireSessionOpen: true

};