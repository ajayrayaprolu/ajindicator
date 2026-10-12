// AJ_ALGO_MONITOR_STATIC_UI_V1
// Static UI only: no broker orders, live metrics, or execution calls.
import { useMemo, useState, type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeContext";

type ToolItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  color: string;
  detail: string;
};

type MonitorItem = {
  title: string;
  code: string;
  description: string;
  state: string;
  detail: string;
};

const tools: ToolItem[] = [
  { id: "strategy-builder", code: "SB", title: "Strategy Builder", description: "Build multi-leg option strategies with live Greeks, payoff diagram and what-if simulators", color: "#d946ef", detail: "Build a strategy from individual option legs, configure strikes and quantities, examine theoretical payoff and Greeks, and compare what-if scenarios. Live chain data and calculations require integration." },
  { id: "strategy-portfolio", code: "SP", title: "Strategy Portfolio", description: "Saved strategies across MyTrades and Simulation watchlists", color: "#8b5cf6", detail: "A workspace for organizing saved strategies and grouping them into real-trade and simulation watchlists. Portfolio persistence is not connected in this prototype." },
  { id: "portfolio-backtester", code: "PB", title: "Portfolio Backtester", description: "Backtest a weighted portfolio against an index with real delivery costs, rebalancing rules, crisis periods and a full tearsheet", color: "#10b981", detail: "Configure portfolio weights, a benchmark, transaction and delivery costs, rebalancing policy, and historical regimes. Results require a verified historical data and backtest engine." },
  { id: "sip-backtester", code: "SB", title: "SIP Backtester", description: "What a monthly, weekly or quarterly SIP would actually have returned: XIRR, rupee-cost averaging, start-date sensitivity and how it compares with a lumpsum", color: "#10b981", detail: "Compare investment frequency, start-date sensitivity, XIRR and rupee-cost averaging against a lump-sum investment. No return figures are fabricated." },
  { id: "portfolio-analyzer", code: "PA", title: "Portfolio Analyzer", description: "Grade the holdings you actually own: concentration, co-movement, drawdown resilience and behaviour in past crises", color: "#0ea5e9", detail: "Analyze holdings concentration, cross-asset co-movement, drawdown resilience and historical crisis behavior when an actual portfolio and historical data source are connected." },
  { id: "option-chain", code: "OC", title: "Option Chain", description: "Real-time option chain with live Greeks, OI data, and quick order placement", color: "#10b981", detail: "Display calls and puts across strikes, Greeks, open interest and expiry selection. This prototype does not load live option data or submit orders." },
  { id: "option-greeks", code: "OG", title: "Option Greeks", description: "Historical IV, Delta, Theta, Vega, and Gamma charts for ATM options", color: "#8b5cf6", detail: "Explore historical implied volatility and Delta, Theta, Vega and Gamma for ATM options once verified option-history data is available." },
  { id: "oi-tracker", code: "OT", title: "OI Tracker", description: "Open Interest analysis with CE/PE OI bars, PCR overlay, and ATM strike marker", color: "#3b82f6", detail: "A chart workspace for CE/PE open-interest bars, put-call ratio and the at-the-money strike marker. Data integration is required." },
  { id: "oi-range", code: "OR", title: "OI Range", description: "Open Interest by strike for a custom range with ATM-relative quick selectors and optional 1-minute auto-refresh", color: "#06b6d4", detail: "Choose an ATM-relative strike range and inspect open interest around the underlying. Automatic refresh remains disabled until a live data source is connected." },
  { id: "max-pain", code: "MP", title: "Max Pain", description: "Max Pain strike calculation with visual pain distribution across strikes", color: "#f59e0b", detail: "Calculate a theoretical max-pain strike and visualize the distribution by strike using verified option-chain open interest." },
  { id: "straddle-chart", code: "SC", title: "Straddle Chart", description: "Dynamic ATM Straddle chart with rolling strike, Spot, and Synthetic Futures overlay", color: "#14b8a6", detail: "Compare ATM straddle price with spot and synthetic futures, including rolling-strike behavior. Live candles and option quotes are not connected." },
  { id: "straddle-pnl", code: "SP", title: "Straddle PnL", description: "Simulated intraday ATM straddle P&L with automated N-point adjustments and trade log", color: "#f97316", detail: "A simulation layout for adjustment intervals, trade logs and intraday straddle P&L. The simulation engine has not yet been integrated." },
  { id: "vol-surface", code: "VS", title: "Vol Surface", description: "3D Implied Volatility surface across strikes and expiries using live option chain data", color: "#f43f5e", detail: "Visualize implied volatility across strike and expiry dimensions once suitable option-chain data and surface calculations are available." },
  { id: "gex-dashboard", code: "GD", title: "GEX Dashboard", description: "Gamma Exposure analysis with OI Walls, Net GEX per strike, and top gamma strikes", color: "#6366f1", detail: "A gamma-exposure dashboard for open-interest walls, net gamma exposure by strike and notable gamma concentrations. Requires verified options data." },
  { id: "gamma-density", code: "GD", title: "Gamma Density", description: "Γ×OI density and convexity zones with intraday & to-expiry views, ATM IV, and ±1σ/±2σ expected-move bands", color: "#84cc16", detail: "Inspect gamma-times-open-interest density, potential convexity zones, ATM implied volatility and expected-move bands. Calculations require live option data." },
  { id: "iv-smile", code: "IS", title: "IV Smile", description: "Implied Volatility smile with Call/Put IV curves, ATM IV, and skew analysis", color: "#06b6d4", detail: "Compare call and put implied-volatility curves, ATM IV and skew by expiry when an appropriate options data feed is available." },
  { id: "oi-profile", code: "OP", title: "OI Profile", description: "Futures candlestick with OI butterfly and daily OI change across strikes", color: "#f97316", detail: "Combine futures price bars with open-interest structure and daily changes by strike. Historical and current exchange data are required." },
  { id: "arbitrage", code: "A", title: "Arbitrage", description: "Realtime futures calendar-spread scanner across NFO & MCX, ranked by executable bid/ask spread % with one-click two-leg orders", color: "#16a34a", detail: "The intended scanner compares futures calendar spreads across NFO and MCX using executable bid/ask prices. It is a non-executing preview; no arbitrage scanner or order placement is connected." },
];

