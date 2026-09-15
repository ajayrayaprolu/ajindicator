/****************************************************************************************
 * File:
 * EntryRiskEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/EntryRiskEngine.ts
 *
 * Purpose:
 * Canonical Institutional Entry Planning Engine.
 *
 * Responsibilities
 * ----------------
 * • Validate execution prerequisites
 * • Validate authority approval
 * • Validate risk qualification
 * • Select ATR multiplier
 * • Configure reward:risk model
 * • Build institutional entry plan
 * • Produce EntryRiskResult
 *
 * This engine DOES NOT:
 * ---------------------
 * • Decide BUY / SELL
 * • Calculate confidence
 * • Calculate trend
 * • Execute trades
 * • Position sizing
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Risk Qualification
 *      ↓
 * Entry Risk Engine
 *      ↓
 * Execution Engine
 *
 ****************************************************************************************/

import type {EntryRiskInput} from "./EntryRiskTypes";
import type {EntryRiskResult} from "./EntryRiskResult";
import {AJConstants} from "../../AJConstants";

//======================================================
// ENTRY RISK ENGINE
//======================================================

export class EntryRiskEngine {

    //--------------------------------------------------
    // BUILD ENTRY PLAN
    //--------------------------------------------------

    static build(

        input: EntryRiskInput

    ): EntryRiskResult {

        //--------------------------------------------------
        // EXECUTION GATE
        //--------------------------------------------------

        const executionAllowed =

            input.authorityApproved &&

            input.riskQualified &&

            input.tradeDirectionFinal !== 0 &&

            (

                input.engineState === "EXECUTED" ||

                input.engineState === "MANAGE"

            );

        //--------------------------------------------------
        // INVALID PLAN
        //--------------------------------------------------

        if (

            !executionAllowed

        ) {

            return {

                entryPrice: null,

                tradeDirection: 0,

                stopLoss: null,

                riskDistance: 0,

                atrDistance: 0,

                tp1: null,

                tp2: null,

                tp3: null,

                rewardRiskRatio: 0,

                breakEvenTrigger: null,

                breakEvenEnabled: false,

                trailStart: null,

                trailingEnabled: false,

                executionAllowed: false,

                atrMultiplier: 0,

                volatilityAdjusted: false,

                confidence:

                    input.confidence,

                riskScore:

                    input.riskScore ?? 0,

                planType:

                    input.isOptionsMode

                        ? "OPTIONS"

                        : input.isScalping

                            ? "SCALPING"

                            : input.isSwingTrade

                                ? "SWING"

                                : "STANDARD",

                diagnostics: {

                    authorityApproved:

                        input.authorityApproved,

                    riskQualified:

                        input.riskQualified,

                    trendAligned:

                        (input.trendStrength ?? 0) > 0,

                    momentumAligned:

                        (input.momentumScore ?? 0) > 0,

                    volatilityAccepted:

                        (input.volatilityScore ?? 0) >= 0,

                    mtfAligned:

                        (input.mtfAlignment ?? 0) >= 50

                },

                notes: [

                    "Execution blocked."

                ]

            };

        }

		//--------------------------------------------------
        // ATR VALIDATION
        //--------------------------------------------------

        const atr =

            Math.max(

                input.atr,

                0.0000001

            );

        //--------------------------------------------------
        // ATR MULTIPLIER
        //--------------------------------------------------

        let atrMultiplier =

            input.atrMultiplier ??

            AJConstants.ATR_MULTIPLIER;

        if (

            input.isScalping

        ) {

            atrMultiplier =

                AJConstants.SCALP_ATR_MULTIPLIER;

        }

        if (

            input.isAdvancedMode

        ) {

            atrMultiplier =

                AJConstants.ADV_ATR_MULTIPLIER;

        }

        if (

            input.isOptionsMode

        ) {

            atrMultiplier =

                AJConstants.OPTION_ATR_MULTIPLIER;

        }

        //--------------------------------------------------
        // VOLATILITY ADJUSTMENT
        //--------------------------------------------------

        if (

            (input.volatilityScore ?? 50) > 80

        ) {

            atrMultiplier *= 1.20;

        }

        else if (

            (input.volatilityScore ?? 50) < 30

        ) {

            atrMultiplier *= 0.90;

        }

        //--------------------------------------------------
        // RISK DISTANCE
        //--------------------------------------------------

        const atrDistance =

            atr *

            atrMultiplier;

        const riskDistance =

            atrDistance;

        //--------------------------------------------------
        // REWARD : RISK
        //--------------------------------------------------

        let rr1 =

            AJConstants.TP1_RR;

        let rr2 =

            AJConstants.TP2_RR;

        let rr3 =

            AJConstants.TP3_RR;

        //--------------------------------------------------
        // STRATEGY MODES
        //--------------------------------------------------

        if (

            input.isScalping

        ) {

            rr1 = AJConstants.SCALP_TP1_RR;

            rr2 = AJConstants.SCALP_TP2_RR;

            rr3 = AJConstants.SCALP_TP3_RR;

        }

        if (

            input.isAdvancedMode

        ) {

            rr1 = AJConstants.ADV_TP1_RR;

            rr2 = AJConstants.ADV_TP2_RR;

            rr3 = AJConstants.ADV_TP3_RR;

        }

        //--------------------------------------------------
        // TREND ADJUSTMENT
        //--------------------------------------------------

        if (

            (input.trendStrength ?? 50) >= 80

        ) {

            rr2 *= 1.10;

            rr3 *= 1.20;

        }

        //--------------------------------------------------
        // MOMENTUM ADJUSTMENT
        //--------------------------------------------------

        if (

            (input.momentumScore ?? 50) >= 80

        ) {

            rr3 *= 1.10;

        }

        //--------------------------------------------------
        // EXECUTION PLAN TYPE
        //--------------------------------------------------

        const planType =

            input.isOptionsMode

                ? "OPTIONS"

                : input.isScalping

                    ? "SCALPING"

                    : input.isSwingTrade

                        ? "SWING"

                        : "STANDARD";

        //--------------------------------------------------
        // EXECUTION FLAGS
        //--------------------------------------------------

        const breakEvenEnabled =

            input.allowBreakEven ??

            true;

        const trailingEnabled =

            input.allowTrailing ??

            true;

        //--------------------------------------------------
        // DIAGNOSTIC FLAGS
        //--------------------------------------------------

        const trendAligned =

            (input.trendStrength ?? 0) >= 60;

        const momentumAligned =

            (input.momentumScore ?? 0) >= 60;

        const volatilityAccepted =

            (input.volatilityScore ?? 50) <= 80;

        const mtfAligned =

            (input.mtfAlignment ?? 0) >= 60;

//--------------------------------------------------
// LONG / SHORT PLANNING
//--------------------------------------------------

		//--------------------------------------------------
        // LONG TRADE PLAN
        //--------------------------------------------------

        if (

            input.tradeDirectionFinal > 0

        ) {

            //--------------------------------------------------
            // INITIAL STOP LOSS
            //--------------------------------------------------

            const stopLoss =

                input.entryPrice -

                riskDistance;

            //--------------------------------------------------
            // TARGETS
            //--------------------------------------------------

            const tp1 =

                input.entryPrice +

                (riskDistance * rr1);

            const tp2 =

                input.entryPrice +

                (riskDistance * rr2);

            const tp3 =

                input.entryPrice +

                (riskDistance * rr3);

            //--------------------------------------------------
            // BREAK-EVEN TRIGGER
            //--------------------------------------------------

            const breakEvenTrigger =

                breakEvenEnabled

                    ? tp1

                    : null;

            //--------------------------------------------------
            // TRAILING START
            //--------------------------------------------------

            const trailStart =

                trailingEnabled

                    ? tp2

                    : null;

            //--------------------------------------------------
            // REWARD / RISK
            //--------------------------------------------------

            const rewardRiskRatio =

                Math.abs(

                    tp3 -

                    input.entryPrice

                ) /

                Math.max(

                    riskDistance,

                    0.000001

                );

            //--------------------------------------------------
            // EXECUTION ALLOWED
            //--------------------------------------------------

            const authorityExecutionAllowed =

                input.authorityApproved &&

                input.riskQualified &&

                input.tradeDirectionFinal > 0;

            //--------------------------------------------------
            // DIAGNOSTICS
            //--------------------------------------------------

            const diagnostics = {

                authorityApproved:

                    input.authorityApproved,

                riskQualified:

                    input.riskQualified,

                trendAligned,

                momentumAligned,

                volatilityAccepted,

                mtfAligned

            };

            //--------------------------------------------------
            // NOTES
            //--------------------------------------------------

            const notes: string[] = [];

            if (trendAligned)
                notes.push("Trend aligned");

            if (momentumAligned)
                notes.push("Momentum aligned");

            if (volatilityAccepted)
                notes.push("Volatility accepted");

            if (mtfAligned)
                notes.push("Higher timeframe aligned");

            if (authorityExecutionAllowed)
                notes.push("Execution approved");

            //--------------------------------------------------
            // RESULT
            //--------------------------------------------------

            return {

                entryPrice:

                    input.entryPrice,

                tradeDirection: 1,

                stopLoss,

                riskDistance,

                atrDistance,

                tp1,

                tp2,

                tp3,

                rewardRiskRatio,

                breakEvenTrigger,

                breakEvenEnabled,

                trailStart,

                trailingEnabled,

                executionAllowed,

                atrMultiplier,

                volatilityAdjusted:

                    atrMultiplier !==

                    AJConstants.ATR_MULTIPLIER,

                confidence:

                    input.confidence,

                riskScore:

                    input.riskScore ?? 0,

                planType,

                diagnostics,

                notes

            };

        }

		//--------------------------------------------------
        // SHORT TRADE PLAN
        //--------------------------------------------------

        const stopLoss =

            input.entryPrice +

            riskDistance;

        //--------------------------------------------------
        // TARGETS
        //--------------------------------------------------

        const tp1 =

            input.entryPrice -

            (riskDistance * rr1);

        const tp2 =

            input.entryPrice -

            (riskDistance * rr2);

        const tp3 =

            input.entryPrice -

            (riskDistance * rr3);

        //--------------------------------------------------
        // BREAK-EVEN TRIGGER
        //--------------------------------------------------

        const breakEvenTrigger =

            breakEvenEnabled

                ? tp1

                : null;

        //--------------------------------------------------
        // TRAILING START
        //--------------------------------------------------

        const trailStart =

            trailingEnabled

                ? tp2

                : null;

        //--------------------------------------------------
        // REWARD : RISK
        //--------------------------------------------------

        const rewardRiskRatio =

            Math.abs(

                input.entryPrice -

                tp3

            ) /

            Math.max(

                riskDistance,

                0.000001

            );

        //--------------------------------------------------
        // EXECUTION ALLOWED
        //--------------------------------------------------

        const authorityExecutionAllowed =

            input.authorityApproved &&

            input.riskQualified &&

            input.tradeDirectionFinal < 0;

        //--------------------------------------------------
        // DIAGNOSTICS
        //--------------------------------------------------

        const diagnostics = {

            authorityApproved:

                input.authorityApproved,

            riskQualified:

                input.riskQualified,

            trendAligned,

            momentumAligned,

            volatilityAccepted,

            mtfAligned

        };

        //--------------------------------------------------
        // NOTES
        //--------------------------------------------------

        const notes: string[] = [];

        if (

            trendAligned

        ) {

            notes.push(

                "Trend aligned"

            );

        }

        if (

            momentumAligned

        ) {

            notes.push(

                "Momentum aligned"

            );

        }

        if (

            volatilityAccepted

        ) {

            notes.push(

                "Volatility accepted"

            );

        }

        if (

            mtfAligned

        ) {

            notes.push(

                "Higher timeframe aligned"

            );

        }

        if (

            authorityExecutionAllowed

        ) {

            notes.push(

                "Execution approved"

            );

        }

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            entryPrice: input.entryPrice,

            tradeDirection: -1,
            stopLoss,
            riskDistance,
            atrDistance,
            tp1,
            tp2,
            tp3,
            rewardRiskRatio,
            breakEvenTrigger,
            breakEvenEnabled,
            trailStart,
            trailingEnabled,
            executionAllowed,
            atrMultiplier,
            volatilityAdjusted:
                atrMultiplier !==
                AJConstants.ATR_MULTIPLIER,

            confidence: input.confidence,
			
            riskScore:
                input.riskScore ??
                0,

            planType,
            diagnostics,
            notes

        };
		
		//--------------------------------------------------
        // END OF SHORT TRADE PLAN
        //--------------------------------------------------

    }

}
//======================================================
// END OF FILE
//======================================================