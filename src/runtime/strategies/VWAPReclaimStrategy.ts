//-==============================================
// \src\runtime\strategies\VWAPReclaimStrategy.ts
//===============================================

import type { Signal } from "../signals/Signal";
import type { Candle } from "../../types/Candle";
import { StrategyRuntime } from "../StrategyRuntime";

export class VWAPReclaimStrategy
extends StrategyRuntime {

  generate(
    _candles: Candle[]
  ): Signal[] {

    return [];

  }

}

