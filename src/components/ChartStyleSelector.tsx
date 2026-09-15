//======================================
// src/components/ChartStyleSelector.tsx
//=======================================

//======================================
// src/components/ChartStyleSelector.tsx
// AJ v2 - Chart Style Selector
//======================================

import {
  useEffect,
  useRef,
  useState
} from "react";

//======================================
// CHART STYLE TYPE
//======================================

export type ChartStyle =

  | "bars"

  | "candles"

  | "hollow-candles"

  | "line"

  | "area"

  | "baseline"

  | "heikin-ashi"

  | "renko"

  | "line-break"

  | "kagi"

  | "point-and-figure";

//======================================
// CATALOG
//======================================

interface ChartStyleItem {
  value: ChartStyle;
  label: string;
  description: string;
  icon: string;
}

const CHART_STYLES:
  ChartStyleItem[] = [

  {
    value: "bars",
    label: "Bars",
    description: "OHLC bars",
    icon: "│"
  },

  {
    value: "candles",
    label: "Candles",
    description: "Standard candlesticks",
    icon: "▮"
  },

  {
    value: "hollow-candles",
    label: "Hollow Candles",
    description: "Hollow candlesticks",
    icon: "▯"
  },

  {
    value: "line",
    label: "Line",
    description: "Closing price line",
    icon: "╱"
  },

  {
    value: "area",
    label: "Area",
    description: "Filled price area",
    icon: "◢"
  },

  {
    value: "baseline",
    label: "Baseline",
    description: "Price relative to baseline",
    icon: "═"
  },

  {
    value: "heikin-ashi",
    label: "Heikin Ashi",
    description: "Smoothed candlesticks",
    icon: "▥"
  },

  {
    value: "renko",
    label: "Renko",
    description: "Price bricks",
    icon: "▦"
  },

  {
    value: "line-break",
    label: "Line Break",
    description: "Three-line break",
    icon: "☷"
  },

  {
    value: "kagi",
    label: "Kagi",
    description: "Kagi price chart",
    icon: "⌁"
  },

  {
    value: "point-and-figure",
    label: "Point & Figure",
    description: "X/O price chart",
    icon: "XO"
  }

];

//======================================
// PROPS
//======================================

interface Props {
  value: ChartStyle;
  onChange: (
    style: ChartStyle
  ) => void;

}

//======================================
// COMPONENT
//======================================

export default function ChartStyleSelector({
  value,
  onChange
}: Props) {

  const [
    open,
    setOpen
  ] = useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const selectedStyle =
    CHART_STYLES.find(
      style =>
        style.value === value
    ) ??
    CHART_STYLES.find(
      style =>
        style.value === "candles"
    )!;

  //====================================
  // CLOSE OUTSIDE
  //====================================

  useEffect(() => {

    function handleOutsideClick(
      event: MouseEvent
    ) {

      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {

        setOpen(false);

      }

    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);

  //====================================
  // SELECT
  //====================================

  function selectStyle(
    style: ChartStyle
  ) {

    onChange(style);
    setOpen(false);

  }

  //====================================
  // RENDER
  //====================================

  return (

    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        flexShrink: 0
      }}
    >

      <button
        type="button"
        title="Select chart style"
        aria-label="Select chart style"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            previous => !previous
          )
        }
        style={{
          height: 30,
          minWidth: 135,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 9px",
          background: "var(--bg-panel)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-primary)",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600
        }}
      >

        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7
          }}
        >

          <span
            style={{
              width: 18,
              textAlign: "center",
              color:
                "var(--text-secondary)",
              fontSize: 15
            }}
          >
            {selectedStyle.icon}
          </span>

          <span>
            {selectedStyle.label}
          </span>

        </span>

        <span
          style={{
            color:
              "var(--text-muted)",
            fontSize: 10
          }}
        >
          {open ? "▲" : "▼"}
        </span>

      </button>

      {open && (

        <div
          style={{
            position: "absolute",
            zIndex: 2147483647,
            top: "calc(100% + 4px)",
            right: 0,
            width: 250,
            padding: 5,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-primary)",
            borderRadius: 5,
            boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
            overflow: "hidden"
          }}
        >

          <div
            style={{
              padding: "7px 8px 6px",
              color: "var(--text-muted)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}
          >
            Chart Style
          </div>

          {CHART_STYLES.map(
            style => {
              const active =
                style.value === value;

              return (

                <button
                  key={style.value}
                  type="button"
                  onClick={() =>
                    selectStyle(
                      style.value
                    )
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 8px",
                    background:
                      active
                        ? "var(--bg-hover)"
                        : "transparent",

                    color: "var(--text-primary)",
                    border: "none",
                    borderRadius: 3,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >

                  <span
                    style={{
                      width: 24,
                      textAlign: "center",
                      color:
                        active
                          ? "var(--accent-primary)"
                          : "var(--text-secondary)",
                      fontWeight: 700
                    }}
                  >
                    {style.icon}
                  </span>

                  <span
                    style={{
                      flex: 1,
                      minWidth: 0
                    }}
                  >

                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {style.label}
                    </span>

                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color: "var(--text-muted)",
                        fontSize: 10
                      }}
                    >
                      {style.description}
                    </span>
                  </span>
                  {active && (
                    <span
                      style={{
                        color:
                          "var(--accent-primary)",
                        fontWeight: 700
                      }}
                    >
                      ✓
                    </span>

                  )}

                </button>

              );

            }
          )}

        </div>

      )}

    </div>

  );

}