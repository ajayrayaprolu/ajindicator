import type { Candle }
from "../../types/Candle";

export function BOSRule(
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

  if (
    last.close >
    previousHigh
  ) {

    return {

      signal:
        "BOS_BULLISH",

      score: 120

    };

  }

  if (
    last.close <
    previousLow
  ) {

    return {

      signal:
        "BOS_BEARISH",

      score: 120

    };

  }

  return null;

}
