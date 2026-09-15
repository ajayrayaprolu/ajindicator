//============================================================================
//src/runtime/portfolio/AllocationEngine.ts: Phase 12 Portfolio Allocation Core
//=============================================================================
// This layer sits above RiskEngine and PositionSizing, and is responsible for:
// capital distribution across trades / strategies // enforcing risk caps from RiskEngine // balancing exposure across market regimes
// preparing allocation vector for execution
//======================================================
// AllocationEngine.ts — Part 1 : // Phase 12 Portfolio Core
//======================================================

import { MarketRegime } from "../RuntimeTypes";
import type { PortfolioEngineResult } from "./PortfolioEngine";
import type { AIConfidenceResult } from "../../indicators/AJIndicator/ai/AIConfidenceEngine";

//======================================================
// INPUT CONTRACT
//======================================================

export interface AllocationInput {
    symbol: string;
    price: number;
    portfolio: PortfolioEngineResult;
    aiConfidence: AIConfidenceResult;
    marketRegime: MarketRegime;
    accountEquity: number;
    sector?: string;
    volatility: number;
}

//======================================================
// OUTPUT CONTRACT
//======================================================

export interface AllocationResult {

    //--------------------------------------------------
    // ALLOCATION CORE
    //--------------------------------------------------

    allocatedCapital: number;
    allocationWeight: number;
    adjustedPositionSize: number;
    leverageFactor: number;

    //--------------------------------------------------
    // RISK ADJUSTMENTS
    //--------------------------------------------------

    riskScaledAllocation: number;
    volatilityAdjustedAllocation: number;
    regimeAdjustedAllocation: number;

    //--------------------------------------------------
    // LIMITERS
    //--------------------------------------------------

    maxAllowedAllocation: number;
    allocationCapped: boolean;

    //--------------------------------------------------
    // QUALITY METRICS
    //--------------------------------------------------

    allocationEfficiency: number;
    confidenceWeightedAllocation: number;
}

//======================================================
// ALLOCATION ENGINE
//======================================================

export class AllocationEngine {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    private static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // BASE WEIGHT
    //--------------------------------------------------

    private static baseWeight(input: AllocationInput): number {

        let weight = 0.5;
        if (input.portfolio.portfolioScore >= 70) weight += 0.2;
        if (input.portfolio.risk.riskScore <= 40) weight += 0.2;
        if (input.aiConfidence.aiConfidence >= 70) weight += 0.2;
        if (input.aiConfidence.aiConfidence <= 40) weight -= 0.2;
        return this.clamp(weight, 0.1, 1);
    }

    //--------------------------------------------------
    // REGIME MULTIPLIER
    //--------------------------------------------------

    private static regimeMultiplier(regime: MarketRegime): number {
    
        switch (regime) {
            case MarketRegime.TRENDING:
                return 1.2;
            case MarketRegime.BREAKOUT:
                return 1.3;
            case MarketRegime.REVERSAL:
                return 0.8;
            case MarketRegime.RANGING:
                return 0.6;
            default:
                return 1;
        }
    }
	
	//--------------------------------------------------
    // VOLATILITY SCALING
    //--------------------------------------------------
    
    private static volatilityScale(volatility: number): number {
        if (volatility > 2) return 0.6;
        if (volatility > 1) return 0.8;
        return 1;
    }

//--------------------------------------------------
// FINAL ALLOCATION
//--------------------------------------------------

    static evaluate(
        input: AllocationInput
    ): AllocationResult {
        const baseWeight =
            this.baseWeight(input);
        const regimeFactor =
            this.regimeMultiplier(
                input.marketRegime
            );
        const volatilityFactor =
            this.volatilityScale(
                input.volatility
            );
    
        //--------------------------------------------------
        // ALLOCATION
        //--------------------------------------------------

        const allocationWeight =
            this.clamp(
                baseWeight *
                regimeFactor *
                volatilityFactor,
                0.05,
                1
            );
	    
        const maxAllowedAllocation =
            input.accountEquity * 0.25;
	    
        const allocatedCapital =
            input.accountEquity *
            allocationWeight;
	    
        const adjustedPositionSize =
            allocatedCapital /
            input.price;
	    
        const leverageFactor =
            input.portfolio.risk.riskAllowed
                ? 1
                : 0.5;
	    
        //--------------------------------------------------
        // RISK ADJUSTMENTS
        //--------------------------------------------------

        const riskScaledAllocation =
            allocationWeight *
            (1 - input.portfolio.risk.riskScore / 100);
	    
        const volatilityAdjustedAllocation =
            allocationWeight *
            volatilityFactor;
	    
        const regimeAdjustedAllocation =
            allocationWeight *
            regimeFactor;

        //--------------------------------------------------
        // LIMIT CHECK
        //--------------------------------------------------

        const allocationCapped =
            allocatedCapital >
            maxAllowedAllocation;

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        const allocationEfficiency =
            (
                input.aiConfidence.executionConfidence +
                input.portfolio.portfolioScore
            ) / 2;
	    
        const confidenceWeightedAllocation =
            allocationWeight *
            (input.aiConfidence.aiConfidence / 100);
	    
        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {
	    
            allocatedCapital,
            allocationWeight,
            adjustedPositionSize,
            leverageFactor,
            riskScaledAllocation,
            volatilityAdjustedAllocation,
            regimeAdjustedAllocation,
            maxAllowedAllocation,
            allocationCapped,
            allocationEfficiency,
            confidenceWeightedAllocation
        };
    }
}

