/****************************************************************************************
 * File:
 * MarketStateEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MarketState/MarketStateEngine.ts
 *
 * Purpose:
 * Determines the current market regime before any institutional analysis begins.
 * This engine classifies the market into Trend, Range, Expansion, Compression,
 * Accumulation, Distribution, News and Session states.
 *
 * Responsibility:
 * • No trade scoring
 * • No confidence calculation
 * • No execution decisions
 * • Produces only raw market-state evidence
 *
 * AJ v2 Architecture
 *
 * Raw Market Data
 *      │
 *      ▼
 * MarketStateEngine
 *      ▼
 * OrderFlowEngine
 *      ▼
 * MarketStructureEngine
 *      ▼
 * ...
 ****************************************************************************************/

import type { MarketStateInput } from "./MarketStateTypes";
import type { MarketStateResult } from "./MarketStateResult";

export class MarketStateEngine {

    //----------------------------------------------------------------------
    // Evaluate
    //----------------------------------------------------------------------

    evaluate(
        input: MarketStateInput
    ): MarketStateResult {

        const {

            close,
            ema20,
            ema50,
            ema200,

            adx,
            atr,

            sessionName,
            currentVolume,
            averageVolume,

            currentTime,

            previousHigh,
            previousLow,

            dayHigh,
            dayLow

        } = input;

        //------------------------------------------------------------------
        // TREND
        //------------------------------------------------------------------

        const bullishTrend =
            close > ema20 &&
            ema20 > ema50 &&
            ema50 > ema200;

        const bearishTrend =
            close < ema20 &&
            ema20 < ema50 &&
            ema50 < ema200;

        //------------------------------------------------------------------
        // RANGE
        //------------------------------------------------------------------

        const ranging =
            !bullishTrend &&
            !bearishTrend &&
            adx < 20;

        //------------------------------------------------------------------
        // EXPANSION
        //------------------------------------------------------------------

        const expansion =
            atr >= input.averageATR * 1.20;

        //------------------------------------------------------------------
        // COMPRESSION
        //------------------------------------------------------------------

        const compression =
            atr <= input.averageATR * 0.80;

        //------------------------------------------------------------------
        // ACCUMULATION
        //------------------------------------------------------------------

        const accumulation =

            ranging &&

            currentVolume >

            averageVolume * 1.20 &&

            close >
            previousLow;

        //------------------------------------------------------------------
        // DISTRIBUTION
        //------------------------------------------------------------------

        const distribution =

            ranging &&

            currentVolume >

            averageVolume * 1.20 &&

            close <
            previousHigh;

        //------------------------------------------------------------------
        // SESSION
        //------------------------------------------------------------------

        const asianSession =
            sessionName === "ASIA";

        const europeanSession =
            sessionName === "EUROPE";

        const usSession =
            sessionName === "US";

        const indianSession =
            sessionName === "INDIA";

        //------------------------------------------------------------------
        // OPENING DRIVE
        //------------------------------------------------------------------

        const openingDrive =
            currentTime <= input.sessionOpen + 30 * 60;

        //------------------------------------------------------------------
        // CLOSING SESSION
        //------------------------------------------------------------------

        const closingSession =
            currentTime >= input.sessionClose - 30 * 60;

        //------------------------------------------------------------------
        // HIGH VOLATILITY
        //------------------------------------------------------------------

        const highVolatility =
            expansion &&
            adx >= 25;

        //------------------------------------------------------------------
        // LOW VOLATILITY
        //------------------------------------------------------------------

        const lowVolatility =
            compression;

        //------------------------------------------------------------------
        // NEWS DETECTION (Placeholder)
        //------------------------------------------------------------------

        const newsEvent = false;

        //------------------------------------------------------------------
        // MARKET STATE
        //------------------------------------------------------------------

        let marketState: MarketStateResult["marketState"] = "RANGE";

        if (bullishTrend)
            marketState = "TREND_BULL";

        else if (bearishTrend)
            marketState = "TREND_BEAR";

        else if (accumulation)
            marketState = "ACCUMULATION";

        else if (distribution)
            marketState = "DISTRIBUTION";

        else if (compression)
            marketState = "COMPRESSION";

        else if (expansion)
            marketState = "EXPANSION";

        //------------------------------------------------------------------
        // MARKET QUALITY
        //------------------------------------------------------------------

        const marketQuality =

            bullishTrend ||

            bearishTrend ||

            accumulation ||

            distribution;

        //------------------------------------------------------------------
        // CONFIDENCE
        //------------------------------------------------------------------

        let confidence = 50;

        if (bullishTrend || bearishTrend)
            confidence += 20;

        if (adx >= 25)
            confidence += 15;

        if (expansion)
            confidence += 10;

        if (compression)
            confidence -= 10;

        confidence = Math.max(
            0,
            Math.min(100, confidence)
        );

        //------------------------------------------------------------------
        // RETURN
        //------------------------------------------------------------------

        return {

            marketState,

            bullishTrend,
            bearishTrend,

            ranging,

            expansion,
            compression,

            accumulation,
            distribution,

            highVolatility,
            lowVolatility,

            asianSession,
            europeanSession,
            usSession,
            indianSession,

            openingDrive,
            closingSession,

            newsEvent,

            marketQuality,

            confidence,

            currentDayHigh:
                dayHigh,

            currentDayLow:
                dayLow

        };

    }

}