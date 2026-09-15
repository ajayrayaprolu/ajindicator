/****************************************************************************************
 * File:
 * MarketStructureResult.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketStructure/MarketStructureResult.ts
 *
 * Purpose:
 * Canonical output contract for the AJ v2 Market Structure Engine.
 *
 * This object represents raw market structure intelligence only.
 * No confidence scoring, trade qualification or execution logic
 * should be implemented in this contract.
 *
 * AJ v2 Architecture
 *
 * MarketState
 *      │
 *      ▼
 * OrderFlow
 *      │
 *      ▼
 * MarketStructure
 *      │
 *      ▼
 * Liquidity
 ****************************************************************************************/

export interface MarketStructureResult {

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
    // STRONG BOS
    //--------------------------------------------------

    strongBullBos: boolean;
    strongBearBos: boolean;

    //--------------------------------------------------
    // WEAK BOS
    //--------------------------------------------------

    weakBullBos: boolean;
    weakBearBos: boolean;

    //--------------------------------------------------
    // FAILED BOS
    //--------------------------------------------------

    failedBullBos: boolean;
    failedBearBos: boolean;

    //--------------------------------------------------
    // INTERNAL BOS
    //--------------------------------------------------

    internalBullBos: boolean;
    internalBearBos: boolean;

    //--------------------------------------------------
    // EXTERNAL BOS
    //--------------------------------------------------

    externalBullBos: boolean;
    externalBearBos: boolean;

    //--------------------------------------------------
    // STRONG CHOCH
    //--------------------------------------------------

    strongBullChoch: boolean;
    strongBearChoch: boolean;

    //--------------------------------------------------
    // WEAK CHOCH
    //--------------------------------------------------

    weakBullChoch: boolean;
    weakBearChoch: boolean;

    //--------------------------------------------------
    // MARKET STRUCTURE
    //--------------------------------------------------

    marketBias: -1 | 0 | 1;

    structureType:
        | "STRONG_BULL_BOS"
        | "STRONG_BEAR_BOS"
        | "BULL_CHOCH"
        | "BEAR_CHOCH"
        | "RANGE";

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    structureQuality: number;

    confidence: number;

    //--------------------------------------------------
    // ANALYTICS
    //--------------------------------------------------

    breakStrength: number;

    swingDistance: number;

}