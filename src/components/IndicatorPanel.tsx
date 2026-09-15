//=====================================
// src/components/IndicatorPanel.tsx
//=====================================
import type {
  IndicatorSettings
} from "../store/WorkspaceIndicatorStore";

interface Props {

  indicators:
    IndicatorSettings;

  onChange: (
    settings: IndicatorSettings
  ) => void;

}

export default function IndicatorPanel({

  indicators,

  onChange

}: Props) {

  function toggle(
    key: keyof IndicatorSettings
  ) {

    onChange({

      ...indicators,

      [key]:
        !indicators[key]

    });

  }

  return (

    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center"
      }}
    >

      <button
        onClick={() =>
          toggle("ema")
        }
      >
        EMA
        {indicators.ema
          ? " ✓"
          : ""}
      </button>

      <button
        onClick={() =>
          toggle("vwap")
        }
      >
        VWAP
        {indicators.vwap
          ? " ✓"
          : ""}
      </button>

      <button
        onClick={() =>
          toggle("rsi")
        }
      >
        RSI
        {indicators.rsi
          ? " ✓"
          : ""}
      </button>

      <button
        onClick={() =>
          toggle("atr")
        }
      >
        ATR
        {indicators.atr
          ? " ✓"
          : ""}
      </button>

      <button
        onClick={() =>
          toggle("adx")
        }
      >
        ADX
        {indicators.adx
          ? " ✓"
          : ""}
      </button>

    </div>

  );

}
