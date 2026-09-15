//======================================================
// src\runtime\Portfolio\PortfolioRiskEngine.ts
//=======================================================
// Phase 11 module ,which will introduce institutional portfolio-level risk management 
// (risk budget, exposure limits, position sizing, correlation control, daily loss limits, and execution permission)
// while remaining independent of the existing runtime infrastructure. // PortfolioRiskEngine.ts // Part 1: Institutional Portfolio Risk Engine
// Part 2 :Portfolio risk calculation // Dynamic position sizing // Risk approval logic // Institutional recommendations // evaluate() method
// Final PortfolioRiskResult return // Class completion // What changed in Part 1 (important, no fluff) // Clean separation introduced
// Removed hidden coupling risk //AJRuntimeContext //→ Payload //→ Indicator //→ AI Confidence //→ Regime //→ Portfolio Risk //→ Parameter Optimization
//→ Execution Optimization //→ Scheduler //PortfolioRiskEngine (FINAL FIX) //Ensures: //exposure correctness //position sizing correctness //daily risk caps
//correlation proxy safety //Outputs: //→ riskAllowed + maxPositionSize + exposure control

//======================================================
// PortfolioRiskEngine.ts — CORE STRUCTURE + RISK MODEL
// Phase 11 Institutional Portfolio Risk Gate
//======================================================

import type { AJRuntimeContext } from "../../indicators/AJIndicator/AJRuntimeContext";
import type { AJIndicatorResult } from "../../indicators/AJIndicator/AJTypes";
import type { AIConfidenceResult } from "../../indicators/AJIndicator/ai/AIConfidenceEngine";
import type { PortfolioRiskResult } from "./PortfolioRiskResult";

//======================================================
// PORTFOLIO RISK ENGINE
//======================================================

export class PortfolioRiskEngine {

    //--------------------------------------------------
    // CONFIGURATION LIMITS (INSTITUTIONAL DEFAULTS)
    //--------------------------------------------------
    private static readonly MAX_DAILY_RISK = 6;
    private static readonly MAX_POSITION_RISK = 2;
    private static readonly MAX_PORTFOLIO_EXPOSURE = 10;

    //--------------------------------------------------
    // CLAMP UTILITY
    //--------------------------------------------------

    private static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // POSITION RISK (% DISTANCE SL)
    //--------------------------------------------------

    private static calculatePositionRisk(runtime: AJRuntimeContext): number {

        if (runtime.entryPrice <= 0 || runtime.stopLoss <= 0) {
            return 100;
        }
        const risk =
            Math.abs(runtime.entryPrice - runtime.stopLoss) /
            runtime.entryPrice *
            100;
        return this.clamp(risk, 0, 100);
    }

    //--------------------------------------------------
    // PORTFOLIO EXPOSURE MODEL
    //--------------------------------------------------

    private static calculateExposure(runtime: AJRuntimeContext): number {
        const base = runtime.positionSize;
        const normalized =
            (base / 100) * 100;
        return this.clamp(normalized, 0, 100);
    }

    //--------------------------------------------------
    // CORRELATION RISK (INSTITUTIONAL PROXY)
    //--------------------------------------------------

    private static calculateCorrelationRisk(runtime: AJRuntimeContext): number {

        let score = 0;
        if (runtime.aiInstitutionalLong || runtime.aiInstitutionalShort) score += 40;
        if (runtime.mtfAlignment >= 80) score += 30;
        if (runtime.contextConfidence >= 70) score += 30;
        return this.clamp(score, 0, 100);
    }

    //--------------------------------------------------
    // MAIN EVALUATION ENGINE  PART 2 — PORTFOLIO DECISION ENGINE (FINAL)
    //--------------------------------------------------

    static evaluate(
        runtime: AJRuntimeContext,
        _indicator: AJIndicatorResult,
        ai: AIConfidenceResult
    ): PortfolioRiskResult {

        //--------------------------------------------------
        // CORE METRICS
        //--------------------------------------------------

        const positionRisk = this.calculatePositionRisk(runtime);
        const exposure = this.calculateExposure(runtime);
        const correlationRisk = this.calculateCorrelationRisk(runtime);

        //--------------------------------------------------
        // DAILY RISK USAGE (DERIVED)
        //--------------------------------------------------

        const dailyRiskUsed =
            this.clamp(
                exposure * 0.6 + positionRisk * 0.4,
                0,
                100
            );

        //--------------------------------------------------
        // REGIME ADJUSTMENT
        //--------------------------------------------------

        let regimeMultiplier = 1;
        if (ai.aiConfidence >= 80) regimeMultiplier = 0.9;
        if (ai.aiConfidence <= 50) regimeMultiplier = 1.2;
        if (runtime.adxTrend && runtime.emaBull) regimeMultiplier = 0.85;

        //--------------------------------------------------
        // FINAL RISK SCORE
        //--------------------------------------------------

        const portfolioRisk =
            this.clamp(
                (positionRisk * 0.4 +
                    exposure * 0.3 +
                    correlationRisk * 0.3) *
                regimeMultiplier,
                0,
                100
            );

        //--------------------------------------------------
        // RISK LIMIT CHECKS
        //--------------------------------------------------

        const riskAllowed =
            portfolioRisk <= this.MAX_DAILY_RISK * 10 &&
            positionRisk <= this.MAX_POSITION_RISK * 10 &&
            exposure <= this.MAX_PORTFOLIO_EXPOSURE * 10;

        //--------------------------------------------------
        // POSITION SIZING CAP
        //--------------------------------------------------

        const maxPositionSize =
            this.clamp(
                (100 - portfolioRisk) * 0.8,
                5,
                100
            );

        //--------------------------------------------------
        // RECOMMENDED RISK
        //--------------------------------------------------

        const recommendedRisk =
            this.clamp(
                100 - portfolioRisk,
                10,
                80
            );

        //--------------------------------------------------
        // RECOMMENDATION ENGINE
        //--------------------------------------------------

        let recommendation = "ALLOW";
        if (!riskAllowed) recommendation = "REDUCE_POSITION";
        if (portfolioRisk > 80) recommendation = "SKIP_TRADE";
        if (positionRisk > 20) recommendation = "REDUCE_POSITION";

        //--------------------------------------------------
        // FINAL RESULT
        //--------------------------------------------------

        const result: PortfolioRiskResult = {
            riskAllowed,
            portfolioRisk,
            positionRisk,
            recommendedRisk,
            maxPositionSize,
            dailyRiskUsed,
            exposure,
            correlationRisk,
            recommendation
        };

        return result;
    }

}

