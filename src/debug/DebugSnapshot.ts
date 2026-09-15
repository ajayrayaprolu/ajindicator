//======================================================
// src/debug/DebugSnapshot.ts
// Institutional Runtime Debug Snapshot
// Phase 13
//======================================================

export interface DebugSnapshot {


    //--------------------------------------------------
    // GENERAL
    //--------------------------------------------------

    timestamp: number;

    symbol: string;

    timeframe: string;


    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    engineState: string;

    direction: string;

    tradeScore: number;

    executionAllowed: boolean;


    //--------------------------------------------------
    // AI
    //--------------------------------------------------

    aiConfidence: number;

    institutionalConfidence: number;

    executionConfidence: number;


    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    trend: string;

    trendStrength: number;

    regime: string;


    //--------------------------------------------------
    // STRUCTURE
    //--------------------------------------------------

    bos: boolean;

    choch: boolean;

    liquidity: boolean;

    fvg: boolean;


    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    entry: number;

    stop: number;

    tp1: number;

    tp2: number;

    tp3: number;


    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    optionSymbol: string;


    //--------------------------------------------------
    // RENDERING
    //--------------------------------------------------

    markers: number;

    signals: number;

    zones: number;

}


//======================================================

export class DebugSnapshotBuilder {


    //--------------------------------------------------
    // EMPTY
    //--------------------------------------------------

    static empty():

        DebugSnapshot {

        return {

            timestamp:
                Date.now(),

            symbol:
                "",

            timeframe:
                "",


            engineState:
                "WAIT",

            direction:
                "NONE",

            tradeScore:
                0,

            executionAllowed:
                false,


            aiConfidence:
                0,

            institutionalConfidence:
                0,

            executionConfidence:
                0,


            trend:
                "UNKNOWN",

            trendStrength:
                0,

            regime:
                "UNKNOWN",


            bos:
                false,

            choch:
                false,

            liquidity:
                false,

            fvg:
                false,


            entry:
                0,

            stop:
                0,

            tp1:
                0,

            tp2:
                0,

            tp3:
                0,


            optionSymbol:
                "",


            markers:
                0,

            signals:
                0,

            zones:
                0

        };

    }


    //--------------------------------------------------
    // BUILD
    //--------------------------------------------------

    static fromRuntime(

        runtime: any

    ): DebugSnapshot {

        if (

            !runtime

        ) {

            return this.empty();

        }


        return {

            timestamp:
                Date.now(),

            symbol:
                runtime.symbol
                ?? "",

            timeframe:
                runtime.timeframe
                ?? "",


            engineState:
                runtime.engineState
                ?? "WAIT",

            direction:
                runtime.direction
                ?? "NONE",

            tradeScore:
                runtime.tradeScore
                ?? 0,

            executionAllowed:
                runtime.executionAllowed
                ?? false,


            aiConfidence:
                runtime.aiConfidence
                ?? 0,

            institutionalConfidence:
                runtime.institutionalConfidence
                ?? 0,

            executionConfidence:
                runtime.executionConfidence
                ?? 0,


            trend:
                runtime.trend
                ?? "UNKNOWN",

            trendStrength:
                runtime.trendStrength
                ?? 0,

            regime:
                runtime.regime
                ?? "UNKNOWN",


            bos:
                runtime.bos
                ?? false,

            choch:
                runtime.choch
                ?? false,

            liquidity:
                runtime.liquidity
                ?? false,

            fvg:
                runtime.fvg
                ?? false,


            entry:
                runtime.entryPrice
                ?? 0,

            stop:
                runtime.stopLoss
                ?? 0,

            tp1:
                runtime.tp1
                ?? 0,

            tp2:
                runtime.tp2
                ?? 0,

            tp3:
                runtime.tp3
                ?? 0,


            optionSymbol:
                runtime.optionSymbol
                ?? "",


            markers:
                runtime.markers?.length
                ?? 0,

            signals:
                runtime.signals?.length
                ?? 0,

            zones:
                runtime.zones?.length
                ?? 0

        };

    }

}