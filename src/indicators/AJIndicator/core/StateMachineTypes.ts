//src\indicators\AJIndicator\core\StateMachine.ts
//======================================================
// StateMachineTypes.ts
// Canonical State Machine Input Contract
//======================================================

import { EngineState } from "../core/EngineState";

import type { RuntimeContext } from "../../../runtime/RuntimeContext";
import type { AJRuntimeContext } from "../AJRuntimeContext";
import type { ExecutionAuthorityResult } from "../engines/Authority";

export interface StateMachineInputs {

    //--------------------------------------------------
    // CANONICAL RUNTIME
    //--------------------------------------------------

    runtime: RuntimeContext;
    ajRuntime: AJRuntimeContext;

    //--------------------------------------------------
    // PIPELINE RESULTS
    //--------------------------------------------------

    authorityResult: ExecutionAuthorityResult;

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    engineState: EngineState | number;
    signalBar: number | null;
    signalTimeout: number;
    barIndex: number;
    bias: number;
    lastBias: number;

    //--------------------------------------------------
    // RUNTIME FLAGS
    //--------------------------------------------------

    enableAITradeSafety: boolean;
    enableAISMCMode: boolean;
    tradeLifecycleLocked: boolean;

    //--------------------------------------------------
    // MARKET CONTEXT
    //--------------------------------------------------

    ctxLong: boolean;
    ctxShort: boolean;

    //--------------------------------------------------
    // AI CONTEXT
    //--------------------------------------------------

    aiTrendLong: boolean;
    aiTrendShort: boolean;
    aiInstitutionalLong: boolean;
    aiInstitutionalShort: boolean;
    aiMarketStructureBull: boolean;
    aiMarketStructureBear: boolean;

    //--------------------------------------------------
    // EXECUTION AUTHORITY
    //--------------------------------------------------

    common_aiCoreReady: boolean;
    common_aiSmcCoreReady: boolean;
    common_originalCoreReady: boolean;

    //--------------------------------------------------
    // TRADE
    //--------------------------------------------------

    tradeDirectionFinal:number;
    tradeScore:number;

	executionAllowed: boolean;
	minimumTradeScore: number;
	executionAcknowledged: boolean;
	
	canEnter: boolean;
	entryPrice: number;
	
	positionOpen: boolean;
	positionClosed: boolean;
	

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    isOptionsMode: boolean;
    isMirrorOptionChart: boolean;
    optionIndexTruthOk: boolean;
    indexTruthDir: number;

    //--------------------------------------------------
    // CRYPTO
    //--------------------------------------------------

    advCryptoMode: boolean;
    isAdvCryptoSymbol: boolean;
    advCryptoReady: boolean;

}

