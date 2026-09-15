//========================
// \src\runtime\strategies\ADXTrendStrategy.ts
//==========================
import type { Signal } from "../signals/Signal";
import type { Candle } from "../../types/Candle";
import { StrategyRuntime } from "../StrategyRuntime";

export class ADXTrendStrategy
extends StrategyRuntime {

  generate(
    _candles: Candle[]
  ): Signal[] {

    return [];

  }

}

