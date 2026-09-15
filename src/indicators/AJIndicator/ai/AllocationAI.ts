//======================================================
// AllocationAI.ts — Part 1
// Phase 12 AI Layer
// Allocation Decision Intelligence Engine
//======================================================

import type { PortfolioEngineResult } from "../../../runtime/portfolio/PortfolioEngine";
import type { PortfolioAIResult } from "./PortfolioAI";
import type { AllocationSignal } from "../../../runtime/portfolio/AllocationTypes";

//======================================================
// ALLOCATION AI RESULT
//======================================================

export interface AllocationAIResult {

    allocationScore: number;

    capitalAllocationPct: number;

    positionScalingFactor: number;

    riskAdjustedSize: number;

    diversificationFactor: number;

    allocationMode: "FULL" | "PARTIAL" | "MINIMAL" | "BLOCKED";

    executionAllowed: boolean;

}

//======================================================
// ALLOCATION AI ENGINE
//======================================================

export class AllocationAI {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // BASE ALLOCATION SCORE
    //--------------------------------------------------

    protected static baseScore(
        portfolio: PortfolioEngineResult,
        portfolioAI: PortfolioAIResult
    ): number {

        const score =
            portfolio.portfolioScore * 0.4 +
            portfolioAI.convictionScore * 0.3 +
            portfolioAI.portfolioHealthScore * 0.3;

        return this.clamp(score, 0, 100);
    }

    //--------------------------------------------------
    // CAPITAL ALLOCATION MODEL
    //--------------------------------------------------

    protected static capitalAllocation(
        portfolioAI: PortfolioAIResult
    ): number {

        const biasMultiplier =
            portfolioAI.allocationBias === "AGGRESSIVE" ? 0.95 :
            portfolioAI.allocationBias === "MODERATE" ? 0.70 :
            portfolioAI.allocationBias === "CONSERVATIVE" ? 0.45 :
            0.20;

        return this.clamp(
            portfolioAI.capitalDeployment * biasMultiplier,
            0,
            100
        );
    }

    //--------------------------------------------------
    // POSITION SCALING MODEL
    //--------------------------------------------------

    protected static positionScaling(
        portfolio: PortfolioEngineResult,
        portfolioAI: PortfolioAIResult
    ): number {

        const base =
            portfolio.executionEligibility ? 1.0 : 0.5;

        const riskPenalty =
            portfolioAI.riskAppetite / 100;

        return this.clamp(base * riskPenalty, 0, 1.5);
    }

    //--------------------------------------------------
    // MAIN ENGINE (Part 2 expands gating logic)
    //--------------------------------------------------

    static evaluate(
        portfolio: PortfolioEngineResult,
        portfolioAI: PortfolioAIResult,
        _signal: AllocationSignal
    ): AllocationAIResult {

        const allocationScore =
            this.baseScore(portfolio, portfolioAI);

        const capitalAllocationPct =
            this.capitalAllocation(portfolioAI);

        const positionScalingFactor =
            this.positionScaling(portfolio, portfolioAI);

        //--------------------------------------------------
        // PLACEHOLDER METRICS (Part 2)
        //--------------------------------------------------

        const riskAdjustedSize = 0;

        const diversificationFactor = 0;

        const allocationMode = "BLOCKED";

        const executionAllowed = false;

        return {
            allocationScore,
            capitalAllocationPct,
            positionScalingFactor,
            riskAdjustedSize,
            diversificationFactor,
            allocationMode,
            executionAllowed
        };
    }
}
//======================================================
// AllocationAI.ts — Part 2
// Institutional Allocation Control Layer
//======================================================
//======================================================
// EXTENDED ENGINE
//======================================================

export class AllocationAIExtended extends AllocationAI {

    //--------------------------------------------------
    // RISK-ADJUSTED SIZE MODEL
    //--------------------------------------------------

    private static riskAdjustedSize(
        capitalPct: number,
        scaling: number,
        riskAppetite: number
    ): number {

        return this.clamp(
            capitalPct * scaling * (riskAppetite / 100),
            0,
            100
        );
    }

    //--------------------------------------------------
    // DIVERSIFICATION FACTOR
    //--------------------------------------------------

    private static diversificationFactor(
        portfolio: any,
        portfolioAI: any
    ): number {

        const exposure = portfolio.exposure.exposureRisk ?? 0;
        const corr = portfolioAI.diversificationPreference ?? 50;

        return this.clamp(
            (100 - exposure) * 0.5 +
            corr * 0.5,
            0,
            100
        );
    }

    //--------------------------------------------------
    // ALLOCATION MODE CLASSIFIER
    //--------------------------------------------------

    private static allocationMode(
        score: number,
        risk: number,
        allowed: boolean
    ): AllocationAIResult["allocationMode"] {

        if (!allowed) return "BLOCKED";

        if (score >= 75 && risk >= 60) return "FULL";

        if (score >= 55) return "PARTIAL";

        if (score >= 35) return "MINIMAL";

        return "BLOCKED";
    }

    //--------------------------------------------------
    // FINAL EVALUATION
    //--------------------------------------------------

    static override evaluate(
        portfolio: any,
        portfolioAI: any,
        signal: any
    ) {

        const base = super.evaluate(portfolio, portfolioAI, signal);

        //--------------------------------------------------
        // FINAL METRICS
        //--------------------------------------------------

        const riskAdjustedSize =
            this.riskAdjustedSize(
                base.capitalAllocationPct,
                base.positionScalingFactor,
                portfolioAI.riskAppetite
            );

        const diversificationFactor =
            this.diversificationFactor(portfolio, portfolioAI);

        //--------------------------------------------------
        // FINAL GATE CONDITIONS
        //--------------------------------------------------

        const executionAllowed =
            base.allocationScore >= 55 &&
            portfolioAI.aiAllocationAllowed &&
            diversificationFactor >= 50;

        const allocationMode =
            this.allocationMode(
                base.allocationScore,
                portfolioAI.riskAppetite,
                executionAllowed
            );

        return {
            ...base,
            riskAdjustedSize,
            diversificationFactor,
            allocationMode,
            executionAllowed
        };
    }
}
