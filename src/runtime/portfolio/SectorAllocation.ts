//======================================================
// SectorAllocation.ts — .\src\runtime\portfolio\SectorAllocation.ts
// Phase 12 Portfolio Core Layer: // Sector-Level Capital Allocation Engine
//======================================================

import type { PortfolioContext } from "./PortfolioTypes";
import type { AllocationSignal } from "./AllocationTypes";

//======================================================
// SECTOR ALLOCATION RESULT
//======================================================

export interface SectorAllocationResult {
    sectorExposure: Record<string, number>;
    sectorRiskScore: Record<string, number>;
    allowedSectors: string[];
    restrictedSectors: string[];
    concentrationRisk: number;
    diversificationScore: number;
}

//======================================================
// SECTOR ALLOCATION ENGINE
//======================================================

export class SectorAllocationEngine {

    //--------------------------------------------------
    // CLAMP UTILITY
    //--------------------------------------------------
    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    //--------------------------------------------------
    // SECTOR RISK BASELINE
    //--------------------------------------------------

    protected static getSectorRisk(sector: string): number {

        switch (sector) {
            case "TECH":
                return 70;
            case "BANKING":
                return 60;
            case "ENERGY":
                return 55;
            case "PHARMA":
                return 45;
            case "METALS":
                return 65;
            case "AUTO":
                return 50;
            default:
                return 50;
        }
    }

    //--------------------------------------------------
    // CORE ALLOCATION ENGINE (will expand in Part 2)
    //--------------------------------------------------

    static evaluate(
        context: PortfolioContext,
        signal: AllocationSignal
    ): SectorAllocationResult {
    
        const sectors =
            (context as any).sectorWeights ?? {
                TECH: 20,
                BANKING: 15,
                ENERGY: 10,
                PHARMA: 10,
                METALS: 10,
                AUTO: 10,
                OTHERS: 25
            };
    
        const strength =
            (signal as any).allocationStrength ?? 1;
    
        const sectorExposure: Record<string, number> = {};
        const sectorRiskScore: Record<string, number> = {};
    
        let totalExposure = 0;
    
        for (const sector in sectors) {
    
            const weight = sectors[sector];
    
            const adjusted =
                weight * strength;
    
            sectorExposure[sector] = adjusted;
    
            sectorRiskScore[sector] =
                this.getSectorRisk(sector);
    
            totalExposure += adjusted;
        }
    
        if (totalExposure > 0) {
    
            for (const sector in sectorExposure) {
    
                sectorExposure[sector] =
                    (sectorExposure[sector] / totalExposure) * 100;
            }
        }
    
        const maxExposure =
            Math.max(
                ...Object.values(sectorExposure),
                0
            );
    
        const concentrationRisk =
            this.clamp(
                maxExposure,
                0,
                100
            );
    
        const diversificationScore =
            this.clamp(
                100 - concentrationRisk,
                0,
                100
            );
    
        const allowedSectors: string[] = [];
        const restrictedSectors: string[] = [];
    
        for (const sector in sectorRiskScore) {
    
            if (sectorRiskScore[sector] > 65)
                restrictedSectors.push(sector);
            else
                allowedSectors.push(sector);
        }
    
        return {
            sectorExposure,
            sectorRiskScore,
            allowedSectors,
            restrictedSectors,
            concentrationRisk,
            diversificationScore
        };
    }
}