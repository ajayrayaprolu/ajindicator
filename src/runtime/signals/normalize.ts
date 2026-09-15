//======================================================
// src\runtime\signals\normalize.ts
// Canonical Signal Normalizer
//======================================================

import type { Signal } from "./Signal";
import type { AJDecisionResult } from "../../indicators/AJIndicator/AJTypes";

export class Normalize {

    //--------------------------------------------------

    static lastNumber(series: unknown): number {
        if (typeof series==="number")
            return series;
        if(Array.isArray(series)){
            const last=series.at(-1);
            return typeof last==="number"
                ?last
                :0;
        }
        return 0;
    }

    //--------------------------------------------------

    static bool(value: unknown): boolean{
        return value===true;
    }

    //--------------------------------------------------

    static direction(value:number):-1|0|1{
        if(value>0) return 1;
        if(value<0) return -1;
        return 0;
    }

    //--------------------------------------------------

	static toSignal(
		d: AJDecisionResult,
		index: number,
		time: number
	): Signal {
	
		const direction =
			this.direction(d.direction);
	
		const action =
			direction === 1
				? "BUY"
				: direction === -1
					? "SELL"
					: "COVER";
	
		const stateResult =
			d.state as any;
	
		return {
			index,
			time,
	
			action,
	
			direction,
	
			price:
				d.entryPrice ?? 0,
	
			stopLoss:
				d.stopLoss ?? 0,
	
			tp1:
				d.tp1 ?? 0,
	
			tp2:
				d.tp2 ?? 0,
	
			tp3:
				d.tp3 ?? 0,
	
			tradeScore:
				d.tradeScore ?? 0,
	
			executionAllowed:
				d.canExecute === true,
	
			state:
				(
					stateResult?.engineState ??
					"SCAN"
				) as Signal["state"],
	
			optionSymbol:
				d.optionSymbol,
	
			enteredExecuted:
				stateResult?.enteredExecuted === true,
	
			reason:
				direction === 1
					? "AJ LONG"
					: direction === -1
						? "AJ SHORT"
						: "AJ NO TRADE",
	
			decision:
				d
		};
	}

    //--------------------------------------------------

    static indicators(input:{
        ema?:unknown;
        rsi?:unknown;
        atr?:unknown;
        adx?:unknown;
        vwap?:unknown;
    }){
        return{
            ema: this.lastNumber(input.ema),
            rsi: this.lastNumber(input.rsi),
            atr: this.lastNumber(input.atr),
            adx: this.lastNumber(input.adx),
            vwap: this.lastNumber(input.vwap)

        };

    }

}