const monitoringItems: MonitorItem[] = [
  { title: "Broker Connections", code: "BR", description: "Connection state, authorization, adapter health and account availability.", state: "Not verified", detail: "Connection status should come from each broker adapter and its authentication check. No broker health state is asserted here." },
  { title: "Execution Logs", code: "EX", description: "Order lifecycle, acknowledgements, fills, rejections and exit events.", state: "Not connected", detail: "Execution events will be shown after connecting the platform's verified order and execution log sources." },
  { title: "API Diagnostics", code: "API", description: "Endpoint status, authentication errors, timeouts and recent failures.", state: "Not checked", detail: "API checks have not been run from this page. A later integration can surface sanitized health-check results without exposing secrets." },
  { title: "Latency", code: "LAT", description: "Request duration, market-data freshness and end-to-end processing time.", state: "Not measured", detail: "Latency should be sourced from instrumented requests and market-data timestamps; this prototype does not invent timing figures." },
  { title: "Risk Settings", code: "RISK", description: "Per-trade risk, daily limits, exposure controls and protective stops.", state: "Not configured", detail: "Risk rules require explicit configuration, validation and connection to the strategy/order guard layer. This panel does not apply settings." },
  { title: "Feed Health", code: "FEED", description: "Feed connectivity, candle freshness, gaps and subscription errors.", state: "Not verified", detail: "Feed health should use the existing AJ market-data runtime's verified status and freshness metrics. No duplicate feed engine is created." },
  { title: "Security Events", code: "SEC", description: "Authentication events, permission changes and security-related warnings.", state: "Not connected", detail: "Security events will require a verified and appropriately sanitized security log source." },
];

