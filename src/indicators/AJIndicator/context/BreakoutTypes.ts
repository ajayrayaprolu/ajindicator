// src/indicators/AJIndicator/context/BreakoutTypes.ts

export interface BreakoutInput {
  insideBar: boolean;

  high: number;
  low: number;
  close: number;

  ibHigh: number | null;
  ibLow: number | null;
  ibValid: boolean;

  isIndiaMarket: boolean;
  isCryptoSpot: boolean;
  optionMirrorMode: boolean;

  highs: number[];
  lows: number[];
  
  atr:number;
}

export interface BreakoutState {
  ibHigh: number | null;
  ibLow: number | null;
  ibValid: boolean;
}

