/****************************************************************************************
 * File:
 * AuthorityDecision.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Authority/AuthorityDecision.ts
 *
 * Purpose:
 * Canonical Authority Decision Engine for AJ v2.
 *
 * Responsibilities
 * ----------------
 * • Consume outputs from:
 *      - Confidence Engine
 *      - Risk Qualification Engine
 *      - Trend Engine
 *      - Momentum Engine
 *      - Market State Engine
 *      - Liquidity Engine
 *      - Order Block Engine
 *      - Multi-Timeframe Engine
 *      - State Machine
 *
 * • Produce ONLY:
 *      BUY
 *      SELL
 *      WAIT
 *
 * This engine never calculates TP/SL, position sizing,
 * execution management or lifecycle.
 ****************************************************************************************/

import type {
    AuthorityDecisionInput,
    AuthorityAction
} from "./AuthorityDecisionTypes";

import type {
    AuthorityDecisionResult
} from "./AuthorityDecisionResult";

export class AuthorityDecision {

    //--------------------------------------------------
    // DECIDE
    //--------------------------------------------------

    static evaluate(
        input: AuthorityDecisionInput
    ): AuthorityDecisionResult {

        //--------------------------------------------------
        // READY FLAGS
        //--------------------------------------------------

        const confidenceReady =
            input.confidence >=
            input.minimumConfidence;

        const riskReady =
            input.riskApproved;

        const mtfReady =
            input.mtfAgreement;

        const stateReady =
            input.stateReady;

        //--------------------------------------------------
        // DIRECTION
        //--------------------------------------------------

        const bullish =
            input.tradeDirection > 0;

        const bearish =
            input.tradeDirection < 0;

        //--------------------------------------------------
        // FINAL READY
        //--------------------------------------------------

        const approved =

            confidenceReady &&

            riskReady &&

            mtfReady &&

            stateReady;

        //--------------------------------------------------
        // ACTION
        //--------------------------------------------------

        let action: AuthorityAction =
            "WAIT";

        if (
            approved &&
            bullish
        ) {

            action = "BUY";

        }

        else if (
            approved &&
            bearish
        ) {

            action = "SELL";

        }

        //--------------------------------------------------
        // REASONS
        //--------------------------------------------------

        const reasons: string[] = [];

        if (!confidenceReady)
            reasons.push("Confidence below threshold");

        if (!riskReady)
            reasons.push("Risk qualification rejected");

        if (!mtfReady)
            reasons.push("Multi-timeframe disagreement");

        if (!stateReady)
            reasons.push("State machine not ready");

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // DECISION
            //--------------------------------------------------

            action,

            approved,

            //--------------------------------------------------
            // FLAGS
            //--------------------------------------------------

            confidenceReady,

            riskReady,

            mtfReady,

            stateReady,

            //--------------------------------------------------
            // INPUT SNAPSHOT
            //--------------------------------------------------

            confidence:
                input.confidence,

            riskScore:
                input.riskScore,

            tradeDirection:
                input.tradeDirection,

            //--------------------------------------------------
            // DIAGNOSTICS
            //--------------------------------------------------

            reasons,

            blocked:
                !approved

        };

    }

}