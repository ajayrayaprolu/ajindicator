import type {
  Candle
} from "../../types/Candle";

export function BreakoutRule(
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

  if (
    last.close >
    previousHigh
  ) {

    return {

      signal:
        "BREAKOUT",

      score: 90

    };

  }

  return null;

}
