//================================
// \src\runtime\StrategyRuntime.ts
//================================
import type { Candle } from "../types/Candle";
import type { Signal } from "./signals/Signal";

export abstract class StrategyRuntime {

  abstract generate(
    candles: Candle[]
  ): Signal[];

}

