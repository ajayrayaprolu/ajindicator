import type { Candle }
from "../../types/Candle";

export function StructureShiftRule(
  candles: Candle[]
) {

  if (
    candles.length < 30
  ) {
    return null;
  }

  const recent =
    candles.slice(-10);

  const previous =
    candles.slice(
      -20,
      -10
    );

  const recentHigh =
    Math.max(
      ...recent.map(
        c => c.high
      )
    );

  const recentLow =
    Math.min(
      ...recent.map(
        c => c.low
      )
    );

  const previousHigh =
    Math.max(
      ...previous.map(
        c => c.high
      )
    );

  const previousLow =
    Math.min(
      ...previous.map(
        c => c.low
      )
    );

  if (
    recentHigh >
      previousHigh &&
    recentLow >
      previousLow
  ) {

    return {

      signal:
        "CHOCH_BULLISH",

      score: 110

    };

  }

  if (
    recentHigh <
      previousHigh &&
    recentLow <
      previousLow
  ) {

    return {

      signal:
        "CHOCH_BEARISH",

      score: 110

    };

  }

  return null;

}
