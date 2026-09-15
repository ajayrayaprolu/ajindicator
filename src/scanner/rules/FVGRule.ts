import type { Candle }
from "../../types/Candle";

export function FVGRule(
  candles: Candle[]
) {

  if (
    candles.length < 5
  ) {
    return null;
  }

  const c1 =
    candles[
      candles.length - 3
    ];

  const c3 =
    candles[
      candles.length - 1
    ];

  if (
    c3.low >
    c1.high
  ) {

    return {

      signal:
        "FVG_BULLISH",

      score: 170

    };

  }

  if (
    c3.high <
    c1.low
  ) {

    return {

      signal:
        "FVG_BEARISH",

      score: 170

    };

  }

  return null;

}
