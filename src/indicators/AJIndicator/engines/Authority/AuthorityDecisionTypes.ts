/****************************************************************************************
 * File:
 * AuthorityDecisionTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/AuthorityDecisionTypes.ts
 *
 * Purpose:
 * Canonical input contracts and reusable types for the AJ v2
 * Authority Decision Engine.
 *
 * The Authority Engine is the final decision layer before
 * Execution. It consumes outputs from:
 *
 * • Confidence Engine
 * • Risk Qualification Engine
 * • Market State Engine
 * • Trend Engine
 * • Momentum Engine
 * • Liquidity Engine
 * • Order Block Engine
 * • Multi-Timeframe Engine
 * • State Machine
 *
 * It produces only:
 *
 *      BUY
 *      SELL
 *      WAIT
 *
 * No execution logic belongs here.
 ****************************************************************************************/

//======================================================
// FINAL ACTION
//======================================================

export type AuthorityAction =
    | "BUY"
    | "SELL"
    | "WAIT";

//======================================================
// TRADE DIRECTION
//======================================================

export type TradeDirection =
    | -1
    | 0
    | 1;

//======================================================
// DECISION GRADE
//======================================================

export type AuthorityGrade =
    | "A+"
    | "A"
    | "B"
    | "C"
    | "REJECT";

//======================================================
// DECISION INPUT
//======================================================

export interface AuthorityDecisionInput {

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;

    minimumConfidence: number;

    //--------------------------------------------------
    // RISK QUALIFICATION
    //--------------------------------------------------

    riskApproved: boolean;

    riskScore: number;

    //--------------------------------------------------
    // MULTI-TIMEFRAME
    //--------------------------------------------------

    mtfAgreement: boolean;

    alignmentPercent?: number;

    //--------------------------------------------------
    // STATE MACHINE
    //--------------------------------------------------

    stateReady: boolean;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirection: TradeDirection;

    //--------------------------------------------------
    // MARKET CONTEXT
    //--------------------------------------------------

    trendBull?: boolean;

    trendBear?: boolean;

    momentumBull?: boolean;

    momentumBear?: boolean;

    liquidityBull?: boolean;

    liquidityBear?: boolean;

    orderBlockBull?: boolean;

    orderBlockBear?: boolean;

    marketTrending?: boolean;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

}

//======================================================
// AUTHORITY SUMMARY
//======================================================

export interface AuthoritySummary {

    action: AuthorityAction;

    approved: boolean;

    confidenceReady: boolean;

    riskReady: boolean;

    mtfReady: boolean;

    stateReady: boolean;

}

//======================================================
// ENGINE CONFIGURATION
//======================================================

export interface AuthorityConfiguration {

    minimumConfidence: number;

    requireRiskApproval: boolean;

    requireMTFAgreement: boolean;

    requireStateReady: boolean;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultAuthorityConfiguration: AuthorityConfiguration = {

    minimumConfidence: 75,

    requireRiskApproval: true,

    requireMTFAgreement: true,

    requireStateReady: true

};