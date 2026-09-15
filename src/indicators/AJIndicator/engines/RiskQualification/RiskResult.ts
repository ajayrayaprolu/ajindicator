/****************************************************************************************
 * File:
 * RiskResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/RiskResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Institutional Risk Model.
 *
 * Responsibilities:
 * -----------------
 * • Defines the complete institutional risk allocation result.
 * • Supplies position sizing information to the Execution subsystem.
 * • Supplies portfolio allocation information.
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
 *      ↓
 * Risk Model
 *          ├── Position Size
 *          ├── Capital Allocation
 *          ├── Margin Usage
 *          ├── Portfolio Exposure
 *          ├── Risk Metrics
 *          └── Diagnostics
 ****************************************************************************************/

//======================================================
// RISK MODEL RESULT
//======================================================

export interface RiskResult {

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    riskAmount: number;

    riskPercent: number;

    riskUtilization: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;

    positionValue: number;

    //--------------------------------------------------
    // CAPITAL
    //--------------------------------------------------

    capitalAllocated: number;

    availableCapital: number;

    //--------------------------------------------------
    // DISTANCE
    //--------------------------------------------------

    stopDistance: number;

    atrDistance: number;

    //--------------------------------------------------
    // LEVERAGE
    //--------------------------------------------------

    leverageUsed: number;

    marginRequired: number;

    //--------------------------------------------------
    // PORTFOLIO
    //--------------------------------------------------

    portfolioExposure: number;

    portfolioRisk: number;

    openPositions: number;

    //--------------------------------------------------
    // REWARD / RISK
    //--------------------------------------------------

    rewardRiskRatio: number;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    confidence: number;

    riskScore: number;

    //--------------------------------------------------
    // VALIDATION
    //--------------------------------------------------

    allocationApproved: boolean;

    positionApproved: boolean;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics: {

        authorityApproved: boolean;

        riskQualified: boolean;

        volatilityAccepted: boolean;

        trendAligned: boolean;

        mtfAligned: boolean;

        capitalAvailable: boolean;

    };

    //--------------------------------------------------
    // METADATA
    //--------------------------------------------------

    notes: string[];

}