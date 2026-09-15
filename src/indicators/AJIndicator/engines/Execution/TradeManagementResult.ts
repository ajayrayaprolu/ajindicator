/****************************************************************************************
 * File:
 * TradeManagementResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/TradeManagementResult.ts
 *
 * Purpose:
 * Canonical institutional Trade Management result contract for AJ v2.
 *
 * This file represents the complete output produced by the
 * Trade Management Engine after execution has begun.
 *
 * Responsibilities:
 * -----------------
 * • Position management
 * • Position sizing updates
 * • Scale-in / Scale-out state
 * • Partial exit state
 * • Break-even state
 * • Trailing eligibility
 * • Re-entry eligibility
 * • Live risk metrics
 * • Portfolio exposure
 * • Institutional diagnostics
 *
 * This file performs NO calculations.
 * It only defines reusable output contracts.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Execution Engine
 *      ↓
 * Lifecycle Engine
 *      ↓
 * Trade Management
 *      ↓
 * Trailing / Exit / ReEntry
 *
 ****************************************************************************************/

import type {

    TradeProgress,
    ScaleInState,
    ScaleOutState,
    PartialExit,
    TradeRiskState,
    PortfolioExposure

} from "./TradeManagementTypes";

//======================================================
// RESULT
//======================================================

export interface TradeManagementResult {

    //--------------------------------------------------
    // TRADE STATUS
    //--------------------------------------------------

    tradeActive:boolean;
    tradeCompleted:boolean;
    tradeClosed:boolean;
	exitReason:string;
    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize:number;
    remainingPosition:number;
    realizedPosition:number;
    averageEntryPrice:number;
	positionOpen:boolean;
	positionClosed:boolean;

    //--------------------------------------------------
    // TARGET STATUS
    //--------------------------------------------------

	tp1Hit:boolean;
	tp2Hit:boolean;
	tp3Hit:boolean;
	stopLossHit:boolean;

    //--------------------------------------------------
    // BREAK EVEN
    //--------------------------------------------------

    breakEvenActive:boolean;
	breakEven?: {
		active:boolean;
		price:number;
	};
    breakEvenPrice:number;

	//--------------------------------------------------
	// TRAILING
	//--------------------------------------------------
	
	trailingAllowed:boolean;
	trailingActive:boolean;
	trailingStop:number;
	
	//--------------------------------------------------
	// RE-ENTRY
	//--------------------------------------------------
	reEntryCount: number;
	reEntryEligible:boolean;
	remainingAttempts: number;
	//--------------------------------------------------
	// SCALE IN
	//--------------------------------------------------
    scaleIn:ScaleInState;

    //--------------------------------------------------
    // SCALE OUT
    //--------------------------------------------------
    scaleOut:ScaleOutState;

    //--------------------------------------------------
    // PARTIAL EXIT
    //--------------------------------------------------
    partialExit:PartialExit;
	emergencyExit: boolean;
	timeoutExit: boolean;
	forceExit: boolean;
    //--------------------------------------------------
    // TRADE PROGRESS
    //--------------------------------------------------
    progress:TradeProgress;
    targetLevelReached:number;

    //--------------------------------------------------
    // LIVE RISK
    //--------------------------------------------------
    risk:TradeRiskState;

    //--------------------------------------------------
    // PORTFOLIO
    //--------------------------------------------------
    portfolio:PortfolioExposure;

    //--------------------------------------------------
    // PERFORMANCE
    //--------------------------------------------------
    executionScore:number;
    managementScore:number;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics:{
        breakEvenActivated:boolean;
        trailingActivated:boolean;
        scaleInExecuted:boolean;
        scaleOutExecuted:boolean;
        partialExitExecuted:boolean;
        tradeCompleted:boolean;
    };

    //--------------------------------------------------
    // EXTENSIONS
    //--------------------------------------------------

    metadata?:Record<string,unknown>;
    notes?:string[];

}