export default function AlgoMonitorPage() {
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<MonitorItem | null>(null);

  const light = theme === "light";
  const muted = light ? "#64748b" : "#91a3bd";
  const border = light ? "#d7e0ea" : "rgba(148,163,184,.15)";

  const root: CSSProperties = {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "26px",
    color: light ? "#202938" : "#e5edf8",
    background: light
      ? "#f3f6fa"
      : "radial-gradient(circle at 12% 0%, rgba(37,99,235,.18), transparent 28%), radial-gradient(circle at 90% 12%, rgba(124,58,237,.14), transparent 25%), #050816",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const panel: CSSProperties = {
    minWidth: 0,
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 19,
    background: light ? "#ffffff" : "linear-gradient(145deg, rgba(15,23,42,.84), rgba(7,13,28,.88))",
    boxShadow: light ? "0 3px 12px rgba(30,41,59,.045)" : "0 20px 50px rgba(0,0,0,.14)",
  };

  const input: CSSProperties = {
    width: "100%",
    maxWidth: 440,
    boxSizing: "border-box",
    padding: "11px 13px",
    borderRadius: 9,
    border: `1px solid ${border}`,
    background: light ? "#fff" : "rgba(15,23,42,.65)",
    color: "inherit",
    outlineColor: "#60a5fa",
  };

  const actionButton: CSSProperties = {
    border: `1px solid ${light ? "#cbd5e1" : "rgba(148,163,184,.24)"}`,
    borderRadius: 9,
    padding: "10px 13px",
    background: light ? "#ffffff" : "rgba(15,23,42,.55)",
    color: "inherit",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  };

  const filteredTools = useMemo(
    () => tools.filter((item) =>
      `${item.title} ${item.description} ${item.code}`.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  function goHome() {
    const feed = new URLSearchParams(window.location.search).get("feed") || "fyers";
    window.location.assign(`${window.location.origin}${window.location.pathname}?feed=${encodeURIComponent(feed)}`);
  }

  return (
    <main style={root}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div style={{ color: "#60a5fa", fontSize: 11, fontWeight: 850, letterSpacing: ".14em" }}>AJ INSTITUTIONAL · MONITORING WORKSPACE</div>
          <h1 style={{ margin: "9px 0 6px", fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-.035em" }}>◉ Algo Monitor</h1>
          <p style={{ color: muted, margin: 0, lineHeight: 1.6, maxWidth: 780 }}>
            Analytical tools for options trading and market analysis, with a dedicated space for monitoring, diagnostics and risk configuration.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={actionButton} onClick={toggleTheme}>{light ? "◐ Dark mode" : "☀ Light mode"}</button>
          <button
            type="button"
            style={{
              ...actionButton,
              background: light ? "#dbeafe" : "rgba(37,99,235,.17)",
              borderColor: light ? "#2563eb" : "rgba(59,130,246,.6)",
              color: light ? "#1d4ed8" : "#bfdbfe",
            }}
            onClick={goHome}
          >
            ← AlgoHome
          </button>
        </div>
      </header>

      <div style={{
        padding: "13px 15px",
        marginBottom: 22,
        borderRadius: 11,
        border: `1px solid ${light ? "#bfdbfe" : "rgba(96,165,250,.25)"}`,
        background: light ? "#eff6ff" : "rgba(30,58,138,.18)",
        color: light ? "#1e40af" : "#bfdbfe",
        fontSize: 13,
        lineHeight: 1.65,
      }}>
        <strong>Prototype / not connected:</strong> tool outputs, broker states, execution logs, API diagnostics, latency, feed health and security events require verified services. No live figures or execution success are simulated.
      </div>

      {selectedTool && (
        <section style={{ ...panel, marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, flex: "0 0 52px", borderRadius: 13, display: "grid", placeItems: "center", color: "#fff", background: selectedTool.color, fontWeight: 900 }}>{selectedTool.code}</div>
            <div style={{ flex: "1 1 300px" }}>
              <div style={{ color: "#60a5fa", fontSize: 10, letterSpacing: ".12em", fontWeight: 850 }}>ANALYTICAL TOOL · STATIC PREVIEW</div>
              <h2 style={{ margin: "5px 0 8px", fontSize: 24 }}>{selectedTool.title}</h2>
              <p style={{ color: muted, margin: "0 0 12px", lineHeight: 1.7 }}>{selectedTool.description}</p>
              <p style={{ lineHeight: 1.75 }}>{selectedTool.detail}</p>
              <div style={{ padding: 13, borderRadius: 9, border: `1px dashed ${border}`, color: muted, fontSize: 12, lineHeight: 1.7 }}>
                Output is unavailable until the corresponding data source and calculation/service layer are integrated. No order is submitted by this preview.
              </div>
            </div>
            <button type="button" style={actionButton} onClick={() => setSelectedTool(null)}>← Back to tools</button>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 24 }}>Algo Tools</h2>
            <p style={{ color: muted, margin: 0, lineHeight: 1.6 }}>
              Strategy building, option chain, Greeks, open-interest analysis, payoff analysis, backtesting and additional analytical tools.
            </p>
          </div>
          <input aria-label="Search analytical tools" value={search} onChange={(event) => setSearch(event.target.value)} style={input} placeholder="Search all 18 analytical tools…" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
          {filteredTools.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSelectedTool(item); setSelectedPanel(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                ...panel,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 0,
                color: "inherit",
                minHeight: 196,
                transition: "border-color .15s ease, transform .15s ease",
              }}
              title={`Open ${item.title} preview`}
            >
              <span style={{ width: 50, height: 50, borderRadius: 13, display: "grid", placeItems: "center", color: "#fff", background: item.color, fontWeight: 900, fontSize: 15, marginBottom: 12 }}>{item.code}</span>
              <strong style={{ fontSize: 16, marginBottom: 7 }}>{item.title}</strong>
              <span style={{ color: muted, fontSize: 13, lineHeight: 1.65, flex: 1 }}>{item.description}</span>
              <span style={{ color: light ? "#2563eb" : "#93c5fd", fontSize: 13, marginTop: 18 }}>Click to open {item.title} →</span>
            </button>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div style={{ ...panel, textAlign: "center", color: muted, padding: 34 }}>No tools match this search.</div>
        )}
      </section>

      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 24 }}>Algo Monitoring &amp; Settings</h2>
          <p style={{ color: muted, margin: 0, lineHeight: 1.6 }}>
            Broker connections, execution logs, API diagnostics, latency, risk settings, feed health and security events.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 14 }}>
          {monitoringItems.map((item) => (
            <article key={item.code} style={panel}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: light ? "#dbeafe" : "rgba(37,99,235,.18)", color: light ? "#1d4ed8" : "#93c5fd", display: "grid", placeItems: "center", fontWeight: 850, fontSize: 12 }}>{item.code}</div>
                <span style={{ border: `1px solid ${border}`, borderRadius: 99, padding: "5px 8px", color: muted, fontSize: 10, fontWeight: 750 }}>{item.state}</span>
              </div>
              <h3 style={{ fontSize: 16, margin: "14px 0 7px" }}>{item.title}</h3>
              <p style={{ color: muted, fontSize: 13, lineHeight: 1.65, margin: "0 0 15px" }}>{item.description}</p>
              <button type="button" style={actionButton} onClick={() => { setSelectedPanel(item); setSelectedTool(null); }}>Open panel →</button>
            </article>
          ))}
        </div>

        {selectedPanel && (
          <div style={{ ...panel, marginTop: 16 }}>
            <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ color: "#60a5fa", fontSize: 10, letterSpacing: ".12em", fontWeight: 850 }}>MONITORING / SETTINGS · PREVIEW</div>
                <h3 style={{ margin: "8px 0", fontSize: 20 }}>{selectedPanel.title}</h3>
                <p style={{ color: muted, lineHeight: 1.7 }}>{selectedPanel.detail}</p>
                <p style={{ color: muted, fontSize: 12 }}>Current state: {selectedPanel.state}. This panel does not change live configuration.</p>
              </div>
              <button type="button" style={actionButton} onClick={() => setSelectedPanel(null)}>Close panel</button>
            </div>
          </div>
        )}
      </section>

      <footer style={{ marginTop: 24, fontSize: 11, color: muted, lineHeight: 1.7 }}>
        AJ Institutional · Algo Monitor UI prototype · Existing indicator and market-data architecture remains the source of truth for future integrations.
      </footer>
    </main>
  );
}