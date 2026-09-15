//===================================
//\src\core\EngineState.ts
//src/core/EngineState.ts → Platform engine
//src/indicators/AJIndicator/core/EngineState.ts → AJ Indicator engine
//====================================

export const EngineState = {
    SCAN: "SCAN",
    ARMED: "ARMED",
    CONFIRMED: "CONFIRMED",
    EXECUTED: "EXECUTED",
    MANAGE: "MANAGE",
    CLOSED: "CLOSED"
} as const;

export type EngineState =
    (typeof EngineState)[keyof typeof EngineState];
