//=========================================
//src/runtime/portfolio/PortfolioEngine.ts
// (Phase 12 Portfolio Orchestrator Core)
// It does not compute risk or sizing itself — it orchestrates://RiskEngine (risk gating)// AllocationEngine (capital distribution)
// PositionSizing (position sizing)// Think of this as the portfolio decision compiler.
//======================================================
// PortfolioEngine.ts — Part 1
// Phase 12 Portfolio Core
// Institutional Portfolio Aggregation Engine
//======================================================

import type { PortfolioContext } from "./PortfolioTypes";
import type { AllocationSignal } from "./AllocationTypes";

import type { RiskEngineResult } from "./RiskEngine";
import type { ExposureEngineResult } from "./ExposureEngine";
import type { CorrelationEngineResult } from "./CorrelationEngine";
import type { PositionSizingResult } from "./PositionSizing";

//======================================================
// PORTFOLIO RESULT
//======================================================

export interface PortfolioEngineResult {
    portfolioScore: number;
    risk: RiskEngineResult;
    exposure: ExposureEngineResult;
    correlation: CorrelationEngineResult;
    positionSizing: PositionSizingResult;
    allocationEfficiency: number;
    capitalEfficiency: number;
    diversificationScore: number;
    safetyScore: number;
    executionEligibility: boolean;
}

//======================================================
// PORTFOLIO ENGINE
//======================================================

export class PortfolioEngine {

    //--------------------------------------------------
    // CLAMP UTILITY
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // RISK WEIGHTING MODEL
    //--------------------------------------------------

    protected static riskWeight(
        risk: RiskEngineResult
    ): number {

        return this.clamp(
            100 - risk.riskScore,
            0,
            100
        );
    }

    //--------------------------------------------------
    // EXPOSURE WEIGHTING MODEL
    //--------------------------------------------------

    protected static exposureWeight(
        exposure: ExposureEngineResult
    ): number {

        return this.clamp(
            100 - exposure.exposureRisk,
            0,
            100
        );
    }

    //--------------------------------------------------
    // CORRELATION WEIGHTING MODEL
    //--------------------------------------------------

    protected static correlationWeight(
        corr: CorrelationEngineResult
    ): number {

        return this.clamp(
            100 - corr.correlationRisk,
            0,
            100
        );
    }

    //--------------------------------------------------
    // POSITION QUALITY SCORE
    //--------------------------------------------------

    protected static positionWeight(
        position: PositionSizingResult
    ): number {

        return this.clamp(
            100 - position.riskUtilization,
            0,
            100
        );
    }
	
    //--------------------------------------------------
    // DIVERSIFICATION SCORE
    //--------------------------------------------------
    
    protected static diversificationScore(
        exposure: ExposureEngineResult,
        correlation: CorrelationEngineResult
    ): number {
    
        const score =
            (100 - exposure.exposureRisk) * 0.5 +
            (100 - correlation.correlationRisk) * 0.5;
    
        return this.clamp(score,0,100);
    }
    
    //--------------------------------------------------
    // CAPITAL EFFICIENCY
    //--------------------------------------------------
    
    protected static capitalEfficiency(
        position: PositionSizingResult,
        exposure: ExposureEngineResult
    ): number {
    
        const value =
            (position.finalPositionSize /
            ((exposure.totalExposure ?? 0)+1))*100;
    
        return this.clamp(value,0,100);
    }
    
    //--------------------------------------------------
    // SAFETY SCORE
    //--------------------------------------------------
    
    protected static safetyScore(
        risk: RiskEngineResult,
        exposure: ExposureEngineResult,
        correlation: CorrelationEngineResult
    ): number {
        return this.clamp(
            (100-risk.riskScore)*0.4+
            (100-exposure.exposureRisk)*0.3+
            (100-correlation.correlationRisk)*0.3,
            0,
            100
        );
    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        _context: PortfolioContext,
        _signal: AllocationSignal,
        risk: RiskEngineResult,
        exposure: ExposureEngineResult,
        correlation: CorrelationEngineResult,
        position: PositionSizingResult
    ): PortfolioEngineResult {
    
        const riskW = this.riskWeight(risk);
        const exposureW = this.exposureWeight(exposure);
        const corrW = this.correlationWeight(correlation);
        const positionW = this.positionWeight(position);
    
        const portfolioScore =
            this.clamp(
                riskW * 0.30 +
                exposureW * 0.25 +
                corrW * 0.25 +
                positionW * 0.20,
                0,
                100
            );
    
        const diversificationScore=
        this.diversificationScore(
            exposure,
            correlation
        );
        
        const capitalEfficiency=
        this.capitalEfficiency(
            position,
            exposure
        );
        
        const safetyScore=
        this.safetyScore(
            risk,
            exposure,
            correlation
        );
        
        const executionEligibility=
        portfolioScore>=60&&
        safetyScore>=55&&
        risk.riskAllowed&&
        (exposure.allowedExposure??true)&&
        (correlation.isDiversified??true);
	    
        const allocationEfficiency=
        this.clamp(
	    	portfolioScore*0.5+
	    	capitalEfficiency*0.3+
	    	safetyScore*0.2,
	    	0,
	    	100
	    );
        
        return{
        portfolioScore,
        risk,
        exposure,
        correlation,
        positionSizing:position,
        allocationEfficiency,
        capitalEfficiency,
        diversificationScore,
        safetyScore,
        executionEligibility
        };
    }
}

