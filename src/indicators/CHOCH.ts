//\src\indicators\CHOCH.ts

import type { Candle } from "../types/Candle";

export interface CHOCHResult {

    //--------------------------------------------------
    // DETECTION
    //--------------------------------------------------

    detected: boolean;
    bullish: boolean;
    bearish: boolean;
    direction: number;

    //--------------------------------------------------
    // MARKET STRUCTURE
    //--------------------------------------------------

    previousTrend: number;
    currentTrend: number;
    swingHigh: number;
    swingLow: number;
    breakLevel: number;

    //--------------------------------------------------
    // REVERSAL
    //--------------------------------------------------

    reversalStrength: number;
    displacement: number;
    bodyStrength: number;
    wickRejection: number;

    //--------------------------------------------------
    // CONFIRMATION
    //--------------------------------------------------

    structureConfirmed: boolean;
    momentumConfirmed: boolean;
    volumeConfirmed: boolean;
    confidence: number;

}

export class CHOCH {

    //--------------------------------------------------
    // PUBLIC HISTORY API
    //--------------------------------------------------

    static calculate(
        candles: Candle[],
        lookback = 5
    ): CHOCHResult[] {

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
    ): CHOCHResult {

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
                previousTrend: 0,
                currentTrend: 0,
                swingHigh: 0,
                swingLow: 0,
                breakLevel: 0,
                reversalStrength: 0,
                displacement: 0,
                bodyStrength: 0,
                wickRejection: 0,
                structureConfirmed: false,
                momentumConfirmed: false,
                volumeConfirmed: false,
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
    ): CHOCHResult[] {

        if (candles.length < lookback + 3) {
            return [];
        }

        const results: CHOCHResult[] = [];

        const current =
            candles[candles.length - 1];

        const previous =
            candles[candles.length - 2];

        const history =
            candles.slice(
                candles.length - lookback - 2,
                candles.length - 2
            );

        const swingHigh =
            Math.max(
                ...history.map(c => c.high)
            );

        const swingLow =
            Math.min(
                ...history.map(c => c.low)
            );

        const previousTrend =
            previous.close > swingHigh
                ? 1
                : previous.close < swingLow
                    ? -1
                    : 0;

        let bullish = false;

        let bearish = false;

        let currentTrend =
            previousTrend;

        if (
            previousTrend <= 0 &&
            current.close > swingHigh
        ) {

            bullish = true;

            currentTrend = 1;

        }

        if (
            previousTrend >= 0 &&
            current.close < swingLow
        ) {

            bearish = true;

            currentTrend = -1;

        }

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
                : bearish
                    ? swingLow
                    : 0;

        const displacement =
            detected
                ? Math.abs(
                    current.close -
                    breakLevel
                )
                : 0;

        const bodyStrength =
            Math.abs(
                current.close -
                current.open
            );

        const candleRange =
            Math.max(
                current.high -
                current.low,
                0.000001
            );

        const wickRejection =
            candleRange -
            bodyStrength;

        const reversalStrength =
            (bodyStrength / candleRange) * 100;

        const momentumConfirmed =
            Math.abs(
                current.close -
                previous.close
            ) >
            candleRange * 0.25;

        const averageVolume =
            history.reduce(
                (sum, c) => sum + (c.volume ?? 0),
                0
            ) / history.length;

        const volumeConfirmed =
            (current.volume ?? 0) >
            averageVolume;

        const structureConfirmed =
            detected;

        let confidence =
            reversalStrength;

        if (momentumConfirmed) {
            confidence += 15;
        }

        if (volumeConfirmed) {
            confidence += 15;
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
            previousTrend,
            currentTrend,
            swingHigh,
            swingLow,
            breakLevel,
            reversalStrength,
            displacement,
            bodyStrength,
            wickRejection,
            structureConfirmed,
            momentumConfirmed,
            volumeConfirmed,
            confidence

        });

        return results;

    }

}