/****************************************************************************************
 * File:
 * MarketStructureInput.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketStructure/MarketStructureInput.ts
 *
 * Purpose:
 * Canonical input contract for the AJ v2 Market Structure Engine.
 *
 * This contract contains only the raw market structure inputs consumed
 * by MarketStructureEngine. It contains no calculations or business logic.
 ****************************************************************************************/

export interface MarketStructureInput {

    //--------------------------------------------------
    // BOS
    //--------------------------------------------------

    bosBull: boolean;

    bosBear: boolean;

    //--------------------------------------------------
    // CHOCH
    //--------------------------------------------------

    chochBull: boolean;

    chochBear: boolean;

    //--------------------------------------------------
    // ORDER FLOW
    //--------------------------------------------------

    orderFlowBull: boolean;

    orderFlowBear: boolean;

    //--------------------------------------------------
    // TREND / STRENGTH
    //--------------------------------------------------

    adx: number;

    breakStrength: number;

    //--------------------------------------------------
    // PRICE
    //--------------------------------------------------

    close: number;

    breakLevel: number;

    //--------------------------------------------------
    // SWING
    //--------------------------------------------------

    swingDistance: number;

    internalThreshold: number;

    //--------------------------------------------------
    // MULTI TIMEFRAME
    //--------------------------------------------------

    higherTimeframeAligned: boolean;

}