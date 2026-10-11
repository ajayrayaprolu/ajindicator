//=================================================
// src\indicators\SuperTrend.ts
//=================================================
// SuperTrend indicator for AJ Institutional.
// calculateResults() is candle-aligned; values before ATR warm-up are null.
// The legacy supertrend() API retains a compact numeric array.
//==========================================================================
export type SupertrendProps = {
    initialArray: Array<{
        high: number;
        low: number;
        close: number;
    }>;
    period?: number;
    multiplier?: number;
};

export interface SuperTrendResult {
    value: number | null;
    direction: 1 | -1 | 0;
    bullish: boolean;
    bearish: boolean;
    reversal: boolean;
    valid: boolean;
}

export class SuperTrend {
    static calculate(
        candles: Array<{ high: number; low: number; close: number }>,
        period = 7,
        multiplier = 3
    ): Array<number | null> {
        return this.calculateResults(candles, period, multiplier).map(item => item.value);
    }

    static calculateResults(
        candles: Array<{ high: number; low: number; close: number }>,
        period = 7,
        multiplier = 3
    ): SuperTrendResult[] {
        const empty = (): SuperTrendResult => ({
            value: null, direction: 0, bullish: false,
            bearish: false, reversal: false, valid: false
        });

        if (
            !Number.isInteger(period) || period < 1 ||
            !Number.isFinite(multiplier) || multiplier <= 0 ||
            candles.some(c =>
                !Number.isFinite(c.high) ||
                !Number.isFinite(c.low) ||
                !Number.isFinite(c.close) ||
                c.high < c.low
            )
        ) {
            return candles.map(() => empty());
        }

        const results = candles.map(() => empty());
        if (candles.length < period) return results;

        const trueRanges: number[] = [];
        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            const previousClose = i > 0 ? candles[i - 1].close : candle.close;
            trueRanges.push(Math.max(
                candle.high - candle.low,
                Math.abs(candle.high - previousClose),
                Math.abs(candle.low - previousClose)
            ));
        }

        let atr = 0;
        for (let i = 0; i < period; i++) atr += trueRanges[i];
        atr /= period;

        let finalUpper = (candles[period - 1].high + candles[period - 1].low) / 2 + multiplier * atr;
        let finalLower = (candles[period - 1].high + candles[period - 1].low) / 2 - multiplier * atr;
        let direction: 1 | -1 = candles[period - 1].close >= (candles[period - 1].high + candles[period - 1].low) / 2 ? 1 : -1;

        results[period - 1] = {
            value: direction === 1 ? finalLower : finalUpper,
            direction,
            bullish: direction === 1,
            bearish: direction === -1,
            reversal: false,
            valid: true
        };

        for (let i = period; i < candles.length; i++) {
            atr = ((atr * (period - 1)) + trueRanges[i]) / period;

            const candle = candles[i];
            const previousClose = candles[i - 1].close;
            const midpoint = (candle.high + candle.low) / 2;
            const basicUpper = midpoint + multiplier * atr;
            const basicLower = midpoint - multiplier * atr;

            const nextUpper =
                basicUpper < finalUpper || previousClose > finalUpper
                    ? basicUpper : finalUpper;
            const nextLower =
                basicLower > finalLower || previousClose < finalLower
                    ? basicLower : finalLower;

            const previousDirection = direction;
            if (direction === -1 && candle.close > finalUpper) direction = 1;
            else if (direction === 1 && candle.close < finalLower) direction = -1;

            finalUpper = nextUpper;
            finalLower = nextLower;

            results[i] = {
                value: direction === 1 ? finalLower : finalUpper,
                direction,
                bullish: direction === 1,
                bearish: direction === -1,
                reversal: direction !== previousDirection,
                valid: true
            };
        }

        return results;
    }
}

export function supertrend({
    initialArray,
    period = 10,
    multiplier = 3
}: SupertrendProps): number[] {
    if (initialArray.length <= period) return [];
    return SuperTrend.calculate(initialArray, period, multiplier)
        .slice(period)
        .map(value => value ?? 0);
}