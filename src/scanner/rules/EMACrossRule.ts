import type {
  Candle
} from "../../types/Candle";

export function EMACrossRule(
  candles: Candle[]
) {

  if (
    candles.length < 50
  ) {
    return null;
  }

  const close =
    candles.map(
      c => c.close
    );

  const ema20 =
    close
      .slice(-20)
      .reduce(
        (a, b) => a + b,
        0
      ) / 20;

  const ema50 =
    close
      .slice(-50)
      .reduce(
        (a, b) => a + b,
        0
      ) / 50;

  if (
    ema20 > ema50
  ) {

    return {

      signal:
        "EMA_BULLISH",

      score: 70

    };

  }

  if (
    ema20 < ema50
  ) {

    return {

      signal:
        "EMA_BEARISH",

      score: 70

    };

  }

  return null;

}
