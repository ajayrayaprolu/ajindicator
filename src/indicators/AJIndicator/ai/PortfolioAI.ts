//======================================================
// PortfolioAI.ts — Part 1
// Phase 12 AI Layer
// Portfolio Intelligence Engine
// Converts portfolio + risk signals into AI allocation intent
//======================================================

import type { PortfolioEngineResult } from "../../../runtime/portfolio/PortfolioEngine";

import type { AllocationSignal } from "../../../runtime/portfolio/AllocationTypes";

import type { RiskAIResult } from "./RiskAI";
//======================================================
// PORTFOLIO AI RESULT
//======================================================

export interface PortfolioAIResult {

    allocationBias: "AGGRESSIVE" | "MODERATE" | "CONSERVATIVE" | "DEFENSIVE";

    capitalDeployment: number;

    riskAppetite: number;

    diversificationPreference: number;

    convictionScore: number;

    executionPriority: number;

    portfolioHealthScore: number;

    aiAllocationAllowed: boolean;

}

//======================================================
// PORTFOLIO AI ENGINE
//======================================================

export class PortfolioAI {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // PORTFOLIO HEALTH MODEL
    //--------------------------------------------------

    protected static portfolioHealth(
        portfolio: PortfolioEngineResult
    ): number {

        const base =
            portfolio.portfolioScore * 0.5 +
            portfolio.safetyScore * 0.5;

        return this.clamp(base, 0, 100);
    }

    //--------------------------------------------------
    // RISK APPETITE MODEL
    //--------------------------------------------------

    protected static riskAppetite(
        riskAI: RiskAIResult
    ): number {

        return this.clamp(
            100 - riskAI.riskScoreAI,
            0,
            100
        );
    }

    //--------------------------------------------------
    // CONVICTION MODEL
    //--------------------------------------------------

    protected static convictionScore(
        portfolio: PortfolioEngineResult,
        riskAI: RiskAIResult
    ): number {

        const base =
            portfolio.executionEligibility ? 60 : 30;

        const riskBonus =
            riskAI.riskAdjustedAllowed ? 25 : 0;

        const stabilityBonus =
            100 - riskAI.volatilityStress;

        return this.clamp(
            base + riskBonus + (stabilityBonus * 0.2),
            0,
            100
        );
    }

    //--------------------------------------------------
    // ALLOCATION BIAS CLASSIFIER
    //--------------------------------------------------

    protected static allocationBias(
        health: number,
        riskAppetite: number,
        conviction: number
    ): PortfolioAIResult["allocationBias"] {

        const score = (health * 0.4) + (riskAppetite * 0.3) + (conviction * 0.3);

        if (score >= 75) return "AGGRESSIVE";
        if (score >= 55) return "MODERATE";
        if (score >= 35) return "CONSERVATIVE";
        return "DEFENSIVE";
    }

    //--------------------------------------------------
    // MAIN ENGINE (Part 2 expands gating + deployment logic)
    //--------------------------------------------------

    static evaluate(
        portfolio: PortfolioEngineResult,
        riskAI: RiskAIResult,
        _signal: AllocationSignal
    ): PortfolioAIResult {

        const health = this.portfolioHealth(portfolio);

        const riskAppetite = this.riskAppetite(riskAI);

        const conviction = this.convictionScore(portfolio, riskAI);

        const bias = this.allocationBias(health, riskAppetite, conviction);

        //--------------------------------------------------
        // CAPITAL DEPLOYMENT MODEL
        //--------------------------------------------------

        const baseDeployment =
            bias === "AGGRESSIVE" ? 90 :
            bias === "MODERATE" ? 70 :
            bias === "CONSERVATIVE" ? 45 : 20;

        const capitalDeployment =
            this.clamp(
                baseDeployment *
                (conviction / 100),
                0,
                100
            );

        //--------------------------------------------------
        // OTHER METRICS (Part 2 refinement)
        //--------------------------------------------------

        const diversificationPreference = 0;

        const executionPriority = 0;

        const aiAllocationAllowed = false;

        return {
            allocationBias: bias,
            capitalDeployment,
            riskAppetite,
            diversificationPreference,
            convictionScore: conviction,
            executionPriority,
            portfolioHealthScore: health,
            aiAllocationAllowed
        };
    }
}

//======================================================
// PortfolioAI.ts — Part 2
// Institutional Allocation Gate + Deployment Control
//======================================================

//======================================================
// EXTENDED ENGINE
//======================================================

export class PortfolioAIExtended extends PortfolioAI {

    //--------------------------------------------------
    // DIVERSIFICATION MODEL
    //--------------------------------------------------

    private static diversificationPreference(
        portfolio: any,
        riskAI: any
    ): number {

        const base =
            (100 - portfolio.exposure.exposureRisk) * 0.5 +
            (100 - riskAI.correlationStress) * 0.5;

        return this.clamp(base, 0, 100);
    }

    //--------------------------------------------------
    // EXECUTION PRIORITY MODEL
    //--------------------------------------------------

    private static executionPriority(
        conviction: number,
        riskAppetite: number
    ): number {

        return this.clamp(
            (conviction * 0.6) + (riskAppetite * 0.4),
            0,
            100
        );
    }

    //--------------------------------------------------
    // FINAL GATE
    //--------------------------------------------------

    static override evaluate(
        portfolio: any,
        riskAI: any,
        signal: any
    ) {

        const base = super.evaluate(portfolio, riskAI, signal);

        //--------------------------------------------------
        // FINAL METRICS
        //--------------------------------------------------

        const diversificationPreference =
            this.diversificationPreference(portfolio, riskAI);

        const executionPriority =
            this.executionPriority(base.convictionScore, base.riskAppetite);

        //--------------------------------------------------
        // ALLOCATION GATE
        //--------------------------------------------------

        const aiAllocationAllowed =
            base.portfolioHealthScore >= 55 &&
            base.convictionScore >= 50 &&
            riskAI.riskAdjustedAllowed &&
            executionPriority >= 50;

        //--------------------------------------------------
        // FINAL ADJUSTMENT
        //--------------------------------------------------

        return {
            ...base,
            diversificationPreference,
            executionPriority,
            aiAllocationAllowed
        };
    }
}
