/****************************************************************************************
 * File:
 * PriceActionEngine.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/PriceAction/PriceActionEngine.ts
 *
 * Purpose:
 * Detects institutional price action from raw OHLC candles.
 *
 * Responsibilities
 * • Candle Quality
 * • Wick Analysis
 * • Body Analysis
 * • Rejections
 * • Engulfing
 * • Pin Bars
 * • Hammer / Shooting Star
 * • Compression
 * • Expansion
 * • Institutional Candle Metrics
 *
 * This engine ONLY detects evidence.
 * No confidence scoring or trade decisions belong here.
 ****************************************************************************************/

import type { Candle } from "../../../../types/Candle";
import type { PriceActionResult } from "./PriceActionResult";

export class PriceActionEngine {

    private static readonly LOOKBACK = 20;

    private static readonly LONG_WICK_PERCENT = 60;

    private static readonly STRONG_BODY_PERCENT = 70;

    private static readonly DOJI_BODY_PERCENT = 10;

    static evaluate(
        candles: Candle[]
    ): PriceActionResult {

        if (candles.length < 3) {
            return this.empty();
        }

        const current = candles.at(-1)!;
        const previous = candles.at(-2)!;

        //--------------------------------------------------
        // BASIC VALUES
        //--------------------------------------------------

        const range =
            Math.max(
                current.high - current.low,
                Number.EPSILON
            );

        const body =
            Math.abs(
                current.close - current.open
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

        //--------------------------------------------------
        // PERCENTAGES
        //--------------------------------------------------

        const bodyPercent =
            body / range * 100;

        const upperPercent =
            upperWick / range * 100;

        const lowerPercent =
            lowerWick / range * 100;

        //--------------------------------------------------
        // BODY QUALITY
        //--------------------------------------------------

        const bullish =
            current.close > current.open;

        const bearish =
            current.close < current.open;

        const strongBull =
            bullish &&
            bodyPercent >= this.STRONG_BODY_PERCENT;

        const strongBear =
            bearish &&
            bodyPercent >= this.STRONG_BODY_PERCENT;

        const weakBull =
            bullish &&
            bodyPercent < this.STRONG_BODY_PERCENT;

        const weakBear =
            bearish &&
            bodyPercent < this.STRONG_BODY_PERCENT;

        const neutral =
            Math.abs(
                current.close -
                current.open
            ) < Number.EPSILON;

        //--------------------------------------------------
        // WICKS
        //--------------------------------------------------

        const longUpperWick =
            upperPercent >=
            this.LONG_WICK_PERCENT;

        const longLowerWick =
            lowerPercent >=
            this.LONG_WICK_PERCENT;

        const balancedWick =
            Math.abs(
                upperPercent -
                lowerPercent
            ) <= 10;

        const exhaustionWick =
            longUpperWick ||
            longLowerWick;

        //--------------------------------------------------
        // REJECTIONS
        //--------------------------------------------------

        const bullishRejection =
            longLowerWick &&
            bullish;

        const bearishRejection =
            longUpperWick &&
            bearish;

        const doubleRejection =
            bullishRejection &&
            previous.close > previous.open;

        const tripleRejection =
            doubleRejection &&
            candles.at(-3)!.close >
            candles.at(-3)!.open;

        //--------------------------------------------------
        // PATTERNS
        //--------------------------------------------------

        const bullishEngulfing =
            previous.close < previous.open &&
            current.close > previous.open &&
            current.open < previous.close;

        const bearishEngulfing =
            previous.close > previous.open &&
            current.close < previous.open &&
            current.open > previous.close;

        const pinBar =
            bodyPercent < 25 &&
            (longUpperWick || longLowerWick);

        const hammer =
            bullish &&
            longLowerWick &&
            bodyPercent < 40;

        const invertedHammer =
            bullish &&
            longUpperWick &&
            bodyPercent < 40;

        const shootingStar =
            bearish &&
            longUpperWick &&
            bodyPercent < 40;

        const doji =
            bodyPercent <=
            this.DOJI_BODY_PERCENT;

        const insideBar =
            current.high <= previous.high &&
            current.low >= previous.low;

        const outsideBar =
            current.high >= previous.high &&
            current.low <= previous.low;

        //--------------------------------------------------
        // COMPRESSION
        //--------------------------------------------------

        const history =
            candles.slice(
                -this.LOOKBACK
            );

        const avgRange =
            history.reduce(
                (a, c) =>
                    a +
                    (c.high - c.low),
                0
            ) / history.length;

        const compression =
            range <
            avgRange * 0.70;

        const tightRange =
            range <
            avgRange * 0.50;

        //--------------------------------------------------
        // EXPANSION
        //--------------------------------------------------

        const expansion =
            range >
            avgRange * 1.50;

        const impulseCandle =
            expansion &&
            bodyPercent >= 70;

        const expansionAfterCompression =
            compression &&
            previous.high -
            previous.low <
            avgRange * 0.70;

        const expansionStrength =
            Math.min(
                100,
                Math.round(
                    range /
                    avgRange *
                    100
                )
            );

        //--------------------------------------------------
        // METRICS
        //--------------------------------------------------

        const bodyDominance =
            bodyPercent;

        const wickDominance =
            upperPercent +
            lowerPercent;

        const closePosition =
            (
                (current.close -
                current.low) /
                range
            ) * 100;

        const openPosition =
            (
                (current.open -
                current.low) /
                range
            ) * 100;

        const relativeCandleSize =
            range / avgRange;

        const averageCandleRatio =
            relativeCandleSize;

        //--------------------------------------------------
        // REVERSALS
        //--------------------------------------------------

        const bullishExhaustion =
            bearishRejection &&
            expansion;

        const bearishExhaustion =
            bullishRejection &&
            expansion;

        const buyingClimax =
            strongBull &&
            expansion;

        const sellingClimax =
            strongBear &&
            expansion;

        //--------------------------------------------------
        // QUALITY
        //--------------------------------------------------

        let quality = 50;

        if (strongBull || strongBear)
            quality += 20;

        if (bullishEngulfing || bearishEngulfing)
            quality += 15;

        if (bullishRejection || bearishRejection)
            quality += 10;

        if (pinBar)
            quality += 10;

        quality =
            Math.min(
                100,
                quality
            );

        //--------------------------------------------------
        // RETURN
        //--------------------------------------------------

        return {

            strongBull,

            strongBear,

            weakBull,

            weakBear,

            neutral,

            bodyPercent,

            upperWickPercent: upperPercent,

            lowerWickPercent: lowerPercent,

            longUpperWick,

            longLowerWick,

            balancedWick,

            exhaustionWick,

            bullishRejection,

            bearishRejection,

            doubleRejection,

            tripleRejection,

            bullishEngulfing,

            bearishEngulfing,

            pinBar,

            hammer,

            invertedHammer,

            shootingStar,

            doji,

            insideBar,

            outsideBar,

            compression,

            tightRange,

            atrCompression: compression,

            expansion,

            impulseCandle,

            expansionAfterCompression,

            expansionStrength,

            bodyDominance,

            wickDominance,

            closePosition,

            openPosition,

            relativeCandleSize,

            averageCandleRatio,

            bullishExhaustion,

            bearishExhaustion,

            buyingClimax,

            sellingClimax,
			
			marketBias:
				strongBull
					? 1
					: strongBear
						? -1
						: 0,
			
			priceActionState:
				expansion
					? "EXPANSION"
					: compression
						? "COMPRESSION"
						: strongBull
							? "BULLISH"
							: strongBear
								? "BEARISH"
								: "NEUTRAL",
			
			dominantPattern:
				bullishEngulfing || bearishEngulfing
					? "ENGULFING"
					: pinBar
						? "PINBAR"
						: hammer
							? "HAMMER"
							: shootingStar
								? "SHOOTING_STAR"
								: doji
									? "DOJI"
									: insideBar
										? "INSIDE_BAR"
										: outsideBar
											? "OUTSIDE_BAR"
											: "NONE",

            candleQuality: quality,

            confidence: quality

        };

    }

    //--------------------------------------------------

    private static empty(): PriceActionResult {

        return {

            strongBull:false,
            strongBear:false,
            weakBull:false,
            weakBear:false,
            neutral:false,

            bodyPercent:0,
            upperWickPercent:0,
            lowerWickPercent:0,

            longUpperWick:false,
            longLowerWick:false,
            balancedWick:false,
            exhaustionWick:false,

            bullishRejection:false,
            bearishRejection:false,
            doubleRejection:false,
            tripleRejection:false,

            bullishEngulfing:false,
            bearishEngulfing:false,

            pinBar:false,
            hammer:false,
            invertedHammer:false,
            shootingStar:false,
            doji:false,

            insideBar:false,
            outsideBar:false,

            compression:false,
            tightRange:false,
            atrCompression:false,

            expansion:false,
            impulseCandle:false,
            expansionAfterCompression:false,
            expansionStrength:0,

            bodyDominance:0,
            wickDominance:0,
            closePosition:0,
            openPosition:0,
            relativeCandleSize:0,
            averageCandleRatio:0,

            bullishExhaustion:false,
            bearishExhaustion:false,
            buyingClimax:false,
			sellingClimax:false,
			
			marketBias:0,
			
			priceActionState:"NEUTRAL",
			
			dominantPattern:"NONE",
			
			candleQuality:0,
            confidence:0

        };

    }

}