import type { Candle }
from "../../types/Candle";

export function OrderBlockRule(
  candles: Candle[]
) {

  if (
    candles.length < 30
  ) {
    return null;
  }

  const impulse =
    candles[
      candles.length - 1
    ];

  const base =
    candles[
      candles.length - 4
    ];

  const bullish =

    impulse.close >
    base.high * 1.01;

  const bearish =

    impulse.close <
    base.low * 0.99;

  if (bullish) {

    return {

      signal:
        "ORDER_BLOCK_BULLISH",

      score: 180

    };

  }

  if (bearish) {

    return {

      signal:
        "ORDER_BLOCK_BEARISH",

      score: 180

    };

  }

  return null;

}
