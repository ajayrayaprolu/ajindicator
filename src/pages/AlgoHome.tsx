// ============================================================
// src/pages/AlgoHome.tsx
// AJ Institutional — Algo Home Dashboard
//
// Phase 2:
// - Reuses existing broker symbol-search APIs.
// - FYERS:     /api/fyers/symbols/search
// - INDSTOCKS: /api/indstocks/symbols/search
// - Preserves canonical instrument metadata.
// - No duplicate market-data implementation.
// - No duplicate candle implementation.
// - No duplicate indicator calculations.
// - No broker order calls.
// - Existing Terminal / ChartWindow remain untouched.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import ChartWindow from "../components/ChartWindow";
import AJSettingsPanel from "../indicators/AJIndicator/config/AJIndicatorSettingsPanel";

import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Layers3,
  Moon,
  Pause,
  Play,
  Search,
  Sun,
  Settings2,
  ShieldCheck,
  Square,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

type Feed = "fyers" | "indstocks";
type ActivityTab = "positions" | "orders" | "history";

type Instrument = {
  symbol: string;
  tradingSymbol?: string;
  displayName?: string;

  underlying?: string;
  expiry?: string;
  strike?: number | string;
  optionType?: string;

  exchange?: string;
  feedSource?: string;
  tokenIdentifier?: string;

  instrumentType?: string;

  [key: string]: unknown;
};

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

const fallbackInstruments: Instrument[] = [];

function money(value: number) {
  return `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString("en-IN")}`;
}


function selectFeed(feed: Feed) {
  const url =
    `${window.location.origin}` +
    `${window.location.pathname}?feed=${feed}`;

  window.location.assign(url);
}

/**
 * Existing broker search responses can differ slightly between
 * adapters. We normalize the outer response here without creating
 * another symbol master.
 */
function extractSearchItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const value = payload as Record<string, unknown>;

  const candidates = [
    value.data,
    value.results,
    value.items,
    value.symbols,
    value.instruments,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (
      candidate &&
      typeof candidate === "object"
    ) {
      const nested = candidate as Record<string, unknown>;

      for (const nestedValue of [
        nested.data,
        nested.results,
        nested.items,
        nested.symbols,
        nested.instruments,
      ]) {
        if (Array.isArray(nestedValue)) {
          return nestedValue;
        }
      }
    }
  }

  return [];
}

/**
 * Convert the existing broker search result into the canonical
 * metadata shape required by AlgoHome.
 *
 * Important:
 * We do not reconstruct option symbols from display text.
 * Unknown broker-specific fields are retained through ...item.
 */
