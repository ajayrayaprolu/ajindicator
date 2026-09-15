/****************************************************************************************
 * File:
 * ExitEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/ExitEngine.ts
 *
 * Purpose:
 * Canonical institutional exit engine for AJ v2.
 *
 * Responsibilities:
 * -----------------
 * • TP1 exit
 * • TP2 exit
 * • TP3 exit
 * • Partial exits
 * • Full exits
 * • Emergency exits
 * • Time-based exits
 * • Structure-based exits
 * • Stop-loss exits
 * • Exit diagnostics
 * • Exit reason reporting
 *
 * This engine ONLY decides whether a trade should be exited.
 * It does not calculate stops, targets or lifecycle.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Execution Engine
 *      ↓
 * Lifecycle Engine
 *      ↓
 * Exit Engine
 *
 ****************************************************************************************/

import type {ExecutionContext} from "./ExecutionTypes";
import type {TradeManagementResult} from "./TradeManagementResult";
import type {RuntimeExecutionResult} from "../../../../runtime/execution";

//======================================================
// RESULT
//======================================================

export interface ExitResult {

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    closeTrade:boolean;

    partialExit:boolean;

    emergencyExit:boolean;

    //--------------------------------------------------
    // EXIT LEVEL
    //--------------------------------------------------

    exitLevel:
        | "NONE"
        | "TP1"
        | "TP2"
        | "TP3"
        | "STOPLOSS";

    //--------------------------------------------------
    // REASON
    //--------------------------------------------------

	reason:
		| "NONE"
		| "TP1"
		| "TP2"
		| "TP3"
		| "STOPLOSS"
		| "FAILED_BREAKOUT"
		| "REVERSAL"
		| "TIME_EXIT"
		| "FORCE_EXIT";

    //--------------------------------------------------
    // DIAGNOSTICS
    //--------------------------------------------------

    diagnostics:{

        tp1Hit:boolean;
        tp2Hit:boolean;
        tp3Hit:boolean;
        stopLossHit:boolean;
        timeout:boolean;
        reversal:boolean;
        failedBreakout:boolean;

    };

}

//======================================================
// ENGINE
//======================================================

export class ExitEngine {

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(

        ctx:ExecutionContext,
        _trade:TradeManagementResult,
        runtime:RuntimeExecutionResult

    ):ExitResult {

        //--------------------------------------------------
        // DEFAULT FLAGS
        //--------------------------------------------------

        let partialExit = false;
        let emergencyExit = false;

        let exitLevel:
            ExitResult["exitLevel"] =
            "NONE";

        let reason:
            ExitResult["reason"] =
            "NONE";

        //--------------------------------------------------
        // STOP LOSS
        //--------------------------------------------------

        if(
            runtime.stopLossHit
        ){

            return{

                closeTrade:true,
                partialExit:false,
                emergencyExit:false,
                exitLevel:"STOPLOSS",
                reason:"STOPLOSS",

                diagnostics:{
                    tp1Hit:false,
                    tp2Hit:false,
                    tp3Hit:false,
                    stopLossHit:true,
                    timeout:false,
                    reversal:false,
                    failedBreakout:false
                }
            };
        }

        //--------------------------------------------------
        // TP3
        //--------------------------------------------------

        if(
            runtime.tp3Hit
        ){

            return{

                closeTrade:true,
                partialExit:false,
                emergencyExit:false,
                exitLevel:"TP3",
                reason:"TP3",

                diagnostics:{
                    tp1Hit:true,
                    tp2Hit:true,
                    tp3Hit:true,
                    stopLossHit:false,
                    timeout:false,
                    reversal:false,
                    failedBreakout:false
                }

            };

        }

        //--------------------------------------------------
        // TP2
        //--------------------------------------------------

        if(
            runtime.tp2Hit
        ){

            partialExit = true;
            exitLevel = "TP2";
            reason = "TP2";
        }

        //--------------------------------------------------
        // TP1
        //--------------------------------------------------

        else if(
            runtime.tp1Hit

        ){
            partialExit = true;
            exitLevel = "TP1";
            reason = "TP1";
        }

        //--------------------------------------------------
        // FAILED BREAKOUT
        //--------------------------------------------------

        if(
             ctx.liquiditySweep ?? false
        ){

            emergencyExit = true;

            return{

                closeTrade:true,
                partialExit:false,
                emergencyExit:true,
                exitLevel:"NONE",
                reason:"FAILED_BREAKOUT",

                diagnostics:{

                    tp1Hit:runtime.tp1Hit,
                    tp2Hit:runtime.tp2Hit,
                    tp3Hit:runtime.tp3Hit,
                    stopLossHit:false,
                    timeout:false,
                    reversal:false,
                    failedBreakout:true
                }
            };
        }

        //--------------------------------------------------
        // STRUCTURE REVERSAL
        //--------------------------------------------------

        const structureReversal =

            (
                ctx.tradeDir > 0 &&
                (
                    ctx.bosBear ||
                    ctx.chochBear
                )
            )

            ||

            (
                ctx.tradeDir < 0 &&
                (
                    ctx.bosBull ||
                    ctx.chochBull
                )
            );

        if(
            structureReversal
        ){
            emergencyExit = true;

            return{

                closeTrade:true,
                partialExit:false,
                emergencyExit:true,
                exitLevel:"NONE",
                reason:"REVERSAL",

                diagnostics:{
                    tp1Hit:runtime.tp1Hit,
                    tp2Hit:runtime.tp2Hit,
                    tp3Hit:runtime.tp3Hit,
                    stopLossHit:false,
                    timeout:false,
                    reversal:true,
                    failedBreakout:false
                }
            };
        }

        //--------------------------------------------------
        // TIME EXIT
        //--------------------------------------------------

        if(

            ctx.barsInTrade >=

            ctx.maxHoldingBars

        ){

            return{

                closeTrade:true,

                partialExit:false,

                emergencyExit:false,

                exitLevel:"NONE",

                reason:"TIME_EXIT",

                diagnostics:{

                    tp1Hit:runtime.tp1Hit,

                    tp2Hit:runtime.tp2Hit,

                    tp3Hit:runtime.tp3Hit,

                    stopLossHit:false,

                    timeout:true,

                    reversal:false,

                    failedBreakout:false

                }

            };

        }

        //--------------------------------------------------
        // INVALID POSITION
        //--------------------------------------------------

        if(

            ctx.tradeDir===0 ||

            ctx.positionSize<=0

        ){

            return{

                closeTrade:true,

                partialExit:false,

                emergencyExit:true,

                exitLevel:"NONE",

                reason:"FORCE_EXIT",

                diagnostics:{

                    tp1Hit:false,

                    tp2Hit:false,

                    tp3Hit:false,

                    stopLossHit:false,

                    timeout:false,

                    reversal:false,

                    failedBreakout:false

                }

            };

        }

        //--------------------------------------------------
        // KEEP TRADE OPEN
        //--------------------------------------------------

        return{

            closeTrade:false,

            partialExit,

            emergencyExit,

            exitLevel,

            reason,

            diagnostics:{

                tp1Hit:runtime.tp1Hit,

                tp2Hit:runtime.tp2Hit,

                tp3Hit:runtime.tp3Hit,

                stopLossHit:runtime.stopLossHit,

                timeout:false,

                reversal:false,

                failedBreakout:false

            }

        };

    }

}