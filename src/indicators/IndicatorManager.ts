//These indicators should support dual APIs
//| Indicator | calculate() | analyze()      | Required |
//                    EMA
//                     │
//        ┌────────────┴────────────┐
//        │                         │
//calculate()                 analyze()
//(number[])                 (EMAResult)
//        │                         │
//        │                         │
// Chart Engine              AJ Indicator
// IndicatorManager          Runtime Context
// Plotting                  Decision Engine
//                            AI Engine
//
//Exactly the same for RSI, ATR, VWAP, ADX and CVD.
//| Indicator      | `calculate()`    | `analyze()`            | Internal                |
//| -------------- | ---------------- | ---------------------- | ----------------------- |
//| EMA            | `number[]`       | `EMAResult`            | `buildResults()`        |
//| RSI            | `number[]`       | `RSIResult`            | `buildResults()`        |
//| ATR            | `number[]`       | `ATRResult`            | `buildResults()`        |
//| ADX            | `number[]`       | `ADXResult`            | `buildResults()`        |
//| VWAP           | `number[]`       | `VWAPResult`           | `buildResults()`        |
//| CVD            | *(keep for now)* | `CVDResult`            | Existing implementation |
//| BOS            | —                | `BOSResult`            | Existing                |
//| CHOCH          | —                | `CHOCHResult`          | Existing                |
//| FVG            | —                | `FVGResult`            | Existing                |
//| LiquiditySweep | —                | `LiquiditySweepResult` | Existing                |
//| InsideBar      | —                | `InsideBarResult`      | Existing                |

import { EMA, type EMAResult } from "./EMA";
import { RSI, type RSIResult } from "./RSI";
import { ATR, type ATRResult } from "./ATR";
import { ADX, type ADXResult } from "./ADX/ADX";
import { VWAP, type VWAPResult } from "./VWAP";
import { CVD, type CVDResult } from "./CVD";
import { InsideBar, type InsideBarResult } from "./InsideBar";
import { BOS, type BOSResult } from "./BOS";
import { CHOCH, type CHOCHResult } from "./CHOCH";

import {
    LiquiditySweep,
    type LiquiditySweepResult
} from "./LiquiditySweep";

import { FVG, type FVGResult } from "./FVG";
import type { Candle } from "../types/Candle";

//--------------------------------------------------
// UNIFIED INDICATOR SNAPSHOT
//--------------------------------------------------

export interface IndicatorSnapshot {

    //--------------------------------------------------
    // TREND INDICATORS
    //--------------------------------------------------

    ema: EMAResult;
    rsi: RSIResult;
    atr: ATRResult;
    adx: ADXResult;
    vwap: VWAPResult;
    cvd: CVDResult;

    //--------------------------------------------------
    // STRUCTURAL INDICATORS
    //--------------------------------------------------

    insideBar: InsideBarResult;
    bos: BOSResult;
    choch: CHOCHResult;
    liquiditySweep: LiquiditySweepResult;
    fvg: FVGResult;

    //--------------------------------------------------
    // AGGREGATED MARKET STATE
    //--------------------------------------------------

    trendBias: number;
    momentumBias: number;
    volatilityBias: number;
    strengthBias: number;

    regime: "TREND" | "RANGE" | "TRANSITION";

    //--------------------------------------------------
    // DECISION ENGINE
    //--------------------------------------------------

    confluenceScore: number;
    confidence: number;

    //--------------------------------------------------
    // RISK ENGINE
    //--------------------------------------------------

    riskMultiplier: number;
    stopDistance: number;

}

export class IndicatorManager {

    //--------------------------------------------------
    // BUILD SNAPSHOT
    //--------------------------------------------------

