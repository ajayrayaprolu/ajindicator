//=====================================================================================
// src/runtime/portfolio/RiskEngine.ts : RiskEngine.ts — (Phase 12 Portfolio Risk Core)
// This is the foundation layer that: // aggregates portfolio risk signals // applies regime-aware risk caps // prepares inputs for PositionSizing + AllocationEngine
// acts as the central risk gate for Phase 12 
//======================================================
// RiskEngine.ts
// Institutional Risk Computation Layer
//======================================================

import type { PortfolioContext } from "./PortfolioTypes";
import type { PositionSizingResult } from "./PositionSizing";
import type { AllocationSignal } from "./AllocationTypes";

//======================================================
// RISK RESULT
//======================================================

export interface RiskEngineResult {
    riskScore: number;
    maxRiskAllowed: number;
    positionRisk: number;
    portfolioRisk: number;
    volatilityRisk: number;
    exposureRisk: number;
    drawdownRisk: number;
    riskAllowed: boolean;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

//======================================================
// RISK ENGINE
//======================================================

export class RiskEngine {

    //--------------------------------------------------
    // CLAMP UTILITY
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // VOLATILITY RISK
    //--------------------------------------------------

    protected static volatilityRisk(atr: number): number {
        if (atr <= 1) return 20;
        if (atr <= 2) return 40;
        if (atr <= 3) return 60;
        return 80;
    }

    //--------------------------------------------------
    // EXPOSURE RISK
    //--------------------------------------------------

    protected static exposureRisk(exposure: number): number {
        return this.clamp(exposure, 0, 100);
    }

    //--------------------------------------------------
    // DRAWDOWN RISK (placeholder model)
    //--------------------------------------------------

    protected static drawdownRisk(context: PortfolioContext): number {
        const dd = context.currentDrawdown ?? 0;
        if (dd <= 5) return 10;
        if (dd <= 10) return 30;
        if (dd <= 15) return 60;
        return 90;
    }

    //--------------------------------------------------
    // POSITION RISK
    //--------------------------------------------------

    protected static positionRisk(positionSize: number, maxSize: number): number {
        if (maxSize <= 0) return 100;
        return this.clamp((positionSize / maxSize) * 100, 0, 100);
    }

    //--------------------------------------------------
    // BASE RISK SCORE
    //--------------------------------------------------

    protected static baseRiskScore(
        volatility: number,
        exposure: number,
        drawdown: number,
        position: number
    ): number {

        return this.clamp(
            (volatility * 0.3) +
            (exposure * 0.25) +
            (drawdown * 0.25) +
            (position * 0.2),
            0,
            100
        );

    }

    //--------------------------------------------------
    // RISK LEVEL CLASSIFICATION
    //--------------------------------------------------

    protected static classifyRisk(
        score: number
    ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
        if (score <= 25) return "LOW";
        if (score <= 50) return "MEDIUM";
        if (score <= 75) return "HIGH";
        return "CRITICAL";
    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------
    
    static evaluate(
        context: PortfolioContext,
        sizing: PositionSizingResult,
        _signal: AllocationSignal
    ): RiskEngineResult {
	
    //--------------------------------------------------
    // BASE METRICS
    //--------------------------------------------------
	
        const volatilityRisk =
            this.volatilityRisk(
                context.atr ?? 1
            );
	    
        const exposureRisk =
            this.exposureRisk(
                context.exposure ?? 0
            );
	    
        const drawdownRisk =
            this.drawdownRisk(
                context
            );
	    
        const positionRisk =
            this.positionRisk(
                sizing.finalPositionSize,
                sizing.maxAllowedSize ?? 100
            );
	    
        //--------------------------------------------------
        // BASE SCORE
        //--------------------------------------------------
	    
        let riskScore =
            this.baseRiskScore(
                volatilityRisk,
                exposureRisk,
                drawdownRisk,
                positionRisk
            );
	    
        //--------------------------------------------------
        // HARD LIMITS
        //--------------------------------------------------
	    
        const overExposure =
            (context.exposure ?? 0) >
            (context.maxExposureLimit ?? 100);
	    
        const highDrawdown =
        (context.currentDrawdown ?? 0) >
        (
            context.maxDrawdownLimit ??
            context.maxDrawdown
        );

        const extremeVolatility =
            (context.atr ?? 0) >
            (context.maxAtrLimit ?? 5);
	    
        const positionTooLarge =
            positionRisk > 85;
	    
        //--------------------------------------------------
        // ADJUSTMENTS
        //--------------------------------------------------
	    
        if (overExposure)
            riskScore += 20;
        if (highDrawdown)
            riskScore += 25;
        if (extremeVolatility)
            riskScore += 15;
        if (positionTooLarge)
            riskScore += 20;
        riskScore =
            this.clamp(
                riskScore,
                0,
                100
            );
	    
        //--------------------------------------------------
        // CLASSIFICATION
        //--------------------------------------------------

        const riskLevel =
            this.classifyRisk(
                riskScore
            );

        //--------------------------------------------------
        // GATE
        //--------------------------------------------------
	    
        const riskAllowed =
            riskScore < 75 &&
            !overExposure &&
            !highDrawdown &&
            !extremeVolatility;
	    
        //--------------------------------------------------
        // MAX RISK
        //--------------------------------------------------
	    
        const maxRiskAllowed =
            riskLevel === "CRITICAL"
                ? 30
                : riskLevel === "HIGH"
                ? 50
                : riskLevel === "MEDIUM"
                ? 70
                : 100;
	    
        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------
	    
        return {
            riskScore,
            maxRiskAllowed,
            positionRisk,
            portfolioRisk: exposureRisk,
            volatilityRisk,
            exposureRisk,
            drawdownRisk,
            riskAllowed,
            riskLevel
	    
        };
    }
}

