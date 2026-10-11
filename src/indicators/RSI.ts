// RSI calculation and analysis API.
// Output begins at candle index = period, preserving the existing alignment.
export interface RSIResult {
    value: number;
    previous: number;
    overbought: boolean;
    oversold: boolean;
    neutral: boolean;
    direction: number;
    bullishZone: boolean;
    bearishZone: boolean;
    momentumStrength: number;
    trendStrength: number;
    confidence: number;
    valid: boolean;
}

export class RSI {
    static calculate(closes: number[], period = 14): number[] {
        return this.buildResults(closes, period).map(result => result.value);
    }

    static analyze(closes: number[], period = 14): RSIResult {
        const results = this.buildResults(closes, period);
        if (!results.length) {
            return {
                value: 0,
                previous: 0,
                overbought: false,
                oversold: false,
                neutral: true,
                direction: 0,
                bullishZone: false,
                bearishZone: false,
                momentumStrength: 0,
                trendStrength: 0,
                confidence: 0,
                valid: false
            };
        }
        return results[results.length - 1];
    }

    private static buildResults(closes: number[], period = 14): RSIResult[] {
        if (
            !Number.isInteger(period) ||
            period < 1 ||
            closes.length <= period ||
            closes.some(value => !Number.isFinite(value))
        ) {
            return [];
        }

        const changes: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }

        let gainSum = 0;
        let lossSum = 0;
        for (let i = 0; i < period; i++) {
            const change = changes[i];
            if (change > 0) gainSum += change;
            else lossSum -= change;
        }

        let averageGain = gainSum / period;
        let averageLoss = lossSum / period;
        const result: RSIResult[] = [];

        for (let i = period; i < closes.length; i++) {
            if (i > period) {
                const change = changes[i - 1];
                const gain = Math.max(change, 0);
                const loss = Math.max(-change, 0);
                averageGain = ((averageGain * (period - 1)) + gain) / period;
                averageLoss = ((averageLoss * (period - 1)) + loss) / period;
            }

            let value: number;
            if (averageGain === 0 && averageLoss === 0) value = 50;
            else if (averageLoss === 0) value = 100;
            else if (averageGain === 0) value = 0;
            else value = 100 - (100 / (1 + averageGain / averageLoss));

            const previous = result.length ? result[result.length - 1].value : value;
            const overbought = value >= 70;
            const oversold = value <= 30;
            const momentumStrength = Math.abs(value - previous);
            const trendStrength = Math.abs(50 - value);

            result.push({
                value,
                previous,
                overbought,
                oversold,
                neutral: !overbought && !oversold,
                direction: value > previous ? 1 : value < previous ? -1 : 0,
                bullishZone: oversold,
                bearishZone: overbought,
                momentumStrength,
                trendStrength,
                confidence: Math.min(100, trendStrength + momentumStrength),
                valid: true
            });
        }

        return result;
    }
}