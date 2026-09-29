//=========================================
// File : .\src\indicators\BOS.ts
//===========================================

import type { Candle } from "../types/Candle";

export interface BOSResult {

    //--------------------------------------------------
    // DETECTION
    //--------------------------------------------------

    detected: boolean;
    bullish: boolean;
    bearish: boolean;
    direction: number;

    //--------------------------------------------------
    // STRUCTURE
    //--------------------------------------------------

    swingHigh: number;
    swingLow: number;
    breakLevel: number;
    breakoutPrice: number;

    //--------------------------------------------------
    // STRENGTH
    //--------------------------------------------------

    breakoutDistance: number;
    breakoutStrength: number;
    momentum: number;
    volumeConfirmation: boolean;

    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------

    confidence: number;

}

export class BOS {

    //--------------------------------------------------
    // PUBLIC HISTORY API
    //--------------------------------------------------

    static calculate(
        candles: Candle[],
        lookback = 5
    ): BOSResult[] {

        return this.buildResults(
            candles,
            lookback
        );

    }

    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------

    static analyze(
        candles: Candle[],
        lookback = 5
    ): BOSResult {

        const results =
            this.buildResults(
                candles,
                lookback
            );

        if (!results.length) {

            return {

                detected: false,
                bullish: false,
                bearish: false,
                direction: 0,
                swingHigh: 0,
                swingLow: 0,
                breakLevel: 0,
                breakoutPrice: 0,
                breakoutDistance: 0,
                breakoutStrength: 0,
                momentum: 0,
                volumeConfirmation: false,
                confidence: 0

            };

        }

        return results[results.length - 1];

    }

    //=========================================
    // PRIVATE RESULT CALCULATION ENGINE
    //=========================================

    private static buildResults(
        candles: Candle[],
        lookback = 5
    ): BOSResult[] {

        if (candles.length < lookback + 2) {
            return [];
        }

        const results: BOSResult[] = [];

        const current =
            candles[candles.length - 1];

        const previousBars =
            candles.slice(
                candles.length - lookback - 1,
                candles.length - 1
            );

        const swingHigh =
            Math.max(
                ...previousBars.map(c => c.high)
            );

        const swingLow =
            Math.min(
                ...previousBars.map(c => c.low)
            );

        //--------------------------------------------------
        // AJ FIX: BOS PERSISTENCE WINDOW
        // A break of structure stays valid for up to
        // BOS_VALIDITY_BARS bars, or until price closes
        // back through the break level (mirroring how
        // OrderBlock tracks mitigation).
        //--------------------------------------------------

        const BOS_VALIDITY_BARS = 10;

        let bosFiredIndex = candles.length - 1;

        let bullish =
            current.close > swingHigh;

        let bearish =
            current.close < swingLow;

        let breakLevel =
            bullish
                ? swingHigh
                : bearish
                    ? swingLow
                    : 0;

        let breakoutPrice =
            current.close;

        if (!bullish && !bearish) {

            const scanStart =
                Math.max(
                    lookback,
                    candles.length - 1 - BOS_VALIDITY_BARS
                );

            for (let i = candles.length - 2; i >= scanStart; i--) {

                const bar = candles[i];

                const priorBars =
                    candles.slice(i - lookback, i);

                if (priorBars.length < lookback) {
                    break;
                }

                const pHigh =
                    Math.max(...priorBars.map(c => c.high));

                const pLow =
                    Math.min(...priorBars.map(c => c.low));

                if (bar.close > pHigh) {

                    bullish = true;

                    breakLevel = pHigh;

                    breakoutPrice = bar.close;

                    bosFiredIndex = i;

                    break;

                }

                if (bar.close < pLow) {

                    bearish = true;

                    breakLevel = pLow;

                    breakoutPrice = bar.close;

                    bosFiredIndex = i;

                    break;

                }

            }

            //--------------------------------------------------
            // INVALIDATION: close back through break level
            //--------------------------------------------------

            if (bullish || bearish) {

                for (let j = bosFiredIndex + 1; j < candles.length; j++) {

                    const c = candles[j];

                    if (bullish && c.close < breakLevel) {

                        bullish = false;

                        break;

                    }

                    if (bearish && c.close > breakLevel) {

                        bearish = false;

                        break;

                    }

                }

            }

        }

        const detected =
            bullish || bearish;

        const direction =
            bullish
                ? 1
                : bearish
                    ? -1
                    : 0;

        const breakoutDistance =
            Math.abs(
                breakoutPrice -
                breakLevel
            );

        const range =
            Math.max(
                current.high -
                current.low,
                0.000001
            );

        const breakoutStrength =
            (breakoutDistance / range) * 100;

        const previous =
            candles[candles.length - 2];

        const momentum =
            Math.abs(
                current.close -
                previous.close
            );

        const currentVolume =
            current.volume ?? 0;

        const averageVolume =
            previousBars.reduce(
                (sum, c) => sum + (c.volume ?? 0),
                0
            ) / previousBars.length;

        const volumeConfirmation =
            currentVolume >
            averageVolume;

        let confidence =
            breakoutStrength;

        if (volumeConfirmation) {
            confidence += 20;
        }

        confidence =
            Math.min(
                100,
                confidence
            );

        results.push({

            detected,
            bullish,
            bearish,
            direction,
            swingHigh,
            swingLow,
            breakLevel,
            breakoutPrice,
            breakoutDistance,
            breakoutStrength,
            momentum,
            volumeConfirmation,
            confidence

        });

        return results;

    }

}