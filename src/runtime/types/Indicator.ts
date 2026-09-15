import type {
  Candle
}
from "../../types/Candle";

export interface Indicator {

  name: string;

  description: string;

  color: string;

  calculate(
    candles: Candle[]
  ): {

    time: number;

    value: number;

  }[];

}

