//=============================================
// src/types/TradeState.ts
//=============================================

import type { EngineState } from "../core/EngineState";

export interface TradeState {
    engineState: EngineState;
    tradeLifecycleLocked: boolean;
    tradeRunning: boolean;
    tradeDir: number;
    tradeDirectionFinal: number;
    entryPrice: number;
    slPrice: number;
    tp1: number;
    tp2: number;
    tp3: number;
    signalBar: number;
    lastExecBar: number;
}
