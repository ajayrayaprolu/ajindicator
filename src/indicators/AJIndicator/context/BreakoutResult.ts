// src/indicators/AJIndicator/context/BreakoutResult.ts

export interface BreakoutResult {
  longBreak: boolean;
  shortBreak: boolean;

  execMode:
    | "IB-STRUCTURE"
    | "IB-RELAXED"
    | "RANGE-FALLBACK"
    | "NO BREAK"
    | "NONE";

  rangeHigh?: number;
  rangeLow?: number;

  ibHigh?: number | null;
  ibLow?: number | null;
  ibValid?: boolean;
}

