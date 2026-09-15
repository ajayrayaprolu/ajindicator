import { useEffect, useState } from "react";

import { ScannerEngine } from "../scanner/ScannerEngine";
import { SYMBOL_MASTER } from "../data/SymbolMaster";

import type {
  ScanResult
} from "../scanner/ScannerTypes";

interface Props {
  onSelectSymbol?: (
    symbol: string
  ) => void;
}

export default function ScannerPanel({
  onSelectSymbol
}: Props) {

  const [results, setResults] =
    useState<ScanResult[]>([]);

  const [lastScan, setLastScan] =
    useState("");

  const [filter, setFilter] =
    useState("ALL");

  async function runScan() {

    try {

      const symbols =
        SYMBOL_MASTER.map(
          x => x.symbol
        );

      const data =
        await ScannerEngine.scan(
          symbols,
          "5m",
          "Yahoo"
        );

      setResults(data);

      setLastScan(
        new Date().toLocaleTimeString()
      );

    } catch (err) {

      console.error(
        "[SCANNER]",
        err
      );

    }

  }

  useEffect(() => {

    runScan();

    const timer =
      setInterval(
        runScan,
        30000
      );

    return () =>
      clearInterval(timer);

  }, []);

  const filteredResults =
    results.filter(row => {

      if (filter === "ALL")
        return true;

      if (filter === "SMC") {

        return (

          row.signal.includes("ORDER_BLOCK") ||
          row.signal.includes("FVG") ||
          row.signal.includes("MITIGATION") ||
          row.signal.includes("CHOCH") ||
          row.signal.includes("BOS") ||
          row.signal.includes("LIQUIDITY")

        );

      }

      return row.signal.includes(
        filter
      );

    });

  function getSignalColor(
    signal: string
  ) {

    if (signal.includes("ORDER_BLOCK"))
      return "#ff4040";

    if (signal.includes("FVG"))
      return "#bb55ff";

    if (signal.includes("MITIGATION"))
      return "#00ffff";

    if (signal.includes("LIQUIDITY"))
      return "#ff66ff";

    if (signal.includes("CHOCH"))
      return "#00aaff";

    if (signal.includes("BOS"))
      return "#00ff88";

    if (signal.includes("BREAKOUT"))
      return "#88ff88";

    return "#ffffff";

  }

  function formatRankingSignal(
    signal: string
  ) {

    const parts =
      signal
        .split("|")
        .map(
          x => x.trim()
        );

    const rows: string[] = [];

    for (
      let i = 0;
      i < parts.length;
      i += 2
    ) {

      rows.push(

        parts
          .slice(
            i,
            i + 2
          )
          .join(" • ")

      );

    }

    return rows.join("\n");

  }

  function formatTableSignal(
    signal: string
  ) {

    return signal
      .split("|")
      .map(
        x => x.trim()
      )
      .join("\n");

  }

  return (

    <div
      style={{
        width: 340,
        minWidth: 340,
        maxWidth: 340,
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "#111",
        color: "white",
        borderLeft: "1px solid #333",
        overflow: "hidden"
      }}
    >

      {/* HEADER */}

      <div
        style={{
          padding: 8,
          borderBottom:
            "1px solid #333",
          flexShrink: 0
        }}
      >

        <div
          style={{
            fontWeight: 500,
            fontSize: 10
          }}
        >
          Scanner
        </div>

        <div
          style={{
            color: "#999",
            fontSize: 10
          }}
        >
          Last Scan: {lastScan}
        </div>

        <div
          style={{
            color: "#999",
            fontSize: 10
          }}
        >
          Signals: {results.length}
        </div>

      </div>

      {/* FILTER */}

      <div
        style={{
          padding: 8,
          borderBottom:
            "1px solid #333",
          flexShrink: 0
        }}
      >

        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value
            )
          }
          style={{
            width: "100%",
            background: "#222",
            color: "white"
          }}
        >

          <option value="ALL">ALL</option>
          <option value="SMC">SMC</option>
          <option value="ORDER_BLOCK">ORDER_BLOCK</option>
          <option value="FVG">FVG</option>
          <option value="CHOCH">CHOCH</option>
          <option value="BOS">BOS</option>

        </select>

      </div>

      {/* FIXED 50 / 50 PANEL */}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >

        {/* RANKING */}

        <div
          style={{
            height: "50%",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            borderBottom:
              "1px solid #333",
            padding: 8
          }}
        >

          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              marginBottom: 10,
              textAlign: "center"
            }}
          >
            Institutional Ranking
          </div>

          {filteredResults
            .slice(0, 10)
            .map(
              (
                row,
                index
              ) => (

                <div
                  key={index}
                  style={{
                    marginBottom: 12
                  }}
                >

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: "center"
                    }}
                  >
                    #{index + 1} {row.symbol}
                  </div>

                  <div
                    style={{
                      color:
                        getSignalColor(
                          row.signal
                        ),
                      fontSize: 11,
                      lineHeight: 1.4,
                      textAlign: "center",
                      whiteSpace: "pre-line",
                      maxWidth: "100%",
                      overflow: "hidden"
                    }}
                  >
                    {
                      formatRankingSignal(
                        row.signal
                      )
                    }
                  </div>

                  <div
                    style={{
                      color: "#777",
                      fontSize: 10,
                      textAlign: "center"
                    }}
                  >
                    Score: {row.score}
                  </div>

                </div>

              )
            )}

        </div>

        {/* SIGNAL TABLE */}

        <div
          style={{
            height: "50%",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden"
          }}
        >

          <table
            style={{
              width: "100%",
              maxWidth: "100%",
              fontSize: 11,
              tableLayout: "fixed"
            }}
          >

            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "#111",
                zIndex: 10
              }}
            >

              <tr>

                <th
                  style={{
                    width: "22%"
                  }}
                >
                  Symbol
                </th>

                <th
                  style={{
                    width: "58%",
                    maxWidth: "58%"
                  }}
                >
                  Signal
                </th>

                <th
                  style={{
                    width: "20%"
                  }}
                >
                  Score
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredResults.map(
                (
                  row,
                  index
                ) => (

                  <tr
                    key={index}
                    style={{
                      cursor: "pointer"
                    }}
                    onClick={() =>
                      onSelectSymbol?.(
                        row.symbol
                      )
                    }
                  >

                    <td
                      style={{
                        verticalAlign: "top"
                      }}
                    >
                      {row.symbol}
                    </td>

                    <td
                      style={{
                        color:
                          getSignalColor(
                            row.signal
                          ),
                        whiteSpace:
                          "pre-line",
                        verticalAlign:
                          "top",
                        maxWidth: 0,
                        overflow: "hidden"
                      }}
                    >
                      {
                        formatTableSignal(
                          row.signal
                        )
                      }
                    </td>

                    <td
                      style={{
                        verticalAlign: "top"
                      }}
                    >
                      {row.score}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}
