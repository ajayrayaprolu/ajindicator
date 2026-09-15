// src/indicators/AJIndicator/authority/ADXTypes.ts

export interface ADXInput {
  high: number;
  low: number;
  open: number;
  close: number;

  prevHigh: number;
  prevLow: number;

  adxLenCore: number;

  adxThresholdCore: number;
  adxStrongThreshold: number;
  adxExtremeThreshold: number;

  adxScoreWeight: number;

  enableADXBreakoutBoost: boolean;
  enableADXStrengthFilter: boolean;

  tradeDirectionFinal: number;

  longBreak: boolean;
  shortBreak: boolean;

  tradeScore: number;

  commonAiCoreReady: boolean;
  commonAiSmcCoreReady: boolean;

  isIndiaMarket: boolean;
  isIndexEff: boolean;
  isOptionChart: boolean;
  isNifty: boolean;
  isBankNifty: boolean;
  isSensex: boolean;
}

