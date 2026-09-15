// src/indicators/AJIndicator/authority/ADXResult.ts

export interface ADXResult {
  adxValue: number;

  adxBullBias: boolean;
  adxBearBias: boolean;

  adxDirectionAligned: boolean;
  adxBreakoutAligned: boolean;

  adxTradeValid: boolean;

  adxScoreFinal: number;

  finalTradeScore: number;

  aiADXValidated: boolean;

  finalADXExecutionOK: boolean;

  enhancedAIReady: boolean;
  enhancedAISMCReady: boolean;

  adxValidationActive: boolean;

  adxStrengthText:
    | "WEAK"
    | "GOOD"
    | "STRONG"
    | "EXTREME";

  adxModeText: string;
}

