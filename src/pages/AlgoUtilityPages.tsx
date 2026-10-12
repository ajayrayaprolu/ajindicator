// AJ_UTILITY_PAGES_V1
// Shared-theme prototypes for Brokers, Watch List and Indicators.
// Uses existing WatchlistPanel / AlertsPanel. No new broker or candle engine.
import { useMemo, useState, type CSSProperties } from "react";
import { useTheme } from "../theme/ThemeContext";
import WatchlistPanel from "../components/WatchlistPanel";
import AlertsPanel from "../components/AlertsPanel";

type UtilityPage = "brokers" | "watchlist" | "indicators";

type IndicatorItem = {
  name: string;
  category: string;
  source: string;
  description: string;
};

const brokerItems = [
  { name: "FYERS", short: "FY", description: "Broker connection and feed integration", note: "Uses the existing FYERS adapter when connected." },
  { name: "INDSTOCKS", short: "IS", description: "Broker connection and feed integration", note: "Uses the existing INDSTOCKS adapter when connected." },
  { name: "AliceBlue", short: "AB", description: "Broker connection placeholder", note: "No credentials or connection checks are performed here." },
  { name: "Delta Exchange", short: "DE", description: "Broker / derivatives connection placeholder", note: "No credentials or connection checks are performed here." },
];

const indicatorItems: IndicatorItem[] = [
  { name: "AJIndicator", category: "AJ Core", source: "AJIndicator module", description: "Existing AJ signal and indicator pipeline." },
  { name: "EMA", category: "Trend", source: "ChartEngine / IndicatorManager", description: "Exponential moving average overlay." },
  { name: "EMA 21", category: "Trend", source: "ChartEngine", description: "Existing 21-period moving-average series." },
  { name: "EMA 50", category: "Trend", source: "ChartEngine", description: "Existing 50-period moving-average series." },
  { name: "VWAP", category: "Volume / Price", source: "IndicatorManager / ChartEngine", description: "Volume-weighted average price." },
  { name: "RSI", category: "Momentum", source: "IndicatorManager / ChartEngine", description: "Relative strength oscillator with its separate pane." },
  { name: "ATR", category: "Volatility", source: "IndicatorManager", description: "Average true range for volatility analysis." },
  { name: "ADX", category: "Trend Strength", source: "IndicatorManager / ChartEngine", description: "Average directional index for trend strength." },
  { name: "SuperTrend", category: "Trend", source: "SuperTrend.ts", description: "ATR-based trend overlay." },
  { name: "CVD", category: "Volume Flow", source: "IndicatorManager reference", description: "Cumulative volume delta analysis." },
  { name: "BOS", category: "Market Structure", source: "IndicatorManager reference", description: "Break of structure." },
  { name: "CHOCH", category: "Market Structure", source: "IndicatorManager reference", description: "Change of character." },
  { name: "Liquidity Sweep", category: "Liquidity", source: "IndicatorManager reference", description: "Liquidity sweep detection." },
  { name: "FVG", category: "Market Structure", source: "IndicatorManager reference", description: "Fair value gap detection." },
];

