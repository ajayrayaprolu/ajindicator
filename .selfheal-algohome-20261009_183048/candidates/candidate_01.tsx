// ============================================================
// src/pages/AlgoHome.tsx
// AJ Institutional — Algo Home Dashboard
//
// Phase 1:
// - Static / interactive dashboard only.
// - No broker order calls.
// - No changes to Terminal / ChartWindow / feed implementations.
// - Get Charts opens the existing terminal in a separate tab.
// ============================================================

import { useMemo, useState } from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  ExternalLink,
  Layers3,
  LineChart,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

type Feed = "fyers" | "indstocks";
type ActivityTab = "positions" | "orders" | "history";

type Position = {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  avg: number;
  ltp: number;
  pnl: number;
  strategy: string;
  status: "OPEN" | "CLOSED";
};

const FEED_LABELS: Record<Feed, string> = {
  fyers: "FYERS",
  indstocks: "INDSTOCKS",
};

const positions: Position[] = [
  {
    symbol: "NIFTY 25,500 CE",
    side: "BUY",
    qty: 75,
    avg: 124.5,
    ltp: 152.3,
    pnl: 2085,
    strategy: "NIFTY Momentum",
    status: "OPEN",
  },
  {
    symbol: "RELIANCE 1250 CE",
    side: "BUY",
    qty: 50,
    avg: 48.2,
    ltp: 69.2,
    pnl: 1050,
    strategy: "Stock Option Buy",
    status: "OPEN",
  },
  {
    symbol: "BANKNIFTY 57,000 PE",
    side: "BUY",
    qty: 25,
    avg: 236.75,
    ltp: 219.35,
    pnl: -435,
    strategy: "BankNifty Breakout",
    status: "OPEN",
  },
];

const orders = [
  ["10:15:42", "NIFTY 25,500 CE", "BUY", "75", "124.50", "FILLED"],
  ["09:52:11", "BANKNIFTY 57,000 PE", "BUY", "25", "236.75", "FILLED"],
  ["09:34:27", "RELIANCE 1250 CE", "BUY", "50", "48.20", "FILLED"],
];

const history = [
  ["09 Sep", "NIFTY 25,400 CE", "BUY → EXIT", "+₹3,420"],
  ["08 Sep", "BANKNIFTY 56,800 CE", "BUY → EXIT", "+₹1,870"],
  ["08 Sep", "RELIANCE 1240 CE", "BUY → SL", "-₹620"],
  ["07 Sep", "NIFTY 25,300 CE", "BUY → TARGET", "+₹2,190"],
];

function money(value: number) {
  return `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString("en-IN")}`;
}

