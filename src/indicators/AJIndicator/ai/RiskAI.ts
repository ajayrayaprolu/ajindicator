//======================================================
// src/runtime/ai/RiskAI.ts : // Phase 12 AI Layer
// Risk Intelligence Engine (Adaptive Risk Scoring)
//======================================================

import type { PortfolioEngineResult } from "../../../runtime/portfolio/PortfolioEngine";
import type { RiskEngineResult } from "../../../runtime/portfolio/RiskEngine";
import type { ExposureEngineResult } from "../../../runtime/portfolio/ExposureEngine";

//======================================================
// RISK AI RESULT
//======================================================

export interface RiskAIResult {

    riskScoreAI: number;
    volatilityStress: number;
    drawdownRisk: number;
    exposureRiskAI: number;
    correlationStress: number;
    liquidityRisk: number;
    riskRegime: "SAFE" | "CONTROLLED" | "WARNING" | "DANGEROUS";
    riskAdjustedAllowed: boolean;
}

//======================================================
// RISK AI ENGINE
//======================================================

export class RiskAI {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // VOLATILITY STRESS MODEL
    //--------------------------------------------------

    protected static volatilityStress(
        portfolio: PortfolioEngineResult
    ): number {
        const base = portfolio.exposure.exposureRisk ?? 0;
        const risk = portfolio.risk.riskScore ?? 0;
        return this.clamp((base * 0.6) + (risk * 0.4), 0, 100);
    }

    //--------------------------------------------------
    // DRAWDOWN RISK MODEL
    //--------------------------------------------------

    protected static drawdownRisk(
        risk: RiskEngineResult
    ): number {
        const dd = risk.drawdownRisk ?? 0;
        const utilization = risk.portfolioRisk ?? 0;
        return this.clamp((dd * 0.7) + (utilization * 0.3), 0, 100);
    }

    //--------------------------------------------------
    // CORRELATION STRESS MODEL
    //--------------------------------------------------

    protected static correlationStress(
        exposure: ExposureEngineResult
    ): number {
        return this.clamp(
            exposure.concentrationExposure * 0.5 +
            exposure.exposureRisk * 0.5,
            0,
            100
        );
    }

    //--------------------------------------------------
    // LIQUIDITY RISK MODEL (placeholder institutional proxy)
    //--------------------------------------------------

    protected static liquidityRisk(
        portfolio: PortfolioEngineResult
    ): number {
        const exposure = portfolio.exposure.totalExposure ?? 0;
        const position = portfolio.positionSizing.riskUtilization ?? 0;
        return this.clamp((exposure + position) / 2, 0, 100);
    }

    //--------------------------------------------------
    // MAIN ENGINE (Part 2 expands decision logic)
    //--------------------------------------------------

    static evaluate(
        portfolio: PortfolioEngineResult,
        risk: RiskEngineResult,
        exposure: ExposureEngineResult
    ): RiskAIResult {

        const volatilityStress = this.volatilityStress(portfolio);
        const drawdownRisk = this.drawdownRisk(risk);
        const correlationStress = this.correlationStress(exposure);
        const liquidityRisk = this.liquidityRisk(portfolio);

        //--------------------------------------------------
        // COMPOSITE RISK SCORE
        //--------------------------------------------------

        const riskScoreAI =
            this.clamp(
                (volatilityStress * 0.30) +
                (drawdownRisk * 0.30) +
                (correlationStress * 0.25) +
                (liquidityRisk * 0.15),
                0,
                100
            );

        //--------------------------------------------------
        // RISK REGIME (Part 2 refinement)
        //--------------------------------------------------

        const riskRegime =
            riskScoreAI < 30 ? "SAFE" :
            riskScoreAI < 55 ? "CONTROLLED" :
            riskScoreAI < 75 ? "WARNING" :
            "DANGEROUS";

        //--------------------------------------------------
        // GATE (placeholder, finalized in Part 2)
        //--------------------------------------------------

        const riskAdjustedAllowed = riskScoreAI < 80;

        return {
            riskScoreAI,
            volatilityStress,
            drawdownRisk,
            exposureRiskAI: exposure.exposureRisk,
            correlationStress,
            liquidityRisk,
            riskRegime,
            riskAdjustedAllowed
        };
    }
}

//======================================================
// RiskAI.ts — Part 2
// Institutional Risk Gating Layer + Hard Safety Filters
//======================================================
//======================================================
// EXTENDED ENGINE
//======================================================

export class RiskAIExtended extends RiskAI {

    //--------------------------------------------------
    // HARD RISK OVERRIDE
    //--------------------------------------------------

    private static hardRiskOverride(
        riskScoreAI: number,
        drawdownRisk: number,
        liquidityRisk: number
    ): boolean {

        return (
            riskScoreAI > 85 ||
            drawdownRisk > 80 ||
            liquidityRisk > 90
        );
    }

    //--------------------------------------------------
    // FINAL GATE
    //--------------------------------------------------

    static override evaluate(
        portfolio: any,
        risk: any,
        exposure: any
    ) {

        const base = super.evaluate(portfolio, risk, exposure);

        //--------------------------------------------------
        // HARD OVERRIDE CHECK
        //--------------------------------------------------

        const blocked =
            this.hardRiskOverride(
                base.riskScoreAI,
                base.drawdownRisk,
                base.liquidityRisk
            );

        //--------------------------------------------------
        // FINAL ADJUSTED GATE
        //--------------------------------------------------

        const riskAdjustedAllowed =
            !blocked &&
            base.riskScoreAI < 80 &&
            base.riskRegime !== "DANGEROUS" &&
            exposure.allowedExposure !== false;

        //--------------------------------------------------
        // FINAL RECLASSIFICATION
        //--------------------------------------------------

        const riskRegime =
            blocked ? "DANGEROUS" : base.riskRegime;

        return {
            ...base,
            riskAdjustedAllowed,
            riskRegime
        };
    }
}
