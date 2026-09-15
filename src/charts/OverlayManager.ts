//============================
//src/charts/OverlayManager.ts
//============================

import type {Candle} from "../types/Candle";
import {EMA} from "../indicators/EMA";
import {VWAP} from "../indicators/VWAP";
import {RSI} from "../indicators/RSI";
import {ATR} from "../indicators/ATR";
import { ADX } from "../indicators/ADX/ADX";

export class OverlayManager {

  static buildEMA(
    candles: Candle[],
    period = 20
  ) {

    const values =
      EMA.calculate(
        candles.map(
          c => c.close
        ),
        period
      );

    return values.map(
      (v, i) => ({
        time:
          candles[
            i + period - 1
          ].time,
        value: v
      })
    );

  }

  static buildVWAP(
    candles: Candle[]
  ) {

    const values =
      VWAP.calculate(
        candles
      );

    return candles.map(
      (c, i) => ({
        time: c.time,
        value: values[i]
      })
    );

  }

  static buildRSI(
    candles: Candle[]
  ) {

    const values =
      RSI.calculate(
        candles.map(
          c => c.close
        ),
        14
      );

    return values.map(
      (v, i) => ({
        time:
          candles[
            i + 14
          ].time,
        value: v
      })
    );

  }

  static buildATR(
    candles: Candle[]
  ) {

    const values =
      ATR.calculate(
        candles,
        14
      );

    return values.map(
      (v, i) => ({
        time:
          candles[
            i + 13
          ].time,
        value: v
      })
    );

  }

  static buildADX(
    candles: Candle[]
  ) {

    const values =
      ADX.calculate(
        candles
      );

    return values.map(
      (v, i) => ({
        time:
          candles[
            i
          ].time,
        value: v
      })
    );

  }

}
