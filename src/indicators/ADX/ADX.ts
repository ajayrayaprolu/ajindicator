//\src\indicators\ADX.ts
//ADX should follow the same dual-API pattern as EMA, VWAP, RSI, ATR so that AJRuntimeContextBuilder can consume:
// ADX.calculate(...) → numeric history (number[]), ADX.calculateResult(...) → full ADXResult[], ADX.analyze(...) → latest ADXResult

//\src\indicators\ADX.ts

import type { Candle } from "../../types/Candle";

export interface ADXResult {

    //--------------------------------------------------
    // CORE VALUES
    //--------------------------------------------------

    adx: number;
    plusDI: number;
    minusDI: number;

    //--------------------------------------------------
    // TREND DIRECTION
    //--------------------------------------------------

    direction: number;

    bullish: boolean;
    bearish: boolean;
    neutral: boolean;

    //--------------------------------------------------
    // TREND STRENGTH
    //--------------------------------------------------

    trendStrength: number;

    strongTrend: boolean;
    weakTrend: boolean;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    diSpread: number;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;

    valid: boolean;

}

export class ADX {

    //--------------------------------------------------
    // PUBLIC NUMERIC API
    //--------------------------------------------------

    static calculate(
        candles: Candle[],
        period = 14
    ): number[] {

        return this
            .calculateResult(
                candles,
                period
            )
            .map(x => x.adx);

    }

    //--------------------------------------------------
    // PUBLIC RESULT HISTORY API
    //--------------------------------------------------

    static calculateResult(
        candles: Candle[],
        period = 14
    ): ADXResult[] {

        if (candles.length < period + 1) {
            return [];
        }

        const result: ADXResult[] = [];

        let trSum = 0;

        let plusDMSum = 0;

        let minusDMSum = 0;

        //--------------------------------------------------
        // INITIAL WINDOW
        //--------------------------------------------------

        for (let i = 1; i <= period; i++) {

            const highDiff =
                candles[i].high -
                candles[i - 1].high;

            const lowDiff =
                candles[i - 1].low -
                candles[i].low;

            const plusDM =
                highDiff > lowDiff &&
                highDiff > 0
                    ? highDiff
                    : 0;

            const minusDM =
                lowDiff > highDiff &&
                lowDiff > 0
                    ? lowDiff
                    : 0;

            const tr =
                Math.max(

                    candles[i].high -
                    candles[i].low,

                    Math.abs(
                        candles[i].high -
                        candles[i - 1].close
                    ),

                    Math.abs(
                        candles[i].low -
                        candles[i - 1].close
                    )

                );

            trSum += tr;

            plusDMSum += plusDM;

            minusDMSum += minusDM;

        }

        let atr =
            trSum / period;

        let plusDI =
            plusDMSum / period;

        let minusDI =
            minusDMSum / period;

        let dx =
            100 *
            Math.abs(
                plusDI -
                minusDI
            ) /
            Math.max(
                plusDI +
                minusDI,
                0.0001
            );

        let adx = dx;

        result.push(
            this.build(
                adx,
                plusDI,
                minusDI
            )
        );

        //--------------------------------------------------
        // WILDER SMOOTHING
        //--------------------------------------------------

        for (
            let i = period + 1;
            i < candles.length;
            i++
        ) {

            const highDiff =
                candles[i].high -
                candles[i - 1].high;

            const lowDiff =
                candles[i - 1].low -
                candles[i].low;

            const plusDM =
                highDiff > lowDiff &&
                highDiff > 0
                    ? highDiff
                    : 0;

            const minusDM =
                lowDiff > highDiff &&
                lowDiff > 0
                    ? lowDiff
                    : 0;

            const tr =
                Math.max(

                    candles[i].high -
                    candles[i].low,

                    Math.abs(
                        candles[i].high -
                        candles[i - 1].close
                    ),

                    Math.abs(
                        candles[i].low -
                        candles[i - 1].close
                    )

                );

            atr =
                (
                    atr *
                    (period - 1)
                    + tr
                ) /
                period;

            plusDI =
                (
                    plusDI *
                    (period - 1)
                    + plusDM
                ) /
                period;

            minusDI =
                (
                    minusDI *
                    (period - 1)
                    + minusDM
                ) /
                period;

            dx =
                100 *
                Math.abs(
                    plusDI -
                    minusDI
                ) /
                Math.max(
                    plusDI +
                    minusDI,
                    0.0001
                );

            adx =
                (
                    adx *
                    (period - 1)
                    + dx
                ) /
                period;

            result.push(

                this.build(
                    adx,
                    plusDI,
                    minusDI
                )

            );

        }

        return result;

    }
	
	//--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------

    static analyze(
        candles: Candle[],
        period = 14
    ): ADXResult {

        const results =
            this.calculateResult(
                candles,
                period
            );

        if (!results.length) {

            return {

                adx: 0,
                plusDI: 0,
                minusDI: 0,

                direction: 0,

                bullish: false,
                bearish: false,
                neutral: true,

                trendStrength: 0,

                strongTrend: false,
                weakTrend: true,

                diSpread: 0,

                confidence: 0,

                valid: false

            };

        }

        return results[
            results.length - 1
        ];

    }

    //=========================================
    // PRIVATE RESULT ENGINE
    //=========================================

    private static build(
        adx: number,
        plusDI: number,
        minusDI: number
    ): ADXResult {

        const direction =
            plusDI > minusDI
                ? 1
                : plusDI < minusDI
                    ? -1
                    : 0;

        const bullish =
            direction === 1;

        const bearish =
            direction === -1;

        const neutral =
            direction === 0;

        const diSpread =
            Math.abs(
                plusDI -
                minusDI
            );

        const strongTrend =
            adx >= 25;

        const weakTrend =
            adx < 20;

        const trendStrength =
            Math.min(
                100,
                adx
            );

        const confidence =
            Math.min(
                100,
                adx +
                diSpread
            );

        return {

            adx,
            plusDI,
            minusDI,

            direction,

            bullish,
            bearish,
            neutral,

            trendStrength,

            strongTrend,
            weakTrend,

            diSpread,

            confidence,

            valid: true

        };

    }

}