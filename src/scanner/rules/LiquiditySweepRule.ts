import type { Candle }
from "../../types/Candle";

export function LiquiditySweepRule(
  candles: Candle[]
) {

  if (
    candles.length < 20
  ) {
    return null;
  }

  const last =
    candles[
      candles.length - 1
    ];

  const previousHigh =
    Math.max(
      ...candles
        .slice(-20, -1)
        .map(
          c => c.high
        )
    );

  const previousLow =
    Math.min(
      ...candles
        .slice(-20, -1)
        .map(
          c => c.low
        )
    );

  const bullishSweep =

    last.high >
      previousHigh &&

    last.close <
      previousHigh;

  const bearishSweep =

    last.low <
      previousLow &&

    last.close >
      previousLow;

  if (
    bullishSweep ||
    bearishSweep
  ) {

    return {

      signal:
        "LIQUIDITY_SWEEP",

      score: 130

    };

  }

  return null;

}
