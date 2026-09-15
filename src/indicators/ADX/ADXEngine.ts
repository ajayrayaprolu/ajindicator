// src/indicators/AJIndicator/authority/ADXEngine.ts

import type { ADXInput } from "./ADXTypes";
import type { ADXResult } from "./ADXResult";

export class ADXEngine {
  static evaluate(
    input: ADXInput,
    adxValue: number,
    plusDI: number,
    minusDI: number
  ): ADXResult {

    const adxIndiaOnly =
      input.isIndiaMarket &&
      (
        input.isIndexEff ||
        input.isOptionChart ||
        input.isNifty ||
        input.isBankNifty ||
        input.isSensex
      );

    const adxBullBias =
      plusDI > minusDI;

    const adxBearBias =
      minusDI > plusDI;

    const adxDirectionAligned =
      (input.tradeDirectionFinal === 1 &&
        adxBullBias) ||
      (input.tradeDirectionFinal === -1 &&
        adxBearBias);

    const adxBreakoutAligned =
      (input.longBreak && adxBullBias) ||
      (input.shortBreak && adxBearBias);

    const body =
      Math.abs(
        input.close - input.open
      );

    const range =
      Math.max(
        input.high - input.low,
        0.0000001
      );

    const strongBullBody =
      input.close > input.open &&
      body >= range * 0.55;

    const strongBearBody =
      input.close < input.open &&
      body >= range * 0.55;

    const strongBody =
      (input.tradeDirectionFinal === 1 &&
        strongBullBody) ||
      (input.tradeDirectionFinal === -1 &&
        strongBearBody);

    let adxScore = 0;

    if (
      adxValue >= input.adxThresholdCore
    )
      adxScore += 5;

    if (
      adxValue >= input.adxStrongThreshold
    )
      adxScore += 5;

    if (
      adxValue >= input.adxExtremeThreshold
    )
      adxScore += 5;

    if (adxDirectionAligned)
      adxScore += 5;

    if (
      input.enableADXBreakoutBoost &&
      adxBreakoutAligned
    )
      adxScore += 5;

    if (strongBody)
      adxScore += 5;

    const adxScoreFinal =
      Math.min(
        adxScore,
        input.adxScoreWeight
      );

    const adxStrengthOK =
      adxValue >=
      input.adxThresholdCore;

    const adxTradeValid =
      adxStrengthOK &&
      adxDirectionAligned;

    const adxValidationActive =
      input.enableADXStrengthFilter &&
      adxIndiaOnly;

    const finalTradeScore =
      adxValidationActive
        ? input.tradeScore +
          adxScoreFinal
        : input.tradeScore;

    const aiADXValidated =
      !adxValidationActive
        ? true
        : adxTradeValid;

    const finalADXExecutionOK =
      !adxValidationActive
        ? true
        : (
            adxTradeValid &&
            adxScoreFinal >= 10
          );

    const enhancedAIReady =
      input.commonAiCoreReady &&
      aiADXValidated;

    const enhancedAISMCReady =
      input.commonAiSmcCoreReady &&
      aiADXValidated;

    const adxStrengthText =
      adxValue >=
      input.adxExtremeThreshold
        ? "EXTREME"
        : adxValue >=
          input.adxStrongThreshold
        ? "STRONG"
        : adxValue >=
          input.adxThresholdCore
        ? "GOOD"
        : "WEAK";

    return {
      adxValue,

      adxBullBias,
      adxBearBias,

      adxDirectionAligned,
      adxBreakoutAligned,

      adxTradeValid,

      adxScoreFinal,

      finalTradeScore,

      aiADXValidated,

      finalADXExecutionOK,

      enhancedAIReady,
      enhancedAISMCReady,

      adxValidationActive,

      adxStrengthText,

      adxModeText:
        adxValidationActive
          ? `ADX:${adxStrengthText}`
          : "ADX:OFF",
    };
  }
}

