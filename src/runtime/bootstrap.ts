//===============================
// src/runtime/bootstrap.ts
//=================================

import { StrategyRegistry } from "./StrategyRegistry";
import { EMA20CrossStrategy} from "./strategies/EMA20CrossStrategy";
import { RSIReversalStrategy} from "./strategies/RSIReversalStrategy";
import {VWAPReclaimStrategy} from "./strategies/VWAPReclaimStrategy";
import {ATRBreakoutStrategy} from "./strategies/ATRBreakoutStrategy";
import {ADXTrendStrategy} from "./strategies/ADXTrendStrategy";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
//=================================================================

export function bootstrapRuntime() {

  StrategyRegistry.register(
    "EMA20Cross",
    new EMA20CrossStrategy()
  );

  StrategyRegistry.register(
    "RSIReversal",
    new RSIReversalStrategy()
  );

  StrategyRegistry.register(
    "VWAPReclaim",
    new VWAPReclaimStrategy()
  );

  StrategyRegistry.register(
    "ATRBreakout",
    new ATRBreakoutStrategy()
  );

  StrategyRegistry.register(
    "ADXTrend",
    new ADXTrendStrategy()
  );

  AJLoggingGate.log(
    "[AJ Runtime Ready]"
  );

}

