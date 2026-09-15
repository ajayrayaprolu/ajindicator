//.\src\indicators\EMA.ts

export interface EMAResult {

    //--------------------------------------------------
    // VALUE
    //--------------------------------------------------
    value: number;
    previous: number;
    //--------------------------------------------------
    // TREND STATE
    //--------------------------------------------------
    direction: number; // 1 bullish, -1 bearish, 0 flat
    bullish: boolean;
    bearish: boolean;
    neutral: boolean;
    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------
    slope: number;
    slopeStrength: number;
    trendStrength: number;
    //--------------------------------------------------
    // REGIME
    //--------------------------------------------------
    isUptrend: boolean;
    isDowntrend: boolean;
    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    confidence: number;
    valid: boolean;
}

export class EMA {
	
	//--------------------------------------------------
    // PUBLIC NUMERIC API
    //--------------------------------------------------
    
    static calculate(
        values: number[],
        period: number
    ): number[] {
    
        return this
            .buildResults(values, period)
            .map(x => x.value);
    
    }
	
    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------
    
    static analyze(
        values: number[],
        period: number
    ): EMAResult {
    
        const results =
            this.buildResults(values, period);
    
        if (!results.length) {
    
            return {
    
                value: 0,
                previous: 0,
    
                direction: 0,
    
                bullish: false,
                bearish: false,
                neutral: true,
    
                slope: 0,
                slopeStrength: 0,
                trendStrength: 0,
    
                isUptrend: false,
                isDowntrend: false,
    
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
        values: number[],
        period: number
    ): EMAResult[] {

        if (values.length < period) {
            return [];
        }

        const result: EMAResult[] = [];

        const multiplier =
            2 / (period + 1);

        let ema =
            values
                .slice(0, period)
                .reduce((a, b) => a + b, 0) /
            period;

        let previousEma = ema;

        result.push({
            value: ema,
            previous: ema,

            direction: 0,
            bullish: false,
            bearish: false,
            neutral: true,

            slope: 0,
            slopeStrength: 0,
            trendStrength: 0,

            isUptrend: false,
            isDowntrend: false,

            confidence: 0,
            valid: true
        });

        for (let i = period; i < values.length; i++) {

            previousEma = ema;

            ema =
                (values[i] - ema) *
                multiplier +
                ema;

            //--------------------------------------------------
            // CORE CALCULATIONS
            //--------------------------------------------------

            const slope =
                ema - previousEma;

			//--------------------------------------------------
			// TREND DIRECTION
			//--------------------------------------------------
			
			const price =
				values[i];
			
			let direction = 0;
			
			if (
				price > ema &&
				slope > 0
			) {
			
				direction = 1;
			
			}
			else if (
				price < ema &&
				slope < 0
			) {
			
				direction = -1;
			
			}

            const slopeStrength =
                Math.abs(slope);

			const distance =
				Math.abs(price - ema);
			
			const trendStrength =
				distance;

            //--------------------------------------------------
            // REGIME DETECTION
            //--------------------------------------------------

            const isUptrend =
                direction === 1;

            const isDowntrend =
                direction === -1;

            const bullish = isUptrend;
            const bearish = isDowntrend;
            const neutral = direction === 0;

            //--------------------------------------------------
            // CONFIDENCE MODEL
            //--------------------------------------------------

			const confidence =
				Math.min(
					100,
					(
						slopeStrength * 20
					) +
					(
						trendStrength * 0.5
					)
				);

            result.push({

                value: ema,
                previous: previousEma,

                direction,

                bullish,
                bearish,
                neutral,

                slope,
                slopeStrength,
                trendStrength,

                isUptrend,
                isDowntrend,

                confidence,
                valid: true

            });

        }

        return result;

    }

}
