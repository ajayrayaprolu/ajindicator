//======================================
// .\src\scanner\ScannerEngine.ts
//========================================
import type { Candle } from "../types/Candle";
import { EMACrossRule } from "./rules/EMACrossRule";
import { BreakoutRule } from "./rules/BreakoutRule";
import { VolumeSpikeRule } from "./rules/VolumeSpikeRule";
import { BOSRule } from "./rules/BOSRule";
import { StructureShiftRule } from "./rules/StructureShiftRule";
import { LiquiditySweepRule } from "./rules/LiquiditySweepRule";
import { OrderBlockRule } from "./rules/OrderBlockRule";
import { FVGRule } from "./rules/FVGRule";
import { MitigationRule } from "./rules/MitigationRule";
import { PremiumDiscountRule } from "./rules/PremiumDiscountRule";
import {ScannerStore} from "./ScannerStore";
import {SMCScoringEngine} from "./smc/SMCScoringEngine";
import {ZoneStore} from "./smc/ZoneStore";
import {ScannerSeverityEngine} from "./ScannerSeverity";
import type {ScanResult} from "./ScannerTypes";
//=======================================================================

export class ScannerEngine {

  static async scan(
    symbols: string[],
    timeframe: string,
    datasource: string
  ): Promise<ScanResult[]> {
	  
    const results:
      ScanResult[] = [];

    for (
      const symbol
      of symbols
	  
    ) {
	
      try {

	let yahooSymbol =
	symbol;
	
	if (
	datasource.trim().toLowerCase() ===
	"yahoo"
	) {
	
	const searchResponse =
		await fetch(
		`/api/symbols/search?q=${encodeURIComponent(symbol)}`
		);
	
	if (!searchResponse.ok) {
	
		throw new Error(
		`Symbol search failed: ${searchResponse.status}`
		);
	
	}
	
	const searchData =
		await searchResponse.json();
	
	const match =
		searchData?.results?.find(
		(item: any) =>
			item?.yahooSymbol
		);
	
	if (!match) {
	
		throw new Error(
		`Yahoo symbol not found for ${symbol}`
		);
	
	}
	
	yahooSymbol =
		match.yahooSymbol;
	
	}
	
	const historyResponse =
	await fetch(
		`/api/yahoo/${encodeURIComponent(yahooSymbol)}?timeframe=${encodeURIComponent(timeframe)}`
	);
	
	if (!historyResponse.ok) {
	
	throw new Error(
		`Yahoo history request failed: ${historyResponse.status}`
	);
	
	}
	
	const data =
	await historyResponse.json();
	
	const candles =
	Array.isArray(data)
		? data as Candle[]
		: Array.isArray(data?.candles)
		? data.candles as Candle[]
		: [];

    if (
      candles.length < 50
    ) {
      continue;
    }

    const signals:
      string[] = [];

        //--------------------------------------------------
        // ORDER BLOCK
        //--------------------------------------------------

        const ob =
          OrderBlockRule(
            candles
          );

        if (ob) {

          signals.push(
            ob.signal
          );

          ZoneStore.add({

            symbol,

            type:
              "ORDER_BLOCK",

            high:
              candles[
                candles.length - 1
              ].high,

            low:
              candles[
                candles.length - 1
              ].low,

            timestamp:
              Date.now()

          });

        }

        //--------------------------------------------------
        // FVG
        //--------------------------------------------------

        const fvg =
          FVGRule(
            candles
          );

        if (fvg) {

          signals.push(
            fvg.signal
          );

        }

        //--------------------------------------------------
        // MITIGATION
        //--------------------------------------------------

        const mitigation =
          MitigationRule(
            candles
          );

        if (mitigation) {

          signals.push(
            mitigation.signal
          );

        }

        //--------------------------------------------------
        // LIQUIDITY
        //--------------------------------------------------

        const sweep =
          LiquiditySweepRule(
            candles
          );

        if (sweep) {

          signals.push(
            sweep.signal
          );

        }

        //--------------------------------------------------
        // CHOCH
        //--------------------------------------------------

        const choch =
          StructureShiftRule(
            candles
          );

        if (choch) {

          signals.push(
            choch.signal
          );

        }

        //--------------------------------------------------
        // BOS
        //--------------------------------------------------

        const bos =
          BOSRule(
            candles
          );

        if (bos) {

          signals.push(
            bos.signal
          );

        }

        //--------------------------------------------------
        // BREAKOUT
        //--------------------------------------------------

        const breakout =
          BreakoutRule(
            candles
          );

        if (breakout) {

          signals.push(
            breakout.signal
          );

        }

        //--------------------------------------------------
        // VOLUME
        //--------------------------------------------------

        const volume =
          VolumeSpikeRule(
            candles
          );

        if (volume) {

          signals.push(
            volume.signal
          );

        }

        //--------------------------------------------------
        // EMA
        //--------------------------------------------------

        const ema =
          EMACrossRule(
            candles
          );

        if (ema) {

          signals.push(
            ema.signal
          );

        }

        //--------------------------------------------------
        // PREMIUM / DISCOUNT
        //--------------------------------------------------

        const pd =
          PremiumDiscountRule(
            candles
          );

        if (pd) {

          signals.push(
            pd.signal
          );

        }

        //--------------------------------------------------

        if (
          signals.length > 0
        ) {

          const score =
            SMCScoringEngine.calculate(
              signals
            );

          const severity =
            ScannerSeverityEngine.calculate(
              score
            );

          results.push({

            symbol,

            timeframe,

            signal:
              signals.join(
                " | "
              ),

            score,

            severity,

            timestamp:
              Date.now()

          });

        }

      }

      catch (err) {

        console.error(

          "[SCANNER]",

          symbol,

          err

        );

      }

    }

    results.sort(
      (a, b) =>
        b.score -
        a.score
    );

    ScannerStore.set(
      results
    );

    return results;

  }

}
