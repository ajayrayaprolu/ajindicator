//\src\indicators\LiquiditySweep.ts

import type { Candle } from "../types/Candle";

export interface LiquiditySweepResult {

    //--------------------------------------------------
    // DETECTION
    //--------------------------------------------------

    detected: boolean;
    bullish: boolean;
    bearish: boolean;
    direction: number;

    //--------------------------------------------------
    // SWEEP
    //--------------------------------------------------

    sweepHigh: boolean;
    sweepLow: boolean;
    liquidityLevel: number;
    sweepDistance: number;

    //--------------------------------------------------
    // REJECTION
    //--------------------------------------------------

    rejectionStrength: number;
    wickRatio: number;
    bodyRecovery: number;
    stopHuntDetected: boolean;

    //--------------------------------------------------
    // CONFIRMATION
    //--------------------------------------------------

    volumeConfirmation: boolean;
    structureConfirmation: boolean;
    recoveredInsideRange: boolean;

    //--------------------------------------------------
    // QUALITY
    //--------------------------------------------------

    strength: number;
    confidence: number;

}

export class LiquiditySweep {

    //--------------------------------------------------
    // PUBLIC HISTORY API
    //--------------------------------------------------

    static calculate(
        candles: Candle[],
        lookback = 10
    ): LiquiditySweepResult[] {

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
        lookback = 10
    ): LiquiditySweepResult {

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
                sweepHigh: false,
                sweepLow: false,
                liquidityLevel: 0,
                sweepDistance: 0,
                rejectionStrength: 0,
                wickRatio: 0,
                bodyRecovery: 0,
                stopHuntDetected: false,
                volumeConfirmation: false,
                structureConfirmation: false,
                recoveredInsideRange: false,
                strength: 0,
                confidence: 0

            };

        }

        return results[results.length - 1];

    }

    //=========================================
    // PRIVATE RESULT ENGINE
    //=========================================

    private static buildResults(
        candles: Candle[],
        lookback = 10
    ): LiquiditySweepResult[] {

        if (candles.length < lookback + 2) {
            return [];
        }

        const results: LiquiditySweepResult[] = [];

        const current = candles[candles.length - 1];

        const history =
            candles.slice(
                candles.length - lookback - 1,
                candles.length - 1
            );

        const highestHigh =
            Math.max(...history.map(c => c.high));

        const lowestLow =
            Math.min(...history.map(c => c.low));

        const sweepHigh =
            current.high > highestHigh &&
            current.close < highestHigh;

        const sweepLow =
            current.low < lowestLow &&
            current.close > lowestLow;

        const detected =
            sweepHigh || sweepLow;

        const bullish = sweepLow;

        const bearish = sweepHigh;

        const direction =
            bullish ? 1 :
            bearish ? -1 : 0;

        const liquidityLevel =
            bullish
                ? lowestLow
                : bearish
                    ? highestHigh
                    : 0;

        const sweepDistance =
            bullish
                ? liquidityLevel - current.low
                : bearish
                    ? current.high - liquidityLevel
                    : 0;

        const candleRange =
            Math.max(
                current.high - current.low,
                0.000001
            );

        const bodySize =
            Math.abs(
                current.close -
                current.open
            );

        const upperWick =
            current.high -
            Math.max(
                current.open,
                current.close
            );

        const lowerWick =
            Math.min(
                current.open,
                current.close
            ) -
            current.low;

        const rejectionStrength =
            bullish
                ? (lowerWick / candleRange) * 100
                : bearish
                    ? (upperWick / candleRange) * 100
                    : 0;

        const wickRatio =
            ((upperWick + lowerWick) / candleRange) * 100;

        const bodyRecovery =
            (bodySize / candleRange) * 100;

        const averageVolume =
            history.reduce(
                (s, c) => s + (c.volume ?? 0),
                0
            ) / history.length;

        const volumeConfirmation =
            (current.volume ?? 0) >
            averageVolume;

        const recoveredInsideRange =
            bullish
                ? current.close > lowestLow
                : bearish
                    ? current.close < highestHigh
                    : false;

        const structureConfirmation =
            detected &&
            recoveredInsideRange;

        const stopHuntDetected =
            detected &&
            rejectionStrength >= 40 &&
            recoveredInsideRange;

        let strength =
            rejectionStrength * 0.5 +
            bodyRecovery * 0.2 +
            Math.min(30, sweepDistance);

        if (volumeConfirmation) {
            strength += 10;
        }

        strength = Math.min(100, strength);

        let confidence = strength;

        if (structureConfirmation)
            confidence += 10;

        if (stopHuntDetected)
            confidence += 10;

        confidence = Math.min(100, confidence);

        results.push({

            detected,
            bullish,
            bearish,
            direction,
            sweepHigh,
            sweepLow,
            liquidityLevel,
            sweepDistance,
            rejectionStrength,
            wickRatio,
            bodyRecovery,
            stopHuntDetected,
            volumeConfirmation,
            structureConfirmation,
            recoveredInsideRange,
            strength,
            confidence

        });

        return results;

    }

}