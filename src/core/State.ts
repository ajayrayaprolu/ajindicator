//================================================
//src/core/State.ts
//===============================================

import { EngineState } from "./EngineState";

export interface StateStore {
    engineState: EngineState;

    lockedTradeDirection: number;
    lockedBiasDirection: number;

    tradeRunning: boolean;

    entryPrice?: number;
    slPrice?: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
}

export const InitialState: StateStore = {
    engineState: EngineState.SCAN,

    lockedTradeDirection: 0,
    lockedBiasDirection: 0,

    tradeRunning: false
};
