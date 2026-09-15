//======================================================================
// This module is the final translation layer in your portfolio stack:
// Allocation (0–1) → Actual position size // It ensures: // capital efficiency // volatility-aware sizing // execution stability // regime-adjusted risk scaling
//======================================================
// PositionSizing.ts — .\src\runtime\portfolio\PositionSizing.ts
// Phase 12 Portfolio Core Position Sizing Engine (Capital → Trade Size Converter)
// Institutional Position Sizing Engine
//======================================================

import type { PortfolioContext } from "./PortfolioTypes";
import type { AllocationSignal } from "./AllocationTypes";
import type { PortfolioEngineResult } from "./PortfolioEngine";

import type { PortfolioAIResult } from "../../indicators/AJIndicator/ai/PortfolioAI";

//======================================================
// POSITION RESULT
//======================================================

export interface PositionSizingResult {
    basePositionSize: number;
    riskAdjustedSize: number;
    finalPositionSize: number;
    riskUtilization: number;
    exposureContribution: number;
    volatilityAdjustment: number;
    confidenceMultiplier: number;
    allowed: boolean;
	maxAllowedSize: number;
}

//======================================================
// POSITION SIZING ENGINE
//======================================================
export class PositionSizing {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------
    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    //--------------------------------------------------
    // BASE SIZE MODEL
    //--------------------------------------------------
    protected static baseSize(
        portfolio: PortfolioEngineResult
    ): number {
        return this.clamp(
            portfolio.portfolioScore * 0.8,
            0,
            100
        );
    }
    //--------------------------------------------------
    // VOLATILITY ADJUSTMENT
    //--------------------------------------------------

    protected static volatilityAdjustment(
        portfolio: PortfolioEngineResult
    ): number {

        const exposureRisk =
            portfolio.exposure.exposureRisk ?? 0;

        return this.clamp(
            1 - (exposureRisk / 100),
            0.2,
            1
        );
    }
    //--------------------------------------------------
    // CONFIDENCE MULTIPLIER
    //--------------------------------------------------
    protected static confidenceMultiplier(
        portfolioAI: PortfolioAIResult
    ): number {
        const conviction =
            portfolioAI.convictionScore ?? 50;
        return this.clamp(
            conviction / 100,
            0.3,
            1.2
        );
    }
	
	//--------------------------------------------------
    // FINAL POSITION CAP
    //--------------------------------------------------
    
    protected static finalCap(
        riskAdjustedSize: number,
        exposure: number
    ): number {
    
        const exposurePenalty =
            1 - (exposure / 100);
    
        return this.clamp(
            riskAdjustedSize * exposurePenalty,
            0,
            100
        );
    }
    
    //--------------------------------------------------
    // RISK UTILIZATION
    //--------------------------------------------------
    
    protected static riskUtilization(
        finalSize: number,
        _portfolio: PortfolioEngineResult
    ): number {
    
        const maxCap = 100;
    
        return this.clamp(
            (finalSize / maxCap) * 100,
            0,
            100
        );
    }
    
    //--------------------------------------------------
    // ALLOWED CHECK
    //--------------------------------------------------
    
    protected static isAllowed(
        finalSize: number,
        riskUtilization: number
    ): boolean {
    
        return (
            finalSize > 0 &&
            riskUtilization < 85
        );
    }
	
    //--------------------------------------------------
    // MAIN ENGINE (Part 2 expands risk gates)
    //--------------------------------------------------
    
    static evaluate(
        _context: PortfolioContext,
        _signal: AllocationSignal,
        portfolio: PortfolioEngineResult,
        portfolioAI: PortfolioAIResult
    ): PositionSizingResult {
    
        const basePositionSize = this.baseSize(portfolio);
        const volatilityAdjustment = this.volatilityAdjustment(portfolio);
        const confidenceMultiplier =  this.confidenceMultiplier(portfolioAI);
        const riskAdjustedSize = this.clamp(basePositionSize * volatilityAdjustment * confidenceMultiplier, 0, 100);
        const finalPositionSize = this.finalCap(riskAdjustedSize, portfolio.exposure.exposureRisk);
		const maxAllowedSize = 100;
        const riskUtilization = this.riskUtilization(finalPositionSize, portfolio);
        const exposureContribution = this.clamp(finalPositionSize * 0.6, 0, 100);
        const allowed = this.isAllowed(finalPositionSize, riskUtilization);
    
        return {
            basePositionSize,
            riskAdjustedSize,
            finalPositionSize,
            maxAllowedSize,
            riskUtilization,
            exposureContribution,
            volatilityAdjustment,
            confidenceMultiplier,
            allowed
        };
    }
}