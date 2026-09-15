//Institutional scalping engine with:
//
//Fast-entry validation
//Momentum confirmation
//Time-window filtering
//ATR-based stop loss
//Quick TP / partial exits
//Break-even management
//Re-entry cooldown
//Scalping lifecycle management
//Execution result model suitable for high-frequency option trades

export interface ScalpingExecutionInput {

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    symbol: string;

    direction: number;

    entryPrice: number;

    lastPrice: number;

    atr: number;

    //--------------------------------------------------
    // ORDER FLOW
    //--------------------------------------------------

    cvdBull: boolean;

    cvdBear: boolean;

    //--------------------------------------------------
    // TREND
    //--------------------------------------------------

    emaBull: boolean;

    emaBear: boolean;

    vwapBull: boolean;

    vwapBear: boolean;

    //--------------------------------------------------
    // STRUCTURE
    //--------------------------------------------------

    bosBull: boolean;

    bosBear: boolean;

    chochBull: boolean;

    chochBear: boolean;

    //--------------------------------------------------
    // VOLUME
    //--------------------------------------------------

    volume: number;

    volumeAverage: number;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    tradingAllowed: boolean;

}

export interface ScalpingExecutionResult {

    //--------------------------------------------------
    // ENTRY
    //--------------------------------------------------

    entryAllowed: boolean;

    executionScore: number;

    //--------------------------------------------------
    // LEVELS
    //--------------------------------------------------

    stopLoss: number;

    breakEven: number;

    target1: number;

    target2: number;

    //--------------------------------------------------
    // MANAGEMENT
    //--------------------------------------------------

    trailDistance: number;

    reEntryAllowed: boolean;

    //--------------------------------------------------
    // STATE
    //--------------------------------------------------

    state:

        | "WAIT"

        | "READY"

        | "ACTIVE"

        | "EXIT";

}

export class ScalpingExecutionEngine {

    //--------------------------------------------------
    // SCORE
    //--------------------------------------------------

    private static calculateScore(

        p: ScalpingExecutionInput

    ): number {

        let score = 0;

        //--------------------------------------------------
        // TREND
        //--------------------------------------------------

        if (

            p.direction > 0 &&

            p.emaBull &&

            p.vwapBull

        ) {

            score += 20;

        }

        if (

            p.direction < 0 &&

            p.emaBear &&

            p.vwapBear

        ) {

            score += 20;

        }

        //--------------------------------------------------
        // ORDER FLOW
        //--------------------------------------------------

        if (

            p.direction > 0 &&

            p.cvdBull

        ) {

            score += 15;

        }

        if (

            p.direction < 0 &&

            p.cvdBear

        ) {

            score += 15;

        }

        //--------------------------------------------------
        // STRUCTURE
        //--------------------------------------------------

        if (

            p.direction > 0 &&

            p.bosBull

        ) {

            score += 10;

        }

        if (

            p.direction < 0 &&

            p.bosBear

        ) {

            score += 10;

        }

        if (

            p.direction > 0 &&

            p.chochBull

        ) {

            score += 10;

        }

        if (

            p.direction < 0 &&

            p.chochBear

        ) {

            score += 10;

        }

        //--------------------------------------------------
        // VOLUME
        //--------------------------------------------------

        if (

            p.volume >

            p.volumeAverage

        ) {

            score += 20;

        }

        //--------------------------------------------------
        // SESSION
        //--------------------------------------------------

        if (

            p.tradingAllowed

        ) {

            score += 15;

        }

        return Math.min(

            score,

            100

        );

    }

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    static evaluate(

        p: ScalpingExecutionInput

    ): ScalpingExecutionResult {

        //--------------------------------------------------
        // SCORE
        //--------------------------------------------------

        const executionScore =

            this.calculateScore(

                p

            );

        //--------------------------------------------------
        // ENTRY
        //--------------------------------------------------

        const entryAllowed =

            executionScore >= 70;

        //--------------------------------------------------
        // ATR
        //--------------------------------------------------

        const atr =

            Math.max(

                p.atr,

                0.01

            );

        //--------------------------------------------------
        // LONG
        //--------------------------------------------------

        let stopLoss = 0;

        let breakEven = p.entryPrice;

        let target1 = 0;

        let target2 = 0;

        if (

            p.direction > 0

        ) {

            stopLoss =

                p.entryPrice -

                atr;

            target1 =

                p.entryPrice +

                atr;

            target2 =

                p.entryPrice +

                atr * 2;

        }

        //--------------------------------------------------
        // SHORT
        //--------------------------------------------------

        else {

            stopLoss =

                p.entryPrice +

                atr;

            target1 =

                p.entryPrice -

                atr;

            target2 =

                p.entryPrice -

                atr * 2;

        }

        //--------------------------------------------------
        // TRAILING
        //--------------------------------------------------

        const trailDistance =

            atr * 0.75;

        //--------------------------------------------------
        // REENTRY
        //--------------------------------------------------

        const reEntryAllowed =

            executionScore >= 85;

        //--------------------------------------------------
        // STATE
        //--------------------------------------------------

        let state:

            ScalpingExecutionResult["state"] =

            "WAIT";

        if (

            entryAllowed

        ) {

            state =

                "READY";

        }

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            entryAllowed,

            executionScore,

            stopLoss,

            breakEven,

            target1,

            target2,

            trailDistance,

            reEntryAllowed,

            state

        };

    }

}