export default function AlgoUtilityPages({ page }: { page: string }) {
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");

  const light = theme === "light";
  const muted = light ? "#64748b" : "#91a3bd";
  const border = light ? "#d7e0ea" : "rgba(148,163,184,.15)";
  const accent = "#60a5fa";

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
    padding: 20,
    background: light ? "#ffffff" : "linear-gradient(145deg, rgba(15,23,42,.84), rgba(7,13,28,.88))",
    boxShadow: light ? "0 3px 12px rgba(30,41,59,.045)" : "0 20px 50px rgba(0,0,0,.14)",
  };

  const button: CSSProperties = {
    border: `1px solid ${light ? "#cbd5e1" : "rgba(148,163,184,.24)"}`,
    borderRadius: 9,
    padding: "10px 13px",
    background: light ? "#ffffff" : "rgba(15,23,42,.55)",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  };

  const field: CSSProperties = {
    width: "100%",
    maxWidth: 440,
    boxSizing: "border-box",
    padding: "11px 13px",
    border: `1px solid ${border}`,
    borderRadius: 9,
    background: light ? "#ffffff" : "rgba(15,23,42,.65)",
    color: "inherit",
    outlineColor: accent,
  };

  const pageTitles: Record<UtilityPage, { title: string; subtitle: string }> = {
    brokers: {
      title: "⇆ Brokers",
      subtitle: "Broker connections and adapter configuration workspace.",
    },
    watchlist: {
      title: "☆ Watch List",
      subtitle: "Your saved symbol watchlists and existing Telegram alert integration.",
    },
    indicators: {
      title: "⌁ Indicators",
      subtitle: "Search indicators referenced by the existing AJIndicator and chart architecture.",
    },
  };

  const utilityPage: UtilityPage =
    page === "watchlist" || page === "indicators" ? page : "brokers";

  const filteredIndicators = useMemo(() => {
    const query = search.trim().toLowerCase();
    return indicatorItems.filter((item) =>
      `${item.name} ${item.category} ${item.source} ${item.description}`.toLowerCase().includes(query)
    );
  }, [search]);

  function goHome() {
    const feed = new URLSearchParams(window.location.search).get("feed") || "fyers";
    window.location.assign(`${window.location.origin}${window.location.pathname}?feed=${encodeURIComponent(feed)}`);
  }

  function openCharts() {
    const feed = new URLSearchParams(window.location.search).get("feed") || "fyers";
    window.open(`${window.location.pathname}?terminal=1&feed=${encodeURIComponent(feed)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main style={root}>
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 18,
        flexWrap: "wrap",
        marginBottom: 22,
      }}>
        <div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 850, letterSpacing: ".14em" }}>
            AJ INSTITUTIONAL · WORKSPACE
          </div>
          <h1 style={{ margin: "9px 0 6px", fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-.035em" }}>
            {pageTitles[utilityPage].title}
          </h1>
          <p style={{ margin: 0, maxWidth: 780, color: muted, lineHeight: 1.65 }}>
            {pageTitles[utilityPage].subtitle}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={button} onClick={toggleTheme}>
            {light ? "◐ Dark mode" : "☀ Light mode"}
          </button>
          <button
            type="button"
            style={{
              ...button,
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
        marginBottom: 20,
        borderRadius: 11,
        border: `1px solid ${light ? "#bfdbfe" : "rgba(96,165,250,.25)"}`,
        background: light ? "#eff6ff" : "rgba(30,58,138,.18)",
        color: light ? "#1e40af" : "#bfdbfe",
        fontSize: 13,
        lineHeight: 1.65,
      }}>
        <strong>AJ Institutional prototype:</strong>{" "}
        the page uses the shared master theme. Broker account data and indicator calculations are not fabricated. Existing watchlist storage and alert components are reused.
      </div>

      {utilityPage === "brokers" && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 285px), 1fr))", gap: 16 }}>
            {brokerItems.map((broker) => (
              <article key={broker.name} style={panel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 12, background: light ? "#dbeafe" : "rgba(37,99,235,.18)", color: light ? "#1d4ed8" : "#bfdbfe", fontWeight: 900 }}>
                    {broker.short}
                  </div>
                  <span style={{ border: `1px solid ${border}`, borderRadius: 99, padding: "5px 9px", color: muted, fontSize: 10, fontWeight: 800 }}>
                    NOT CHECKED
                  </span>
                </div>
                <h2 style={{ margin: "16px 0 7px", fontSize: 19 }}>{broker.name}</h2>
                <p style={{ color: muted, fontSize: 13, lineHeight: 1.65, minHeight: 42 }}>{broker.description}</p>
                <p style={{ color: muted, fontSize: 12, lineHeight: 1.65 }}>{broker.note}</p>
                {[
                  ["Authorization", "Not queried"],
                  ["Account / funds", "Unavailable"],
                  ["Connection health", "Not verified"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: `1px solid ${border}`, fontSize: 12 }}>
                    <span style={{ color: muted }}>{label}</span><strong>{value}</strong>
                  </div>
                ))}
                <button type="button" style={{ ...button, marginTop: 16 }} onClick={() => setNotice(`${broker.name}: connection setup remains a placeholder; no API was called.`)}>
                  Connection setup preview
                </button>
              </article>
            ))}
          </section>
          {notice && <div role="status" style={{ ...panel, marginTop: 16, fontSize: 13 }}>{notice}</div>}
        </>
      )}

      {utilityPage === "watchlist" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 16, alignItems: "start" }}>
          <section style={panel}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Saved Watch Lists</h2>
                <p style={{ margin: 0, color: muted, fontSize: 12 }}>Existing WatchlistPanel / WatchlistStore</p>
              </div>
              <span style={{ color: muted, border: `1px solid ${border}`, borderRadius: 99, padding: "5px 8px", fontSize: 10 }}>EXISTING STORE</span>
            </div>
            <WatchlistPanel
              onSelectSymbol={(item) => {
                const value = item as unknown as Record<string, unknown>;
                setSelectedSymbol(String(value.tradingSymbol ?? value.symbol ?? value.displayName ?? value.name ?? "Selected watchlist item"));
              }}
            />
            {selectedSymbol && (
              <div role="status" style={{ marginTop: 14, color: muted, fontSize: 12, lineHeight: 1.6 }}>
                Selected item: <strong>{selectedSymbol}</strong>. Use the existing Charts workspace to work with an instrument.
              </div>
            )}
            <button type="button" style={{ ...button, marginTop: 16 }} onClick={openCharts}>
              Open existing Charts workspace ↗
            </button>
          </section>

          <section style={panel}>
            <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Telegram Alerts</h2>
            <p style={{ margin: "0 0 16px", color: muted, fontSize: 12, lineHeight: 1.6 }}>
              Existing AlertsPanel and TelegramNotifier integration. The existing component retains its own alert controls and test behaviour.
            </p>
            <AlertsPanel />
          </section>
        </div>
      )}

      {utilityPage === "indicators" && (
        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 21 }}>Indicator Catalogue</h2>
              <p style={{ color: muted, margin: 0, fontSize: 13, lineHeight: 1.65 }}>
                Search by indicator name, category or source reference.
              </p>
            </div>
            <input
              aria-label="Search indicators"
              style={field}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search indicators…"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 14 }}>
            {filteredIndicators.map((item) => (
              <article key={item.name} style={{ ...panel, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 11, background: light ? "#dbeafe" : "rgba(37,99,235,.18)", color: light ? "#1d4ed8" : "#bfdbfe", fontSize: 17 }}>
                    ⌁
                  </div>
                  <span style={{ border: `1px solid ${border}`, borderRadius: 99, padding: "5px 8px", color: muted, fontSize: 10 }}>
                    {item.category}
                  </span>
                </div>
                <h3 style={{ margin: "14px 0 7px", fontSize: 16 }}>{item.name}</h3>
                <p style={{ color: muted, margin: "0 0 12px", fontSize: 13, lineHeight: 1.65 }}>{item.description}</p>
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10, fontSize: 11, color: muted }}>
                  Source: {item.source}
                </div>
              </article>
            ))}
          </div>

          {filteredIndicators.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>No indicators match this search.</div>
          )}

          <p style={{ margin: "18px 0 0", fontSize: 11, color: muted, lineHeight: 1.7 }}>
            Catalogue entries are based on existing AJIndicator, IndicatorManager and ChartEngine references. Registry and per-indicator availability verification can be added as a follow-up.
          </p>
        </section>
      )}

      <footer style={{ color: muted, fontSize: 11, marginTop: 22, lineHeight: 1.7 }}>
        AJ Institutional · Shared theme · No new market-data or candle engine is introduced.
      </footer>
    </main>
  );
}