/****************************************************************************************
 * File:
 * EntryRiskResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/EntryRiskResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Institutional Entry Risk Engine.
 *
 * Responsibilities:
 * -----------------
 * • Defines the institutional entry plan.
 * • Contains initial risk parameters.
 * • Contains target planning.
 * • Defines break-even and trailing triggers.
 * • Supplies execution diagnostics.
 *
 * This file contains contracts only.
 * No calculations should be implemented here.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Risk Qualification
 *      ↓
 * Entry Risk Engine
 *          ├── Entry Plan
 *          ├── Initial Stop Loss
 *          ├── TP1
 *          ├── TP2
 *          ├── TP3
 *          ├── Break-even Trigger
 *          ├── Trail Trigger
 *          └── Diagnostics
 ****************************************************************************************/

//======================================================
// ENTRY RISK RESULT
//======================================================

export interface EntryRiskResult {

    //--------------------------------------------------
    // ENTRY
    //--------------------------------------------------

    entryPrice: number | null;

    tradeDirection:
        | 1
        | -1
        | 0;

    //--------------------------------------------------
    // INITIAL RISK
    //--------------------------------------------------

    stopLoss: number | null;

    riskDistance: number;

    atrDistance: number;

    //--------------------------------------------------
    // TARGETS
    //--------------------------------------------------

    tp1: number | null;

    tp2: number | null;

    tp3: number | null;

    rewardRiskRatio: number;

    //--------------------------------------------------
    // BREAK-EVEN
    //--------------------------------------------------

    breakEvenTrigger: number | null;

    breakEvenEnabled: boolean;

    //--------------------------------------------------
    // TRAILING
    //--------------------------------------------------

    trailStart: number | null;

    trailingEnabled: boolean;

    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    executionAllowed: boolean;

    //--------------------------------------------------
    // VOLATILITY
    //--------------------------------------------------

    atrMultiplier: number;

    volatilityAdjusted: boolean;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    confidence: number;

    riskScore: number;

    //--------------------------------------------------
    // PLAN
    //--------------------------------------------------

    planType:
        | "STANDARD"
        | "SCALPING"
        | "OPTIONS"
        | "SWING";

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics: {

        authorityApproved: boolean;

        riskQualified: boolean;

        trendAligned: boolean;

        momentumAligned: boolean;

        volatilityAccepted: boolean;

        mtfAligned: boolean;

    };

    //--------------------------------------------------
    // METADATA
    //--------------------------------------------------

    notes: string[];

}