import type { Candle } from "../types/Candle";

export class CandleCache {

  private static cache =
    new Map<string, Candle[]>();

  static set(
    key: string,
    candles: Candle[]
  ) {

    this.cache.set(
      key,
      candles
    );

  }

  static get(
    key: string
  ): Candle[] | undefined {

    return this.cache.get(key);

  }

  static clear(
    key: string
  ) {

    this.cache.delete(key);

  }

}