function openTerminal() {
  const url = `${window.location.origin}${window.location.pathname}?terminal=1`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function selectFeed(feed: Feed) {
  const url = `${window.location.origin}${window.location.pathname}?feed=${feed}`;
  window.location.assign(url);
}

export default function AlgoHome() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialFeed =
    params.get("feed") === "indstocks" ? "indstocks" : "fyers";

  const [feed, setFeed] = useState<Feed>(initialFeed);
  const [activityTab, setActivityTab] =
    useState<ActivityTab>("positions");
  const [autoTrade, setAutoTrade] = useState(true);
  const [strategyPaused, setStrategyPaused] = useState(false);

  const handleFeed = (nextFeed: Feed) => {
    setFeed(nextFeed);
    selectFeed(nextFeed);
  };

  const livePositions = positions.filter((item) => item.status === "OPEN");
  const unrealized = livePositions.reduce((sum, item) => sum + item.pnl, 0);

  return (
    <main className="aj-home">
      <style>{`
        .aj-home {
          min-height: 100vh;
          color: #e5edf8;
          background:
            radial-gradient(circle at 12% 0%, rgba(37,99,235,.18), transparent 28%),
            radial-gradient(circle at 90% 12%, rgba(124,58,237,.14), transparent 25%),
            #050816;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .aj-shell {
          width: min(1500px, calc(100% - 36px));
          margin: 0 auto;
        }

        .aj-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          border-bottom: 1px solid rgba(148,163,184,.14);
          background: rgba(5,8,22,.92);
          backdrop-filter: blur(18px);
        }

        .aj-topbar-inner {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .aj-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 220px;
        }

        .aj-brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-weight: 900;
          color: white;
          background: linear-gradient(135deg,#2563eb,#7c3aed);
          box-shadow: 0 10px 30px rgba(37,99,235,.28);
        }

        .aj-brand-title {
          font-weight: 900;
          letter-spacing: -.02em;
        }

        .aj-brand-sub {
          margin-top: 2px;
          color: #71809a;
          font-size: 11px;
        }

        .aj-feed-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          justify-content: center;
        }

        .aj-feed-tab {
          min-width: 132px;
          border: 1px solid rgba(148,163,184,.16);
          border-radius: 12px;
          padding: 9px 14px;
          color: #91a0b8;
          background: rgba(15,23,42,.55);
          cursor: pointer;
          transition: .18s ease;
        }

        .aj-feed-tab:hover {
          border-color: rgba(96,165,250,.4);
          transform: translateY(-1px);
        }

        .aj-feed-tab.active {
          color: white;
          border-color: rgba(59,130,246,.7);
          background: linear-gradient(180deg, rgba(37,99,235,.28), rgba(37,99,235,.10));
          box-shadow: 0 8px 25px rgba(37,99,235,.14);
        }

        .aj-feed-name {
          font-weight: 850;
          font-size: 13px;
        }

        .aj-feed-status {
          margin-top: 4px;
          font-size: 10px;
        }

        .aj-live-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34,197,94,.10);
          margin-right: 6px;
        }

        .aj-top-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .aj-status {
          padding: 9px 12px;
          border: 1px solid rgba(34,197,94,.22);
          border-radius: 11px;
          color: #86efac;
          background: rgba(34,197,94,.07);
          font-size: 11px;
          font-weight: 750;
        }

        .aj-icon-button {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 11px;
          display: grid;
          place-items: center;
          color: #94a3b8;
          background: rgba(15,23,42,.55);
        }

        .aj-hero {
          display: grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 18px;
          padding: 30px 0 18px;
        }

        .aj-panel {
          border: 1px solid rgba(148,163,184,.13);
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(15,23,42,.84), rgba(7,13,28,.88));
          box-shadow: 0 20px 50px rgba(0,0,0,.18);
        }

        .aj-hero-main {
          padding: 30px;
          overflow: hidden;
          position: relative;
        }

        .aj-hero-main:after {
          content: "";
          position: absolute;
          width: 320px;
          height: 320px;
          right: -150px;
          top: -150px;
          border-radius: 50%;
          background: rgba(59,130,246,.10);
          filter: blur(8px);
        }

        .aj-eyebrow {
          color: #60a5fa;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .aj-h1 {
          margin: 9px 0 8px;
          max-width: 720px;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 1.02;
          letter-spacing: -.045em;
        }

        .aj-muted {
          color: #7f8da6;
        }

        .aj-flow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 25px;
        }

        .aj-flow-step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 11px;
          background: rgba(2,6,23,.35);
          color: #b8c5d8;
          font-size: 12px;
          font-weight: 700;
        }

        .aj-flow-number {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: #2563eb;
          font-size: 10px;
        }

        .aj-primary {
          border: 0;
          border-radius: 11px;
          padding: 12px 16px;
          color: white;
          background: linear-gradient(135deg,#2563eb,#4f46e5);
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(37,99,235,.22);
        }

        .aj-secondary {
          border: 1px solid rgba(148,163,184,.17);
          border-radius: 11px;
          padding: 11px 14px;
          color: #cbd5e1;
          background: rgba(15,23,42,.65);
          font-weight: 750;
          cursor: pointer;
        }

        .aj-hero-side {
          padding: 22px;
        }

        .aj-side-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .aj-side-title h3 {
          margin: 0;
          font-size: 14px;
        }

        .aj-small-pill {
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 800;
          color: #86efac;
          background: rgba(34,197,94,.08);
          border: 1px solid rgba(34,197,94,.18);
        }

        .aj-signal-box {
          padding: 18px;
          border-radius: 15px;
          border: 1px solid rgba(96,165,250,.18);
          background: linear-gradient(145deg, rgba(37,99,235,.12), rgba(124,58,237,.07));
        }

        .aj-signal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 7px 0;
          font-size: 12px;
        }

        .aj-signal-value {
          color: white;
          font-weight: 800;
        }

        .aj-stats {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 12px;
          margin: 0 0 18px;
        }

        .aj-stat {
          padding: 18px;
        }

        .aj-stat-label {
          color: #75839b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 800;
        }

        .aj-stat-value {
          margin-top: 7px;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -.025em;
        }

        .aj-stat-change {
          margin-top: 4px;
          color: #4ade80;
          font-size: 11px;
          font-weight: 750;
        }

        .aj-grid {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .aj-card {
          padding: 21px;
        }

        .aj-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .aj-card-title {
          margin: 0;
          font-size: 15px;
          font-weight: 850;
        }

        .aj-card-subtitle {
          margin-top: 4px;
          color: #71809a;
          font-size: 11px;
        }

        .aj-strategy-state {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 850;
          color: #fbbf24;
          background: rgba(245,158,11,.08);
          border: 1px solid rgba(245,158,11,.17);
          white-space: nowrap;
        }

        .aj-indicators {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 18px;
        }

        .aj-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 9px;
          border: 1px solid rgba(148,163,184,.13);
          border-radius: 9px;
          color: #aebbd0;
          background: rgba(2,6,23,.32);
          font-size: 10px;
          font-weight: 750;
        }

        .aj-chart-placeholder {
          min-height: 230px;
          border-radius: 14px;
          border: 1px dashed rgba(96,165,250,.20);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(rgba(148,163,184,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,.045) 1px, transparent 1px),
            rgba(2,6,23,.3);
          background-size: 38px 38px;
        }

        .aj-chart-line {
          width: 72%;
          height: 110px;
          border-top: 3px solid #60a5fa;
          transform: rotate(-5deg) skewX(-13deg);
          opacity: .7;
          filter: drop-shadow(0 8px 12px rgba(59,130,246,.18));
        }

        .aj-buy-marker {
          position: absolute;
          left: 58%;
          top: 38%;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #4ade80;
          font-size: 10px;
          font-weight: 900;
        }

        .aj-marker-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 0 5px rgba(74,222,128,.09);
        }

        .aj-execution {
          display: grid;
          gap: 9px;
        }

        .aj-exec-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(148,163,184,.08);
          font-size: 11px;
        }

        .aj-exec-row:last-child {
          border-bottom: 0;
        }

        .aj-exec-label {
          color: #74839b;
        }

        .aj-exec-value {
          color: #e7edf7;
          font-weight: 800;
          text-align: right;
        }

        .aj-targets {
          margin: 16px 0;
          display: grid;
          gap: 7px;
        }

        .aj-target {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 10px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 750;
          background: rgba(2,6,23,.32);
          border: 1px solid rgba(148,163,184,.08);
        }

        .aj-target.hit {
          color: #86efac;
          border-color: rgba(34,197,94,.18);
        }

        .aj-target.wait {
          color: #aebbd0;
        }

        .aj-target.stop {
          color: #fca5a5;
        }

        .aj-action-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .aj-activity {
          margin-bottom: 18px;
          overflow: hidden;
        }

        .aj-tabs {
          display: flex;
          gap: 4px;
          padding: 8px;
          border-bottom: 1px solid rgba(148,163,184,.09);
          background: rgba(2,6,23,.25);
        }

        .aj-tab {
          border: 0;
          border-radius: 9px;
          padding: 9px 13px;
          color: #71809a;
          background: transparent;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .aj-tab.active {
          color: white;
          background: rgba(59,130,246,.14);
        }

        .aj-table-wrap {
          overflow-x: auto;
        }

        .aj-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .aj-table th,
        .aj-table td {
          padding: 13px 15px;
          border-bottom: 1px solid rgba(148,163,184,.07);
          text-align: left;
          font-size: 11px;
        }

        .aj-table th {
          color: #61708a;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .aj-table td {
          color: #b8c5d8;
        }

        .aj-positive {
          color: #4ade80 !important;
          font-weight: 850;
        }

        .aj-negative {
          color: #f87171 !important;
          font-weight: 850;
        }

        .aj-bottom-grid {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 18px;
          margin-bottom: 30px;
        }

        .aj-performance {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .aj-metric {
          padding: 13px;
          border: 1px solid rgba(148,163,184,.08);
          border-radius: 11px;
          background: rgba(2,6,23,.28);
        }

        .aj-metric span {
          display: block;
          color: #6e7c94;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 800;
        }

        .aj-metric strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
        }

        .aj-strategy-list {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 10px;
        }

        .aj-strategy {
          padding: 15px;
          border: 1px solid rgba(148,163,184,.10);
          border-radius: 12px;
          background: rgba(2,6,23,.25);
        }

        .aj-strategy-name {
          font-size: 12px;
          font-weight: 850;
        }

        .aj-strategy-meta {
          margin-top: 5px;
          color: #71809a;
          font-size: 10px;
        }

        .aj-footer {
          padding: 10px 0 30px;
          color: #4f5d73;
          text-align: center;
          font-size: 10px;
        }

        @media (max-width: 1100px) {
          .aj-hero,
          .aj-grid,
          .aj-bottom-grid {
            grid-template-columns: 1fr;
          }
          .aj-stats {
            grid-template-columns: repeat(2,1fr);
          }
          .aj-strategy-list {
            grid-template-columns: 1fr;
          }
          .aj-topbar-inner {
            flex-wrap: wrap;
            padding: 10px 0;
          }
          .aj-feed-tabs {
            order: 3;
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .aj-shell {
            width: min(100% - 20px, 1500px);
          }
          .aj-stats {
            grid-template-columns: 1fr;
          }
          .aj-flow {
            flex-direction: column;
            align-items: stretch;
          }
          .aj-top-actions {
            width: 100%;
          }
          .aj-status {
            flex: 1;
          }
        }
      `}</style>

      <header className="aj-topbar">
        <div className="aj-shell aj-topbar-inner">
          <div className="aj-brand">
            <div className="aj-brand-mark">AJ</div>
            <div>
              <div className="aj-brand-title">AJ Institutional</div>
              <div className="aj-brand-sub">Algo Trading Control Center</div>
            </div>
          </div>

          <div className="aj-feed-tabs" aria-label="Market feeds">
            {(["fyers", "indstocks"] as Feed[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`aj-feed-tab ${feed === item ? "active" : ""}`}
                onClick={() => handleFeed(item)}
              >
                <div className="aj-feed-name">{FEED_LABELS[item]}</div>
                <div className="aj-feed-status">
                  <span className="aj-live-dot" />
                  Connected · Live
                </div>
              </button>
            ))}
          </div>

          <div className="aj-top-actions">
            <div className="aj-status">
              <span className="aj-live-dot" />
              {FEED_LABELS[feed]} Broker Connected
            </div>
            <button className="aj-icon-button" title="Notifications">
              <Bell size={17} />
            </button>
            <button className="aj-icon-button" title="Account">
              <Wallet size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="aj-shell">
        <section className="aj-hero">
          <div className="aj-panel aj-hero-main">
            <div className="aj-eyebrow">AUTOMATED EXECUTION · {FEED_LABELS[feed]}</div>
            <h1 className="aj-h1">
              Turn your indicator signal into a managed trade.
            </h1>
            <div className="aj-muted">
              Your indicator remains the decision source. AJ handles entry,
              option selection, position monitoring, targets, stop-loss and exit.
            </div>

            <div className="aj-flow">
              <div className="aj-flow-step">
                <span className="aj-flow-number">1</span>
                Indicator signal
              </div>
              <ChevronRight size={15} color="#52627b" />
              <div className="aj-flow-step">
                <span className="aj-flow-number">2</span>
                Wait for entry
              </div>
              <ChevronRight size={15} color="#52627b" />
              <div className="aj-flow-step">
                <span className="aj-flow-number">3</span>
                Buy option
              </div>
              <ChevronRight size={15} color="#52627b" />
              <div className="aj-flow-step">
                <span className="aj-flow-number">4</span>
                Target / SL
              </div>
            </div>

            <div style={{ display: "flex", gap: 9, marginTop: 22, flexWrap: "wrap" }}>
              <button type="button" className="aj-primary" onClick={openTerminal}>
                <ExternalLink size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />
                Get Charts
              </button>

              <button
                type="button"
                className="aj-secondary"
                onClick={() => setAutoTrade((value) => !value)}
              >
                {autoTrade ? <Zap size={15} /> : <Square size={15} />}
                Auto Trade: {autoTrade ? "ARMED" : "OFF"}
              </button>
            </div>
          </div>

          <div className="aj-panel aj-hero-side">
            <div className="aj-side-title">
              <h3>Current Signal</h3>
              <span className="aj-small-pill">MONITORING</span>
            </div>

            <div className="aj-signal-box">
              <div className="aj-eyebrow">NIFTY MOMENTUM · 5 MIN</div>
              <div style={{ fontSize: 25, fontWeight: 900, margin: "9px 0" }}>
                BUY SIGNAL
              </div>
              <div className="aj-signal-row">
                <span className="aj-muted">Underlying</span>
                <span className="aj-signal-value">NIFTY</span>
              </div>
              <div className="aj-signal-row">
                <span className="aj-muted">Signal time</span>
                <span className="aj-signal-value">10:15:42</span>
              </div>
              <div className="aj-signal-row">
                <span className="aj-muted">State</span>
                <span style={{ color: "#fbbf24", fontWeight: 850 }}>
                  Waiting for entry
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 7, alignItems: "center", color: "#75839b", fontSize: 10 }}>
              <ShieldCheck size={14} />
              No order is sent by this prototype.
            </div>
          </div>
        </section>

        <section className="aj-stats">
          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">NIFTY</div>
            <div className="aj-stat-value">25,480.25</div>
            <div className="aj-stat-change"><ArrowUpRight size={12} /> +0.72%</div>
          </div>
          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">BANK NIFTY</div>
            <div className="aj-stat-value">57,210.40</div>
            <div className="aj-stat-change"><ArrowUpRight size={12} /> +0.48%</div>
          </div>
          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">INDIA VIX</div>
            <div className="aj-stat-value">13.82</div>
            <div className="aj-stat-change"><ArrowDownRight size={12} /> -2.10%</div>
          </div>
          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">UNREALIZED P&L</div>
            <div className={`aj-stat-value ${unrealized >= 0 ? "aj-positive" : "aj-negative"}`}>
              {money(unrealized)}
            </div>
            <div className="aj-stat-change">3 open positions</div>
          </div>
        </section>

        <section className="aj-grid">
          <div className="aj-panel aj-card">
            <div className="aj-card-header">
              <div>
                <h2 className="aj-card-title">Active Algo · NIFTY Momentum</h2>
                <div className="aj-card-subtitle">
                  {FEED_LABELS[feed]} · 5 minute · Option Buy
                </div>
              </div>
              <div className="aj-strategy-state">
                <Circle size={9} fill="currentColor" />
                {strategyPaused ? "PAUSED" : "WAITING FOR ENTRY"}
              </div>
            </div>

            <div className="aj-indicators">
              {["EMA 21", "EMA 50", "RSI", "Supertrend", "Price Action"].map((name) => (
                <span className="aj-indicator" key={name}>
                  <CheckCircle2 size={12} color="#4ade80" />
                  {name}
                </span>
              ))}
            </div>

            <div className="aj-chart-placeholder">
              <div className="aj-chart-line" />
              <div className="aj-buy-marker">
                <span className="aj-marker-dot" />
                BUY SIGNAL
              </div>
            </div>

            <div className="aj-action-row" style={{ marginTop: 14 }}>
              <button type="button" className="aj-secondary" onClick={openTerminal}>
                <LineChart size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                View Chart
              </button>
              <button
                type="button"
                className="aj-secondary"
                onClick={() => setStrategyPaused((value) => !value)}
              >
                {strategyPaused ? <Play size={14} /> : <Pause size={14} />}
                {strategyPaused ? "Resume" : "Pause"}
              </button>
              <button type="button" className="aj-secondary">
                <Square size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Stop
              </button>
            </div>
          </div>

          <div className="aj-panel aj-card">
            <div className="aj-card-header">
              <div>
                <h2 className="aj-card-title">Option Execution</h2>
                <div className="aj-card-subtitle">Execution plan — demonstration only</div>
              </div>
              <Target size={19} color="#60a5fa" />
            </div>

            <div className="aj-execution">
              <div className="aj-exec-row"><span className="aj-exec-label">Underlying</span><span className="aj-exec-value">NIFTY</span></div>
              <div className="aj-exec-row"><span className="aj-exec-label">Direction</span><span className="aj-exec-value" style={{ color: "#4ade80" }}>BUY</span></div>
              <div className="aj-exec-row"><span className="aj-exec-label">Contract</span><span className="aj-exec-value">25,500 CE</span></div>
              <div className="aj-exec-row"><span className="aj-exec-label">Expiry</span><span className="aj-exec-value">09 Sep 2026</span></div>
              <div className="aj-exec-row"><span className="aj-exec-label">Quantity</span><span className="aj-exec-value">75</span></div>
              <div className="aj-exec-row"><span className="aj-exec-label">Entry</span><span className="aj-exec-value">₹124.50</span></div>
            </div>

            <div className="aj-targets">
              <div className="aj-target hit"><span>Target 1 · ₹145</span><span>✓ HIT</span></div>
              <div className="aj-target wait"><span>Target 2 · ₹160</span><span>WAITING</span></div>
              <div className="aj-target wait"><span>Final Target · ₹175</span><span>WAITING</span></div>
              <div className="aj-target stop"><span>Stop Loss · ₹110</span><span>PROTECTED</span></div>
            </div>

            <button type="button" className="aj-primary" style={{ width: "100%" }} onClick={() => setAutoTrade((value) => !value)}>
              <Bot size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />
              {autoTrade ? "Auto Trade Armed" : "Auto Trade Off"}
            </button>
          </div>
        </section>

        <section className="aj-panel aj-activity">
          <div className="aj-tabs">
            {([
              ["positions", "Positions"],
              ["orders", "Orders"],
              ["history", "Order History"],
            ] as [ActivityTab, string][]).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`aj-tab ${activityTab === key ? "active" : ""}`}
                onClick={() => setActivityTab(key)}
              >
                {label}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "0 10px", color: "#56647a", fontSize: 10 }}>
              <Clock3 size={12} />
              Live monitoring
            </div>
          </div>

          <div className="aj-table-wrap">
            {activityTab === "positions" && (
              <table className="aj-table">
                <thead>
                  <tr>
                    <th>Symbol</th><th>Side</th><th>Qty</th><th>Avg Fill</th>
                    <th>LTP</th><th>Profit</th><th>Strategy</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((item) => (
                    <tr key={item.symbol}>
                      <td style={{ color: "white", fontWeight: 800 }}>{item.symbol}</td>
                      <td className="aj-positive">{item.side}</td>
                      <td>{item.qty}</td>
                      <td>₹{item.avg.toFixed(2)}</td>
                      <td>₹{item.ltp.toFixed(2)}</td>
                      <td className={item.pnl >= 0 ? "aj-positive" : "aj-negative"}>{money(item.pnl)}</td>
                      <td>{item.strategy}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activityTab === "orders" && (
              <table className="aj-table">
                <thead>
                  <tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {orders.map((row) => (
                    <tr key={`${row[0]}-${row[1]}`}>
                      {row.map((cell, index) => (
                        <td key={index} className={cell === "FILLED" ? "aj-positive" : ""}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activityTab === "history" && (
              <table className="aj-table">
                <thead>
                  <tr><th>Date</th><th>Symbol</th><th>Lifecycle</th><th>Net P&L</th></tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={`${row[0]}-${row[1]}`}>
                      <td>{row[0]}</td>
                      <td style={{ color: "white", fontWeight: 800 }}>{row[1]}</td>
                      <td>{row[2]}</td>
                      <td className={row[3].startsWith("-") ? "aj-negative" : "aj-positive"}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="aj-bottom-grid">
          <div className="aj-panel aj-card">
            <div className="aj-card-header">
              <div>
                <h2 className="aj-card-title">Performance</h2>
                <div className="aj-card-subtitle">Prototype metrics — not live account data</div>
              </div>
              <TrendingUp size={18} color="#60a5fa" />
            </div>

            <div className="aj-performance">
              <div className="aj-metric"><span>Realized P&L</span><strong className="aj-positive">₹8,420</strong></div>
              <div className="aj-metric"><span>Unrealized P&L</span><strong className="aj-positive">{money(unrealized)}</strong></div>
              <div className="aj-metric"><span>Win Rate</span><strong>68%</strong></div>
              <div className="aj-metric"><span>Profit Factor</span><strong>1.92</strong></div>
              <div className="aj-metric"><span>Active Positions</span><strong>3</strong></div>
              <div className="aj-metric"><span>Today Trades</span><strong>7</strong></div>
            </div>
          </div>

          <div className="aj-panel aj-card">
            <div className="aj-card-header">
              <div>
                <h2 className="aj-card-title">Strategy Library</h2>
                <div className="aj-card-subtitle">Your native AJ strategies will live here</div>
              </div>
              <Layers3 size={18} color="#60a5fa" />
            </div>

            <div className="aj-strategy-list">
              {[
                ["NIFTY Momentum", "5m · Option Buy · 68% win rate"],
                ["BankNifty Breakout", "5m · Option Buy · 61% win rate"],
                ["Stock Option Buy", "15m · Signal driven · 64% win rate"],
              ].map(([name, meta]) => (
                <div className="aj-strategy" key={name}>
                  <div className="aj-strategy-name">{name}</div>
                  <div className="aj-strategy-meta">{meta}</div>
                  <div style={{ marginTop: 13, color: "#60a5fa", fontSize: 10, fontWeight: 850 }}>
                    Configure strategy <ChevronRight size={12} style={{ verticalAlign: "middle" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="aj-footer">
          AJ Institutional · {FEED_LABELS[feed]} · Phase 1 Algo Dashboard · No live orders are submitted by this prototype.
        </div>
      </div>
    </main>
  );
}

