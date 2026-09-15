// \src\indicators\InsideBar.ts
import type { Candle } from "../types/Candle";

export interface InsideBarResult {

    //--------------------------------------------------
    // DETECTION
    //--------------------------------------------------
    detected: boolean;
    motherIndex: number;
    insideCount: number;
    //--------------------------------------------------
    // RANGE
    //--------------------------------------------------
    motherHigh: number;
    motherLow: number;
    range: number;
    compression: number;
    //--------------------------------------------------
    // BREAKOUT
    //-------------------------------------------------
    breakoutLong: boolean;
    breakoutShort: boolean;
    falseBreakout: boolean;
    breakoutStrength: number;
    //--------------------------------------------------
    // TREND
    //--------------------------------------------------
    bullish: boolean;
    bearish: boolean;
    direction: number;
    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    confidence: number;
}

export class InsideBar {
	
	//--------------------------------------------------
    // PUBLIC HISTORY API
    //--------------------------------------------------

    static calculate(
        candles: Candle[]
    ): InsideBarResult[] {
        return this.buildResults(candles);
    }

    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------

    static analyze(
        candles: Candle[]
    ): InsideBarResult {
        const results =
            this.buildResults(candles);
        if (!results.length) {
            return {
                detected: false,
                motherIndex: -1,
                insideCount: 0,
                motherHigh: 0,
                motherLow: 0,
                range: 0,
                compression: 0,
                breakoutLong: false,
                breakoutShort: false,
                falseBreakout: false,
                breakoutStrength: 0,
                bullish: false,
                bearish: false,
                direction: 0,
                confidence: 0
            };
        }
        return results[results.length - 1];
    }
	
	//=========================================
    // PRIVATE RESULT CALCULATION ENGINE
    //=========================================

    private static buildResults(
        candles: Candle[]
    ): InsideBarResult[] {
        if (candles.length < 2) {
            return [];
        }
        
        const results: InsideBarResult[] = [];
        const current = candles[candles.length - 1];
        let motherIndex = candles.length - 2;
        let mother = candles[motherIndex];
        let insideCount = 0;

        //--------------------------------------------------
        // FIND MOTHER CANDLE
        //--------------------------------------------------

        for (let i = candles.length - 2; i >= 0; i--) {
            const candidate = candles[i];
            if (
                current.high <= candidate.high &&
                current.low >= candidate.low
            ) {
                mother = candidate;
                motherIndex = i;
                insideCount++;
            }
            else {
                break;
            }
        }
        const detected = insideCount > 0;
        const motherHigh = mother.high;
        const motherLow = mother.low;
        const range = motherHigh - motherLow;
        const compression =
            range <= 0
                ? 0
                : Math.min(
                    100,
                    ((current.high - current.low) / range) * 100
                );
        const breakoutLong =
            detected &&
            current.close > motherHigh;
        const breakoutShort =
            detected &&
            current.close < motherLow;
        const falseBreakout =
            detected &&
            (
                (current.high > motherHigh && current.close <= motherHigh)
                ||
                (current.low < motherLow && current.close >= motherLow)
            );
        const bullish = breakoutLong;
        const bearish = breakoutShort;
        const direction =
            bullish
                ? 1
                : bearish
                    ? -1
                    : 0;
        const breakoutStrength =
            breakoutLong
                ? ((current.close - motherHigh) / Math.max(range, 1e-6)) * 100
                : breakoutShort
                    ? ((motherLow - current.close) / Math.max(range, 1e-6)) * 100
                    : 0;
        const confidence =
            detected
                ? Math.min(
                    100,
                    (100 - compression) * 0.5 +
                    Math.abs(breakoutStrength) * 0.5
                )
                : 0;
        results.push({
            detected,
            motherIndex,
            insideCount,
            motherHigh,
            motherLow,
            range,
            compression,
            breakoutLong,
            breakoutShort,
            falseBreakout,
            breakoutStrength,
            bullish,
            bearish,
            direction,
            confidence
        });
        
        return results;
    }
}
