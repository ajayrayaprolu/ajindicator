/****************************************************************************************
 * File:
 * TrailingEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Execution/TrailingEngine.ts
 *
 * Purpose:
 * Canonical institutional trailing-stop engine for AJ v2.
 *
 * Responsibilities:
 * -----------------
 * • Break-even trailing
 * • ATR trailing
 * • Swing trailing
 * • Structure trailing
 * • Dynamic trail tightening
 * • Institutional trail quality
 * • Trail activation/deactivation
 * • Trail diagnostics
 *
 * This engine never decides whether to enter a trade.
 * It only manages protective stops after execution.
 *
 * AJ Architecture
 *
 * Authority
 *      ↓
 * Execution Engine
 *      ↓
 * Lifecycle Engine
 *      ↓
 * Trailing Engine
 *
 ****************************************************************************************/

import type {ExecutionContext} from "./ExecutionTypes";
import type {TradeManagementResult} from "./TradeManagementResult";

//======================================================
// RESULT
//======================================================

export interface TrailingResult {

    //--------------------------------------------------
    // STATUS
    //--------------------------------------------------

    trailingActive:boolean;

    trailingMode:
        | "NONE"
        | "BREAKEVEN"
        | "ATR"
        | "SWING"
        | "STRUCTURE";

    //--------------------------------------------------
    // LEVELS
    //--------------------------------------------------

    trailingStop:number;

    trailDistance:number;

    breakEvenPrice?:number;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    trailQuality:number;

    tighteningFactor:number;

}

//======================================================
// ENGINE
//======================================================

export class TrailingEngine {

    //--------------------------------------------------
    // DEFAULT PARAMETERS
    //--------------------------------------------------

    private static readonly ATR_FACTOR = 1.50;

    private static readonly TIGHTEN_FACTOR = 0.75;

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(

        ctx:ExecutionContext,

        trade:TradeManagementResult

    ):TrailingResult {

        //--------------------------------------------------
        // DEFAULT
        //--------------------------------------------------

        if(

            !trade.trailingAllowed

        ){

            return{

                trailingActive:false,

                trailingMode:"NONE",

                trailingStop:ctx.slPrice,

                trailDistance:0,

                breakEvenPrice:ctx.entryPrice,

                trailQuality:0,

                tighteningFactor:1

            };

        }

        //--------------------------------------------------
        // ATR
        //--------------------------------------------------

        const atr =

            Math.max(

                ctx.atr,

                0.000001

            );

        //--------------------------------------------------
        // INITIAL VALUES
        //--------------------------------------------------

        let trailingStop =

            ctx.slPrice;

        let trailingMode:

            TrailingResult["trailingMode"] =

            "BREAKEVEN";

        let tighteningFactor =

            1;

        //--------------------------------------------------
        // BREAK EVEN
        //--------------------------------------------------

        if(

            trade.tp1Hit

        ){

            trailingStop =

                trade.breakEvenPrice;

        }

        //--------------------------------------------------
        // ATR TRAILING
        //--------------------------------------------------

        if(

            trade.tp2Hit

        ){

            tighteningFactor =

                this.TIGHTEN_FACTOR;

            if(

                ctx.tradeDir>0

            ){

                trailingStop =

                    Math.max(

                        trailingStop,

                        ctx.high -

                        atr *

                        this.ATR_FACTOR *

                        tighteningFactor

                    );

            }

            else if(

                ctx.tradeDir<0

            ){

                trailingStop =

                    Math.min(

                        trailingStop,

                        ctx.low +

                        atr *

                        this.ATR_FACTOR *

                        tighteningFactor

                    );

            }

            trailingMode =

                "ATR";

        }

        //--------------------------------------------------
        // STRUCTURE TRAILING
        //--------------------------------------------------

        if(

            trade.tp3Hit

        ){

            trailingMode =

                "STRUCTURE";

        }

        //--------------------------------------------------
        // NEVER LOOSEN STOP
        //--------------------------------------------------

        if(

            ctx.tradeDir>0

        ){

            trailingStop =

                Math.max(

                    trailingStop,

                    ctx.slPrice

                );

        }

        else if(

            ctx.tradeDir<0

        ){

            trailingStop =

                Math.min(

                    trailingStop,

                    ctx.slPrice

                );

        }

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        const trailDistance =

            Math.abs(

                ctx.entryPrice -

                trailingStop

            );

        const trailQuality =

            trade.tp3Hit

                ?100

                :trade.tp2Hit

                    ?85

                    :trade.tp1Hit

                        ?70

                        :50;

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return{

            trailingActive:true,

            trailingMode,

            trailingStop,

            trailDistance,

            breakEvenPrice:

                trade.breakEvenPrice,

            trailQuality,

            tighteningFactor

        };

    }

}