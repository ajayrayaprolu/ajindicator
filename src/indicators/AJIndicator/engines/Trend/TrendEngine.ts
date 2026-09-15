/****************************************************************************************
 * File:
 * TrendEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Trend/TrendEngine.ts
 *
 * Purpose:
 * Canonical institutional Trend Engine for AJ v2.
 *
 * This engine converts raw trend-related indicators into a unified
 * trend intelligence model for downstream engines.
 *
 * Responsibilities
 * ----------------
 * • EMA alignment
 * • EMA slope analysis
 * • AlphaTrend approximation
 * • ADX trend strength
 * • Higher timeframe alignment
 * • Trend maturity
 * • Trend acceleration
 * • Pullback detection
 * • Trend exhaustion
 * • Trend continuation
 * • Institutional trend quality
 *
 * This engine DOES NOT:
 * • generate entries
 * • generate exits
 * • calculate confidence
 * • calculate authority
 * • execute trades
 ****************************************************************************************/

import type {
    TrendInput,
    TrendDirection,
    TrendStrength,
    TrendStage
} from "./TrendTypes";

import type { TrendResult } from "./TrendResult";

export class TrendEngine {

    //==================================================
    // ANALYZE
    //==================================================

    static analyze(
        input: TrendInput
    ): TrendResult {

        //--------------------------------------------------
        // EMA ALIGNMENT
        //--------------------------------------------------

        const bullishAlignment =
            input.ema20 >
            input.ema50 &&
            input.ema50 >
            input.ema200;

        const bearishAlignment =
            input.ema20 <
            input.ema50 &&
            input.ema50 <
            input.ema200;

        //--------------------------------------------------
        // EMA SLOPES
        //--------------------------------------------------

        const positiveSlope =
            input.ema20Slope > 0 &&
            input.ema50Slope > 0 &&
            input.ema200Slope > 0;

        const negativeSlope =
            input.ema20Slope < 0 &&
            input.ema50Slope < 0 &&
            input.ema200Slope < 0;

        //--------------------------------------------------
        // ALPHA TREND
        //--------------------------------------------------

        const alphaTrendBull =
            bullishAlignment &&
            positiveSlope &&
            input.close > input.ema20;

        const alphaTrendBear =
            bearishAlignment &&
            negativeSlope &&
            input.close < input.ema20;

        //--------------------------------------------------
        // ADX
        //--------------------------------------------------

        const trendStrength: TrendStrength =
            input.adx >= 40
                ? "VERY_STRONG"
                : input.adx >= 30
                    ? "STRONG"
                    : input.adx >= 20
                        ? "MODERATE"
                        : "WEAK";

        //--------------------------------------------------
        // HTF
        //--------------------------------------------------

        const htfAligned =
            input.htfTrend === 0
                ? true
                : input.htfTrend === 1
                    ? bullishAlignment
                    : bearishAlignment;

        //--------------------------------------------------
        // DIRECTION
        //--------------------------------------------------

        let direction: TrendDirection = "NEUTRAL";

        if (bullishAlignment)
            direction = "BULLISH";

        if (bearishAlignment)
            direction = "BEARISH";

        //--------------------------------------------------
        // MATURITY
        //--------------------------------------------------

        const matureTrend =
            input.adx >= 30 &&
            htfAligned;

        //--------------------------------------------------
        // ACCELERATION
        //--------------------------------------------------

        const accelerating =
            Math.abs(input.ema20Slope) >
            Math.abs(input.ema50Slope);

        const decelerating =
            Math.abs(input.ema20Slope) <
            Math.abs(input.ema50Slope);

        //--------------------------------------------------
        // PULLBACK
        //--------------------------------------------------

        const bullishPullback =
            bullishAlignment &&
            input.close < input.ema20;

        const bearishPullback =
            bearishAlignment &&
            input.close > input.ema20;

        //--------------------------------------------------
        // CONTINUATION
        //--------------------------------------------------

        const continuation =
            matureTrend &&
            htfAligned &&
            !bullishPullback &&
            !bearishPullback;

        //--------------------------------------------------
        // EXHAUSTION
        //--------------------------------------------------

        const exhausted =
            input.adx > 55;

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        let quality = 0;

        if (bullishAlignment || bearishAlignment)
            quality += 30;

        if (positiveSlope || negativeSlope)
            quality += 20;

        if (htfAligned)
            quality += 20;

        quality += Math.min(input.adx, 30);

        quality = Math.min(100, quality);

        //--------------------------------------------------
        // STAGE
        //--------------------------------------------------

        let stage: TrendStage = "RANGE";

        if (continuation)
            stage = "CONTINUATION";
        else if (bullishPullback || bearishPullback)
            stage = "PULLBACK";
        else if (accelerating)
            stage = "ACCELERATION";
        else if (decelerating)
            stage = "DECELERATION";

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // DIRECTION
            //--------------------------------------------------

            direction,

            bullishTrend: bullishAlignment,

            bearishTrend: bearishAlignment,

            neutralTrend:
                !bullishAlignment &&
                !bearishAlignment,

            //--------------------------------------------------
            // EMA
            //--------------------------------------------------

            emaBullishAlignment: bullishAlignment,

            emaBearishAlignment: bearishAlignment,

            emaAligned:
                bullishAlignment ||
                bearishAlignment,

            //--------------------------------------------------
            // SLOPES
            //--------------------------------------------------

            positiveSlope,

            negativeSlope,

            accelerating,

            decelerating,

            //--------------------------------------------------
            // ALPHA TREND
            //--------------------------------------------------

            alphaTrendBull,

            alphaTrendBear,

            //--------------------------------------------------
            // ADX
            //--------------------------------------------------

            adxStrength: trendStrength,

            trendStrengthScore: input.adx,

            //--------------------------------------------------
            // HTF
            //--------------------------------------------------

            higherTimeframeAligned: htfAligned,

            //--------------------------------------------------
            // MATURITY
            //--------------------------------------------------

            matureTrend,

            continuation,

            exhausted,

            bullishPullback,

            bearishPullback,

            //--------------------------------------------------
            // QUALITY
            //--------------------------------------------------

            institutionalTrendQuality: quality,

            //--------------------------------------------------
            // STAGE
            //--------------------------------------------------

            trendStage: stage

        };

    }

}