function normalizeInstrument(
  value: unknown,
  feed: Feed,
): Instrument | null {
  if (typeof value === "string") {
    return {
      symbol: value,
      tradingSymbol: value,
      displayName: value,
      feedSource: feed,
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;

  const symbol =
    firstString(
      item.symbol,
      item.tradingsymbol,
      item.tradingSymbol,
      item.displaySymbol,
      item.name,
    );

  if (!symbol) {
    return null;
  }

  const tradingSymbol =
    firstString(
      item.tradingSymbol,
      item.tradingsymbol,
      item.symbol,
    );

  const displayName =
    firstString(
      item.displayName,
      item.display_name,
      item.description,
      item.name,
      tradingSymbol,
      symbol,
    );

  const underlying =
    firstString(
      item.underlying,
      item.underlyingSymbol,
      item.underlying_symbol,
      item.baseSymbol,
    );

  const expiry =
    firstString(
      item.expiry,
      item.expiryDate,
      item.expiry_date,
    );

  const strike =
    firstValue(
      item.strike,
      item.strikePrice,
      item.strike_price,
    );

  const optionType =
    firstString(
      item.optionType,
      item.option_type,
      item.optiontype,
      item.right,
    );

  const exchange =
    firstString(
      item.exchange,
      item.exchangeSegment,
      item.exchange_segment,
    );

  const tokenIdentifier =
    firstString(
      item.tokenIdentifier,
      item.token,
      item.instrumentToken,
      item.instrument_token,
    );

  return {
    ...item,
    symbol,
    tradingSymbol,
    displayName,
    underlying,
    expiry,
    strike,
    optionType,
    exchange,
    feedSource:
      firstString(
        item.feedSource,
        item.feed_source,
      ) ?? feed,
    tokenIdentifier,
  };
}

function firstString(
  ...values: unknown[]
): string | undefined {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  return undefined;
}

function firstValue(
  ...values: unknown[]
): string | number | undefined {
  for (const value of values) {
    if (
      typeof value === "number" ||
      typeof value === "string"
    ) {
      if (String(value).trim().length > 0) {
        return value;
      }
    }
  }

  return undefined;
}

function instrumentLabel(
  instrument: Instrument,
) {
  return (
    instrument.tradingSymbol ||
    instrument.symbol ||
    instrument.displayName ||
    "Unknown Instrument"
  );
}

function instrumentSecondaryLabel(
  instrument: Instrument,
) {
  const parts: string[] = [];

  if (instrument.exchange) {
    parts.push(instrument.exchange);
  }

  if (instrument.optionType) {
    parts.push(String(instrument.optionType));
  }

  if (
    instrument.strike !== undefined &&
    instrument.strike !== null
  ) {
    parts.push(`Strike ${instrument.strike}`);
  }

  if (instrument.expiry) {
    parts.push(String(instrument.expiry));
  }

  return parts.join(" · ");
}

export default function AlgoHome() {
  const { theme: algoHomeTheme, toggleTheme: toggleAlgoHomeTheme } = useTheme();
  const params = useMemo(
    () =>
      new URLSearchParams(
        window.location.search,
      ),
    [],
  );

  const initialFeed: Feed =
    params.get("feed") === "indstocks"
      ? "indstocks"
      : "fyers";

  const [feed, setFeed] =
    useState<Feed>(initialFeed);

  const [activityTab, setActivityTab] =
    useState<ActivityTab>("positions");

  const [autoTrade, setAutoTrade] =
    useState(true);

  const [strategyPaused, setStrategyPaused] =
    useState(false);
  const [chartTimeframe, setChartTimeframe] = useState("5");

  // These controls affect only the embedded AlgoHome ChartWindow.
    const [algoIndicators, setAlgoIndicators] = useState({
    ajindicator: true,
    ema21: true,
    ema50: true,
    supertrend: true,
    adx: false,
    rsi: true,
  });
  const [showAJSettings, setShowAJSettings] = useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<Instrument[]>(fallbackInstruments);

  const [selectedInstrument, setSelectedInstrument] =
    useState<Instrument | null>(null);

  const [searching, setSearching] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  const searchAbortRef =
    useRef<AbortController | null>(null);

  const livePositions =
    positions.filter(
      (item) => item.status === "OPEN",
    );

  const unrealized =
    livePositions.reduce(
      (sum, item) => sum + item.pnl,
      0,
    );

  /**
   * Phase 2 broker symbol search.
   *
   * This calls the existing broker endpoint.
   * AlgoHome does not maintain its own symbol database.
   */
  useEffect(() => {
    const query = searchText.trim();

    // A selected instrument stays in the input; do not reopen its results.
    if (
      selectedInstrument &&
      query === instrumentLabel(selectedInstrument).trim()
    ) {
      searchAbortRef.current?.abort();
      setSearchResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    const controller =
      new AbortController();

    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;

    const timer = window.setTimeout(
      async () => {
        try {
          setSearching(true);
          setSearchError("");

          const endpoint =
            feed === "fyers"
              ? "/api/fyers/symbols/search"
              : "/api/indstocks/symbols/search";

          const url =
            `${endpoint}?q=${encodeURIComponent(query)}`;

          const response =
            await fetch(url, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              signal: controller.signal,
            });

          if (!response.ok) {
            throw new Error(
              `Search request failed (${response.status})`,
            );
          }

          const payload =
            await response.json();

          const items =
            extractSearchItems(payload)
              .map((item) =>
                normalizeInstrument(
                  item,
                  feed,
                ),
              )
              .filter(
                (
                  item,
                ): item is Instrument =>
                  item !== null,
              );

          setSearchResults(items);
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setSearchResults([]);

          setSearchError(
            error instanceof Error
              ? error.message
              : "Unable to search instruments.",
          );
        } finally {
          setSearching(false);
        }
      },
      280,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, feed, selectedInstrument]);

  const handleFeed = (
    nextFeed: Feed,
  ) => {
    setFeed(nextFeed);
    setSearchText("");
    setSearchResults([]);
    setSelectedInstrument(null);
    selectFeed(nextFeed);
  };

  const handleInstrumentSelect = (
    instrument: Instrument,
  ) => {
    searchAbortRef.current?.abort();
    setSearchResults([]);
    setSelectedInstrument(instrument);
    setSearchText(
      instrumentLabel(instrument),
    );
    setSearchResults([]);
  };

  const clearInstrument = () => {
    setSelectedInstrument(null);
    setSearchText("");
    setSearchResults([]);
  };

  const selectedLabel =
    selectedInstrument
      ? instrumentLabel(
          selectedInstrument,
        )
      : "No instrument selected";

  return (
    <main className={`aj-home aj-theme-${algoHomeTheme}`}>
      {showAJSettings && (
        <AJSettingsPanel
          chartId="aj-algo-home-chart"
          onClose={() => setShowAJSettings(false)}
        />
      )}
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
          /* Keep Automated Execution and Current Signal equal-height. */
          align-items: stretch;
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
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .aj-page-layout {
          display: grid;
          grid-template-columns: 184px minmax(0, 1fr);
          align-items: start;
          gap: 16px;
        }
        .aj-page-main {
          min-width: 0;
          width: 100%;
        }
        .aj-side-nav {
          position: sticky;
          top: 92px;
          min-width: 0;
          padding: 12px 9px;
          border: 1px solid rgba(96,165,250,.16);
          border-radius: 13px;
          background: rgba(5,12,29,.88);
        }
        .aj-side-nav-heading {
          padding: 8px 10px 12px;
          color: #64748b;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.5px;
        }
        .aj-side-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 10px;
          margin: 2px 0;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #9aabc4;
          font-size: 11px;
          font-weight: 650;
          line-height: 1.3;
        }
        .aj-side-nav-link {
          text-decoration: none;
          cursor: pointer;
        }

        .aj-side-nav-item > span {
          display: inline-flex;
          flex: 0 0 17px;
          align-items: center;
          justify-content: center;
          color: #8298b9;
          font-size: 15px;
        }
        .aj-side-nav-item.is-current {
          border-color: rgba(96,165,250,.25);
          color: #e2edff;
          background: rgba(37,99,235,.17);
        }
        .aj-side-nav-item.is-current > span {
          color: #60a5fa;
        }
        .aj-targets-ladder .aj-target-name {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }
        .aj-targets-ladder .aj-target-step {
          position: relative;
        }
        .aj-targets-ladder .aj-target-step::before {
          content: "↑";
          position: absolute;
          left: 8px;
          top: -12px;
          width: 16px;
          height: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7dd3a7;
          font-size: 15px;
          font-weight: 900;
          line-height: 1;
          pointer-events: none;
          z-index: 2;
        }
        .aj-target-check {
          display: inline-flex;
          flex: 0 0 16px;
          width: 16px;
          height: 16px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(74,222,128,.7);
          border-radius: 50%;
          color: #4ade80;
          font-size: 10px;
          font-weight: 850;
          line-height: 1;
        }
        .aj-target-check.is-hit {
          border-color: #4ade80;
          color: #052e16;
          background: #4ade80;
        }
        @media (max-width: 900px) {
          .aj-page-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .aj-side-nav {
            position: static;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 3px;
          }
          .aj-side-nav-heading {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 620px) {
          .aj-side-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .aj-side-nav-item {
            padding: 8px 6px;
            gap: 6px;
            font-size: 10px;
          }
        }
        .aj-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: stretch;
          gap: 18px;
          margin-bottom: 18px;
        }

        .aj-chart-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: start;
          margin-bottom: 12px;
          min-width: 0;
        }

        .aj-chart-toolbar-main {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
          min-width: 0;
        }

        .aj-chart-toolbar .aj-search { margin-bottom: 0; min-width: 0; }
        .aj-chart-toolbar .aj-search-input-wrap { min-height: 38px; }
        .aj-chart-toolbar .aj-indicators { gap: 5px; }
        .aj-chart-toolbar .aj-indicator { padding: 5px 7px; font-size: 9px; }

        .aj-timeframe-wrap {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: #74839b;
          font-size: 8px;
          font-weight: 800;
        }

        .aj-timeframe-control {
          min-height: 38px;
          padding: 0 9px;
          border: 1px solid rgba(96,165,250,.24);
          border-radius: 9px;
          color: #e2e8f0;
          background: #0b1424;
        }

        .aj-option-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          margin-bottom: 12px;
        }

        .aj-option-field {
          min-width: 0;
          padding: 9px;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 9px;
          background: rgba(2,6,23,.32);
        }

        .aj-option-field span {
          display: block;
          margin-bottom: 5px;
          color: #74839b;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .aj-option-field strong {
          display: block;
          overflow-wrap: anywhere;
          color: #e7edf7;
          font-size: 11px;
          font-weight: 800;
        }

        .aj-positive { color: #4ade80 !important; }
        .aj-pending { color: #fbbf24 !important; }

        .aj-option-actions {
          display: grid;
          grid-template-columns: 1.2fr .8fr 1fr;
          gap: 8px;
          margin: 10px 0 14px;
        }

        .aj-option-actions > button {
          min-width: 0;
          justify-content: center;
        }

        .aj-execution-lower-grid {
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr);
          gap: 10px;
          align-items: stretch;
        }

        .aj-pipeline-card, .aj-targets-card {
          min-width: 0;
          padding: 12px;
          border: 1px solid rgba(96,165,250,.16);
          border-radius: 12px;
          background: rgba(2,6,23,.28);
        }

        .aj-pipeline-steps {
          display: grid;
          gap: 7px;
          margin-top: 11px;
        }

        .aj-pipeline-step {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          gap: 5px 7px;
          align-items: center;
          padding: 9px 8px;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 8px;
          background: rgba(15,23,42,.56);
        }

        .aj-pipeline-number { color: #64748b; font-size: 9px; font-weight: 800; }
        .aj-pipeline-label { color: #cbd5e1; font-size: 10px; font-weight: 750; }
        .aj-pipeline-step strong { grid-column: 2; font-size: 9px; }

        .aj-targets-compact {
          grid-template-columns: minmax(0, 1fr);
          gap: 7px;
          margin-top: 11px;
        }

        .aj-targets-compact .aj-target {
          gap: 5px;
          padding: 10px 8px;
          font-size: 9px;
        }

        .aj-lifecycle-track {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 4px;
          margin-top: 6px;
        }
        .aj-lifecycle-stage {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 3px 2px;
          text-align: center;
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 9px;
          background: rgba(15,23,42,.45);
        }
        .aj-lifecycle-stage:not(:last-child)::after {
          content: "→";
          position: absolute;
          top: 14px;
          right: -11px;
          z-index: 2;
          color: #64748b;
          font-size: 14px;
          font-weight: 800;
        }
        .aj-lifecycle-marker {
          display: flex;
          width: 22px;
          height: 22px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(148,163,184,.35);
          border-radius: 50%;
          color: #94a3b8;
          background: rgba(15,23,42,.9);
          font-size: 13px;
          font-weight: 900;
        }
        .aj-lifecycle-marker.is-active {
          border-color: rgba(74,222,128,.65);
          color: #052e16;
          background: #4ade80;
        }
        .aj-lifecycle-label {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 750;
        }
        .aj-lifecycle-stage strong {
          color: #94a3b8;
          font-size: 9px;
          overflow-wrap: anywhere;
        }
        .aj-lifecycle-stage strong.is-active { color: #4ade80; }

        .aj-pipeline-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 11px;
        }
        .aj-pipeline-step {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 10px 4px;
          text-align: center;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 8px;
          background: rgba(15,23,42,.56);
        }
        .aj-pipeline-step:not(:last-child)::after {
          content: "→";
          position: absolute;
          top: 14px;
          right: -13px;
          z-index: 2;
          color: #60a5fa;
          font-size: 15px;
          font-weight: 900;
        }
        .aj-pipeline-number {
          display: flex;
          width: 25px;
          height: 25px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(96,165,250,.5);
          border-radius: 50%;
          color: #93c5fd;
          background: rgba(30,58,138,.25);
          font-size: 11px;
          font-weight: 900;
        }
        .aj-pipeline-label {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }
        .aj-pipeline-step strong {
          font-size: 9px;
          overflow-wrap: anywhere;
        }
        .aj-pause-button {
          border-color: rgba(180,130,65,.55) !important;
          color: #f5deb3 !important;
          background: rgba(146,98,35,.25) !important;
        }
        .aj-pause-button:hover { background: rgba(146,98,35,.38) !important; }
        .aj-exit-button {
          border-color: rgba(248,113,113,.55) !important;
          color: #fecaca !important;
          background: rgba(153,27,27,.25) !important;
        }
        .aj-exit-button:hover { background: rgba(153,27,27,.4) !important; }

        @media (max-width: 600px) {
          .aj-lifecycle-track { gap: 4px; }
          .aj-lifecycle-stage { padding: 7px 2px; }
          .aj-lifecycle-stage:not(:last-child)::after { right: -7px; font-size: 11px; }
          .aj-lifecycle-label { font-size: 9px; }
          .aj-lifecycle-stage strong { font-size: 8px; }
          .aj-pipeline-steps { gap: 8px; }
          .aj-pipeline-step:not(:last-child)::after { right: -10px; }
        }

        @media (max-width: 900px) {
          .aj-execution-lower-grid { grid-template-columns: minmax(0, 1fr); }
          .aj-option-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 600px) {
          .aj-chart-toolbar, .aj-option-actions { grid-template-columns: minmax(0, 1fr); }
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

        .aj-search {
          position: relative;
          margin-bottom: 15px;
        }

        .aj-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 45px;
          padding: 0 13px;
          border: 1px solid rgba(96,165,250,.24);
          border-radius: 12px;
          background: rgba(2,6,23,.42);
        }

        .aj-search-input-wrap:focus-within {
          border-color: rgba(59,130,246,.65);
          box-shadow: 0 0 0 3px rgba(37,99,235,.08);
        }

        .aj-search-icon {
          color: #64748b;
          flex: 0 0 auto;
        }

        .aj-search-input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #e5edf8;
          background: transparent;
          font-size: 12px;
        }

        .aj-search-input::placeholder {
          color: #56647a;
        }

        .aj-search-clear {
          border: 0;
          color: #64748b;
          background: transparent;
          cursor: pointer;
          padding: 3px;
          display: grid;
          place-items: center;
        }

        .aj-search-results {
          position: absolute;
          z-index: 30;
          left: 0;
          right: 0;
          top: 52px;
          max-height: 290px;
          overflow-y: auto;
          border: 1px solid rgba(96,165,250,.20);
          border-radius: 13px;
          background: rgba(7,13,28,.98);
          box-shadow: 0 25px 60px rgba(0,0,0,.42);
        }

        .aj-search-result {
          width: 100%;
          display: block;
          text-align: left;
          border: 0;
          border-bottom: 1px solid rgba(148,163,184,.07);
          padding: 12px 13px;
          color: #cbd5e1;
          background: transparent;
          cursor: pointer;
        }

        .aj-search-result:last-child {
          border-bottom: 0;
        }

        .aj-search-result:hover {
          background: rgba(37,99,235,.10);
        }

        .aj-result-symbol {
          color: white;
          font-size: 12px;
          font-weight: 850;
        }

        .aj-result-meta {
          margin-top: 4px;
          color: #68778f;
          font-size: 10px;
        }

        .aj-search-status {
          padding: 12px 13px;
          color: #68778f;
          font-size: 10px;
        }

        .aj-selected-instrument {
          display: grid;
          gap: 8px;
          padding: 14px;
          margin-bottom: 16px;
          border: 1px solid rgba(96,165,250,.18);
          border-radius: 13px;
          background: linear-gradient(145deg, rgba(37,99,235,.10), rgba(2,6,23,.25));
        }

        .aj-selected-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .aj-selected-symbol {
          color: white;
          font-size: 15px;
          font-weight: 900;
        }

        .aj-selected-meta {
          margin-top: 4px;
          color: #74839b;
          font-size: 10px;
        }

        .aj-selected-remove {
          border: 0;
          color: #64748b;
          background: transparent;
          cursor: pointer;
        }

        .aj-canonical-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin-top: 4px;
        }

        .aj-canonical-item {
          padding: 8px;
          border-radius: 8px;
          background: rgba(2,6,23,.34);
        }

        .aj-canonical-label {
          color: #58677e;
          font-size: 8px;
          text-transform: uppercase;
          font-weight: 800;
        }

        .aj-canonical-value {
          margin-top: 3px;
          color: #b8c5d8;
          font-size: 10px;
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

          .aj-canonical-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        /* AlgoHome-only light palette. Dark mode uses the original styles above. */
        .aj-home.aj-theme-light {
          color: #202938 !important;
          background: #f3f6fa !important;
          --bg-modal: #ffffff;
          --bg-panel: #ffffff;
          --bg-panel-secondary: #f5f7fa;
          --bg-panel-tertiary: #e9eef5;
          --bg-input: #ffffff;
          --text-primary: #202938;
          --text-secondary: #465467;
          --text-muted: #69778a;
          --text-heading: #172033;
          --text-inverse: #ffffff;
          --border-primary: #cbd5e1;
          --border-secondary: #dbe2ea;
          --border-subtle: #e7ecf2;
          --border-strong: #aab6c5;
          --accent-primary: #2962ff;
          --shadow-heavy: 0 18px 48px rgba(30, 41, 59, .18);
        }

        .aj-home.aj-theme-light .aj-topbar,
        .aj-home.aj-theme-light .aj-side-nav {
          color: #202938;
          background: #ffffff;
          border-color: #d7e0ea;
        }

        .aj-home.aj-theme-light .aj-card,
        .aj-home.aj-theme-light .aj-panel,
        .aj-home.aj-theme-light .aj-stat-card {
          color: #202938;
          background-color: #ffffff !important;
          border-color: #d7e0ea;
        }

        .aj-home.aj-theme-light .aj-card-title {
          color: #172033 !important;
        }

        .aj-home.aj-theme-light .aj-card-subtitle {
          color: #64748b !important;
        }

        .aj-home.aj-theme-light .aj-brand-title,
        .aj-home.aj-theme-light .aj-side-nav-heading,
        .aj-home.aj-theme-light .aj-side-nav-item,
        .aj-home.aj-theme-light .aj-status {
          color: #334155;
        }

        .aj-home.aj-theme-light .aj-brand-sub {
          color: #64748b;
        }

        .aj-home.aj-theme-light .aj-icon-button {
          color: #334155;
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }

        .aj-home.aj-theme-light input,
        .aj-home.aj-theme-light select,
        .aj-home.aj-theme-light textarea {
          color: #202938 !important;
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }

        .aj-home.aj-theme-light input::placeholder,
        .aj-home.aj-theme-light textarea::placeholder {
          color: #8491a3 !important;
          opacity: 1;
        }

        .aj-home.aj-theme-light .aj-home-chart {
          color: #202938 !important;
          background: #ffffff !important;
          border-color: #d7e0ea !important;
        }

        /* AJ FULL LIGHT THEME OVERRIDES
           Scoped exclusively to AlgoHome. Dark mode retains the original CSS. */

        .aj-home.aj-theme-light {
          color-scheme: light;
          color: #202938 !important;
          background: #f3f6fa !important;
        }

        /* Main layout surfaces */
        .aj-home.aj-theme-light .aj-shell,
        .aj-home.aj-theme-light .aj-main,
        .aj-home.aj-theme-light .aj-content,
        .aj-home.aj-theme-light .aj-workspace,
        .aj-home.aj-theme-light .aj-dashboard,
        .aj-home.aj-theme-light .aj-hero,
        .aj-home.aj-theme-light .aj-stats,
        .aj-home.aj-theme-light .aj-grid {
          color: #202938 !important;
        }
        /* AJ LIGHT PAGE CONTINUOUS BACKGROUND */
        .aj-home.aj-theme-light .aj-shell,
        .aj-home.aj-theme-light .aj-main,
        .aj-home.aj-theme-light .aj-content,
        .aj-home.aj-theme-light .aj-workspace,
        .aj-home.aj-theme-light .aj-dashboard,
        .aj-home.aj-theme-light .aj-grid {
          background-color: #f3f6fa !important;
        }

        /* Equal-height cards within the desktop two-column grid */
        .aj-home.aj-theme-light .aj-grid > .aj-panel {
          height: 100%;
          box-sizing: border-box;
        }

        .aj-home.aj-theme-light .aj-topbar,
        .aj-home.aj-theme-light .aj-side-nav,
        .aj-home.aj-theme-light .aj-panel,
        .aj-home.aj-theme-light .aj-card,
        .aj-home.aj-theme-light .aj-stat-card,
        .aj-home.aj-theme-light .aj-hero-main,
        .aj-home.aj-theme-light .aj-hero-side,
        .aj-home.aj-theme-light .aj-stat,
        .aj-home.aj-theme-light .aj-activity,
        .aj-home.aj-theme-light .aj-home-chart {
          color: #202938 !important;
          background: #ffffff !important;
          border-color: #d7e0ea !important;
          box-shadow: 0 3px 12px rgba(30, 41, 59, .045);
        }

        /* Nested execution, signal, instrument and lifecycle panels */
        .aj-home.aj-theme-light .aj-signal-box,
        .aj-home.aj-theme-light .aj-option-summary,
        .aj-home.aj-theme-light .aj-option-field,
        .aj-home.aj-theme-light .aj-pipeline-card,
        .aj-home.aj-theme-light .aj-targets-card,
        .aj-home.aj-theme-light .aj-lifecycle-track,
        .aj-home.aj-theme-light .aj-lifecycle-stage,
        .aj-home.aj-theme-light .aj-search,
        .aj-home.aj-theme-light .aj-search-input-wrap,
        .aj-home.aj-theme-light .aj-selected-top,
        .aj-home.aj-theme-light .aj-selected-instrument,
        .aj-home.aj-theme-light .aj-canonical-item,
        .aj-home.aj-theme-light .aj-metric,
        .aj-home.aj-theme-light .aj-strategy-state,
        .aj-home.aj-theme-light .aj-target,
        .aj-home.aj-theme-light .aj-tab,
        .aj-home.aj-theme-light .aj-pipeline-step {
          color: #202938 !important;
          background: #f8fafc !important;
          border-color: #dbe2ea !important;
        }

        /* Text defaults: counteract the many hard-coded dark-mode text colors. */
        .aj-home.aj-theme-light .aj-eyebrow,
        .aj-home.aj-theme-light .aj-muted,
        .aj-home.aj-theme-light .aj-card-subtitle,
        .aj-home.aj-theme-light .aj-stat-label,
        .aj-home.aj-theme-light .aj-side-title,
        .aj-home.aj-theme-light .aj-brand-sub,
        .aj-home.aj-theme-light .aj-side-nav-heading,
        .aj-home.aj-theme-light .aj-pipeline-number,
        .aj-home.aj-theme-light .aj-canonical-label,
        .aj-home.aj-theme-light .aj-metric span,
        .aj-home.aj-theme-light .aj-timeframe-wrap,
        .aj-home.aj-theme-light .aj-option-field span {
          color: #64748b !important;
        }

        .aj-home.aj-theme-light .aj-h1,
        .aj-home.aj-theme-light .aj-card-title,
        .aj-home.aj-theme-light .aj-stat-value,
        .aj-home.aj-theme-light .aj-signal-value,
        .aj-home.aj-theme-light .aj-pipeline-label,
        .aj-home.aj-theme-light .aj-brand-title,
        .aj-home.aj-theme-light .aj-side-nav-item,
        .aj-home.aj-theme-light .aj-lifecycle-stage strong,
        .aj-home.aj-theme-light .aj-option-field strong,
        .aj-home.aj-theme-light .aj-strategy-name,
        .aj-home.aj-theme-light .aj-metric strong {
          color: #202938 !important;
        }

        .aj-home.aj-theme-light .aj-topbar *,
        .aj-home.aj-theme-light .aj-side-nav *,
        .aj-home.aj-theme-light .aj-card *,
        .aj-home.aj-theme-light .aj-panel * {
          text-shadow: none;
        }

        /* Search, timeframe, form fields and dropdowns */
        .aj-home.aj-theme-light input,
        .aj-home.aj-theme-light select,
        .aj-home.aj-theme-light textarea,
        .aj-home.aj-theme-light .aj-search-input,
        .aj-home.aj-theme-light .aj-timeframe-control {
          color: #202938 !important;
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
        }

        .aj-home.aj-theme-light input::placeholder,
        .aj-home.aj-theme-light textarea::placeholder {
          color: #8491a3 !important;
          opacity: 1;
        }

        /* Buttons and navigation */
        .aj-home.aj-theme-light .aj-icon-button {
          color: #334155 !important;
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }

        .aj-home.aj-theme-light .aj-side-nav-item {
          color: #475569 !important;
          background: transparent;
        }

        .aj-home.aj-theme-light .aj-side-nav-item.is-current {
          color: #1d4ed8 !important;
          background: #eff6ff !important;
          border-color: #bfdbfe !important;
        }

        .aj-home.aj-theme-light .aj-strategy-state,
        .aj-home.aj-theme-light .aj-small-pill {
          color: #475569 !important;
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }

        /* Preserve meaningful status colors and action-button semantics. */
        .aj-home.aj-theme-light .aj-positive,
        .aj-home.aj-theme-light .aj-target.hit,
        .aj-home.aj-theme-light .aj-target.hit *,
        .aj-home.aj-theme-light .aj-lifecycle-stage strong.is-active {
          color: #15803d !important;
        }

        .aj-home.aj-theme-light .aj-pending {
          color: #a16207 !important;
        }

        .aj-home.aj-theme-light .aj-negative {
          color: #b91c1c !important;
        }

        .aj-home.aj-theme-light .aj-target.hit {
          background: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
        }

        .aj-home.aj-theme-light .aj-pause-button {
          color: #92400e !important;
          background: #fffbeb !important;
          border-color: #fcd34d !important;
        }

        .aj-home.aj-theme-light .aj-exit-button {
          color: #b91c1c !important;
          background: #fef2f2 !important;
          border-color: #fecaca !important;
        }

        .aj-home.aj-theme-light .aj-home-chart > div:first-child {
          color: #202938 !important;
        }

        /* AJSettingsPanel and any dialogs rendered inside the page */
        .aj-home.aj-theme-light [role="dialog"],
        .aj-home.aj-theme-light .aj-modal,
        .aj-home.aj-theme-light .aj-settings-panel {
          color: #202938 !important;
          background: #ffffff !important;
          border-color: #d7e0ea !important;
        }

/* AJ LIGHT THEME SECOND PASS: strategy, indicators and workflow */

.aj-home.aj-theme-light .aj-strategy-list {
  background: transparent !important;
}

.aj-home.aj-theme-light .aj-strategy {
  color: #202938 !important;
  background: #ffffff !important;
  border: 1px solid #d7e4f2 !important;
  border-radius: 12px;
  box-shadow: 0 2px 7px rgba(37, 99, 235, .045);
}

.aj-home.aj-theme-light .aj-strategy:hover {
  background: #f5f9ff !important;
  border-color: #93c5fd !important;
}

.aj-home.aj-theme-light .aj-strategy-name {
  color: #1e293b !important;
}

.aj-home.aj-theme-light .aj-strategy-meta {
  color: #64748b !important;
}

.aj-home.aj-theme-light .aj-strategy [style*="color"] {
  color: #2563eb !important;
}

/* Indicator controls: blue-tinted pills on the light surface. */
.aj-home.aj-theme-light .aj-indicators {
  background: transparent !important;
}

.aj-home.aj-theme-light .aj-indicator {
  color: #334155 !important;
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
  border-radius: 8px;
}

.aj-home.aj-theme-light .aj-indicator button {
  color: #334155 !important;
  background: transparent !important;
}

.aj-home.aj-theme-light .aj-indicator button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Preserve recognizable ON/OFF colors while improving contrast. */
.aj-home.aj-theme-light .aj-indicator button span {
  font-weight: 800;
}

/* Four-step workflow: pale blue tiles with readable labels. */
.aj-home.aj-theme-light .aj-flow-step {
  color: #1e40af !important;
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
  border-radius: 10px;
}

.aj-home.aj-theme-light .aj-flow-number {
  color: #ffffff !important;
  background: #2563eb !important;
  border: 1px solid #2563eb !important;
  border-radius: 999px;
}

/* Signal lifecycle: pale blue stages and visible active marker. */
.aj-home.aj-theme-light .aj-lifecycle-track {
  background: #eff6ff !important;
  border-color: #bfdbfe !important;
}

.aj-home.aj-theme-light .aj-lifecycle-stage {
  background: #f8fbff !important;
  border-color: #dbeafe !important;
}

.aj-home.aj-theme-light .aj-lifecycle-label {
  color: #64748b !important;
}

.aj-home.aj-theme-light .aj-lifecycle-marker {
  color: #64748b !important;
  background: #e2e8f0 !important;
  border-color: #cbd5e1 !important;
}

.aj-home.aj-theme-light .aj-lifecycle-marker.is-active {
  color: #ffffff !important;
  background: #2563eb !important;
  border-color: #2563eb !important;
}

.aj-home.aj-theme-light .aj-lifecycle-stage strong.is-active {
  color: #15803d !important;
}

/* AJ LIGHT THEME CONTROLS INSERT */
.aj-home.aj-theme-light .aj-light-theme-action {
  color: #1e40af !important;
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
  box-shadow: none !important;
}

.aj-home.aj-theme-light .aj-light-theme-action:hover {
  color: #1e40af !important;
  background: #dbeafe !important;
  border-color: #93c5fd !important;
}

.aj-home.aj-theme-light .aj-light-theme-feed {
  color: #1e40af !important;
  background: #eff6ff !important;
  border-color: #bfdbfe !important;
  box-shadow: none !important;
}

.aj-home.aj-theme-light .aj-light-theme-feed:hover,
.aj-home.aj-theme-light .aj-light-theme-feed.active {
  color: #1e40af !important;
  background: #dbeafe !important;
  border-color: #93c5fd !important;
}

.aj-home.aj-theme-light .aj-feed-name,
.aj-home.aj-theme-light .aj-feed-status {
  color: #1e40af !important;
}

.aj-home.aj-theme-light .aj-light-theme-monitoring {
  color: #1e40af !important;
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
}

.aj-home.aj-theme-light .aj-light-theme-live-monitoring {
  color: #1e40af !important;
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
  border-radius: 999px !important;
  padding: 4px 10px !important;
  box-sizing: border-box;
}
        /*         /* Light-theme Positions / Orders / Order History tab bar */
        .aj-home.aj-theme-light .aj-tabs {
          color: #1e40af !important;
          background: #eff6ff !important;
          border-bottom: 1px solid #bfdbfe !important;
        }

        .aj-home.aj-theme-light .aj-tabs > button {
          color: #1e40af !important;
          background: transparent !important;
          border-color: transparent !important;
        }

        .aj-home.aj-theme-light .aj-tabs > button:hover {
          color: #1e40af !important;
          background: #dbeafe !important;
          border-color: #bfdbfe !important;
        }

        .aj-home.aj-theme-light .aj-tabs > button.active {
          color: #1e40af !important;
          background: #dbeafe !important;
          border-color: #93c5fd !important;
        }

        .aj-home.aj-theme-light .aj-light-theme-live-monitoring {
          color: #1e40af !important;
          background: #eff6ff !important;
          border-color: #bfdbfe !important;
        }
/* Strategy and workflow controls should retain visible focus. */
.aj-home.aj-theme-light .aj-strategy:focus-within {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}
      
        /* AJ LIGHT THEME - Positions / Orders / Order History table text */
        .aj-home.aj-theme-light .aj-activity .aj-table th,
        .aj-home.aj-theme-light .aj-activity .aj-table td {
          color: #1e40af !important;
        }

        .aj-home.aj-theme-light .aj-activity .aj-table th {
          background: #eff6ff !important;
          border-color: #bfdbfe !important;
        }

        .aj-home.aj-theme-light .aj-activity .aj-table td {
          border-color: #dbeafe !important;
        }

        .aj-home.aj-theme-light .aj-activity .aj-table tbody tr:hover {
          background: #eff6ff !important;
        }

        /* AJ_MONITOR_SIDEBAR_WIDTH_FIX */
        .aj-home .aj-page-layout {
          grid-template-columns: 150px minmax(0, 1fr);
        }
        .aj-home .aj-side-nav {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .aj-home .aj-side-nav-item {
          white-space: nowrap;
        }
        @media (max-width: 900px) {
          .aj-home .aj-page-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .aj-home .aj-side-nav-item {
            white-space: normal;
          }
        }
        /* AJ_NAV_ALIGNMENT_THEME_OVERRIDES_V2 */
        .aj-home .aj-page-layout {
          grid-template-columns: 256px minmax(0, 1fr);
          column-gap: 20px;
        }

        .aj-home .aj-side-nav {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .aj-home .aj-side-nav-item {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          align-items: center;
          column-gap: 10px;
          width: 100%;
          min-height: 40px;
          box-sizing: border-box;
          white-space: nowrap;
          text-align: left;
          text-decoration: none;
          line-height: 1.25;
        }

        .aj-home .aj-side-nav-item > .aj-side-nav-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          min-width: 24px;
          height: 22px;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          line-height: 1;
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          white-space: nowrap;
        }

        .aj-home .aj-side-nav-item:focus-visible {
          outline: 2px solid #60a5fa;
          outline-offset: 2px;
        }

        @media (max-width: 900px) {
          .aj-home .aj-page-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .aj-home .aj-side-nav-item {
            white-space: normal;
          }
        }


        /* AJ_HOME_LAYOUT_RECOMPOSITION_V2 */
        .aj-home .aj-hero {
          grid-template-columns: minmax(0, 1fr);
          align-items: stretch;
        }
        .aj-home .aj-hero-main {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .aj-home .aj-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: stretch;
        }
        .aj-home .aj-market-analysis-card {
          display: flex;
          flex-direction: column;
          align-self: stretch;
          height: 100%;
          min-height: 0;
          min-width: 0;
          box-sizing: border-box;
        }
        .aj-home .aj-market-analysis-card .aj-chart-toolbar {
          flex: 0 0 auto;
        }
        .aj-home .aj-market-analysis-card .aj-home-chart {
          display: flex;
          flex: 1 1 560px;
          flex-direction: column;
          min-height: 560px;
          min-width: 0;
          box-sizing: border-box;
        }
        .aj-home .aj-market-analysis-card .aj-home-chart > div {
          flex: 1 1 auto;
          height: 100% !important;
          min-height: 520px;
          min-width: 0;
          box-sizing: border-box;
        }
        .aj-home .aj-market-analysis-card > div:last-child {
          flex: 0 0 auto;
          margin-top: auto !important;
        }
        .aj-home .aj-execution-stack {
          display: flex;
          flex-direction: column;
          align-self: stretch;
          gap: 12px;
          min-width: 0;
          min-height: 0;
          height: 100%;
          box-sizing: border-box;
        }
        .aj-home .aj-execution-stack > .aj-panel {
          width: 100%;
          min-width: 0;
          margin-top: 0 !important;
          box-sizing: border-box;
        }
        .aj-home .aj-execution-stack > .aj-hero-side {
          flex: 0 0 auto;
          padding: 18px;
        }
        .aj-home .aj-execution-stack > .aj-option-execution-card {
          flex: 0 0 auto;
        }
        .aj-home .aj-execution-stack > .aj-signal-breakdown-card {
          flex: 0 0 auto;
          min-height: 0;
          height: auto;
          margin-top: 0 !important;
          padding: 16px;
        }
        .aj-home .aj-signal-breakdown-card > div[style*="grid"] {
          gap: 7px !important;
        }
        @media (max-width: 1100px) {
          .aj-home .aj-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .aj-home .aj-market-analysis-card {
            height: auto;
          }
          .aj-home .aj-market-analysis-card .aj-home-chart {
            flex: 0 0 auto;
            min-height: 0;
          }
          .aj-home .aj-market-analysis-card .aj-home-chart > div {
            height: 500px !important;
            min-height: 500px;
          }
          .aj-home .aj-execution-stack {
            height: auto;
          }
        }

`}</style>

      {/* ======================================================
          TOP BAR
          ====================================================== */}

      <header className="aj-topbar">
        <div className="aj-shell aj-topbar-inner">

          <div className="aj-brand">
            <div className="aj-brand-mark">
              AJ
            </div>

            <div>
              <div className="aj-brand-title">
                AJ Institutional
              </div>

              <div className="aj-brand-sub">
                Algo Trading Control Center
              </div>
            </div>
          </div>

          <div
            className="aj-feed-tabs"
            aria-label="Market feeds"
          >
            {(
              ["fyers", "indstocks"] as Feed[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                className={`aj-feed-tab aj-light-theme-feed ${
                  feed === item
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleFeed(item)
                }
              >
                <div className="aj-feed-name">
                  {FEED_LABELS[item]}
                </div>

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

            <button
              className="aj-icon-button"
              title="Notifications"
              type="button"
            >
              <Bell size={17} />
            </button>

            <button
              className="aj-icon-button aj-theme-toggle"
              title={algoHomeTheme === "dark" ? "Switch AlgoHome to light mode" : "Switch AlgoHome to dark mode"}
              aria-label={algoHomeTheme === "dark" ? "Switch AlgoHome to light mode" : "Switch AlgoHome to dark mode"}
              aria-pressed={algoHomeTheme === "light"}
              type="button"
              onClick={toggleAlgoHomeTheme}
            >
              {algoHomeTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="aj-icon-button"
              title="Account"
              type="button"
            >
              <Wallet size={17} />
            </button>
          </div>

        </div>
      </header>

      <div className="aj-shell aj-page-layout">
        <aside className="aj-side-nav" aria-label="Main navigation">
          <div className="aj-side-nav-heading">WORKSPACE</div>

          <a className="aj-side-nav-item is-current" href={`?feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">⌂</span>
            AlgoHome
          </a>

          <a className="aj-side-nav-item" href={`?terminal=1&feed=${feed}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">▦↗</span>
            Live Charts &amp; Signals
          </a>

          <a className="aj-side-nav-item" href={`?page=strategies&feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">◇⌘</span>
            Strategies &amp; Builder
          </a>

          <a className="aj-side-nav-item" href={`?page=positions&feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">▤⇄</span>
            Positions &amp; Orders
          </a>

          <a className="aj-side-nav-item" href={`?page=monitor&feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">◉</span>
            Algo Monitor
          </a>

          <a className="aj-side-nav-item" href={`?page=brokers&feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">⇆</span>
            Brokers
          </a>

          <a className="aj-side-nav-item" href={`?page=watchlist&feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">☆</span>
            Watch List
          </a>

          <a className="aj-side-nav-item" href={`?page=indicators&feed=${feed}`} style={{ textDecoration: "none" }}>
            <span className="aj-side-nav-icon">⌁</span>
            Indicators
          </a>
        </aside>
        <div className="aj-page-main">

        {/* ====================================================
            HERO
            ==================================================== */}

        <section className="aj-hero">

          <div className="aj-panel aj-hero-main">

            <div className="aj-eyebrow">
              AUTOMATED EXECUTION · {FEED_LABELS[feed]}
            </div>

            <h1 className="aj-h1">
              Turn your indicator signal into a managed trade.
            </h1>

            <div className="aj-muted">
              Your indicator remains the decision source.
              AJ handles entry, option selection, position
              monitoring, targets, stop-loss and exit.
            </div>

            <div className="aj-flow">

              <div className="aj-flow-step">
                <span className="aj-flow-number">
                  1
                </span>
                Indicator signal
              </div>

              <ChevronRight
                size={15}
                color="#52627b"
              />

              <div className="aj-flow-step">
                <span className="aj-flow-number">
                  2
                </span>
                Wait for entry
              </div>

              <ChevronRight
                size={15}
                color="#52627b"
              />

              <div className="aj-flow-step">
                <span className="aj-flow-number">
                  3
                </span>
                Buy option
              </div>

              <ChevronRight
                size={15}
                color="#52627b"
              />

              <div className="aj-flow-step">
                <span className="aj-flow-number">
                  4
                </span>
                Target / SL
              </div>

            </div>



          </div>



        </section>

        {/* ====================================================
            MARKET SNAPSHOT
            ==================================================== */}

        <section className="aj-stats">

          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">
              NIFTY
            </div>

            <div className="aj-stat-value">
              25,480.25
            </div>

            <div className="aj-stat-change">
              <ArrowUpRight size={12} />
              +0.72%
            </div>
          </div>

          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">
              BANK NIFTY
            </div>

            <div className="aj-stat-value">
              57,210.40
            </div>

            <div className="aj-stat-change">
              <ArrowUpRight size={12} />
              +0.48%
            </div>
          </div>

          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">
              INDIA VIX
            </div>

            <div className="aj-stat-value">
              13.82
            </div>

            <div className="aj-stat-change">
              <ArrowDownRight size={12} />
              -2.10%
            </div>
          </div>

          <div className="aj-panel aj-stat">
            <div className="aj-stat-label">
              UNREALIZED P&L
            </div>

            <div
              className={`aj-stat-value ${
                unrealized >= 0
                  ? "aj-positive"
                  : "aj-negative"
              }`}
            >
              {money(unrealized)}
            </div>

            <div className="aj-stat-change">
              3 open positions
            </div>
          </div>

        </section>

        {/* ====================================================
            PHASE 2 CORE AREA
            ==================================================== */}

        <section className="aj-grid">

          {/* ==================================================
              SIGNAL / INDICATOR STATUS
              ================================================== */}

          <div className="aj-panel aj-card aj-market-analysis-card">

            <div className="aj-card-header" style={{ justifyContent: "flex-start" }}>
  <h2
    className="aj-card-title"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      margin: 0,
      padding: "10px 14px",
      borderRadius: 9,
      border: `1px solid ${algoHomeTheme === "light" ? "#2563eb" : "rgba(59,130,246,.55)"}`,
      background: algoHomeTheme === "light" ? "#e8eef8" : "rgba(37,99,235,.16)",
      color: algoHomeTheme === "light" ? "#1d4ed8" : "#bfdbfe",
      fontSize: 14,
      fontWeight: 800
    }}
  >
    ⌁ Market Analysis
  </h2>
</div>

            <div className="aj-chart-toolbar">
              <div className="aj-chart-toolbar-main">
            {/* ================================================
                EXISTING BROKER SYMBOL SEARCH
                ================================================ */}

            <div className="aj-search">

              <div className="aj-search-input-wrap">

                <Search
                  size={16}
                  className="aj-search-icon"
                />

                <input
                  className="aj-search-input"
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(
                      event.target.value,
                    )
                  }
                  placeholder={
                    `Search ${
                      feed === "fyers"
                        ? "NIFTY / BANKNIFTY / RELIANCE..."
                        : "INDSTOCKS instruments..."
                    }`
                  }
                  autoComplete="off"
                />

                {searchText && (
                  <button
                    type="button"
                    className="aj-search-clear"
                    onClick={
                      clearInstrument
                    }
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}

              </div>

              {(searching ||
                searchError ||
                searchResults.length > 0) && (
                <div className="aj-search-results">

                  {searching && (
                    <div className="aj-search-status">
                      Searching{" "}
                      {FEED_LABELS[feed]} instruments...
                    </div>
                  )}

                  {!searching &&
                    searchError && (
                      <div
                        className="aj-search-status"
                        style={{
                          color: "#fca5a5",
                        }}
                      >
                        {searchError}
                      </div>
                    )}

                  {!searching &&
                    !searchError &&
                    searchResults.map(
                      (instrument, index) => (
                        <button
                          type="button"
                          className="aj-search-result"
                          key={`${instrument.symbol}-${index}`}
                          onClick={() =>
                            handleInstrumentSelect(
                              instrument,
                            )
                          }
                        >
                          <div className="aj-result-symbol">
                            {instrumentLabel(
                              instrument,
                            )}
                          </div>

                          <div className="aj-result-meta">
                            {instrumentSecondaryLabel(
                              instrument,
                            ) ||
                              instrument.displayName ||
                              FEED_LABELS[
                                feed
                              ]}
                          </div>
                        </button>
                      ),
                    )}

                  {!searching &&
                    !searchError &&
                    searchText.trim()
                      .length >= 2 &&
                    searchResults.length === 0 && (
                      <div className="aj-search-status">
                        No instrument found.
                      </div>
                    )}

                </div>
              )}

            </div>

            <div className="aj-indicators">
              <span className="aj-indicator">
                <button
                  type="button"
                  aria-pressed={Boolean(selectedInstrument) && algoIndicators.ajindicator}
                  onClick={() =>
                    setAlgoIndicators((current) => ({
                      ...current,
                      ajindicator: !current.ajindicator,
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    color: "inherit",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {selectedInstrument && algoIndicators.ajindicator ? (
                    <CheckCircle2 size={12} color="#4ade80" />
                  ) : (
                    <Circle size={12} color="#94a3b8" />
                  )}
                  AJIndicator
                  <span style={{ color: selectedInstrument && algoIndicators.ajindicator ? "#4ade80" : "#94a3b8", fontSize: 9 }}>
                    {selectedInstrument && algoIndicators.ajindicator ? "ON" : "OFF"}
                  </span>
                </button>
                {algoIndicators.ajindicator && (
                  <button
                    type="button"
                    aria-label="AJIndicator settings"
                    title="AJIndicator settings"
                    onClick={() => setShowAJSettings(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: 0,
                      border: 0,
                      color: "#94a3b8",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <Settings2 size={12} />
                  </button>
                )}
              </span>

                <span className="aj-indicator" title="Toggle SuperTrend on the embedded chart">
                <button
                  type="button"
                  aria-pressed={algoIndicators.supertrend}
                  onClick={() =>
                    setAlgoIndicators((current) => ({
                      ...current,
                      supertrend: !current.supertrend,
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    color: "inherit",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {algoIndicators.supertrend ? (
                    <CheckCircle2 size={12} color="#22c55e" />
                  ) : (
                    <Circle size={12} color="#94a3b8" />
                  )}
                  SuperTrend
                  <span style={{ color: algoIndicators.supertrend ? "#22c55e" : "#94a3b8", fontSize: 9 }}>
                    {algoIndicators.supertrend ? "ON" : "OFF"}
                  </span>
                </button>
              </span>

                            <span className="aj-indicator" title="Toggle ADX in its own 0–100 oscillator pane">
                <button
                  type="button"
                  aria-label="Toggle ADX"
                  aria-pressed={algoIndicators.adx}
                  onClick={() =>
                    setAlgoIndicators((current) => ({
                      ...current,
                      adx: !current.adx,
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    color: "inherit",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {algoIndicators.adx ? (
                    <CheckCircle2 size={12} color="#a78bfa" />
                  ) : (
                    <Circle size={12} color="#94a3b8" />
                  )}
                  ADX
                  <span style={{ color: algoIndicators.adx ? "#a78bfa" : "#94a3b8", fontSize: 9 }}>
                    {algoIndicators.adx ? "ON" : "OFF"}
                  </span>
                </button>
              </span>
<span className="aj-indicator">
                <button
                  type="button"
                  aria-pressed={Boolean(selectedInstrument) && algoIndicators.ema21}
                  onClick={() =>
                    setAlgoIndicators((current) => ({
                      ...current,
                      ema21: !current.ema21,
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    color: "inherit",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {selectedInstrument && algoIndicators.ema21 ? (
                    <CheckCircle2 size={12} color="#38bdf8" />
                  ) : (
                    <Circle size={12} color="#94a3b8" />
                  )}
                  EMA 21
                  <span style={{ color: selectedInstrument && algoIndicators.ema21 ? "#38bdf8" : "#94a3b8", fontSize: 9 }}>
                    {selectedInstrument && algoIndicators.ema21 ? "ON" : "OFF"}
                  </span>
                </button>
              </span>

              <span className="aj-indicator">
                <button
                  type="button"
                  aria-pressed={Boolean(selectedInstrument) && algoIndicators.ema50}
                  onClick={() =>
                    setAlgoIndicators((current) => ({
                      ...current,
                      ema50: !current.ema50,
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    color: "inherit",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {selectedInstrument && algoIndicators.ema50 ? (
                    <CheckCircle2 size={12} color="#c084fc" />
                  ) : (
                    <Circle size={12} color="#94a3b8" />
                  )}
                  EMA 50
                  <span style={{ color: selectedInstrument && algoIndicators.ema50 ? "#c084fc" : "#94a3b8", fontSize: 9 }}>
                    {selectedInstrument && algoIndicators.ema50 ? "ON" : "OFF"}
                  </span>
                </button>
              </span>

              <span className="aj-indicator" title="Toggle RSI in its own 0–100 oscillator pane">
                <button
                  type="button"
                  aria-label="Toggle RSI"
                  aria-pressed={algoIndicators.rsi}
                  onClick={() =>
                    setAlgoIndicators((current) => ({
                      ...current,
                      rsi: !current.rsi,
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    color: "inherit",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {algoIndicators.rsi ? (
                    <CheckCircle2 size={12} color="#f59e0b" />
                  ) : (
                    <Circle size={12} color="#94a3b8" />
                  )}
                  RSI
                  <span style={{ color: algoIndicators.rsi ? "#f59e0b" : "#94a3b8", fontSize: 9 }}>
                    {algoIndicators.rsi ? "ON" : "OFF"}
                  </span>
                </button>
              </span>

              <span className="aj-indicator" title="Price Action is part of the AJIndicator runtime, not an independent toggle">
                {selectedInstrument && algoIndicators.ajindicator ? (
                  <CheckCircle2 size={12} color="#4ade80" />
                ) : (
                  <Circle size={12} color="#94a3b8" />
                )}
                Price Action
                <span style={{ color: selectedInstrument && algoIndicators.ajindicator ? "#4ade80" : "#94a3b8", fontSize: 9 }}>
                  {selectedInstrument && algoIndicators.ajindicator ? "AJ CORE" : "INACTIVE"}
                </span>
              </span>
            </div>
              </div>
              <label className="aj-timeframe-wrap">
                <span>TIMEFRAME</span>
                <select
                  className="aj-timeframe-control"
                  value={chartTimeframe}
                  onChange={(event) => setChartTimeframe(event.target.value)}
                  aria-label="Chart timeframe"
                >
                  <option value="1">1m</option>
                  <option value="3">3m</option>
                  <option value="5">5m</option>
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="60">1h</option>
                </select>
              </label>
            </div>
            {/* ================================================
                EMBEDDED LIVE CHART
                Reuses the existing ChartWindow and selected
                canonical broker instrument.
                ================================================ */}
            <div
              className="aj-home-chart"
              style={{
                marginTop: 16,
                marginBottom: 18,
                padding: 12,
                borderRadius: 13,
                border: "1px solid rgba(96,165,250,.20)",
                background: algoHomeTheme === "light" ? "#ffffff" : "rgba(2,6,23,.42)",
                minWidth: 0,
              }}
            >

              {selectedInstrument ? (
                <div
                  style={{
                    height: 500,
                    minHeight: 500,
                    width: "100%",
                    minWidth: 0,
                    overflow: "hidden",
                    borderRadius: 9,
                  }}
                >
                  <ChartWindow
                    chartId="aj-algo-home-chart"
                    themeOverride={algoHomeTheme}
                    symbol={
                      selectedInstrument.symbol ||
                      selectedInstrument.tradingSymbol ||
                      ""
                    }
                    displayName={selectedLabel}
                    datasource={feed === "fyers" ? "Fyers" : FEED_LABELS[feed]}
                    timeframe={chartTimeframe}
                    indicators={{
                      ema: false,
                      ema21: algoIndicators.ema21,
                      ema50: algoIndicators.ema50,
                      vwap: true,
                      rsi: algoIndicators.rsi,
                      atr: false,
                      adx: algoIndicators.adx,
                      ajindicator: algoIndicators.ajindicator,
                      supertrend: algoIndicators.supertrend,
                    }}
                    exchange={selectedInstrument.exchange}
                    feedSource={feed}
                    underlying={selectedInstrument.underlying}
                    expiry={selectedInstrument.expiry}
                    strike={
                      typeof selectedInstrument.strike === "number"
                        ? selectedInstrument.strike
                        : Number(selectedInstrument.strike) || undefined
                    }
                    optionType={selectedInstrument.optionType}
                    isActive={true}
                    onActivate={() => {}}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 20,
                    borderRadius: 9,
                    border: "1px dashed rgba(148,163,184,.20)",
                    color: "#8190a8",
                    fontSize: 11,
                    lineHeight: 1.7,
                  }}
                >
                  Select an instrument using the broker search above.
                  <br />
                  The existing chart will load here.
                </div>
              )}
            </div>
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 13,
                border:
                  "1px solid rgba(96,165,250,.12)",
                background: algoHomeTheme === "light" ? "#eff6ff" : "rgba(2,6,23,.30)",
}}
            >

              <div className="aj-eyebrow">
                SIGNAL LIFECYCLE
              </div>

              <div className="aj-lifecycle-track">
                {[
                  ["Signal", "DETECTED", true],
                  ["Entry", "WAITING", false],
                  ["Position", "PENDING", false],
                  ["Targets", "PENDING", false],
                  ["Exit", "PENDING", false],
                ].map(([label, state, active]) => (
                  <div className="aj-lifecycle-stage" key={String(label)}>
                    <span className={`aj-lifecycle-marker ${active ? "is-active" : ""}`}>
                      {active ? "✓" : "○"}
                    </span>
                    <span className="aj-lifecycle-label">{label}</span>
                    <strong className={active ? "is-active" : ""}>{state}</strong>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* ==================================================
              OPTION EXECUTION
              Instrument search and canonical metadata live here.
              ================================================== */}

          <div className="aj-execution-stack">

<div className="aj-panel aj-hero-side">

            <div className="aj-side-title">

              <h3>
                Current Signal
              </h3>

              <span className="aj-small-pill aj-light-theme-monitoring">
                MONITORING
              </span>

            </div>

            <div className="aj-signal-box">

              <div className="aj-eyebrow">
                INDICATOR SIGNAL
              </div>

              <div
                style={{
                  fontSize: 25,
                  fontWeight: 900,
                  margin: "9px 0",
                }}
              >
                BUY SIGNAL
              </div>

              <div className="aj-signal-row">
                <span className="aj-muted">
                  State
                </span>

                <span
                  style={{
                    color: "#fbbf24",
                    fontWeight: 850,
                  }}
                >
                  Waiting for entry
                </span>
              </div>

              <div className="aj-signal-row">
                <span className="aj-muted">
                  Time
                </span>

                <span className="aj-signal-value">
                  10:15:42
                </span>
              </div>

              <div className="aj-signal-row">
                <span className="aj-muted">
                  Direction
                </span>

                <span
                  className="aj-positive"
                >
                  BUY
                </span>
              </div>

            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 7,
                alignItems: "center",
                color: "#75839b",
                fontSize: 10,
              }}
            >
              <ShieldCheck size={14} />

              No order is sent by this prototype.
            </div>

          </div>

<div className="aj-panel aj-card aj-option-execution-card">

            <div className="aj-card-header">

              <div>
                <h2 className="aj-card-title">
                  Option Executions
                </h2>

                <div className="aj-card-subtitle">
                  {FEED_LABELS[feed]} · Signal driven
                  execution plan
                </div>
              </div>

              <Target
                size={19}
                color="#60a5fa"
              />

            </div>

            <div className="aj-option-summary">
              <div className="aj-option-field">
                <span>Underlying</span>
                <strong>{selectedInstrument?.underlying || selectedInstrument?.symbol || "NIFTY"}</strong>
              </div>
              <div className="aj-option-field">
                <span>Signal</span>
                <strong className="aj-positive">BUY</strong>
              </div>
              <div className="aj-option-field">
                <span>Option Type</span>
                <strong>{selectedInstrument?.optionType || "—"}</strong>
              </div>
              <div className="aj-option-field">
                <span>Strike</span>
                <strong>{selectedInstrument?.strike ?? "—"}</strong>
              </div>
              <div className="aj-option-field">
                <span>Expiry</span>
                <strong>{selectedInstrument?.expiry || "—"}</strong>
              </div>
              <div className="aj-option-field">
                <span>Quantity</span>
                <strong>75</strong>
              </div>
              <div className="aj-option-field">
                <span>Entry</span>
                <strong>₹124.50</strong>
              </div>
              <div className="aj-option-field">
                <span>Entry Status</span>
                <strong className={autoTrade ? "aj-positive" : "aj-pending"}>
                  {autoTrade ? "ARMED" : "WAITING"}
                </strong>
              </div>
            </div>

            <div className="aj-action-row aj-option-actions">
              <button
                type="button"
                className="aj-primary aj-light-theme-action"
                onClick={() => setAutoTrade((value) => !value)}
              >
                <Bot size={15} />
                {autoTrade ? "Auto Trade Armed" : "Auto Trade"}
              </button>

              <button
                type="button"
                className="aj-secondary aj-pause-button"
                onClick={() => setStrategyPaused((value) => !value)}
              >
                {strategyPaused ? <Play size={14} /> : <Pause size={14} />}
                {strategyPaused ? "Resume" : "Pause"}
              </button>

              <button
                type="button"
                className="aj-secondary aj-exit-button"
                onClick={() => setAutoTrade(false)}
              >
                <Square size={14} />
                Exit / Close
              </button>
            </div>

            <div className="aj-execution-lower-grid">
              <div className="aj-pipeline-card">
                <div className="aj-eyebrow">EXECUTION PIPELINE</div>
                <div className="aj-pipeline-steps">
                  {[
                    ["01", "Signal", "Triggered", "#4ade80"],
                    ["02", "Option", selectedInstrument ? "Resolved" : "Waiting", selectedInstrument ? "#4ade80" : "#94a3b8"],
                    ["03", "Order", autoTrade ? "Armed" : "Not sent", autoTrade ? "#60a5fa" : "#94a3b8"],
                    ["04", "Filled", autoTrade ? "Preview only" : "Pending", autoTrade ? "#60a5fa" : "#94a3b8"],
                  ].map(([step, label, value, color]) => (
                    <div className="aj-pipeline-step" key={String(step)}>
                      <span className="aj-pipeline-number">{step}</span>
                      <span className="aj-pipeline-label">{label}</span>
                      <strong style={{ color: String(color) }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aj-targets-card">
                <div className="aj-eyebrow">TARGETS & RISK</div>
                <div className="aj-targets aj-targets-compact aj-targets-ladder">
                  <div className="aj-target wait">
                    <span className="aj-target-name"><span className="aj-target-check">✓</span>TP3 · ₹175</span><span>WAITING</span>
                  </div>
<div className="aj-target wait aj-target-step">
                    <span className="aj-target-name"><span className="aj-target-check">✓</span>TP2 · ₹160</span><span>WAITING</span>
                  </div>
<div className="aj-target hit aj-target-step">
                    <span className="aj-target-name"><span className="aj-target-check is-hit">✓</span>TP1 · ₹145</span><span>✓ HIT</span>
                  </div>
                  <div className="aj-target stop">
                    <span>Stop Loss · ₹110</span><span>PROTECTED</span>
                  </div>
                </div>
              </div>
            </div>

          

          </div>

{/* AJ_SIGNAL_BREAKDOWN_PREVIEW_V1 */}
          <div
            className="aj-panel aj-card aj-signal-breakdown-card"
            style={{
              minWidth: 0,
              
              background: algoHomeTheme === "light" ? "#ffffff" : "rgba(9,15,29,.96)",
              border: `1px solid ${algoHomeTheme === "light" ? "#dce4ef" : "rgba(96,165,250,.16)"}`,
              color: algoHomeTheme === "light" ? "#172033" : "#e7edf7"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 13
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>
                Signal Breakdown
              </h3>
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  fontSize: 9,
                  fontWeight: 850,
                  letterSpacing: ".06em",
                  color: algoHomeTheme === "light" ? "#64748b" : "#94a3b8",
                  background: algoHomeTheme === "light" ? "#f1f5f9" : "rgba(148,163,184,.10)",
                  border: `1px solid ${algoHomeTheme === "light" ? "#e2e8f0" : "rgba(148,163,184,.14)"}`
                }}
              >
                PREVIEW VALUES
              </span>
              <p
                style={{
                  flexBasis: "100%",
                  margin: "-4px 0 0",
                  color: algoHomeTheme === "light" ? "#64748b" : "#8190a8",
                  fontSize: 11,
                  lineHeight: 1.5
                }}
              >
                Hover over a signal for detail. These sample values are placeholders, not live analysis results.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: 9
              }}
            >
              {([
                { label: "OI BIAS", value: "BEARISH", tone: "negative" },
                { label: "ATM OI", value: "NEUTRAL", tone: "neutral" },
                { label: "VWAP BIAS", value: "NEUTRAL", tone: "neutral" },
                { label: "ORB", value: "NEUTRAL", tone: "neutral" },
                { label: "TECHNICAL", value: "NEUTRAL", tone: "neutral" },
                { label: "AI SENTIMENT", value: "NEGATIVE", tone: "negative" },
                { label: "MOMENTUM", value: "NEUTRAL", tone: "neutral" },
                { label: "LARGE GAP", value: "No", tone: "plain" }
              ] as const).map((item) => (
                <div
                  key={item.label}
                  title={`${item.label}: ${item.value}. Preview placeholder only.`}
                  style={{
                    minWidth: 0,
                    minHeight: 34,
                    padding: "6px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    textAlign: "center",
                    borderRadius: 11,
                    background: algoHomeTheme === "light" ? "#f1f5f9" : "rgba(148,163,184,.08)",
                    border: `1px solid ${algoHomeTheme === "light" ? "#edf1f6" : "rgba(148,163,184,.06)"}`
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      lineHeight: 1.3,
                      fontWeight: 850,
                      letterSpacing: ".035em",
                      color: algoHomeTheme === "light" ? "#64748b" : "#8493aa"
                    }}
                  >
                    {item.label}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      maxWidth: "100%",
                      padding: item.tone === "plain" ? "0" : "5px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: item.tone === "plain" ? 500 : 750,
                      overflowWrap: "anywhere",
                      color: item.tone === "negative"
                        ? (algoHomeTheme === "light" ? "#dc2626" : "#f87171")
                        : (algoHomeTheme === "light" ? "#64748b" : "#aebbd0"),
                      background: item.tone === "negative"
                        ? (algoHomeTheme === "light" ? "#fff1f2" : "rgba(248,113,113,.09)")
                        : "transparent"
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 10,
                paddingTop: 8,
                borderTop: `1px solid ${algoHomeTheme === "light" ? "#e2e8f0" : "rgba(148,163,184,.18)"}`,
                color: algoHomeTheme === "light" ? "#64748b" : "#8190a8",
                fontSize: 12
              }}
            >
              <span>Final Direction <span title="Preview placeholder; not a live recommendation.">ⓘ</span></span>
              <span
                title="Preview placeholder only."
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: algoHomeTheme === "light" ? "#fff1f2" : "rgba(248,113,113,.09)",
                  color: algoHomeTheme === "light" ? "#dc2626" : "#f87171",
                  fontWeight: 800
                }}
              >
                PUT
              </span>
            </div>
          </div>

</div>

                  
</section>

        {/* ====================================================
            POSITIONS / ORDERS / HISTORY
            ==================================================== */}

        <section className="aj-panel aj-activity">

          <div className="aj-tabs">

            {(
              [
                ["positions", "Positions"],
                ["orders", "Orders"],
                ["history", "Order History"],
              ] as [
                ActivityTab,
                string,
              ][]
            ).map(
              ([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={`aj-tab ${
                    activityTab === key
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivityTab(key)
                  }
                >
                  {label}
                </button>
              ),
            )}

            <div className="aj-light-theme-live-monitoring"
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 10px",
                color: "#56647a",
                fontSize: 10,
              }}
            >
              <Clock3 size={12} />
              Live monitoring
            </div>

          </div>

          <div className="aj-table-wrap">

            {activityTab === "positions" && (
              <table className="aj-table">

                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Avg Fill</th>
                    <th>LTP</th>
                    <th>Profit</th>
                    <th>Strategy</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {positions.map(
                    (item) => (
                      <tr
                        key={item.symbol}
                      >
                        <td
                          style={{
                            color:
                              "white",
                            fontWeight:
                              800,
                          }}
                        >
                          {item.symbol}
                        </td>

                        <td className="aj-positive">
                          {item.side}
                        </td>

                        <td>
                          {item.qty}
                        </td>

                        <td>
                          ₹
                          {item.avg.toFixed(
                            2,
                          )}
                        </td>

                        <td>
                          ₹
                          {item.ltp.toFixed(
                            2,
                          )}
                        </td>

                        <td
                          className={
                            item.pnl >= 0
                              ? "aj-positive"
                              : "aj-negative"
                          }
                        >
                          {money(
                            item.pnl,
                          )}
                        </td>

                        <td>
                          {item.strategy}
                        </td>

                        <td>
                          {item.status}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>

              </table>
            )}

            {activityTab === "orders" && (
              <table className="aj-table">

                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(
                    (row) => (
                      <tr
                        key={`${row[0]}-${row[1]}`}
                      >
                        {row.map(
                          (
                            cell,
                            index,
                          ) => (
                            <td
                              key={index}
                              className={
                                cell ===
                                "FILLED"
                                  ? "aj-positive"
                                  : ""
                              }
                            >
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>

              </table>
            )}

            {activityTab === "history" && (
              <table className="aj-table">

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Lifecycle</th>
                    <th>Net P&L</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map(
                    (row) => (
                      <tr
                        key={`${row[0]}-${row[1]}`}
                      >
                        <td>
                          {row[0]}
                        </td>

                        <td
                          style={{
                            color:
                              "white",
                            fontWeight:
                              800,
                          }}
                        >
                          {row[1]}
                        </td>

                        <td>
                          {row[2]}
                        </td>

                        <td
                          className={
                            row[3].startsWith(
                              "-",
                            )
                              ? "aj-negative"
                              : "aj-positive"
                          }
                        >
                          {row[3]}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>

              </table>
            )}

          </div>

        </section>

        {/* ====================================================
            PERFORMANCE / STRATEGY LIBRARY
            ==================================================== */}

        <section className="aj-bottom-grid">

          <div className="aj-panel aj-card">

            <div className="aj-card-header">

              <div>
                <h2 className="aj-card-title">
                  Performance
                </h2>

                <div className="aj-card-subtitle">
                  Prototype metrics — not live
                  account data
                </div>
              </div>

              <TrendingUp
                size={18}
                color="#60a5fa"
              />

            </div>

            <div className="aj-performance">

              <div className="aj-metric">
                <span>
                  Realized P&L
                </span>

                <strong className="aj-positive">
                  ₹8,420
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Unrealized P&L
                </span>

                <strong className="aj-positive">
                  {money(unrealized)}
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Win Rate
                </span>

                <strong>
                  68%
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Profit Factor
                </span>

                <strong>
                  1.92
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Active Positions
                </span>

                <strong>
                  3
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Today Trades
                </span>

                <strong>
                  7
                </strong>
              </div>

            </div>

          </div>

          <div className="aj-panel aj-card">

            <div className="aj-card-header">

              <div>
                <h2 className="aj-card-title">
                  Strategy Library
                </h2>

                <div className="aj-card-subtitle">
                  Your native AJ strategies will
                  live here
                </div>
              </div>

              <Layers3
                size={18}
                color="#60a5fa"
              />

            </div>

            <div className="aj-strategy-list">

              {[
                [
                  "NIFTY Momentum",
                  "5m · Option Buy · 68% win rate",
                ],
                [
                  "BankNifty Breakout",
                  "5m · Option Buy · 61% win rate",
                ],
                [
                  "Stock Option Buy",
                  "15m · Signal driven · 64% win rate",
                ],
              ].map(
                ([name, meta]) => (
                  <div
                    className="aj-strategy"
                    key={name}
                  >
                    <div className="aj-strategy-name">
                      {name}
                    </div>

                    <div className="aj-strategy-meta">
                      {meta}
                    </div>

                    <div
                      style={{
                        marginTop: 13,
                        color: "#60a5fa",
                        fontSize: 10,
                        fontWeight: 850,
                      }}
                    >
                      Configure strategy{" "}
                      <ChevronRight
                        size={12}
                        style={{
                          verticalAlign:
                            "middle",
                        }}
                      />
                    </div>
                  </div>
                ),
              )}

            </div>

          </div>

        </section>

        <div className="aj-footer">
          AJ Institutional ·{" "}
          {FEED_LABELS[feed]} · Phase 2 Algo
          Dashboard · No live orders are
          submitted by this prototype.
        </div>

        </div>
      </div>
    </main>
  );
}









