import type { Candle } from "../types/Candle";

export interface VWAPResult {

    //--------------------------------------------------
    // CORE VALUES
    //--------------------------------------------------
    vwap: number;
    price: number;
    deviation: number;
    deviationPercent: number;
    //--------------------------------------------------
    // POSITION RELATIVE TO VWAP
    //--------------------------------------------------
    aboveVWAP: boolean;
    belowVWAP: boolean;
    nearVWAP: boolean;
    //--------------------------------------------------
    // BIAS
    //--------------------------------------------------
    bullishBias: boolean;
    bearishBias: boolean;
    neutral: boolean;
    direction: number; // 1 bullish, -1 bearish, 0 neutral
    //--------------------------------------------------
    // MEAN REVERSION SIGNAL
    //--------------------------------------------------
    stretched: boolean;
    meanReversionLong: boolean;
    meanReversionShort: boolean;
    //--------------------------------------------------
    // STRENGTH
    //--------------------------------------------------
    trendStrength: number;
    //--------------------------------------------------
    // CONFIDENCE
    //--------------------------------------------------
    confidence: number;
    valid: boolean;
}

export class VWAP {
	
	//--------------------------------------------------
    // PUBLIC NUMERIC API
    //--------------------------------------------------
	
	static calculate(
        candles: Candle[]
    ): number[] {
    
        return this
            .buildResults(candles)
            .map(x => x.vwap);
    
    }
	
    //--------------------------------------------------
    // PUBLIC ANALYSIS API
    //--------------------------------------------------
	
     static analyze(
         candles: Candle[]
     ): VWAPResult {
     
        const results =
             this.buildResults(candles);
     
         if (!results.length) {
     
             return {
     
                 vwap: 0,
                 price: 0,
                 deviation: 0,
                 deviationPercent: 0,
     
                 aboveVWAP: false,
                 belowVWAP: false,
                 nearVWAP: true,
     
                 bullishBias: false,
                 bearishBias: false,
                 neutral: true,
     
                 direction: 0,
     
                 stretched: false,
                 meanReversionLong: false,
                 meanReversionShort: false,
     
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
        candles: Candle[]
    ): VWAPResult[] {

        if (candles.length === 0) {
            return [];
        }

        const result: VWAPResult[] = [];

        let cumulativePV = 0;
        let cumulativeVolume = 0;

        for (let i = 0; i < candles.length; i++) {

            const candle = candles[i];

            const volume =
                candle.volume || 1;

            const typicalPrice =
                (candle.high +
                    candle.low +
                    candle.close) / 3;

            cumulativePV +=
                typicalPrice *
                volume;

            cumulativeVolume +=
                volume;

            const vwap =
                cumulativePV /
                Math.max(cumulativeVolume, 0.0001);

            const price =
                candle.close;

            const deviation =
                price - vwap;

            const deviationPercent =
                (deviation / vwap) * 100;

		//--------------------------------------------------
		// POSITION LOGIC
		//--------------------------------------------------
		
		// Small tolerance prevents noisy flips when price is
		// sitting almost exactly on VWAP.
		
		const tolerance =
			Math.max(
				vwap * 0.0005,
				0.01
			);
		
		const aboveVWAP =
			price > (vwap + tolerance);
		
		const belowVWAP =
			price < (vwap - tolerance);
		
		const nearVWAP =
			!aboveVWAP &&
			!belowVWAP;

		//--------------------------------------------------
		// BIAS LOGIC
		//--------------------------------------------------
		
		// Direction should reflect both location relative to
		// VWAP and whether VWAP itself is rising.
		
		const previousVWAP =
			i > 0
				? result[i - 1].vwap
				: vwap;
		
		const vwapSlope =
			vwap - previousVWAP;
		
		let direction = 0;
		
		if (
			aboveVWAP &&
			vwapSlope > 0
		) {
		
			direction = 1;
		
		}
		else if (
			belowVWAP &&
			vwapSlope < 0
		) {
		
			direction = -1;
		
		}

            const bullishBias =
                direction === 1;

            const bearishBias =
                direction === -1;

            const neutral =
                direction === 0;

            //--------------------------------------------------
            // MEAN REVERSION LOGIC
            //--------------------------------------------------

            const stretched =
                Math.abs(deviationPercent) > 1;

            const meanReversionLong =
                belowVWAP && stretched;

            const meanReversionShort =
                aboveVWAP && stretched;

            //--------------------------------------------------
            // STRENGTH MODEL
            //--------------------------------------------------

			const trendStrength =
				Math.min(
					100,
					(
						Math.abs(deviationPercent) * 8
					) +
					(
						Math.abs(vwapSlope) * 200
					)
				);

            //--------------------------------------------------
            // CONFIDENCE MODEL
            //--------------------------------------------------

            const confidence =
                Math.min(
                    100,
                    trendStrength +
                    (nearVWAP ? 10 : 0)
                );

            result.push({

                vwap,
                price,
                deviation,
                deviationPercent,

                aboveVWAP,
                belowVWAP,
                nearVWAP,

                bullishBias,
                bearishBias,
                neutral,
                direction,

                stretched,
                meanReversionLong,
                meanReversionShort,

                trendStrength,

                confidence,
                valid: true

            });

        }

        return result;

    }

}
