import type {
  Candle
} from "../../types/Candle";

export function VolumeSpikeRule(
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

  const avgVolume =

    candles
      .slice(-20, -1)
      .reduce(
        (
          sum,
          candle
        ) =>

          sum +
          (
            candle.volume || 0
          ),

        0
      ) / 19;

  if (

    (last.volume || 0)

      >

    avgVolume * 2

  ) {

    return {

      signal:
        "VOLUME_SPIKE",

      score: 80

    };

  }

  return null;

}
