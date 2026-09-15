import type { Candle }
from "../../types/Candle";

export function MitigationRule(
  candles: Candle[]
) {

  if (
    candles.length < 20
  ) {
    return null;
  }

  const recent =
    candles.slice(-10);

  const high =
    Math.max(
      ...recent.map(
        c => c.high
      )
    );

  const low =
    Math.min(
      ...recent.map(
        c => c.low
      )
    );

  const last =
    candles[
      candles.length - 1
    ];

  if (

    last.low <= high &&
    last.low >= low

  ) {

    return {

      signal:
        "MITIGATION",

      score: 160

    };

  }

  return null;

}
