//=====================================================================
// src/components/DataSourceSelector.tsx
// AJ Institutional
// Global Theme Aware Data Source Selector
//=====================================================================

interface Props {

  datasource: string;

  onChange: (
    source: string
  ) => void;

}

//======================================================
// DATASOURCE CATALOG
//======================================================

const DATA_SOURCES = [
  "Yahoo",
  "Fyers",
  "AliceBlue",
  "IndStocks",
  "Zerodha",
  "Upstox",
  "Dhan",
  "Binance",
  "TwelveData"
] as const;

//======================================================
// COMPONENT
//======================================================

export default function DataSourceSelector({
  datasource,
  onChange
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6
      }}
    >
      <select
        value={
          datasource
        }
        onChange={(
          event
        ) => {
          onChange(
            event.target.value
          );
        }}

        aria-label="Data source"
        title="Select data source"
        style={{
          height: 30,
          minWidth: 130,
          background:
            "var(--bg-panel)",
          color:
            "var(--text-primary)",
          border:
            "1px solid var(--border-primary)",
          borderRadius: 4,
          padding:
            "0 10px",
          fontSize: 14,
          fontWeight: 700,
          cursor:
            "pointer",
          outline:
            "none"
        }}
      >
        {
          DATA_SOURCES.map(
            source => (

              <option
                key={source}
                value={source}
              >
                {source}
              </option>

            )
          )
        }

      </select>

    </div>

  );

}