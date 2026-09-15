//======================================================
// src/charts/TradeLevelRenderer.ts
// Institutional Trade Level Renderer
// Phase 13
//======================================================

export interface TradeLevel {

    id: string;
    title: string;
    price: number;
    color: string;
    lineWidth: number;
    lineStyle:
        "solid"
        | "dashed"
        | "dotted";
}


export interface TradeLevels {
    levels: TradeLevel[];

}

export interface RuntimeTrade {
    entryPrice?: number;
    stopLoss?: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
    executionAllowed?: boolean;

}


//======================================================

export class TradeLevelRenderer {

    //--------------------------------------------------
    // BUILD LEVELS
    //--------------------------------------------------

    static build(
        runtime: RuntimeTrade
    ): TradeLevels {

        const levels:
            TradeLevel[] = [];

        //--------------------------------------------------
        // BLOCK INVALID LEVEL DRAWING
        //--------------------------------------------------

        if(
            !runtime.executionAllowed
        ){
            return {
                levels:[]
            };
        }

        //--------------------------------------------------
        // ENTRY
        //--------------------------------------------------

        if (
            runtime.entryPrice != null
        ) {
            levels.push({
                id: "ENTRY",
                title: `ENTRY  ${runtime.entryPrice?.toFixed(2)}`,
                price: runtime.entryPrice,
                color: "#00C853",
                lineWidth: 2,
                lineStyle: "solid"
            });
        }

        //--------------------------------------------------
        // STOP LOSS
        //--------------------------------------------------

        if (
            runtime.stopLoss != null
        ) {
            levels.push({
                id: "SL",
                title: `SL  ${runtime.stopLoss?.toFixed(2)}`,
                price: runtime.stopLoss,
                color: "#FF1744",
                lineWidth: 2,
                lineStyle: "solid"
            });
        }

        //--------------------------------------------------
        // TARGET 1
        //--------------------------------------------------

        if (
            runtime.tp1 != null
        ) {
            levels.push({
                id: "TP1",
                title: `TP1  ${runtime.tp1?.toFixed(2)}`,
                price: runtime.tp1,
                color: "#00E676",
                lineWidth: 1,
                lineStyle: "dashed"
            });
        }

        //--------------------------------------------------
        // TARGET 2
        //--------------------------------------------------

        if (
            runtime.tp2 != null
        ) {
            levels.push({
                id: "TP2",
                title: `TP2  ${runtime.tp2?.toFixed(2)}`,
                price: runtime.tp2,
                color: "#00E676",
                lineWidth: 1,
                lineStyle: "dashed"
            });
        }

        //--------------------------------------------------
        // TARGET 3
        //--------------------------------------------------

        if (
            runtime.tp3 != null
        ) {
            levels.push({
                id: "TP3",
                title: `TP3  ${runtime.tp3?.toFixed(2)}`,
                price: runtime.tp3,
                color: "#00E676",
                lineWidth: 1,
                lineStyle: "dashed"
            });
        }

        return {
            levels
        };
    }

    //--------------------------------------------------
    // CLEAR
    //--------------------------------------------------
    static empty():
        TradeLevels {
        return {
            levels: []
        };
    }
}