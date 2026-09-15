//=========================================
// src\indicators\IndicatorLibrary.ts
//=========================================

export class IndicatorLibrary {

    //--------------------------------------------------
    // BASIC STATISTICS
    //--------------------------------------------------

    static sma(values: number[]): number {
        if (!values.length) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    static highest(values: number[]): number {
        if (!values.length) return 0;
        return Math.max(...values);
    }

    static lowest(values: number[]): number {
        if (!values.length) return 0;
        return Math.min(...values);
    }

    //--------------------------------------------------
    // MARKET STRUCTURE HELPERS
    //--------------------------------------------------

    static range(highs: number[], lows: number[]): number {
        if (!highs.length || !lows.length) return 0;
        return this.highest(highs) - this.lowest(lows);
    }

    static midpoint(high: number, low: number): number {
        return (high + low) / 2;
    }

    //--------------------------------------------------
    // VOLATILITY HELPERS
    //--------------------------------------------------

    static standardDeviation(values: number[]): number {
        if (!values.length) return 0;
        const mean = this.sma(values);

        const variance =
            values.reduce((sum, v) =>
                sum + Math.pow(v - mean, 2), 0
            ) / values.length;

        return Math.sqrt(variance);
    }

    //--------------------------------------------------
    // NORMALIZATION HELPERS (IMPORTANT FOR YOUR SYSTEM)
    //--------------------------------------------------

    static normalize(value: number, min: number, max: number): number {
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    //--------------------------------------------------
    // SAFE GUARDS (VERY IMPORTANT FOR BACKTEST STABILITY)
    //--------------------------------------------------

    static safeNumber(value: any, fallback = 0): number {
        const num = Number(value);
        return isNaN(num) ? fallback : num;
    }

}
