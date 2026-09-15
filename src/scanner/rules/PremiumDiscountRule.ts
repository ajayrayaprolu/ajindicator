import type { Candle }
from "../../types/Candle";

export function PremiumDiscountRule(
  candles: Candle[]
) {

  if (
    candles.length < 50
  ) {
    return null;
  }

  const rangeHigh =
    Math.max(
      ...candles.map(
        c => c.high
      )
    );

  const rangeLow =
    Math.min(
      ...candles.map(
        c => c.low
      )
    );

  const equilibrium =

    (
      rangeHigh +
      rangeLow
    ) / 2;

  const last =
    candles[
      candles.length - 1
    ];

  if (
    last.close >
    equilibrium
  ) {

    return {

      signal:
        "PREMIUM_ZONE",

      score: 70

    };

  }

  return {

    signal:
      "DISCOUNT_ZONE",

    score: 70

  };

}
