/****************************************************************************************
 * File:
 * RiskQualificationInput.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/
 *
 * Purpose:
 * Canonical input contract for the AJ v2 Risk Qualification Engine.
 ****************************************************************************************/

export interface RiskQualificationInput {

    //--------------------------------------------------
    // MARKET STATE
    //--------------------------------------------------

    choppyMarket: boolean;

    nearbySupply: boolean;

    nearbyDemand: boolean;

    oppositeLiquidity: boolean;

    oppositeStructure: boolean;

    oppositeTrend: boolean;

    volatilityAcceptable: boolean;

    sessionOpen: boolean;

    highImpactNews: boolean;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirection: number;

    riskReward: number;

    minimumRiskReward: number;

    //--------------------------------------------------
    // ORDER FLOW
    //--------------------------------------------------

    orderFlowQualified: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;

    minimumConfidence: number;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    maximumRiskExceeded: boolean;

}