/****************************************************************************************
 * File:
 * VolatilityEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Volatility/VolatilityEngine.ts
 *
 * Purpose:
 * Canonical Volatility Engine for AJ v2.
 *
 * Responsibilities
 * ----------------
 * • ATR analysis
 * • Volatility expansion
 * • Volatility compression
 * • Volatility regime classification
 * • Breakout volatility
 * • Relative volatility
 * • Institutional volatility quality
 *
 * This engine exposes raw volatility intelligence only.
 * It does not generate confidence, authority or trading
 * decisions.
 ****************************************************************************************/

import type {
    VolatilityInput,
    VolatilityDirection,
    VolatilityStrength,
    VolatilityRegime
} from "./VolatilityTypes";

import type {
    VolatilityResult
} from "./VolatilityResult";

export class VolatilityEngine {

    //==================================================
    // ANALYZE
    //==================================================

    static analyze(
        input: VolatilityInput
    ): VolatilityResult {

        //--------------------------------------------------
        // ATR
        //--------------------------------------------------

        const atr = input.atr;

        const averageATR =
            input.averageATR <= 0
                ? atr
                : input.averageATR;

        const atrRatio =
            averageATR === 0
                ? 1
                : atr / averageATR;

        //--------------------------------------------------
        // EXPANSION
        //--------------------------------------------------

        const expansion =
            atrRatio >=
            input.expansionThreshold;

        //--------------------------------------------------
        // COMPRESSION
        //--------------------------------------------------

        const compression =
            atrRatio <=
            input.compressionThreshold;

        //--------------------------------------------------
        // BREAKOUT VOLATILITY
        //--------------------------------------------------

        const breakoutVolatility =
            expansion &&
            input.breakoutStrength >= 60;

        //--------------------------------------------------
        // REGIME
        //--------------------------------------------------

        let regime: VolatilityRegime =
            "NORMAL";

        if (compression)
            regime = "LOW";

        if (expansion)
            regime = "HIGH";

        if (atrRatio >= 2.0)
            regime = "EXTREME";

        //--------------------------------------------------
        // STRENGTH
        //--------------------------------------------------

        let strength: VolatilityStrength =
            "LOW";

        if (atrRatio >= 2.0)
            strength = "EXTREME";
        else if (atrRatio >= 1.50)
            strength = "HIGH";
        else if (atrRatio >= 1.10)
            strength = "MEDIUM";

        //--------------------------------------------------
        // DIRECTION
        //--------------------------------------------------

        let direction: VolatilityDirection =
            "NEUTRAL";

        if (expansion)
            direction = "EXPANDING";

        if (compression)
            direction = "COMPRESSING";

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        let quality = 0;

        quality +=
            Math.min(
                atrRatio * 40,
                40
            );

        if (breakoutVolatility)
            quality += 30;

        if (!compression)
            quality += 30;

        quality =
            Math.min(
                100,
                Math.round(quality)
            );

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // ATR
            //--------------------------------------------------

            atr,

            averageATR,

            atrRatio,

            //--------------------------------------------------
            // REGIME
            //--------------------------------------------------

            volatilityRegime:
                regime,

            volatilityStrength:
                strength,

            volatilityDirection:
                direction,

            //--------------------------------------------------
            // STRUCTURE
            //--------------------------------------------------

            expansion,

            compression,

            breakoutVolatility,

            //--------------------------------------------------
            // QUALITY
            //--------------------------------------------------

            institutionalVolatilityQuality:
                quality,

            //--------------------------------------------------
            // METRICS
            //--------------------------------------------------

            volatilityScore:
                Math.round(
                    atrRatio * 50
                ),

            expansionScore:
                expansion
                    ? 100
                    : 0,

            compressionScore:
                compression
                    ? 100
                    : 0,

            relativeVolatility:
                atrRatio,

            stableVolatility:
                !expansion &&
                !compression

        };

    }

}