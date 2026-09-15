//\src\indicators\BOS.ts
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

        const bullish =
            current.close > swingHigh;

        const bearish =
            current.close < swingLow;

        const detected =
            bullish || bearish;

        const direction =
            bullish
                ? 1
                : bearish
                    ? -1
                    : 0;

        const breakLevel =
            bullish
                ? swingHigh
                : swingLow;

        const breakoutPrice =
            current.close;

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