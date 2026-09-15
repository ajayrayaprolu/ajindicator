//======================================================
// .\src\runtime\portfolio\CorrelationEngine.ts
// Phase 12 Portfolio Intelligence Layer
// Correlation & Dependency Risk Engine
//======================================================

import type { PortfolioContext } from "./PortfolioTypes";
import type { AllocationSignal } from "./AllocationTypes";

//======================================================
// CORRELATION RESULT
//======================================================

export interface CorrelationEngineResult {
    correlationRisk: number;
    avgCorrelation: number;
    maxCorrelation: number;
    sectorCorrelation: Record<string, number>;
    concentrationClusters: number;
    diversificationScore: number;
    isDiversified: boolean;
}

//======================================================
// CORRELATION ENGINE
//======================================================

export class CorrelationEngine {

    //--------------------------------------------------
    // CLAMP
    //--------------------------------------------------

    protected static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    //--------------------------------------------------
    // BASE CORRELATION MATRIX SIMULATION
    //--------------------------------------------------

    protected static buildCorrelationMatrix(
        context: PortfolioContext
    ): Record<string, number> {
        const base = context.sectorWeights ?? {};
        const matrix: Record<string, number> = {};
        for (const sector in base) {
            const weight = base[sector];
            // simplified institutional proxy:
            // higher weight → higher systemic correlation
            matrix[sector] = this.clamp(weight * 0.8, 0, 100);
        }
        return matrix;
    }

    //--------------------------------------------------
    // AVERAGE CORRELATION
    //--------------------------------------------------

    protected static avgCorrelation(
        matrix: Record<string, number>
    ): number {
        const values = Object.values(matrix);
        if (values.length === 0) return 0;
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }

    //--------------------------------------------------
    // MAX CORRELATION
    //--------------------------------------------------

    protected static maxCorrelation(
        matrix: Record<string, number>
    ): number {
        return Math.max(...Object.values(matrix), 0);
    }

    //--------------------------------------------------
    // CONCENTRATION CLUSTERS
    //--------------------------------------------------

    protected static concentrationClusters(
        matrix: Record<string, number>
    ): number {
        let clusters = 0;
        for (const k in matrix) {
            if (matrix[k] > 70) clusters++;
        }
        return clusters;
    }

    //--------------------------------------------------
    // SYSTEMIC STRESS
    //--------------------------------------------------
    
    protected static systemicStress(
        avg: number,
        max: number,
        clusters: number
    ): number {
    
        return this.clamp(
            (avg * 0.4) +
            (max * 0.4) +
            (clusters * 12),
            0,
            100
        );
    }
    
    //--------------------------------------------------
    // HARD DIVERSIFICATION CHECK
    //--------------------------------------------------
    
    protected static hardDiversificationBlock(
        correlationRisk: number,
        clusters: number
    ): boolean {
    
        return (
            correlationRisk > 85 ||
            clusters >= 5
        );
    }
	
    //--------------------------------------------------
    // MAIN ENGINE
    //--------------------------------------------------

    static evaluate(
        context: PortfolioContext,
        _signal: AllocationSignal
    ): CorrelationEngineResult {
    
        const matrix =
            this.buildCorrelationMatrix(context);
    
        const avgCorrelation =
            this.avgCorrelation(matrix);
    
        const maxCorrelation =
            this.maxCorrelation(matrix);
    
        const concentrationClusters =
            this.concentrationClusters(matrix);
    
        const baseRisk =
            this.clamp(
                (avgCorrelation * 0.5) +
                (maxCorrelation * 0.3) +
                (concentrationClusters * 10),
                0,
                100
            );
    
        const systemicRisk =
            this.systemicStress(
                avgCorrelation,
                maxCorrelation,
                concentrationClusters
            );
    
        const correlationRisk =
            this.clamp(
                (baseRisk * 0.6) +
                (systemicRisk * 0.4),
                0,
                100
            );
    
        const diversificationScore =
            this.clamp(
                100 - correlationRisk,
                0,
                100
            );
    
        const isDiversified =
            !this.hardDiversificationBlock(
                correlationRisk,
                concentrationClusters
            ) &&
            diversificationScore > 55;
    
        return {
            correlationRisk,
            avgCorrelation,
            maxCorrelation,
            sectorCorrelation: matrix,
            concentrationClusters,
            diversificationScore,
            isDiversified
        };
    }
}