//================================
//src/core/TimeframeAggregator.ts
//================================
import type { Candle }
from "../types/Candle";

export class TimeframeAggregator {

  static aggregate(
    candles: Candle[],
    timeframe: string
  ): Candle[] {

    const map: Record<
      string,
      number
    > = {

      "1m": 1,

      "3m": 3,

      "5m": 5,

      "15m": 15,

      "30m": 30,

      "1h": 60,

      "4h": 240,

      "1d": 1440

    };

    const minutes =
      map[
        timeframe.toLowerCase()
      ];

    if (
      !minutes ||
      minutes === 1
    ) {

      return candles;

    }

    const bucketSize =
      minutes * 60;

    const result: Candle[] =
      [];

    let bucket:
      Candle[] = [];

    for (
      const candle
      of candles
    ) {

      if (
        bucket.length === 0
      ) {

        bucket.push(
          candle
        );

        continue;

      }

      const startTime =
        bucket[0].time;

      if (

        candle.time -
        startTime

        < bucketSize

      ) {

        bucket.push(
          candle
        );

      }

      else {

        result.push(

          this.buildCandle(
            bucket
          )

        );

        bucket =
          [candle];

      }

    }

    if (
      bucket.length
    ) {

      result.push(

        this.buildCandle(
          bucket
        )

      );

    }

    return result;

  }

  private static buildCandle(
    candles: Candle[]
  ): Candle {

    return {

      time:
        candles[0].time,

      open:
        candles[0].open,

      high:
        Math.max(
          ...candles.map(
            c => c.high
          )
        ),

      low:
        Math.min(
          ...candles.map(
            c => c.low
          )
        ),

      close:
        candles[
          candles.length - 1
        ].close,

      volume:
        candles.reduce(
          (
            total,
            c
          ) =>
            total +
            (
              c.volume || 0
            ),
          0
        )

    };

  }

}
