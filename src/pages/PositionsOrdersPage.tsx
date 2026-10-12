import { useState, type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeContext";

type WorkspaceTab = "positions" | "orders" | "history" | "trades" | "performance";

const tabItems: { id: WorkspaceTab; label: string; description: string }[] = [
  { id: "positions", label: "▤ Positions", description: "Monitor open positions, average prices, unrealized P&L and exit status." },
  { id: "orders", label: "⇄ Orders", description: "Review order requests, partial fills, cancellations and rejections." },
  { id: "history", label: "◷ Order History", description: "Inspect the chronological lifecycle of submitted and completed orders." },
  { id: "trades", label: "≋ Trades", description: "Review executions, entry and exit prices, charges and strategy attribution." },
  { id: "performance", label: "↗ P&L & Performance", description: "Review realized and unrealized P&L, charges, daily performance and reports." },
];

const tableColumns: Record<Exclude<WorkspaceTab, "performance">, string[]> = {
  positions: ["Instrument", "Exchange", "Qty", "Avg. price", "LTP", "Unrealized P&L", "Strategy", "Status"],
  orders: ["Time", "Order ID", "Instrument", "Side", "Order type", "Qty", "Filled qty", "Avg. fill", "Status"],
  history: ["Time", "Order ID", "Instrument", "Side", "Qty", "Fill details", "Status", "Remarks"],
  trades: ["Time", "Instrument", "Side", "Qty", "Entry", "Exit", "Charges", "Net P&L", "Strategy"],
};

export default function PositionsOrdersPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("positions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [dateRange, setDateRange] = useState("Today");

  const light = theme === "light";
  const muted = light ? "#64748b" : "#94a3b8";
  const border = light ? "#d7e0ea" : "rgba(148,163,184,.15)";
  const blue = "#60a5fa";

  const rootStyle: CSSProperties = {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "24px",
    color: light ? "#202938" : "#e5edf8",
    background: light
      ? "#f3f6fa"
      : "radial-gradient(circle at 12% 0%, rgba(37,99,235,.18), transparent 28%), radial-gradient(circle at 90% 12%, rgba(124,58,237,.14), transparent 25%), #050816",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const panelStyle: CSSProperties = {
    minWidth: 0,
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 20,
    background: light
      ? "#ffffff"
      : "linear-gradient(145deg, rgba(15,23,42,.84), rgba(7,13,28,.88))",
    boxShadow: light ? "0 3px 12px rgba(30,41,59,.045)" : "0 20px 50px rgba(0,0,0,.14)",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 13px",
    border: `1px solid ${border}`,
    borderRadius: 9,
    background: light ? "#ffffff" : "rgba(15,23,42,.55)",
    color: "inherit",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 650,
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: `1px solid ${border}`,
    borderRadius: 9,
    background: light ? "#ffffff" : "rgba(15,23,42,.55)",
    color: "inherit",
    outlineColor: blue,
  };

  const tabStyle = (selected: boolean): CSSProperties => ({
    ...buttonStyle,
    background: selected
      ? (light ? "#dbeafe" : "rgba(37,99,235,.17)")
      : (light ? "#ffffff" : "rgba(15,23,42,.35)"),
    borderColor: selected
      ? (light ? "#2563eb" : "rgba(59,130,246,.6)")
      : border,
    color: selected ? (light ? "#1d4ed8" : "#bfdbfe") : "inherit",
    whiteSpace: "nowrap",
  });

  const metrics = [
    { label: "Open Positions", value: "—", note: "Awaiting account data", color: blue },
    { label: "Active Orders", value: "—", note: "Pending and working", color: "#60a5fa" },
    { label: "Executed Trades", value: "—", note: "Session trade count", color: "#22c55e" },
    { label: "Net P&L", value: "—", note: "After charges", color: "#a78bfa" },
  ];

  const selectedTab = tabItems.find((item) => item.id === activeTab)!;
  const columns = activeTab === "performance" ? [] : tableColumns[activeTab];

  function goHome() {
    const currentFeed = new URLSearchParams(window.location.search).get("feed") || "fyers";
    window.location.assign(
      `${window.location.origin}${window.location.pathname}?feed=${encodeURIComponent(currentFeed)}`
    );
  }

  return (
    <main style={rootStyle}>
      <header style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 18,
        marginBottom: 22,
      }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ color: blue, fontSize: 11, fontWeight: 850, letterSpacing: ".14em" }}>
            AJ INSTITUTIONAL · ACCOUNT WORKSPACE
          </div>
          <h1 style={{ fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-.035em", margin: "9px 0 6px" }}>
            Positions &amp; Orders
          </h1>
          <p style={{ color: muted, margin: 0, lineHeight: 1.6 }}>
            Orders, positions, order history, executed trades and P&amp;L performance.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={buttonStyle} onClick={toggleTheme}>
            {light ? "◐ Dark mode" : "☀ Light mode"}
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle,
              background: light ? "#dbeafe" : "rgba(37,99,235,.17)",
              borderColor: light ? "#2563eb" : "rgba(59,130,246,.6)",
              color: light ? "#1d4ed8" : "#bfdbfe",
            }}
            onClick={goHome}
            title="Return to AlgoHome"
          >
            ← AlgoHome
          </button>
        </div>
      </header>

      <div
        role="status"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "13px 15px",
          borderRadius: 11,
          border: `1px solid ${light ? "#bfdbfe" : "rgba(96,165,250,.25)"}`,
          background: light ? "#eff6ff" : "rgba(30,58,138,.18)",
          color: light ? "#1e40af" : "#bfdbfe",
          marginBottom: 20,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <span aria-hidden="true">ⓘ</span>
        <div>
          <strong>Broker data not connected to this page.</strong>{" "}
          This is a UI prototype. Live positions, order states, fills, charges and P&amp;L will be displayed only after verified account APIs are integrated. No order or exit requests are sent here.
        </div>
      </div>

      <section
        aria-label="Account summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {metrics.map((metric) => (
          <article key={metric.label} style={{ ...panelStyle, padding: 19 }}>
            <div style={{ color: muted, fontSize: 13 }}>{metric.label}</div>
            <div style={{ fontSize: 29, fontWeight: 850, color: metric.color, margin: "12px 0 6px", letterSpacing: "-.025em" }}>
              {metric.value}
            </div>
            <div style={{ color: muted, fontSize: 11 }}>{metric.note}</div>
          </article>
        ))}
      </section>

      <section style={{ ...panelStyle, padding: 10, marginBottom: 18 }}>
        <div role="tablist" aria-label="Positions and orders views" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabItems.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              key={item.id}
              style={tabStyle(activeTab === item.id)}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 15,
          marginBottom: 20,
        }}>
          <div>
            <h2 style={{ margin: "0 0 7px", fontSize: 20 }}>{selectedTab.label}</h2>
            <p style={{ margin: 0, color: muted, fontSize: 13, lineHeight: 1.6 }}>
              {selectedTab.description}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={{ ...buttonStyle, opacity: .55, cursor: "not-allowed" }} disabled title="Requires connected broker data">
              ↻ Refresh
            </button>
            <button type="button" style={{ ...buttonStyle, opacity: .55, cursor: "not-allowed" }} disabled title="Requires account records">
              ↓ Export
            </button>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1.6fr) repeat(auto-fit, minmax(145px, .65fr))",
          gap: 10,
          marginBottom: 18,
        }}>
          <input
            aria-label="Search instrument or order"
            style={inputStyle}
            placeholder="Search instrument, order ID, strategy…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select aria-label="Date range" style={inputStyle} value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This month</option>
            <option>All available</option>
          </select>
          {activeTab !== "performance" && (
            <select aria-label="Order or position status" style={inputStyle} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              <option>Open</option>
              <option>Pending</option>
              <option>Partially filled</option>
              <option>Executed</option>
              <option>Cancelled</option>
              <option>Rejected</option>
              <option>Closed</option>
            </select>
          )}
        </div>

        {activeTab !== "performance" && (
          <div style={{ overflowX: "auto", border: `1px solid ${border}`, borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850, fontSize: 12 }}>
              <thead>
                <tr style={{ background: light ? "#f8fafc" : "rgba(15,23,42,.65)" }}>
                  {columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: muted,
                        fontWeight: 750,
                        whiteSpace: "nowrap",
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={columns.length} style={{ padding: "52px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, color: blue, marginBottom: 12 }}>
                      {activeTab === "positions" ? "▤" : activeTab === "orders" ? "⇄" : activeTab === "history" ? "◷" : "≋"}
                    </div>
                    <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
                      {search.trim() ? "No matching records" : "Waiting for broker connection"}
                    </h3>
                    <p style={{ margin: "0 auto", maxWidth: 570, color: muted, lineHeight: 1.7 }}>
                      {search.trim()
                        ? "No records can be searched until broker data is connected."
                        : "This table will show verified account records when the relevant positions, orders and trade-history APIs are integrated. Nothing is being simulated as live data."}
                    </p>
                    <div style={{ color: muted, fontSize: 11, marginTop: 12 }}>
                      View: {activeTab} · Range: {dateRange} · Status: {statusFilter}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "performance" && (
          <div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}>
              {[
                ["Realized P&L", "—"],
                ["Unrealized P&L", "—"],
                ["Charges & Taxes", "—"],
                ["Net P&L", "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${border}`, borderRadius: 11, padding: 16 }}>
                  <div style={{ color: muted, fontSize: 12 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 850, marginTop: 10 }}>{value}</div>
                  <div style={{ color: muted, fontSize: 11, marginTop: 7 }}>Awaiting verified trade data</div>
                </div>
              ))}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}>
              <div style={{ border: `1px solid ${border}`, borderRadius: 11, padding: 18 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Daily performance</h3>
                <p style={{ color: muted, lineHeight: 1.7, fontSize: 13 }}>
                  The P&amp;L curve, daily drawdown, charges and returns will be plotted after verified trade history is available.
                </p>
                <div style={{ border: `1px dashed ${border}`, borderRadius: 9, padding: 25, textAlign: "center", color: muted, fontSize: 12 }}>
                  Performance chart unavailable · No data connected
                </div>
              </div>
              <div style={{ border: `1px solid ${border}`, borderRadius: 11, padding: 18 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Strategy attribution</h3>
                <p style={{ color: muted, lineHeight: 1.7, fontSize: 13 }}>
                  Compare realized and unrealized results, costs, win rate and drawdown by strategy.
                </p>
                <div style={{ border: `1px dashed ${border}`, borderRadius: 9, padding: 25, textAlign: "center", color: muted, fontSize: 12 }}>
                  No strategy trade records available
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer style={{ color: muted, fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
        AJ Institutional · Account data pending integration · Refresh, export and trade-management operations are disabled until the corresponding services are connected.
      </footer>
    </main>
  );
}