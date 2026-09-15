/****************************************************************************************
 * File:
 * ExecutionAuthorityResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/ExecutionAuthorityResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Institutional Execution Authority.
 *
 * Responsibilities:
 * -----------------
 * • Represents the final authority decision before execution.
 * • Carries approval/rejection reasons.
 * • Carries execution authorization.
 * • Supplies diagnostics for dashboards and execution engines.
 *
 * This file contains contracts only.
 * No calculations belong here.
 *
 * AJ Architecture
 *
 * Confidence
 * Risk Qualification
 * Trend
 * Momentum
 * Liquidity
 * Market Structure
 * Multi-Timeframe
 *          │
 *          ▼
 *   Execution Authority
 *          │
 *          ▼
 *   Execution Engine
 ****************************************************************************************/

import type { EngineDiagnostic } from "../../debug/EngineDiagnostic";

//======================================================
// EXECUTION AUTHORITY RESULT
//======================================================

export interface ExecutionAuthorityResult {

    //--------------------------------------------------
    // DECISION
    //--------------------------------------------------

    authorityDecision:

        | "BUY"

        | "SELL"

        | "WAIT";

    authorityApproved:boolean;

    executionAllowed:boolean;

    authorityText:string;

    //--------------------------------------------------
    // SUMMARY
    //--------------------------------------------------

    approvalReasons:string[];

    rejectionReasons:string[];

    //--------------------------------------------------
    // CHECKS
    //--------------------------------------------------

    passedChecks:number;

    failedChecks:number;

    //--------------------------------------------------
    // VALIDATION FLAGS
    //--------------------------------------------------

    trendAligned:boolean;

    momentumAligned:boolean;

    structureAligned:boolean;

    institutionalConfluence:boolean;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

	diagnostics:{
		confidence:number;
		riskScore:number;
		passedChecks:number;
		failedChecks:number;
		approvalRatio:number;
		trendAligned:boolean;
		momentumAligned:boolean;
		structureAligned:boolean;
		institutionalConfluence:boolean;
	};
	
	//--------------------------------------------------
	// STANDARD ENGINE DIAGNOSTIC
	//--------------------------------------------------
	
	diagnostic: EngineDiagnostic;

}