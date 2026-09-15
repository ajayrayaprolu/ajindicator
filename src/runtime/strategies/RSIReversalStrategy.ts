//=============================================
//\src\runtime\strategies\RSIReversalStrategy.ts
//==============================================

import type { Signal } from "../signals/Signal";
import type { Candle } from "../../types/Candle";
import { StrategyRuntime } from "../StrategyRuntime";

export class RSIReversalStrategy
extends StrategyRuntime {

  generate(
    _candles: Candle[]
  ): Signal[] {

    return [];

  }

}

