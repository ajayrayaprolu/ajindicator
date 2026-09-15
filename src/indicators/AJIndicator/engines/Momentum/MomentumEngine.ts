/****************************************************************************************
 * File:
 * MomentumEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Momentum/MomentumEngine.ts
 *
 * Purpose:
 * Canonical Momentum Engine for AJ v2.
 *
 * This engine evaluates raw market momentum using RSI,
 * acceleration, breakout strength and impulse quality.
 *
 * Responsibilities
 * ----------------
 * • RSI evaluation
 * • Momentum acceleration
 * • Breakout strength
 * • Impulse quality
 * • Bull/Bear momentum
 * • Momentum exhaustion
 * • Institutional momentum quality
 *
 * This engine DOES NOT:
 * • Generate trade signals
 * • Calculate confidence
 * • Execute trades
 * • Perform risk qualification
 ****************************************************************************************/

import type {
    MomentumInput,
    MomentumDirection,
    MomentumStrength,
    MomentumStage
} from "./MomentumTypes";

import type { MomentumResult } from "./MomentumResult";

export class MomentumEngine {

    //==================================================
    // ANALYZE
    //==================================================

    static analyze(
        input: MomentumInput
    ): MomentumResult {

        //--------------------------------------------------
        // RSI
        //--------------------------------------------------

        const bullishRSI =
            input.rsi >= 55;

        const bearishRSI =
            input.rsi <= 45;

        const overbought =
            input.rsi >= 70;

        const oversold =
            input.rsi <= 30;

        //--------------------------------------------------
        // ACCELERATION
        //--------------------------------------------------

        const accelerating =
            input.currentMomentum >
            input.previousMomentum;

        const decelerating =
            input.currentMomentum <
            input.previousMomentum;

        const acceleration =
            input.currentMomentum -
            input.previousMomentum;

        //--------------------------------------------------
        // BREAKOUT
        //--------------------------------------------------

        const breakoutStrength =
            Math.min(
                100,
                Math.max(
                    0,
                    input.breakoutStrength
                )
            );

        const strongBreakout =
            breakoutStrength >= 70;

        //--------------------------------------------------
        // IMPULSE
        //--------------------------------------------------

        const impulseQuality =
            Math.min(
                100,
                Math.max(
                    0,
                    input.impulseQuality
                )
            );

        const impulseBull =
            impulseQuality >= 60 &&
            bullishRSI;

        const impulseBear =
            impulseQuality >= 60 &&
            bearishRSI;

        //--------------------------------------------------
        // DIRECTION
        //--------------------------------------------------

        let direction: MomentumDirection =
            "NEUTRAL";

        if (bullishRSI)
            direction = "BULLISH";

        if (bearishRSI)
            direction = "BEARISH";

        //--------------------------------------------------
        // STRENGTH
        //--------------------------------------------------

        let strength: MomentumStrength =
            "WEAK";

        const composite =
            (
                input.rsi +
                breakoutStrength +
                impulseQuality
            ) / 3;

        if (composite >= 80)
            strength = "EXTREME";
        else if (composite >= 65)
            strength = "STRONG";
        else if (composite >= 50)
            strength = "MODERATE";

        //--------------------------------------------------
        // STAGE
        //--------------------------------------------------

        let stage: MomentumStage =
            "BUILDING";

        if (accelerating)
            stage = "ACCELERATING";

        if (decelerating)
            stage = "DECELERATING";

        if (overbought || oversold)
            stage = "EXHAUSTION";

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        let quality = 0;

        if (bullishRSI || bearishRSI)
            quality += 30;

        if (accelerating)
            quality += 20;

        quality += breakoutStrength * 0.25;

        quality += impulseQuality * 0.25;

        quality = Math.min(100, Math.round(quality));

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // DIRECTION
            //--------------------------------------------------

            direction,

            bullishMomentum: bullishRSI,

            bearishMomentum: bearishRSI,

            neutralMomentum:
                !bullishRSI &&
                !bearishRSI,

            //--------------------------------------------------
            // RSI
            //--------------------------------------------------

            rsi: input.rsi,

            overbought,

            oversold,

            //--------------------------------------------------
            // ACCELERATION
            //--------------------------------------------------

            accelerating,

            decelerating,

            acceleration,

            //--------------------------------------------------
            // BREAKOUT
            //--------------------------------------------------

            breakoutStrength,

            strongBreakout,

            //--------------------------------------------------
            // IMPULSE
            //--------------------------------------------------

            impulseQuality,

            impulseBull,

            impulseBear,

            //--------------------------------------------------
            // STRENGTH
            //--------------------------------------------------

            momentumStrength: strength,

            //--------------------------------------------------
            // QUALITY
            //--------------------------------------------------

            institutionalMomentumQuality:
                quality,

            //--------------------------------------------------
            // STAGE
            //--------------------------------------------------

            momentumStage: stage

        };

    }

}