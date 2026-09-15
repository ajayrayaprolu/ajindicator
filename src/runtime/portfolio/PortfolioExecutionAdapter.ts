//======================================================
// PortfolioExecutionAdapter.ts: .\src\runtime\portfolio\PortfolioExecutionAdapter.ts
// Phase 12 Bridge Layer // Portfolio → ExecutionOptimizer Contract Adapter
//======================================================

import type { PortfolioEngineResult } from "../portfolio/PortfolioEngine";
import type { PortfolioAIResult } from "../../indicators/AJIndicator/ai/PortfolioAI";
import type { AllocationAIResult } from "../../indicators/AJIndicator/ai/AllocationAI";
import type { RiskAIResult } from "../../indicators/AJIndicator/ai/RiskAI";

//======================================================
// EXECUTION CONTRACT TYPE (Normalized Output)
//======================================================

export interface ExecutionPortfolioContract {
    //--------------------------------------------------
    // CORE RISK FIELDS (ExecutionOptimizer expects these)
    //--------------------------------------------------
    riskAllowed: boolean;
    exposure: number;
    maxPositionSize: number;
    positionRisk: number;
    correlationRisk: number;
    dailyRiskUsed: number;
    riskScore: number;

    //--------------------------------------------------
    // AI AUGMENTED FIELDS (optional but useful)
    //--------------------------------------------------
    portfolioScore: number;
    safetyScore: number;
    executionEligibility: boolean;
}

//======================================================
// PORTFOLIO EXECUTION ADAPTER
//======================================================

export class PortfolioExecutionAdapter {
    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------
    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    
	//--------------------------------------------------
    // HARD SAFETY CHECK
    //--------------------------------------------------
    
    protected static hardSafetyBlock(
        exposure: number,
        riskScore: number,
        correlationRisk: number
    ): boolean {
    
        return (
            exposure >= 90 ||
            riskScore >= 85 ||
            correlationRisk >= 90
        );
    }
    
    //--------------------------------------------------
    // EXECUTION SCORE
    //--------------------------------------------------
    
    protected static executionScore(
        contract: ExecutionPortfolioContract
    ): number {
    
        return this.clamp(
            (100 - contract.riskScore) * 0.4 +
            (100 - contract.exposure) * 0.3 +
            (contract.safetyScore * 0.3),
            0,
            100
        );
    }
	
    //--------------------------------------------------
    // CORE MAPPER
    //--------------------------------------------------
    static adapt(
        portfolio: PortfolioEngineResult,
        _portfolioAI: PortfolioAIResult,
        allocationAI: AllocationAIResult,
        riskAI: RiskAIResult
    ): ExecutionPortfolioContract & {
        executionScore: number;
    } {
    
        const riskAllowed =
            portfolio.executionEligibility &&
            riskAI.riskAdjustedAllowed &&
            allocationAI.executionAllowed;
    
        const exposure =
            this.clamp(
                portfolio.exposure.exposureRisk,
                0,
                100
            );
    
        const maxPositionSize =
            this.clamp(
                portfolio.positionSizing.finalPositionSize ?? 0,
                0,
                100
            );
    
        const positionRisk =
            this.clamp(
                portfolio.positionSizing.riskUtilization ?? 0,
                0,
                100
            );
    
        const correlationRisk =
            this.clamp(
                portfolio.correlation.correlationRisk ?? 50,
                0,
                100
            );
    
        const dailyRiskUsed =
            this.clamp(
                riskAI.drawdownRisk ?? 0,
                0,
                100
            );
    
        const riskScore =
            this.clamp(
                riskAI.riskScoreAI,
                0,
                100
            );
    
        const base: ExecutionPortfolioContract = {
    
            riskAllowed,
            exposure,
            maxPositionSize,
            positionRisk,
            correlationRisk,
            dailyRiskUsed,
            riskScore,
            portfolioScore: portfolio.portfolioScore,
            safetyScore: portfolio.safetyScore,
			executionEligibility: portfolio.executionEligibility
        };
    
        const blocked =
            this.hardSafetyBlock(
                base.exposure,
                base.riskScore,
                base.correlationRisk
            );
    
        const executionScore =
            this.executionScore(base);
    
        return {
            ...base,
            executionScore,
            riskAllowed:
                !blocked &&
                base.riskAllowed &&
                executionScore >= 55
        };
    }
}