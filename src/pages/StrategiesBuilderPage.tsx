import { useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";

type Tab = "strategies" | "builder" | "templates" | "backtest";

const templates = [
  { name: "AJIndicator Momentum", category: "Trend following", description: "Use an indicator signal as the entry source, with configurable option selection, stop-loss and targets." },
  { name: "Opening Range Breakout", category: "Breakout", description: "Define an opening range and configure breakout confirmation and risk limits." },
  { name: "Trend Pullback", category: "Trend following", description: "Configure a pullback entry aligned with the selected trend filter." },
  { name: "Defined-Risk Iron Condor", category: "Options", description: "Explore a four-leg, defined-risk options structure with expiry and strike settings." },
];

export default function StrategiesBuilderPage() {
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("strategies");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [underlying, setUnderlying] = useState("NIFTY");
  const [timeframe, setTimeframe] = useState("5m");
  const [entry, setEntry] = useState("AJIndicator bullish signal");
  const [exit, setExit] = useState("Indicator reversal or stop-loss");
  const [risk, setRisk] = useState("1");
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState("Prototype mode — no broker orders or live deployments are enabled.");

  const filtered = useMemo(
    () => saved.filter((item) => item.toLowerCase().includes(search.toLowerCase())),
    [saved, search]
  );

  const mutedColor = theme === "light" ? "#64748b" : "#94a3b8";
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: theme === "light" ? "#f3f6fa" : "radial-gradient(circle at 12% 0%, rgba(37,99,235,.18), transparent 28%), radial-gradient(circle at 90% 12%, rgba(124,58,237,.14), transparent 25%), #050816",
    color: theme === "light" ? "#202938" : "#e5edf8",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "24px",
    boxSizing: "border-box",
  };
  const panelStyle: React.CSSProperties = {
    background: theme === "light" ? "#ffffff" : "linear-gradient(145deg, rgba(15,23,42,.84), rgba(7,13,28,.88))",
    border: `1px solid ${theme === "light" ? "#d7e0ea" : "rgba(148,163,184,.13)"}`,
    borderRadius: 14,
    padding: 20,
    minWidth: 0,
    boxShadow: theme === "light" ? "0 3px 12px rgba(30,41,59,.045)" : "0 20px 50px rgba(0,0,0,.18)",
  };
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 8,
    border: `1px solid ${theme === "light" ? "#cbd5e1" : "rgba(148,163,184,.16)"}`,
    background: theme === "light" ? "#ffffff" : "rgba(15,23,42,.55)",
    color: "inherit",
    marginTop: 6,
  };
  const buttonStyle: React.CSSProperties = {
    border: `1px solid ${theme === "light" ? "#cbd5e1" : "rgba(148,163,184,.16)"}`,
    borderRadius: 9,
    padding: "10px 14px",
    background: theme === "light" ? "#ffffff" : "rgba(15,23,42,.55)",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 650,
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".04em",
    marginTop: 14,
  };

  function saveDraft() {
    const cleanName = name.trim();
    if (!cleanName) {
      setNotice("Enter a strategy name before saving.");
      return;
    }
    setSaved((current) => current.includes(cleanName) ? current : [...current, cleanName]);
    setNotice(`Draft "${cleanName}" saved in this page session only.`);
    setTab("strategies");
  }

  return (
    <main style={pageStyle}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div style={{ color: "#60a5fa", fontSize: 11, fontWeight: 800, letterSpacing: ".14em" }}>AJ INSTITUTIONAL · STRATEGY WORKSPACE</div>
          <h1 style={{ fontSize: "clamp(28px, 3vw, 38px)", margin: "10px 0 6px", letterSpacing: "-.035em" }}>Strategies &amp; Builder</h1>
          <p style={{ color: theme === "light" ? "#64748b" : mutedColor, margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
            Create, configure, validate, save and review strategies. Backtesting and trading lifecycle actions remain previews until their engines are connected.
          </p>
        </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={toggleTheme}
            title="Switch the AJ Institutional master theme"
          >
            {theme === "dark" ? "☀ Light mode" : "◐ Dark mode"}
          </button>
          <button style={buttonStyle} onClick={() => { setTab("builder"); setName(""); }}>＋ New strategy</button>
          <button
            type="button"
            style={{
              ...buttonStyle,
              background: theme === "light" ? "#ffffff" : "rgba(37,99,235,.16)",
              borderColor: theme === "light" ? "#2563eb" : "rgba(59,130,246,.55)"
            }}
            onClick={() => window.location.assign(`${window.location.origin}${window.location.pathname}`)}
            title="Return to AlgoHome homepage"
          >
            ← AlgoHome
          </button>
        </div>
      </header>

      <div style={{ ...panelStyle, padding: 10, display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {([
          ["strategies", "◇ My Strategies"],
          ["builder", "⌘ Strategy Builder"],
          ["templates", "▦ Templates"],
          ["backtest", "⌁ Backtest Lab"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            style={{
              ...buttonStyle,
              background: tab === id
                ? (theme === "light" ? "#e8eef8" : "rgba(37,99,235,.16)")
                : "transparent",
              borderColor: tab === id
                ? (theme === "light" ? "#2563eb" : "rgba(59,130,246,.55)")
                : undefined
            }}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 9, padding: "12px 14px", background: theme === "light" ? "#fff7ed" : "#211a10", color: theme === "light" ? "#9a3412" : "#fdba74", border: "1px solid #9a341244", marginBottom: 18, fontSize: 13 }}>
        <strong>Prototype / not connected:</strong> {notice}
      </div>

      {tab === "strategies" && (
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div><h2 style={{ margin: "0 0 6px", fontSize: 20 }}>My Strategies</h2><p style={{ margin: 0, color: mutedColor, fontSize: 13 }}>Session-only drafts · no live broker status</p></div>
            <input aria-label="Search strategies" placeholder="Search strategies…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...fieldStyle, width: 260, marginTop: 0 }} />
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 12px 46px" }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>◇</div>
              <h3 style={{ margin: "0 0 8px" }}>{search ? "No matching strategies" : "No strategies yet"}</h3>
              <p style={{ color: mutedColor, margin: "0 auto 18px", maxWidth: 520, lineHeight: 1.6 }}>
                Create a draft, start from a template, then validate its conditions and risk settings before connecting a backtest engine.
              </p>
              <button style={buttonStyle} onClick={() => setTab("builder")}>Create your first strategy</button>{" "}
              <button style={buttonStyle} onClick={() => setTab("templates")}>Browse templates</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 22 }}>
              {filtered.map((item) => <article key={item} style={{ ...panelStyle, padding: 16 }}><strong>{item}</strong><p style={{ color: mutedColor, fontSize: 12 }}>Draft · saved in current session</p><button style={buttonStyle} onClick={() => { setName(item); setTab("builder"); }}>Edit draft</button></article>)}
            </div>
          )}
        </section>
      )}

      {tab === "builder" && (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(260px,.7fr)", gap: 18 }}>
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Configure strategy</h2>
            <label style={labelStyle}>Strategy name<input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NIFTY Momentum v1" /></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              <label style={labelStyle}>Underlying<select style={fieldStyle} value={underlying} onChange={(e) => setUnderlying(e.target.value)}><option>NIFTY</option><option>BANKNIFTY</option><option>FINNIFTY</option><option>SENSEX</option><option>RELIANCE</option></select></label>
              <label style={labelStyle}>Signal timeframe<select style={fieldStyle} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}><option>1m</option><option>3m</option><option>5m</option><option>15m</option><option>1h</option><option>1D</option></select></label>
            </div>
            <label style={labelStyle}>Entry conditions<textarea style={{ ...fieldStyle, minHeight: 86, resize: "vertical" }} value={entry} onChange={(e) => setEntry(e.target.value)} /></label>
            <label style={labelStyle}>Exit conditions<textarea style={{ ...fieldStyle, minHeight: 86, resize: "vertical" }} value={exit} onChange={(e) => setExit(e.target.value)} /></label>
            <label style={labelStyle}>Risk budget per trade (%)<input type="number" min="0.1" max="100" step="0.1" style={fieldStyle} value={risk} onChange={(e) => setRisk(e.target.value)} /></label>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 22 }}>
              <button style={buttonStyle} onClick={() => setNotice(`Local validation preview: ${name.trim() ? "strategy name supplied" : "strategy name missing"}; entry and exit conditions require implementation-level validation. No execution occurred.`)}>Validate configuration</button>
              <button style={{ ...buttonStyle, background: "#2563eb", color: "#fff", borderColor: "#2563eb" }} onClick={saveDraft}>Save draft</button>
            </div>
          </div>
          <aside style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Configuration summary</h3>
            {[["Underlying", underlying], ["Timeframe", timeframe], ["Risk budget", `${risk || "—"}%`], ["Execution mode", "Not connected"], ["Validation", "Preview only"]].map(([key, value]) => <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #71717a33", fontSize: 13 }}><span style={{ color: mutedColor }}>{key}</span><strong>{value}</strong></div>)}
            <p style={{ color: mutedColor, fontSize: 12, lineHeight: 1.6 }}>Option legs, Greeks, payoff diagrams, and strategy persistence can be connected in a later phase using AJ's existing data and indicator architecture.</p>
          </aside>
        </section>
      )}

      {tab === "templates" && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          {templates.map((item) => <article key={item.name} style={panelStyle}><div style={{ color: "#60a5fa", fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>{item.category.toUpperCase()}</div><h3>{item.name}</h3><p style={{ color: mutedColor, lineHeight: 1.6, minHeight: 65 }}>{item.description}</p><button style={buttonStyle} onClick={() => { setName(item.name); setEntry(item.description); setTab("builder"); setNotice(`Template "${item.name}" loaded as an editable draft. No trading action occurred.`); }}>Use template</button></article>)}
        </section>
      )}

      {tab === "backtest" && (
        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Backtest Lab</h2>
          <p style={{ color: mutedColor, lineHeight: 1.6 }}>Backtest results will appear here after a verified historical-data and simulation engine is connected. No synthetic returns are displayed as real results.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            {["Date range and market regimes", "Brokerage, taxes and slippage", "Maximum drawdown and exposure", "Trade count and expectancy", "Out-of-sample validation", "Paper-trade readiness"].map((item) => <div key={item} style={{ border: "1px solid #71717a44", borderRadius: 10, padding: 14 }}><span style={{ color: "#60a5fa" }}>□</span> <strong style={{ fontSize: 13 }}>{item}</strong><div style={{ color: mutedColor, fontSize: 12, marginTop: 8 }}>Engine integration required</div></div>)}
          </div>
        </section>
      )}

      <footer style={{ marginTop: 20, color: mutedColor, fontSize: 12 }}>
        AJ Institutional · UI prototype · No broker order, paper-trade, deployment, pause, resume, or stop request is sent.
      </footer>
    </main>
  );
}