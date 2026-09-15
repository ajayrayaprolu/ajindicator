//======================================
// src/components/ChartSettingsPanel.tsx
// Per-chart candle color settings
//======================================

import type { CandleColors } from "../types/ChartConfig";

const DEFAULT_CANDLE_COLORS: CandleColors = {
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderUpColor: "#26a69a",
  borderDownColor: "#ef5350",
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350"
};

export { DEFAULT_CANDLE_COLORS };

interface Props {
  colors?: CandleColors;
  onChange: (colors: CandleColors) => void;
  onClose: () => void;
}

function ColorRow({
  label,
  upValue,
  downValue,
  onUpChange,
  onDownChange
}: {
  label: string;
  upValue: string;
  downValue: string;
  onUpChange: (v: string) => void;
  onDownChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid var(--border-secondary)"
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)"
        }}
      >
        {label}
      </span>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="color"
          value={upValue}
          onChange={(e) => onUpChange(e.target.value)}
          title="Up color"
          style={{
            width: 32,
            height: 26,
            border: "1px solid var(--border-primary)",
            borderRadius: 4,
            cursor: "pointer",
            background: "none",
            padding: 0
          }}
        />
        <input
          type="color"
          value={downValue}
          onChange={(e) => onDownChange(e.target.value)}
          title="Down color"
          style={{
            width: 32,
            height: 26,
            border: "1px solid var(--border-primary)",
            borderRadius: 4,
            cursor: "pointer",
            background: "none",
            padding: 0
          }}
        />
      </div>
    </div>
  );
}

export default function ChartSettingsPanel({
  colors,
  onChange,
  onClose
}: Props) {

  const current: CandleColors = colors ?? DEFAULT_CANDLE_COLORS;

  function update(partial: Partial<CandleColors>) {
    onChange({ ...current, ...partial });
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        right: 8,
        width: 260,
        background: "var(--bg-modal)",
        border: "1px solid var(--border-primary)",
        borderRadius: 6,
        boxShadow: "var(--shadow-heavy)",
        zIndex: 9999,
        overflow: "hidden"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-panel)"
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-heading)" }}>
          Chart Settings
        </span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 16
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: "6px 12px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "6px 0 2px"
          }}
        >
          Candles
        </div>

        <ColorRow
          label="Body"
          upValue={current.upColor}
          downValue={current.downColor}
          onUpChange={(v) => update({ upColor: v })}
          onDownChange={(v) => update({ downColor: v })}
        />

        <ColorRow
          label="Borders"
          upValue={current.borderUpColor}
          downValue={current.borderDownColor}
          onUpChange={(v) => update({ borderUpColor: v })}
          onDownChange={(v) => update({ borderDownColor: v })}
        />

        <ColorRow
          label="Wick"
          upValue={current.wickUpColor}
          downValue={current.wickDownColor}
          onUpChange={(v) => update({ wickUpColor: v })}
          onDownChange={(v) => update({ wickDownColor: v })}
        />

        <div style={{ padding: "10px 0" }}>
          <button
            onClick={() => onChange(DEFAULT_CANDLE_COLORS)}
            style={{
              width: "100%",
              padding: "7px 0",
              background: "var(--bg-panel-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-primary)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}