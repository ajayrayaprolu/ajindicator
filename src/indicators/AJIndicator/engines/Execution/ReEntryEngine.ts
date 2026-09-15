/****************************************************************************************
 * File:
 * ReEntryEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/ReEntryEngine.ts
 *
 * Purpose:
 * Canonical institutional re-entry engine for AJ v2.
 *
 * Responsibilities:
 * -----------------
 * • Pullback re-entry
 * • BOS confirmation
 * • CHOCH confirmation
 * • Liquidity sweep confirmation
 * • Fair Value Gap confirmation
 * • Cooldown management
 * • Maximum retry enforcement
 * • Institutional re-entry diagnostics
 *
 * This engine never creates new trade decisions.
 * It only evaluates whether an existing institutional trade
 * qualifies for a managed re-entry.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Execution Engine
 *      ↓
 * Lifecycle Engine
 *      ↓
 * ReEntry Engine
 *
 ****************************************************************************************/

import type {ExecutionContext} from "./ExecutionTypes";
import type {TradeManagementResult} from "./TradeManagementResult";

//======================================================
// RESULT
//======================================================

export interface ReEntryResult {

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    reentryTriggered:boolean;

    reentryAllowed:boolean;

    //--------------------------------------------------
    // TYPE
    //--------------------------------------------------

    reentryType:
        | "NONE"
        | "PULLBACK"
        | "BOS"
        | "LIQUIDITY"
        | "FVG";

    //--------------------------------------------------
    // PRICE
    //--------------------------------------------------

    reentryPrice:number;

    reEntryStopLoss:number;

    //--------------------------------------------------
    // VALIDATION
    //--------------------------------------------------

    cooldownPassed:boolean;

    remainingAttempts:number;

    structureConfirmed:boolean;

    liquidityConfirmed:boolean;

    fvgConfirmed:boolean;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    reentryQuality:number;

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics:{

        entryTouched:boolean;

        bos:boolean;

        choch:boolean;

        liquidity:boolean;

        fvg:boolean;

        cooldown:boolean;

    };

}

//======================================================
// ENGINE
//======================================================

export class ReEntryEngine {

    //--------------------------------------------------
    // CONFIGURATION
    //--------------------------------------------------

    private static readonly MAX_REENTRY = 2;

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    static evaluate(

        ctx:ExecutionContext,

        trade:TradeManagementResult

    ):ReEntryResult{

        //--------------------------------------------------
        // CONFIGURATION
        //--------------------------------------------------

        const reEntryCount =

            ctx.reEntryCount ?? 0;

        const cooldownBars =

            ctx.barsSinceExit ?? 999;

        const cooldownRequired =

            ctx.reEntryCooldown ?? 3;

        //--------------------------------------------------
        // COOLDOWN
        //--------------------------------------------------

        const cooldownPassed =

            cooldownBars >=

            cooldownRequired;

        //--------------------------------------------------
        // REMAINING ATTEMPTS
        //--------------------------------------------------

        const remainingAttempts =

            Math.max(

                0,

                this.MAX_REENTRY -

                reEntryCount

            );

        //--------------------------------------------------
        // BASIC VALIDATION
        //--------------------------------------------------

        const reentryAllowed =

            trade.breakEvenActive &&

            trade.trailingAllowed &&

            !trade.tradeCompleted &&

            cooldownPassed &&

            remainingAttempts > 0;

        //--------------------------------------------------
        // STRUCTURE
        //--------------------------------------------------

        const bos =

            ctx.bosBull ||

            ctx.bosBear;

        const choch =

            ctx.chochBull ||

            ctx.chochBear;

        const structureConfirmed =

            bos &&

            choch;

        //--------------------------------------------------
        // LIQUIDITY
        //--------------------------------------------------

        const liquidityConfirmed =

            ctx.liquiditySweep ??

            false;

        //--------------------------------------------------
        // FAIR VALUE GAP
        //--------------------------------------------------

        const fvgConfirmed =

            ctx.fvgRetest ??

            false;

        //--------------------------------------------------
        // ENTRY RETEST
        //--------------------------------------------------

        let entryTouched = false;

        if(

            ctx.tradeDir > 0

        ){

            entryTouched =

                ctx.low <=

                ctx.entryPrice;

        }

        else if(

            ctx.tradeDir < 0

        ){

            entryTouched =

                ctx.high >=

                ctx.entryPrice;

        }

        //--------------------------------------------------
        // TYPE
        //--------------------------------------------------

        let reentryType:

            ReEntryResult["reentryType"] =

            "NONE";

        if(

            fvgConfirmed

        ){

            reentryType =

                "FVG";

        }

        else if(

            liquidityConfirmed

        ){

            reentryType =

                "LIQUIDITY";

        }

        else if(

            bos

        ){

            reentryType =

                "BOS";

        }

        else if(

            entryTouched

        ){

            reentryType =

                "PULLBACK";

        }

        //--------------------------------------------------
        // FINAL DECISION
        //--------------------------------------------------

        const reentryTriggered =

            reentryAllowed &&

            entryTouched &&

            structureConfirmed;

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        let quality = 50;

        if(structureConfirmed) quality += 20;

        if(liquidityConfirmed) quality += 15;

        if(fvgConfirmed) quality += 15;

        quality = Math.min(

            100,

            quality

        );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return{

            reentryTriggered: reentryTriggered ?? false,

            reentryAllowed,

            reentryType,

            reentryPrice:

                reentryTriggered

                    ? ctx.entryPrice

                    : 0,

            reEntryStopLoss:

                reentryTriggered

                    ? ctx.slPrice

                    : 0,

            cooldownPassed,

            remainingAttempts,

            structureConfirmed: structureConfirmed ?? false,

            liquidityConfirmed,

            fvgConfirmed,

            reentryQuality:

                quality,

            diagnostics:{

                entryTouched,

                bos: bos ?? false,

                choch: choch ?? false,

                liquidity:

                    liquidityConfirmed,

                fvg:

                    fvgConfirmed,

                cooldown:

                    cooldownPassed

            }

        };

    }

}