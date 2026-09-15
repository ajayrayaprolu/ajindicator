/****************************************************************************************
 * File:
 * RiskQualificationEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/RiskQualificationEngine.ts
 *
 * Purpose:
 * Canonical Risk Qualification Engine for AJ v2.
 *
 * Responsibilities
 * ----------------
 * • Choppy market filter
 * • Risk/Reward validation
 * • Nearby supply / demand rejection
 * • Opposing liquidity detection
 * • Opposing structure detection
 * • Opposing trend rejection
 * • Volatility qualification
 * • Session qualification
 * • News qualification
 * • Final trade qualification
 *
 * This engine DOES NOT:
 * • Calculate confidence
 * • Execute trades
 * • Produce stop losses
 * • Produce take profits
 ****************************************************************************************/

import type {
    RiskQualificationInput,
    RiskDecision
} from "./RiskQualificationTypes";

import type {
    RiskQualificationResult
} from "./RiskQualificationResult";

export class RiskQualificationEngine {

    //==================================================
    // QUALIFY
    //==================================================

    static qualify(
        input: RiskQualificationInput
    ): RiskQualificationResult {

        //--------------------------------------------------
        // REJECTION FLAGS
        //--------------------------------------------------

        const choppyRejected =
            input.choppyMarket;

        const rrRejected =
            input.riskReward <
            input.minimumRiskReward;

        const supplyRejected =
            input.nearbySupply &&
            input.tradeDirection > 0;

        const demandRejected =
            input.nearbyDemand &&
            input.tradeDirection < 0;

        const liquidityRejected =
            input.oppositeLiquidity;

        const structureRejected =
            input.oppositeStructure;

		const trendRejected =
			input.oppositeTrend;
		
		//--------------------------------------------------
		// ORDER FLOW QUALIFICATION
		//--------------------------------------------------
		
		const orderFlowRejected =
			input.orderFlowQualified === false;
		
		//--------------------------------------------------
		// CONFIDENCE QUALIFICATION
		//--------------------------------------------------
		
		const confidenceRejected =
				(input.confidence ?? 0) <
				(input.minimumConfidence ?? 0);
		
		//--------------------------------------------------
		// MAXIMUM RISK
		//--------------------------------------------------
		
		const maximumRiskRejected =
				input.maximumRiskExceeded ?? false;
		
		//--------------------------------------------------
		// VOLATILITY
		//--------------------------------------------------
		
		const volatilityRejected =
			!input.volatilityAcceptable;

        const newsRejected =
            input.highImpactNews;

        const sessionRejected =
            !input.sessionOpen;

        //--------------------------------------------------
        // REASONS
        //--------------------------------------------------

        const rejectionReasons: string[] = [];

        if (choppyRejected)
            rejectionReasons.push("Choppy Market");

        if (rrRejected)
            rejectionReasons.push("Low Risk Reward");

        if (supplyRejected)
            rejectionReasons.push("Nearby Supply");

        if (demandRejected)
            rejectionReasons.push("Nearby Demand");

        if (liquidityRejected)
            rejectionReasons.push("Opposite Liquidity");

        if (structureRejected)
            rejectionReasons.push("Opposite Market Structure");

		if (trendRejected)
			rejectionReasons.push("Opposite Trend");
		
		if (orderFlowRejected)
			rejectionReasons.push("Order Flow");
		
		if (confidenceRejected)
			rejectionReasons.push("Confidence");
		
		if (maximumRiskRejected)
			rejectionReasons.push("Maximum Risk");
		
		if (volatilityRejected)
            rejectionReasons.push("Volatility Filter");

        if (newsRejected)
            rejectionReasons.push("High Impact News");

        if (sessionRejected)
            rejectionReasons.push("Session Closed");

        //--------------------------------------------------
        // SCORE
        //--------------------------------------------------

        let score = 100;

        score -= rejectionReasons.length * 10;

        score = Math.max(
            0,
            Math.min(100, score)
        );

        //--------------------------------------------------
        // DECISION
        //--------------------------------------------------

        let decision: RiskDecision =
            "TRADE";

        if (
            rejectionReasons.length >= 5
        ) {

            decision = "NO_TRADE";

        } else if (
            rejectionReasons.length > 0
        ) {

            decision = "WAIT";

        }

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // DECISION
            //--------------------------------------------------

            decision,

            approved:
                decision === "TRADE",

            //--------------------------------------------------
            // SCORE
            //--------------------------------------------------

            qualificationScore:
                score,

            //--------------------------------------------------
            // FILTERS
            //--------------------------------------------------

            choppyRejected,

            riskRewardRejected:
                rrRejected,

            supplyRejected,

            demandRejected,

            liquidityRejected,

            structureRejected,

			trendRejected,
			
			orderFlowRejected,
			
			confidenceRejected,
			
			maximumRiskRejected,
			
			volatilityRejected,

            newsRejected,

            sessionRejected,

            //--------------------------------------------------
            // SUMMARY
            //--------------------------------------------------

            rejectionReasons,

            totalRejections:
                rejectionReasons.length,

            //--------------------------------------------------
            // PASS FLAGS
            //--------------------------------------------------

            passedRiskReward:
                !rrRejected,

            passedStructure:
                !structureRejected,

			passedTrend:
				!trendRejected,
			
			passedOrderFlow:
				!orderFlowRejected,
			
			passedConfidence:
				!confidenceRejected,
			
			passedMaximumRisk:
				!maximumRiskRejected,
			
			passedLiquidity:
                !liquidityRejected,

            passedVolatility:
                !volatilityRejected,

            passedSession:
                !sessionRejected,

            passedNews:
                !newsRejected

        };

    }

}