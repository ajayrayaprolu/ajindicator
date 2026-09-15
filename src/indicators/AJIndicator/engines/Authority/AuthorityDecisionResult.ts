/****************************************************************************************
 * File:
 * AuthorityDecisionResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/AuthorityDecisionResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Authority Decision Engine.
 *
 * The Authority Engine is the final decision gate before
 * Execution. It consumes Confidence, Risk Qualification,
 * Multi-Timeframe alignment and State Machine readiness
 * to produce one of three actions:
 *
 *      BUY
 *      SELL
 *      WAIT
 *
 * This contract intentionally contains no execution,
 * stop-loss, target or position-sizing information.
 ****************************************************************************************/

import type {
    AuthorityAction
} from "./AuthorityDecisionTypes";

export interface AuthorityDecisionResult {

    //--------------------------------------------------
    // FINAL DECISION
    //--------------------------------------------------

    action: AuthorityAction;

    approved: boolean;

    blocked: boolean;

    //--------------------------------------------------
    // READY FLAGS
    //--------------------------------------------------

    confidenceReady: boolean;

    riskReady: boolean;

    mtfReady: boolean;

    stateReady: boolean;

    //--------------------------------------------------
    // INPUT SNAPSHOT
    //--------------------------------------------------

    confidence: number;

    riskScore: number;

    tradeDirection: number;

    //--------------------------------------------------
    // OPTIONAL SUMMARY
    //--------------------------------------------------

    tradeGrade?: string;

    confidenceClass?: string;

    //--------------------------------------------------
    // DECISION QUALITY
    //--------------------------------------------------

    decisionScore?: number;

    authorityStrength?: number;

    institutionalAgreement?: number;

    //--------------------------------------------------
    // REASONS
    //--------------------------------------------------

    reasons: string[];

    positiveFactors?: string[];

    negativeFactors?: string[];

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics?: {

        confidenceScore: number;

        riskScore: number;

        mtfAgreement: boolean;

        stateReady: boolean;

        approved: boolean;

    };

    //--------------------------------------------------
    // FUTURE EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;

    notes?: string[];

}