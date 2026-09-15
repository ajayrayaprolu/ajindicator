//======================================================
// src/indicators/AJIndicator/options/OptionValidationTypes.ts
// Option Validation Input Contract
//======================================================

export interface OptionValidationInput {

    //--------------------------------------------------
    // OPTION MODE
    //--------------------------------------------------

    isOptionsMode: boolean;
    isOptionChart: boolean;


    //--------------------------------------------------
    // GREEKS
    //--------------------------------------------------

    greekOptionMode: boolean;
    greekExecOk: boolean;


    //--------------------------------------------------
    // UNDERLYING
    //--------------------------------------------------

    underlying: string;

    spotPrice: number;

    masterBias: number;

    strike: number;

    smartStrike: number;

    strikeFromSymbol: number;

    strikeStep: number;

    currentOptionType: string;

    direction: number;


    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    engineState: string;

}