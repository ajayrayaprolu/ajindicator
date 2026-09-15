/****************************************************************************************
 * File:
 * MomentumResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Momentum/MomentumResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Momentum Engine.
 *
 * This file represents institutional momentum analytics only.
 * It exposes raw momentum characteristics that downstream
 * engines (Risk Qualification, Confidence and Authority)
 * consume.
 *
 * No trading decisions, confidence calculations or execution
 * logic should exist in this contract.
 ****************************************************************************************/

import type {
    MomentumDirection,
    MomentumStrength,
    MomentumStage
} from "./MomentumTypes";

export interface MomentumResult {

    //--------------------------------------------------
    // PRIMARY MOMENTUM
    //--------------------------------------------------

    direction: MomentumDirection;

    bullishMomentum: boolean;

    bearishMomentum: boolean;

    neutralMomentum: boolean;

    //--------------------------------------------------
    // RSI
    //--------------------------------------------------

    rsi: number;

    overbought: boolean;

    oversold: boolean;

    //--------------------------------------------------
    // ACCELERATION
    //--------------------------------------------------

    accelerating: boolean;

    decelerating: boolean;

    acceleration: number;

    //--------------------------------------------------
    // BREAKOUT
    //--------------------------------------------------

    breakoutStrength: number;

    strongBreakout: boolean;

    breakoutConfirmed?: boolean;

    breakoutContinuation?: boolean;

    //--------------------------------------------------
    // IMPULSE
    //--------------------------------------------------

    impulseQuality: number;

    impulseBull: boolean;

    impulseBear: boolean;

    impulseStrength?: number;

    impulseContinuation?: boolean;

    //--------------------------------------------------
    // MOMENTUM QUALITY
    //--------------------------------------------------

    momentumStrength: MomentumStrength;

    institutionalMomentumQuality: number;

    //--------------------------------------------------
    // MOMENTUM LIFE CYCLE
    //--------------------------------------------------

    momentumStage: MomentumStage;

    //--------------------------------------------------
    // MOMENTUM METRICS
    //--------------------------------------------------

    momentumScore?: number;

    accelerationScore?: number;

    breakoutScore?: number;

    impulseScore?: number;

    qualityScore?: number;

    exhaustionScore?: number;

    //--------------------------------------------------
    // MOMENTUM CLASSIFICATION
    //--------------------------------------------------

    momentumState?:
        | "BUILDING"
        | "ACCELERATING"
        | "STRONG"
        | "EXHAUSTION"
        | "REVERSAL"
        | "NEUTRAL";

    //--------------------------------------------------
    // INSTITUTIONAL ANALYTICS
    //--------------------------------------------------

    buyingPressure?: number;

    sellingPressure?: number;

    momentumBias?: -1 | 0 | 1;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics?: {

        rsiContribution: number;

        accelerationContribution: number;

        breakoutContribution: number;

        impulseContribution: number;

        overallMomentum: number;

    };

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

    notes?: string[];

}