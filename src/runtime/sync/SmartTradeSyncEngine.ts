//======================================================
// SmartTradeSyncEngine.ts
// NIFTY ↔ BANKNIFTY
// BTC ↔ SPX500
//======================================================

export type SmartSyncMode =
    | "NSE ↔ BN"
    | "SPX ↔ BTC"
    | "NSE + SPX (ALL)"
    | "Sync OFF";

export interface SmartSyncSignal {

    chartId:
        string;

    symbol:
        string;

    direction:
        number;

    tradeScore:
        number;

    confidence:
        number;

    barIndex:
        number;

    timestamp:
        number;

}

export interface SmartSyncResult {

    enabled:
        boolean;

    pair:
        string;

    available:
        boolean;

    aligned:
        boolean;

    detached:
        boolean;

    direction:
        number;

    score:
        number;

    confidence:
        number;

    barDistance:
        number;

    reason:
        string;

}

export class SmartTradeSyncEngine {

    private static signals =
        new Map<string, SmartSyncSignal>();

    //--------------------------------------------------
    // SYMBOL NORMALIZATION
    //--------------------------------------------------

    private static normalize(
        symbol:string
    ):string {

        return (
            symbol
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
        );

    }

    //--------------------------------------------------
    // PAIR
    //--------------------------------------------------

    private static pairFor(
        symbol:string
    ):
        "NSE"
        | "SPX"
        | null {

        const s =
            this.normalize(symbol);

        if(
            s.includes("BANKNIFTY") ||
            s.includes("NIFTY")
        ){

            return "NSE";

        }

        if(
            s.includes("BTC") ||
            s.includes("XBT")
        ){

            return "SPX";

        }

        if(
            s.includes("SPX") ||
            s.includes("SP500") ||
            s.includes("US500")
        ){

            return "SPX";

        }

        return null;

    }

    //--------------------------------------------------
    // COUNTERPART
    //--------------------------------------------------

    private static counterpart(
        symbol:string
    ):string | null {

        const s =
            this.normalize(symbol);

        if(
            s.includes("BANKNIFTY")
        ){

            return "NIFTY";

        }

        if(
            s.includes("NIFTY")
        ){

            return "BANKNIFTY";

        }

        if(
            s.includes("BTC") ||
            s.includes("XBT")
        ){

            return "SPX";

        }

        if(
            s.includes("SPX") ||
            s.includes("SP500") ||
            s.includes("US500")
        ){

            return "BTC";

        }

        return null;

    }

    //--------------------------------------------------
    // MODE ENABLEMENT
    //--------------------------------------------------

    private static enabledFor(
        mode:SmartSyncMode,
        symbol:string
    ):boolean {

        const pair =
            this.pairFor(symbol);

        if(
            mode === "Sync OFF" ||
            pair === null
        ){

            return false;

        }

        if(
            mode === "NSE ↔ BN"
        ){

            return pair === "NSE";

        }

        if(
            mode === "SPX ↔ BTC"
        ){

            return pair === "SPX";

        }

        return true;

    }

    //--------------------------------------------------
    // PUBLISH
    //--------------------------------------------------

    static publish(
        signal:SmartSyncSignal
    ):void {

        this.signals.set(
            this.normalize(signal.symbol),
            {
                ...signal,
                timestamp:
                    Date.now()
            }
        );

    }

    //--------------------------------------------------
    // CLEAR
    //--------------------------------------------------

    static clear(
        chartId:string
    ):void {

        for(
            const [symbol, signal]
            of this.signals
        ){

            if(
                signal.chartId === chartId
            ){

                this.signals.delete(symbol);

            }

        }

    }

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(
        input: {

            chartId:
                string;

            symbol:
                string;

            direction:
                number;

            tradeScore:
                number;

            confidence:
                number;

            barIndex:
                number;

            mode:
                SmartSyncMode;

            syncBars:
                number;

            desyncBars:
                number;

        }
    ):SmartSyncResult {

        const enabled =
            this.enabledFor(
                input.mode,
                input.symbol
            );

        if(!enabled){

            return {

                enabled:false,
                pair:"NONE",
                available:false,
                aligned:true,
                detached:false,
                direction:0,
                score:0,
                confidence:0,
                barDistance:0,
                reason:"SYNC OFF / NOT APPLICABLE"

            };

        }

        const pair =
            this.pairFor(
                input.symbol
            ) ?? "NONE";

        const counterpart =
            this.counterpart(
                input.symbol
            );

        if(!counterpart){

            return {

                enabled:true,
                pair,
                available:false,
                aligned:true,
                detached:false,
                direction:0,
                score:0,
                confidence:0,
                barDistance:0,
                reason:"COUNTERPART UNKNOWN"

            };

        }

        const other =
            this.signals.get(
                counterpart
            );

        if(!other){

            return {

                enabled:true,
                pair,
                available:false,
                aligned:true,
                detached:false,
                direction:0,
                score:0,
                confidence:0,
                barDistance:0,
                reason:
                    `WAITING FOR ${counterpart}`

            };

        }

        const barDistance =
            Math.abs(
                input.barIndex -
                other.barIndex
            );

        const directionAligned =
            input.direction === 0 ||
            other.direction === 0 ||
            input.direction === other.direction;

        const detached =
            barDistance >
            Math.max(
                input.desyncBars,
                0
            );

        const aligned =
            !detached &&
            directionAligned;

        const score =
            Math.round(
                (
                    input.tradeScore +
                    other.tradeScore
                ) / 2
            );

        const confidence =
            Math.round(
                (
                    input.confidence +
                    other.confidence
                ) / 2
            );

        let reason =
            "SYNC ALIGNED";

        if(detached){

            reason =
                `SYNC DETACHED: ${barDistance} BARS`;

        }
        else if(!directionAligned){

            reason =
                "COUNTERPART DIRECTION CONFLICT";

        }
        else if(
            barDistance >
            input.syncBars
        ){

            reason =
                `SYNC WEAK: ${barDistance} BARS`;

        }

        return {

            enabled:true,
            pair,
            available:true,
            aligned,
            detached,
            direction:
                other.direction,
            score,
            confidence,
            barDistance,
            reason

        };

    }

}