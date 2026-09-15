//======================================================
// \src\runtime\portfolio\ExposureEngine.ts 
// Phase 12 Portfolio Intelligence Layer
// Exposure & Capital Concentration Engine
//======================================================

import type { PortfolioContext } from "./PortfolioTypes";
import type { AllocationSignal } from "./AllocationTypes";

//======================================================
// EXPOSURE RESULT
//======================================================

export interface ExposureEngineResult {
    totalExposure: number;
    sectorExposure: Record<string, number>;
    symbolExposure: number;
    leverageExposure: number;
    concentrationExposure: number;
    exposureRisk: number;
    allowedExposure: boolean;
    exposureLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
}

//======================================================
// EXPOSURE ENGINE
//======================================================

export class ExposureEngine {

    //--------------------------------------------------
    // CLAMP UTILITY
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // BASE EXPOSURE CALCULATION
    //--------------------------------------------------

    protected static calculateBaseExposure(
        context: PortfolioContext
    ): number {

        const capital = context.totalCapital ?? 0;
        const deployed = context.deployedCapital ?? 0;

        if (capital <= 0) return 0;

        return (deployed / capital) * 100;
    }

    //--------------------------------------------------
    // SECTOR EXPOSURE
    //--------------------------------------------------

    protected static calculateSectorExposure(
        context: PortfolioContext
    ): Record<string, number> {

        const sectors = context.sectorWeights ?? {
            TECH: 20,
            BANKING: 20,
            ENERGY: 15,
            PHARMA: 10,
            METALS: 15,
            AUTO: 20
        };

        const exposure: Record<string, number> = {};

        for (const s in sectors) {
            exposure[s] = this.clamp(sectors[s], 0, 100);
        }

        return exposure;
    }

    //--------------------------------------------------
    // SYMBOL EXPOSURE
    //--------------------------------------------------

    protected static calculateSymbolExposure(
        signal: AllocationSignal
    ): number {

        return this.clamp(signal.positionSizePct ?? 0, 0, 100);
    }

    //--------------------------------------------------
    // LEVERAGE EXPOSURE
    //--------------------------------------------------

    protected static calculateLeverageExposure(
        context: PortfolioContext
    ): number {

        const leverage = context.leverage ?? 1;

        return this.clamp((leverage - 1) * 50, 0, 100);
    }

    //--------------------------------------------------
    // HARD LIMIT CHECKS
    //--------------------------------------------------
    
    protected static applyHardLimits(
        exposureRisk: number,
        totalExposure: number,
        leverageExposure: number
    ): number {
    
        let adjusted = exposureRisk;
    
        if (totalExposure > 85)
            adjusted += 20;
    
        if (leverageExposure > 70)
            adjusted += 15;
    
        if (totalExposure > 95)
            adjusted += 30;
    
        return this.clamp(
            adjusted,
            0,
            100
        );
    }

    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        context: PortfolioContext,
        signal: AllocationSignal
    ): ExposureEngineResult {
    
        const totalExposure =
            this.calculateBaseExposure(context);
    
        const sectorExposure =
            this.calculateSectorExposure(context);
    
        const symbolExposure =
            this.calculateSymbolExposure(signal);
    
        const leverageExposure =
            this.calculateLeverageExposure(context);
    
        const concentrationExposure =
            Math.max(
                symbolExposure,
                leverageExposure
            );
    
        let exposureRisk =
            this.clamp(
                (totalExposure * 0.4) +
                (concentrationExposure * 0.4) +
                (symbolExposure * 0.2),
                0,
                100
            );
    
        exposureRisk =
            this.applyHardLimits(
                exposureRisk,
                totalExposure,
                leverageExposure
            );
    
        const allowedExposure =
            exposureRisk < 80 &&
            totalExposure < 95 &&
            leverageExposure < 90;
    
        const exposureLevel:
            "LOW" | "MEDIUM" | "HIGH" | "EXTREME" =
            exposureRisk < 30
                ? "LOW"
                : exposureRisk < 55
                ? "MEDIUM"
                : exposureRisk < 75
                ? "HIGH"
                : "EXTREME";
    
        return {
            totalExposure,
            sectorExposure,
            symbolExposure,
            leverageExposure,
            concentrationExposure,
            exposureRisk,
            allowedExposure,
            exposureLevel
        };
    }
}
