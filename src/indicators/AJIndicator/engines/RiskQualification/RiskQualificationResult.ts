/****************************************************************************************
 * File:
 * RiskQualificationResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/RiskQualificationResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Risk Qualification Engine.
 *
 * This contract represents the final market qualification stage
 * before Confidence and Authority. It contains no execution,
 * position sizing, stop-loss or take-profit logic.
 ****************************************************************************************/

import type {
    RiskDecision
} from "./RiskQualificationTypes";

export interface RiskQualificationResult {

    //--------------------------------------------------
    // FINAL DECISION
    //--------------------------------------------------

    decision: RiskDecision;

    approved: boolean;

    //--------------------------------------------------
    // QUALIFICATION SCORE
    //--------------------------------------------------

    qualificationScore: number;

    //--------------------------------------------------
    // FILTER RESULTS
    //--------------------------------------------------

    choppyRejected: boolean;

    riskRewardRejected: boolean;

    supplyRejected: boolean;

    demandRejected: boolean;

    liquidityRejected: boolean;

    structureRejected: boolean;

	trendRejected: boolean;
	
	orderFlowRejected: boolean;
	
	confidenceRejected: boolean;
	
	maximumRiskRejected: boolean;
	
	volatilityRejected: boolean;

    newsRejected: boolean;

    sessionRejected: boolean;

    //--------------------------------------------------
    // PASS FLAGS
    //--------------------------------------------------

    passedRiskReward: boolean;

    passedStructure: boolean;

	passedTrend: boolean;
	
	passedOrderFlow: boolean;
	
	passedConfidence: boolean;
	
	passedMaximumRisk: boolean;
	
	passedLiquidity: boolean;
	
    passedVolatility: boolean;

    passedSession: boolean;

    passedNews: boolean;

    //--------------------------------------------------
    // SUMMARY
    //--------------------------------------------------

    totalRejections: number;

    rejectionReasons: string[];

    //--------------------------------------------------
    // OPTIONAL SCORES
    //--------------------------------------------------

    riskRewardScore?: number;

    trendScore?: number;

    structureScore?: number;

    liquidityScore?: number;

    volatilityScore?: number;

    sessionScore?: number;

    newsScore?: number;

    overallRiskScore?: number;

    //--------------------------------------------------
    // MARKET ENVIRONMENT
    //--------------------------------------------------

    marketEnvironment?:
        | "TRENDING"
        | "RANGING"
        | "CHOPPY"
        | "VOLATILE"
        | "UNKNOWN";

    //--------------------------------------------------
    // QUALIFICATION GRADE
    //--------------------------------------------------

    qualificationGrade?:
        | "A+"
        | "A"
        | "B"
        | "C"
        | "D"
        | "REJECT";

    //--------------------------------------------------
    // INSTITUTIONAL SUMMARY
    //--------------------------------------------------

    institutionalReady?: boolean;

    institutionalScore?: number;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics?: {

        rejectionPercentage: number;

        passedFilters: number;

        failedFilters: number;

        totalFilters: number;

        overallQualification: number;

    };

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

    notes?: string[];

}