//==============================================
//src\runtime\strategies\EMA20CrossStrategy.ts
//==============================================

import type { Signal } from "../signals/Signal";
import type { Candle } from "../../types/Candle";
import { StrategyRuntime } from "../StrategyRuntime";

export class EMA20CrossStrategy
extends StrategyRuntime {

    generate(
        _candles: Candle[]
    ): Signal[] {

        return [];

    }

}