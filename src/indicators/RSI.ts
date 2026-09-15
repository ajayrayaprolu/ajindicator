export interface RSIResult {

    //--------------------------------------------------
    // VALUE
    //--------------------------------------------------
    value: number;
    previous: number;
    //--------------------------------------------------
    // SIGNAL STATE
    //--------------------------------------------------
    overbought: boolean;
    oversold: boolean;
    neutral: boolean;
    direction: number; // 1 bullish, -1 bearish, 0 neutral
    //--------------------------------------------------
    // ZONES
    //--------------------------------------------------
    bullishZone: boolean;
    bearishZone: boolean;
    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------
    momentumStrength: number;
    trendStrength: number;
    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    confidence: number;
    valid: boolean;
}

export class RSI {
	
	//--------------------------------------------------
    // PUBLIC NUMERIC API
    //--------------------------------------------------
    
    static calculate(
        closes: number[],
        period = 14
    ): number[] {
    
        return this
            .buildResults(closes, period)
            .map(x => x.value);
    
    }

    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------
    
    static analyze(
        closes: number[],
        period = 14
    ): RSIResult {
    
        const results =
            this.buildResults(closes, period);
    
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

    //=========================================
    // PRIVATE RESULT CALCULATION ENGINE
    //=========================================
	
    private static buildResults(

        closes: number[],
        period = 14
    ): RSIResult[] {
        if (closes.length <= period) {
            return [];
        }

        const result: RSIResult[] = [];

        for (let i = period; i < closes.length; i++) {

            let gain = 0;
            let loss = 0;

            for (let j = i - period + 1; j <= i; j++) {

                const diff =
                    closes[j] -
                    closes[j - 1];

                if (diff > 0) {
                    gain += diff;
                } else {
                    loss += Math.abs(diff);
                }

            }

            const avgGain =
                gain / period;

            const avgLoss =
                loss / period;

            const rs =
                avgLoss === 0
                    ? 100
                    : avgGain / avgLoss;

            const value =
                100 -
                (100 / (1 + rs));

            const previous =
                result.length > 0
                    ? result[result.length - 1].value
                    : value;

            //--------------------------------------------------
            // ZONES
            //--------------------------------------------------

            const overbought =
                value >= 70;

            const oversold =
                value <= 30;

            const neutral =
                !overbought && !oversold;

            //--------------------------------------------------
            // DIRECTION
            //--------------------------------------------------

            const direction =
                value > previous
                    ? 1
                    : value < previous
                        ? -1
                        : 0;

            //--------------------------------------------------
            // MOMENTUM
            //--------------------------------------------------

            const momentumStrength =
                Math.abs(value - previous);

            const trendStrength =
                Math.abs(50 - value);

            //--------------------------------------------------
            // CONFIDENCE
            //--------------------------------------------------

            const confidence =
                Math.min(
                    100,
                    trendStrength + momentumStrength
                );

            const valid =
                true;

            //--------------------------------------------------
            // ZONE CLASSIFICATION
            //--------------------------------------------------

            const bullishZone =
                oversold;

            const bearishZone =
                overbought;

            result.push({

                value,
                previous,

                overbought,
                oversold,
                neutral,

                direction,

                bullishZone,
                bearishZone,

                momentumStrength,
                trendStrength,

                confidence,
                valid

            });

        }

        return result;

    }

}
