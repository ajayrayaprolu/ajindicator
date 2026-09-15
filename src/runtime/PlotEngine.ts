//==================================
// src/runtime/PlotEngine.ts
//==================================

import type {Candle} from "../types/Candle";
import {IndicatorRuntime} from "./IndicatorRuntime";

export interface PlotSeries {
  name: string;
  points: {
    time: number;
    value: number;
  }[];
}

export class PlotEngine {
  static build(
    indicatorName: string,
    candles: Candle[]
  ): PlotSeries | null {
    const result =
      IndicatorRuntime.execute(
        indicatorName,
        candles
      );

    if (!result)
      return null;
  
    const values =
        (result as any).values ?? [];
    
    const offset =
        candles.length -
        values.length;

    return {
      name: indicatorName,
        points:
            values.map(
            (
                value: number,
                index: number
            ) => ({
            time:
              candles[
                index + offset
              ].time,
            value
          })
        )
    };
  }
}