    static build(
        candles: Candle[],
        config?: {
            emaPeriod?: number;
            rsiPeriod?: number;
            adxPeriod?: number;
            atrPeriod?: number;
            cvdSmoothing?: number;
            bosLookback?: number;
            chochLookback?: number;
            liquidityLookback?: number;
        }
    ): IndicatorSnapshot {

        //--------------------------------------------------
        // CONFIG
        //--------------------------------------------------

        const emaPeriod =
            config?.emaPeriod ?? 21;

        const rsiPeriod =
            config?.rsiPeriod ?? 14;

        const atrPeriod =
            config?.atrPeriod ?? 14;

        const adxPeriod =
            config?.adxPeriod ?? 14;

        const cvdSmoothing =
            config?.cvdSmoothing ?? 10;

        const bosLookback =
            config?.bosLookback ?? 5;

        const chochLookback =
            config?.chochLookback ?? 5;

        const liquidityLookback =
            config?.liquidityLookback ?? 10;

        //--------------------------------------------------
        // INDICATOR ANALYSIS
        //--------------------------------------------------

        const ema =
            EMA.analyze(
                candles.map(c => c.close),
                emaPeriod
            );

        const rsi =
            RSI.analyze(
                candles.map(c => c.close),
                rsiPeriod
            );

        const atr =
            ATR.analyze(
                candles,
                atrPeriod
            );

        const adx =
            ADX.analyze(
                candles,
                adxPeriod
            );

        const vwap =
            VWAP.analyze(
                candles
            );

        const cvd =
            CVD.analyze(
                candles,
                cvdSmoothing
            );

        //--------------------------------------------------
        // STRUCTURAL ANALYSIS
        //--------------------------------------------------

        const insideBar =
            InsideBar.analyze(
                candles
            );

        const bos =
            BOS.analyze(
                candles,
                bosLookback
            );

        const choch =
            CHOCH.analyze(
                candles,
                chochLookback
            );

        const liquiditySweep =
            LiquiditySweep.analyze(
                candles,
                liquidityLookback
            );

        const fvg =
            FVG.analyze(
                candles
            );

        //--------------------------------------------------
        // MARKET BIAS
        //--------------------------------------------------

        const trendBias =
            ema.direction +
            vwap.direction;

        const momentumBias =
            rsi.direction +
            cvd.trend;

        const volatilityBias =
            atr.direction;

        const strengthBias =
            adx.strongTrend
                ? adx.direction
                : 0;
		
		//--------------------------------------------------
        // REGIME ENGINE
        //--------------------------------------------------

        const regime: "TREND" | "RANGE" | "TRANSITION" =

            adx.strongTrend

                ? "TREND"

                : adx.weakTrend

                    ? "RANGE"

                    : "TRANSITION";

        //--------------------------------------------------
        // CONFLUENCE ENGINE
        //--------------------------------------------------

        let confluenceScore = 0;

        //--------------------------------------------------
        // TREND
        //--------------------------------------------------

        if (ema.bullish) {
            confluenceScore += 15;
        }
        else if (ema.bearish) {
            confluenceScore -= 15;
        }

        if (vwap.bullishBias) {
            confluenceScore += 15;
        }
        else if (vwap.bearishBias) {
            confluenceScore -= 15;
        }

        //--------------------------------------------------
        // MOMENTUM
        //--------------------------------------------------

        if (rsi.direction > 0) {
            confluenceScore += 10;
        }
        else if (rsi.direction < 0) {
            confluenceScore -= 10;
        }

        if (cvd.trend > 0) {
            confluenceScore += 10;
        }
        else if (cvd.trend < 0) {
            confluenceScore -= 10;
        }

        //--------------------------------------------------
        // TREND STRENGTH
        //--------------------------------------------------

        if (adx.strongTrend) {
            confluenceScore +=
                adx.direction > 0
                    ? 15
                    : -15;
        }

        //--------------------------------------------------
        // STRUCTURAL CONFLUENCE
        //--------------------------------------------------

        if (bos.detected) {
            confluenceScore +=
                bos.direction * 10;
        }

        if (choch.detected) {
            confluenceScore +=
                choch.direction * 10;
        }

        if (insideBar.breakoutLong) {
            confluenceScore += 5;
        }

        if (insideBar.breakoutShort) {
            confluenceScore -= 5;
        }

        if (liquiditySweep.detected) {
            confluenceScore +=
                liquiditySweep.direction * 5;
        }

        if (fvg.detected) {
            confluenceScore +=
                fvg.direction * 5;
        }

        //--------------------------------------------------
        // CONFIDENCE
        //--------------------------------------------------

        const confidence =
            Math.min(
                100,
                (
                    ema.confidence +
                    rsi.confidence +
                    atr.confidence +
                    adx.confidence +
                    vwap.confidence +
                    cvd.confidence +
                    insideBar.confidence +
                    bos.confidence +
                    choch.confidence +
                    liquiditySweep.confidence +
                    fvg.confidence
                ) / 11
            );

        //--------------------------------------------------
        // RISK ENGINE
        //--------------------------------------------------

        const riskMultiplier =
            atr.riskMultiplier;

        const stopDistance =
            atr.stopDistance;

        //--------------------------------------------------
        // RETURN SNAPSHOT
        //--------------------------------------------------

        return {

            ema,
            rsi,
            atr,
            adx,
            vwap,
            cvd,

            insideBar,
            bos,
            choch,
            liquiditySweep,
            fvg,

            trendBias,
            momentumBias,
            volatilityBias,
            strengthBias,

            regime,

            confluenceScore,
            confidence,

            riskMultiplier,
            stopDistance

        };

    }

}