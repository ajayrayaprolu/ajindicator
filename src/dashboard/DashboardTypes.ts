//======================================================
// src/dashboard/DashboardTypes.ts
// Institutional Dashboard Contracts
// Runtime + Legacy Compatible
//======================================================


//======================================================
// METRIC
//======================================================

export interface DashboardMetric {

    label:string;

    value:
        string |
        number |
        boolean |
        null;

}


//======================================================
// PANEL
//======================================================

export interface DashboardPanel {


    id:string;

    title:string;


    metrics:

        DashboardMetric[];

}


//======================================================
// AJ DASHBOARD DATA
// Legacy + Runtime Bridge
//======================================================

export interface AJDashboardData {


    //--------------------------------------------------
    // SYMBOL
    //--------------------------------------------------

    symbol?:string;


    //--------------------------------------------------
    // ENGINE STATE
    //--------------------------------------------------

    engineState?:string;

    state?:string;


    //--------------------------------------------------
    // DIRECTION
    //--------------------------------------------------

    tradeDirection?:
        string |
        number;

    direction?:string;


    //--------------------------------------------------
    // SCORES
    //--------------------------------------------------

    score?:number;

    tradeScore?:number;

    confidence?:number;


    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    marketBias?:
        string |
        number;

    bias?:number;

    regime?:string;


    //--------------------------------------------------
    // EXECUTION
    //--------------------------------------------------

    executionAllowed?:boolean;

    execution?:string;


    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionState?:string;


    //--------------------------------------------------
    // TRADE LEVELS
    //--------------------------------------------------

    entry?:number;

    entryPrice?:number;

    stopLoss?:number;

    tp1?:number;

    tp2?:number;

    tp3?:number;


    //--------------------------------------------------
    // OPTION ENGINE
    //--------------------------------------------------

    optionRecommendation?:string;

    optionSymbol?:string;


    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    riskReward?:
        string |
        number;


}