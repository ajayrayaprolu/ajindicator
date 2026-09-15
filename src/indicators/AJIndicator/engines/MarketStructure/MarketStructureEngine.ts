/****************************************************************************************
 * File:
 * MarketStructureEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketStructure/MarketStructureEngine.ts
 *
 * Purpose:
 * Evaluates institutional market structure for AJ v2.
 *
 * This engine classifies BOS/CHOCH into stronger institutional
 * structure types while remaining independent from scoring,
 * confidence and execution.
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
 *
 ****************************************************************************************/

import type { MarketStructureInput } from "./MarketStructureInput";
import type { MarketStructureResult } from "./MarketStructureResult";

export class MarketStructureEngine {

    //==================================================
    // Evaluate
    //==================================================

    evaluate(
        input: MarketStructureInput
    ): MarketStructureResult {

        //--------------------------------------------------
        // BOS
        //--------------------------------------------------

        const bosBull =
            input.bosBull;

        const bosBear =
            input.bosBear;

        //--------------------------------------------------
        // CHOCH
        //--------------------------------------------------

        const chochBull =
            input.chochBull;

        const chochBear =
            input.chochBear;

        //--------------------------------------------------
        // BOS STRENGTH
        //--------------------------------------------------

        const strongBullBos =
            bosBull &&
            input.orderFlowBull &&
            input.adx >= 25 &&
            input.breakStrength >= 70;

        const strongBearBos =
            bosBear &&
            input.orderFlowBear &&
            input.adx >= 25 &&
            input.breakStrength >= 70;

        const weakBullBos =
            bosBull &&
            !strongBullBos;

        const weakBearBos =
            bosBear &&
            !strongBearBos;

        //--------------------------------------------------
        // FAILED BOS
        //--------------------------------------------------

        const failedBullBos =
            bosBull &&
            input.close < input.breakLevel;

        const failedBearBos =
            bosBear &&
            input.close > input.breakLevel;

        //--------------------------------------------------
        // INTERNAL BOS
        //--------------------------------------------------

        const internalBullBos =
            bosBull &&
            input.swingDistance <
            input.internalThreshold;

        const internalBearBos =
            bosBear &&
            input.swingDistance <
            input.internalThreshold;

        //--------------------------------------------------
        // EXTERNAL BOS
        //--------------------------------------------------

        const externalBullBos =
            bosBull &&
            input.swingDistance >=
            input.internalThreshold;

        const externalBearBos =
            bosBear &&
            input.swingDistance >=
            input.internalThreshold;

        //--------------------------------------------------
        // CHOCH STRENGTH
        //--------------------------------------------------

        const strongBullChoch =
            chochBull &&
            input.orderFlowBull &&
            input.breakStrength >= 65;

        const strongBearChoch =
            chochBear &&
            input.orderFlowBear &&
            input.breakStrength >= 65;

        const weakBullChoch =
            chochBull &&
            !strongBullChoch;

        const weakBearChoch =
            chochBear &&
            !strongBearChoch;

        //--------------------------------------------------
        // MARKET BIAS
        //--------------------------------------------------

        let marketBias: -1 | 0 | 1 = 0;

        if (
            strongBullBos ||
            strongBullChoch
        ) {
            marketBias = 1;
        }

        if (
            strongBearBos ||
            strongBearChoch
        ) {
            marketBias = -1;
        }

        //--------------------------------------------------
        // STRUCTURE QUALITY
        //--------------------------------------------------

        let quality = 50;

        if (
            strongBullBos ||
            strongBearBos
        ) {
            quality += 20;
        }

        if (
            strongBullChoch ||
            strongBearChoch
        ) {
            quality += 15;
        }

        if (
            input.orderFlowBull ||
            input.orderFlowBear
        ) {
            quality += 10;
        }

        if (
            failedBullBos ||
            failedBearBos
        ) {
            quality -= 20;
        }

        quality =
            Math.max(
                0,
                Math.min(100, quality)
            );

        //--------------------------------------------------
        // CONFIDENCE
        //--------------------------------------------------

        let confidence =
            quality;

        if (
            input.higherTimeframeAligned
        ) {
            confidence += 10;
        }

        confidence =
            Math.max(
                0,
                Math.min(100, confidence)
            );

        //--------------------------------------------------
        // PRIMARY STRUCTURE
        //--------------------------------------------------

        let structureType: MarketStructureResult["structureType"] =
            "RANGE";

        if (strongBullBos)
            structureType = "STRONG_BULL_BOS";

        else if (strongBearBos)
            structureType = "STRONG_BEAR_BOS";

        else if (strongBullChoch)
            structureType = "BULL_CHOCH";

        else if (strongBearChoch)
            structureType = "BEAR_CHOCH";

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // BOS
            //--------------------------------------------------

            bosBull,
            bosBear,

            //--------------------------------------------------
            // CHOCH
            //--------------------------------------------------

            chochBull,
            chochBear,

            //--------------------------------------------------
            // BOS TYPES
            //--------------------------------------------------

            strongBullBos,
            strongBearBos,

            weakBullBos,
            weakBearBos,

            failedBullBos,
            failedBearBos,

            internalBullBos,
            internalBearBos,

            externalBullBos,
            externalBearBos,

            //--------------------------------------------------
            // CHOCH TYPES
            //--------------------------------------------------

            strongBullChoch,
            strongBearChoch,

            weakBullChoch,
            weakBearChoch,

            //--------------------------------------------------
            // MARKET STRUCTURE
            //--------------------------------------------------

            marketBias,

            structureType,

            structureQuality:
                quality,

            confidence,

            //--------------------------------------------------
            // METADATA
            //--------------------------------------------------

            breakStrength:
                input.breakStrength,

            swingDistance:
                input.swingDistance

        };

    }

}