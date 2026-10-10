// ============================================================
// AJ INSTITUTIONAL — ALGO HOMEPAGE SKELETON
// STEP 1: SHARED DASHBOARD LAYOUT
// src/pages/AlgoHome.tsx
// ============================================================
// Integration rules:
// 1. Keep the existing broker-feed search functions.
// 2. Keep canonical Instrument metadata unchanged.
// 3. Keep the existing ?terminal=1 navigation unchanged.
// 4. Do not submit live orders from this layout skeleton.
// 5. The existing charts remain accessible through Get Charts.
// ============================================================

// Add these layout classes to the existing AlgoHome.tsx
// component's existing <style> block. Do not remove the
// current instrument-search, feed-selection, or terminal CSS.

.aj-home-shell {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #080d16;
  color: #e5edf8;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.aj-home-topbar {
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 22px;
  background: #0d1421;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.aj-home-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 210px;
}

.aj-home-brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(145deg, #2563eb, #0ea5e9);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.aj-home-brand-name {
  font-size: 14px;
  font-weight: 850;
  letter-spacing: 0.035em;
  color: #f8fafc;
}

.aj-home-brand-caption {
  margin-top: 3px;
  color: #71819a;
  font-size: 10px;
}

.aj-home-topbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aj-home-market-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 999px;
  padding: 7px 11px;
  background: rgba(22, 163, 74, 0.07);
  color: #86efac;
  font-size: 10px;
  font-weight: 750;
  white-space: nowrap;
}

.aj-home-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.45);
}

.aj-home-topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

.aj-home-button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: #121d2d;
  color: #dbeafe;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

.aj-home-button:hover {
  border-color: rgba(96, 165, 250, 0.65);
  background: #17263a;
}

.aj-home-button-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.aj-home-button-primary:hover {
  background: #1d4ed8;
}

.aj-home-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
}

.aj-home-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 13px 7px;
  background: #0b1220;
  border-right: 1px solid rgba(148, 163, 184, 0.13);
}

.aj-home-sidebar-item {
  position: relative;
  width: 46px;
  min-height: 47px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #8493aa;
  cursor: pointer;
}

.aj-home-sidebar-item span {
  font-size: 8px;
  font-weight: 750;
}

.aj-home-sidebar-item:hover {
  background: rgba(51, 65, 85, 0.35);
  color: #dbeafe;
}

.aj-home-sidebar-item.active {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(37, 99, 235, 0.16);
  color: #60a5fa;
}

.aj-home-sidebar-divider {
  width: 30px;
  height: 1px;
  margin: 5px 0;
  background: rgba(148, 163, 184, 0.15);
}

.aj-home-main {
  min-width: 0;
  padding: 18px;
  overflow: auto;
}

.aj-home-page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 17px;
}

.aj-home-page-title {
  margin: 0;
  color: #f8fafc;
  font-size: 20px;
  font-weight: 850;
  letter-spacing: -0.035em;
}

.aj-home-page-subtitle {
  margin-top: 6px;
  color: #8290a6;
  font-size: 11px;
  line-height: 1.6;
}

.aj-home-feed-switch {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  background: #0d1421;
}

.aj-home-feed-switch button {
  min-height: 29px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #8493aa;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.aj-home-feed-switch button.active {
  background: #1d4ed8;
  color: white;
}

.aj-home-dashboard-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.6fr)
    minmax(320px, 1fr);
  gap: 14px;
  align-items: start;
}

.aj-home-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.aj-home-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 13px;
  background: #0d1421;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09);
}

.aj-home-panel-header {
  min-height: 51px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 15px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.aj-home-panel-title {
  margin: 0;
  color: #e8eef8;
  font-size: 12px;
  font-weight: 850;
}

.aj-home-panel-description {
  margin-top: 4px;
  color: #77869d;
  font-size: 10px;
}

.aj-home-panel-body {
  padding: 15px;
}

.aj-home-chart-placeholder {
  min-height: 330px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background:
    linear-gradient(rgba(30, 41, 59, 0.19) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 41, 59, 0.19) 1px, transparent 1px),
    #0a111d;
  background-size: 28px 28px;
  text-align: center;
}

.aj-home-chart-placeholder strong {
  color: #dbeafe;
  font-size: 13px;
}

.aj-home-chart-placeholder p {
  max-width: 320px;
  margin: 0;
  color: #7f8da3;
  font-size: 11px;
  line-height: 1.7;
}

.aj-home-signal-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.aj-home-signal-stat {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.6);
}

.aj-home-signal-stat span {
  display: block;
  color: #8190a7;
  font-size: 10px;
}

.aj-home-signal-stat strong {
  display: block;
  margin-top: 7px;
  color: #f1f5f9;
  font-size: 15px;
  font-weight: 850;
}

.aj-home-signal-stat strong.positive {
  color: #4ade80;
}

.aj-home-signal-stat strong.negative {
  color: #fb7185;
}

.aj-home-signal-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
  padding: 13px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 10px;
  background: rgba(22, 163, 74, 0.07);
}

.aj-home-signal-label {
  color: #86efac;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.07em;
}

.aj-home-signal-name {
  margin-top: 5px;
  color: #f0fdf4;
  font-size: 16px;
  font-weight: 900;
}

.aj-home-signal-note {
  margin-top: 5px;
  color: #8fa49a;
  font-size: 10px;
  line-height: 1.5;
}

.aj-home-signal-chip {
  flex-shrink: 0;
  padding: 7px 10px;
  border-radius: 7px;
  background: rgba(34, 197, 94, 0.14);
  color: #4ade80;
  font-size: 10px;
  font-weight: 850;
}

.aj-home-execution-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.aj-home-execution-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.09);
}

.aj-home-execution-row:last-child {
  border-bottom: 0;
}

.aj-home-execution-row span {
  color: #8493aa;
  font-size: 10px;
}

.aj-home-execution-row strong {
  color: #e2e8f0;
  font-size: 10px;
  font-weight: 800;
  text-align: right;
}

.aj-home-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.aj-home-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.aj-home-empty-state {
  padding: 23px 16px;
  color: #7e8ca2;
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
}

.aj-home-prototype-note {
  margin-top: 14px;
  color: #697991;
  font-size: 10px;
  line-height: 1.6;
  text-align: center;
}

@media (min-width: 1500px) {
  .aj-home-main {
    padding: 22px;
  }

  .aj-home-dashboard-grid {
    grid-template-columns:
      minmax(0, 1.7fr)
      minmax(360px, 1fr);
    gap: 17px;
  }
}

@media (max-width: 1100px) {
  .aj-home-dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .aj-home-chart-placeholder {
    min-height: 280px;
  }
}

@media (max-width: 720px) {
  .aj-home-topbar {
    min-height: 56px;
    padding: 0 11px;
  }

  .aj-home-brand {
    min-width: 0;
  }

  .aj-home-brand-caption,
  .aj-home-topbar-center {
    display: none;
  }

  .aj-home-workspace {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .aj-home-sidebar {
    padding: 10px 3px;
  }

  .aj-home-sidebar-item {
    width: 42px;
  }

  .aj-home-main {
    padding: 12px;
  }

  .aj-home-page-heading {
    flex-direction: column;
  }

  .aj-home-page-title {
    font-size: 18px;
  }

  .aj-home-signal-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aj-home-panel-body {
    padding: 11px;
  }

  .aj-home-chart-placeholder {
    min-height: 230px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .aj-home-panel,
  .aj-home-sidebar-item,
  .aj-home-button {
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }
}
// ============================================================
// AJ INSTITUTIONAL — HOMEPAGE SKELETON
// PART 2: COMPONENT STRUCTURE AND SIDEBAR NAVIGATION
//
// Append these declarations to AlgoHome.tsx.
// Keep the existing Instrument type, feed-search functions,
// state, and openTerminal() implementation from your baseline.
// ============================================================

type HomePanelKey =
  | "charts"
  | "wishlist"
  | "indicators"
  | "orders"
  | "history"
  | "basket"
  | "strategy";

type HomePanelDefinition = {
  key: HomePanelKey;
  label: string;
  icon: typeof Activity;
};

const HOME_PANEL_ITEMS: HomePanelDefinition[] = [
  {
    key: "charts",
    label: "Charts",
    icon: ChartNoAxesCombined,
  },
  {
    key: "wishlist",
    label: "Wishlist",
    icon: Star,
  },
  {
    key: "indicators",
    label: "Indicators",
    icon: SlidersHorizontal,
  },
  {
    key: "orders",
    label: "Orders",
    icon: ClipboardList,
  },
  {
    key: "history",
    label: "Order History",
    icon: History,
  },
  {
    key: "basket",
    label: "Basket",
    icon: ShoppingBasket,
  },
  {
    key: "strategy",
    label: "Strategy Builder",
    icon: Workflow,
  },
];

// Add the following state inside the existing AlgoHome()
// function. Do not remove or rename existing state.

const [activeHomePanel, setActiveHomePanel] =
  useState<HomePanelKey>("charts");

const [homeTheme, setHomeTheme] =
  useState<"dark" | "light">("dark");

// ============================================================
// SHARED HOMEPAGE LAYOUT
//
// Replace the outermost dashboard layout markup in the existing
// component with this structure in Part 3. Preserve existing
// search handlers and selected-instrument rendering in their
// designated sections.
// ============================================================

/*
<main
  className={`aj-home-shell aj-theme-${homeTheme}`}
>
  <header className="aj-home-topbar">

    <div className="aj-home-brand">
      <div className="aj-home-brand-mark">
        AJ
      </div>

      <div>
        <div className="aj-home-brand-name">
          AJ INSTITUTIONAL
        </div>

        <div className="aj-home-brand-caption">
          Multi-feed trading workstation
        </div>
      </div>
    </div>

    <div className="aj-home-topbar-center">
      <div className="aj-home-market-status">
        <span className="aj-home-status-dot" />
        MARKET MONITOR
      </div>
    </div>

    <div className="aj-home-topbar-actions">

      <button
        type="button"
        className="aj-home-button"
        onClick={() =>
          setHomeTheme((theme) =>
            theme === "dark" ? "light" : "dark"
          )
        }
        aria-label="Toggle dashboard theme"
      >
        {homeTheme === "dark" ? (
          <Sun size={14} />
        ) : (
          <Moon size={14} />
        )}

        {homeTheme === "dark" ? "Light mode" : "Dark mode"}
      </button>

      <button
        type="button"
        className="aj-home-button aj-home-button-primary"
        onClick={openTerminal}
      >
        <ChartNoAxesCombined size={14} />
        Get Charts
        <ExternalLink size={12} />
      </button>

    </div>

  </header>

  <div className="aj-home-workspace">

    <aside
      className="aj-home-sidebar"
      aria-label="Trading workspace navigation"
    >
      {HOME_PANEL_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeHomePanel === item.key;

        return (
          <button
            key={item.key}
            type="button"
            className={
              `aj-home-sidebar-item${active ? " active" : ""}`
            }
            onClick={() => setActiveHomePanel(item.key)}
            aria-current={active ? "page" : undefined}
            title={item.label}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>

    <div className="aj-home-main">

      <div className="aj-home-page-heading">

        <div>
          <h1 className="aj-home-page-title">
            {HOME_PANEL_ITEMS.find(
              (item) => item.key === activeHomePanel
            )?.label ?? "Trading Workspace"}
          </h1>

          <div className="aj-home-page-subtitle">
            Monitor market signals, review instruments,
            and configure your trading workflow.
          </div>
        </div>

        <div className="aj-home-feed-switch">
          <button
            type="button"
            className={feed === "fyers" ? "active" : ""}
            onClick={() => selectFeed("fyers")}
          >
            FYERS
          </button>

          <button
            type="button"
            className={feed === "indstocks" ? "active" : ""}
            onClick={() => selectFeed("indstocks")}
          >
            INDSTOCKS
          </button>
        </div>

      </div>

      {activeHomePanel === "charts" && (
        <div className="aj-home-dashboard-grid">

          <div className="aj-home-column">

            <section className="aj-home-panel">
              <div className="aj-home-panel-header">
                <div>
                  <h2 className="aj-home-panel-title">
                    Live Charts
                  </h2>

                  <div className="aj-home-panel-description">
                    Open the existing chart terminal without
                    replacing the homepage.
                  </div>
                </div>

                <ChartNoAxesCombined
                  size={17}
                  color="#60a5fa"
                />
              </div>

              <div className="aj-home-chart-placeholder">
                <ChartNoAxesCombined
                  size={30}
                  color="#60a5fa"
                />

                <strong>
                  Existing AJ Chart Terminal
                </strong>

                <p>
                  Your current charting, indicators,
                  market feeds, and chart controls remain
                  in the existing terminal.
                </p>

                <button
                  type="button"
                  className="aj-home-button aj-home-button-primary"
                  onClick={openTerminal}
                >
                  <ExternalLink size={13} />
                  Open Live Charts
                </button>
              </div>
            </section>

            <section className="aj-home-panel">
              <div className="aj-home-panel-header">
                <div>
                  <h2 className="aj-home-panel-title">
                    Market Overview
                  </h2>

                  <div className="aj-home-panel-description">
                    Market data must come from the connected
                    feed before it is presented as live.
                  </div>
                </div>

                <Activity size={17} color="#60a5fa" />
              </div>

              <div className="aj-home-panel-body">
                <div className="aj-home-signal-summary">
                  <div className="aj-home-signal-stat">
                    <span>Selected Feed</span>
                    <strong>{FEED_LABELS[feed]}</strong>
                  </div>

                  <div className="aj-home-signal-stat">
                    <span>Signal Timeframe</span>
                    <strong>5 minute</strong>
                  </div>

                  <div className="aj-home-signal-stat">
                    <span>Instrument</span>
                    <strong>
                      {selectedInstrument
                        ? instrumentLabel(selectedInstrument)
                        : "Not selected"}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

          </div>

          <div className="aj-home-column">

            <section className="aj-home-panel">
              <div className="aj-home-panel-header">
                <div>
                  <h2 className="aj-home-panel-title">
                    Live Signals
                  </h2>

                  <div className="aj-home-panel-description">
                    Signal monitoring and strategy controls
                  </div>
                </div>

                <Activity size={17} color="#4ade80" />
              </div>

              <div className="aj-home-panel-body">
                <div className="aj-home-signal-banner">
                  <div>
                    <div className="aj-home-signal-label">
                      SIGNAL ENGINE
                    </div>

                    <div className="aj-home-signal-name">
                      Awaiting confirmed signal
                    </div>

                    <div className="aj-home-signal-note">
                      Connect a real signal source before
                      displaying an actionable entry.
                    </div>
                  </div>

                  <span className="aj-home-signal-chip">
                    MONITORING
                  </span>
                </div>

                <div className="aj-home-execution-fields">
                  <div className="aj-home-execution-row">
                    <span>Feed</span>
                    <strong>{FEED_LABELS[feed]}</strong>
                  </div>

                  <div className="aj-home-execution-row">
                    <span>Indicator</span>
                    <strong>AJIndicator · SuperTrend</strong>
                  </div>

                  <div className="aj-home-execution-row">
                    <span>Timeframe</span>
                    <strong>5 minute</strong>
                  </div>

                  <div className="aj-home-execution-row">
                    <span>Instrument</span>
                    <strong>
                      {selectedInstrument
                        ? instrumentLabel(selectedInstrument)
                        : "Select in Options Execution"}
                    </strong>
                  </div>

                  <div className="aj-home-execution-row">
                    <span>Auto Trade</span>
                    <strong>Disabled in skeleton</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="aj-home-panel">
              <div className="aj-home-panel-header">
                <div>
                  <h2 className="aj-home-panel-title">
                    Options Execution
                  </h2>

                  <div className="aj-home-panel-description">
                    Broker-aware instrument selection
                  </div>
                </div>

                <Layers3 size={17} color="#60a5fa" />
              </div>

              <div className="aj-home-panel-body">
                {/*
                  Insert the EXISTING instrument search JSX here.
                  Preserve:
                  - searchText / setSearchText
                  - searching / searchError / searchResults
                  - handleInstrumentSelect
                  - selectedInstrument / clearInstrument
                  - instrumentLabel / instrumentSecondaryLabel
                  - canonical instrument metadata fields
                  - existing /api/fyers/symbols/search API
                  - existing /api/indstocks/symbols/search API
                */}

                <div className="aj-home-empty-state">
                  Preserve the existing broker symbol search
                  and selected canonical instrument panel here.
                </div>
              </div>
            </section>

          </div>

        </div>
      )}

      {activeHomePanel !== "charts" && (
        <section className="aj-home-panel">
          <div className="aj-home-panel-header">
            <div>
              <h2 className="aj-home-panel-title">
                {HOME_PANEL_ITEMS.find(
                  (item) => item.key === activeHomePanel
                )?.label}
              </h2>

              <div className="aj-home-panel-description">
                AJ Institutional workspace
              </div>
            </div>
          </div>

          <div className="aj-home-empty-state">
            This workspace section is part of the homepage
            skeleton. Connect its existing data and controls
            in the next implementation step.
          </div>
        </section>
      )}

      <div className="aj-home-prototype-note">
        AJ Institutional · {FEED_LABELS[feed]} · Homepage
        skeleton · No live orders are submitted by this layout.
      </div>

    </div>
  </div>
</main>
*/
// ============================================================
// AJ INSTITUTIONAL — HOMEPAGE SKELETON
// PART 3: THEME STYLES + SIDEBAR + DASHBOARD SECTIONS
//
// Add these styles to the existing <style> block.
// Do not replace the existing broker-search styles.
// ============================================================

.aj-theme-dark {
  --aj-bg: #080d16;
  --aj-topbar: #0d1421;
  --aj-sidebar: #0b1220;
  --aj-panel: #0d1421;
  --aj-panel-alt: #101a2a;
  --aj-border: rgba(148, 163, 184, 0.15);
  --aj-text: #e5edf8;
  --aj-muted: #8493aa;
  --aj-accent: #60a5fa;
  --aj-positive: #4ade80;
  --aj-negative: #fb7185;
  color: var(--aj-text);
  background: var(--aj-bg);
}

.aj-theme-light {
  --aj-bg: #f1f5f9;
  --aj-topbar: #ffffff;
  --aj-sidebar: #ffffff;
  --aj-panel: #ffffff;
  --aj-panel-alt: #f8fafc;
  --aj-border: #dce4ee;
  --aj-text: #172033;
  --aj-muted: #64748b;
  --aj-accent: #2563eb;
  --aj-positive: #15803d;
  --aj-negative: #be123c;
  color: var(--aj-text);
  background: var(--aj-bg);
}

.aj-theme-light.aj-home-shell,
.aj-theme-dark.aj-home-shell {
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}

.aj-theme-light .aj-home-topbar,
.aj-theme-light .aj-home-sidebar,
.aj-theme-light .aj-home-panel,
.aj-theme-light .aj-home-feed-switch {
  background: var(--aj-topbar);
  border-color: var(--aj-border);
}

.aj-theme-light .aj-home-brand-name,
.aj-theme-light .aj-home-page-title,
.aj-theme-light .aj-home-panel-title,
.aj-theme-light .aj-home-panel-body strong,
.aj-theme-light .aj-home-execution-row strong {
  color: var(--aj-text);
}

.aj-theme-light .aj-home-brand-caption,
.aj-theme-light .aj-home-page-subtitle,
.aj-theme-light .aj-home-panel-description,
.aj-theme-light .aj-home-execution-row span {
  color: var(--aj-muted);
}

.aj-theme-light .aj-home-button {
  color: #334155;
  background: #ffffff;
  border-color: var(--aj-border);
}

.aj-theme-light .aj-home-button-primary {
  color: #ffffff;
  background: #2563eb;
  border-color: #2563eb;
}

.aj-theme-light .aj-home-sidebar-item {
  color: #64748b;
}

.aj-theme-light .aj-home-sidebar-item:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.aj-theme-light .aj-home-sidebar-item.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.aj-theme-light .aj-home-feed-switch button {
  color: #64748b;
}

.aj-theme-light .aj-home-feed-switch button.active {
  color: #ffffff;
  background: #2563eb;
}

.aj-theme-light .aj-home-chart-placeholder {
  background:
    linear-gradient(#e8edf5 1px, transparent 1px),
    linear-gradient(90deg, #e8edf5 1px, transparent 1px),
    #f8fafc;
  background-size: 28px 28px;
}

.aj-theme-light .aj-home-chart-placeholder strong {
  color: #1e293b;
}

.aj-theme-light .aj-home-chart-placeholder p {
  color: #64748b;
}

.aj-theme-light .aj-home-signal-stat {
  background: #f8fafc;
  border-color: var(--aj-border);
}

.aj-theme-light .aj-home-signal-stat span {
  color: #64748b;
}

.aj-theme-light .aj-home-signal-stat strong {
  color: #172033;
}

.aj-theme-light .aj-home-signal-banner {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.aj-theme-light .aj-home-signal-label,
.aj-theme-light .aj-home-signal-name {
  color: #166534;
}

.aj-theme-light .aj-home-signal-note {
  color: #4b6955;
}

.aj-theme-light .aj-home-signal-chip {
  background: #dcfce7;
  color: #15803d;
}

.aj-theme-light .aj-home-execution-row {
  border-bottom-color: #e8edf5;
}

.aj-theme-light .aj-home-empty-state,
.aj-theme-light .aj-home-prototype-note {
  color: #64748b;
}

.aj-theme-light .aj-home-panel-header {
  border-bottom-color: var(--aj-border);
}

.aj-theme-light .aj-home-panel-actions .aj-home-button {
  background: #ffffff;
}

.aj-theme-light .aj-home-panel-actions .aj-home-button-primary {
  background: #2563eb;
  color: #ffffff;
}

.aj-theme-light .aj-home-signal-summary {
  color: #172033;
}

// ============================================================
// COMPONENT MARKUP INSERTION GUIDE
//
// In the existing AlgoHome() return statement, use the
// structure below as the shared homepage layout.
//
// Keep the existing top-level component logic and handlers.
// ============================================================

/*
return (
  <main className={`aj-home-shell aj-theme-${homeTheme}`}>

    <header className="aj-home-topbar">
      <div className="aj-home-brand">
        <div className="aj-home-brand-mark">AJ</div>
        <div>
          <div className="aj-home-brand-name">
            AJ INSTITUTIONAL
          </div>
          <div className="aj-home-brand-caption">
            Multi-feed trading workstation
          </div>
        </div>
      </div>

      <div className="aj-home-topbar-center">
        <div className="aj-home-market-status">
          <span className="aj-home-status-dot" />
          MARKET MONITOR
        </div>
      </div>

      <div className="aj-home-topbar-actions">
        <button
          type="button"
          className="aj-home-button"
          onClick={() =>
            setHomeTheme((theme) =>
              theme === "dark" ? "light" : "dark"
            )
          }
        >
          {homeTheme === "dark"
            ? <Sun size={14} />
            : <Moon size={14} />}
          {homeTheme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <button
          type="button"
          className="aj-home-button aj-home-button-primary"
          onClick={openTerminal}
        >
          <ChartNoAxesCombined size={14} />
          Get Charts
          <ExternalLink size={12} />
        </button>
      </div>
    </header>

    <div className="aj-home-workspace">
      <aside
        className="aj-home-sidebar"
        aria-label="Trading workspace"
      >
        {HOME_PANEL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeHomePanel === item.key;

          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              className={
                `aj-home-sidebar-item${active ? " active" : ""}`
              }
              onClick={() => setActiveHomePanel(item.key)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      <div className="aj-home-main">
        <div className="aj-home-page-heading">
          <div>
            <h1 className="aj-home-page-title">
              {HOME_PANEL_ITEMS.find(
                (item) => item.key === activeHomePanel
              )?.label ?? "Trading Workspace"}
            </h1>
            <div className="aj-home-page-subtitle">
              Market monitoring, signals and execution workspace
            </div>
          </div>

          <div className="aj-home-feed-switch">
            <button
              type="button"
              className={feed === "fyers" ? "active" : ""}
              onClick={() => selectFeed("fyers")}
            >
              FYERS
            </button>
            <button
              type="button"
              className={feed === "indstocks" ? "active" : ""}
              onClick={() => selectFeed("indstocks")}
            >
              INDSTOCKS
            </button>
          </div>
        </div>

        {activeHomePanel === "charts" && (
          <div className="aj-home-dashboard-grid">
            <div className="aj-home-column">

              <section className="aj-home-panel">
                <div className="aj-home-panel-header">
                  <div>
                    <h2 className="aj-home-panel-title">
                      Live Charts
                    </h2>
                    <div className="aj-home-panel-description">
                      Existing AJ chart terminal
                    </div>
                  </div>
                  <ChartNoAxesCombined
                    size={17}
                    color="#60a5fa"
                  />
                </div>

                <div className="aj-home-chart-placeholder">
                  <ChartNoAxesCombined
                    size={30}
                    color="#60a5fa"
                  />
                  <strong>Existing Chart Terminal</strong>
                  <p>
                    Open the existing charts, indicators and
                    market-feed workspace in a separate tab.
                  </p>
                  <button
                    type="button"
                    className="aj-home-button aj-home-button-primary"
                    onClick={openTerminal}
                  >
                    <ExternalLink size={13} />
                    Open Live Charts
                  </button>
                </div>
              </section>

              <section className="aj-home-panel">
                <div className="aj-home-panel-header">
                  <div>
                    <h2 className="aj-home-panel-title">
                      Market Overview
                    </h2>
                    <div className="aj-home-panel-description">
                      Connected feed context
                    </div>
                  </div>
                  <Activity size={17} color="#60a5fa" />
                </div>
                <div className="aj-home-panel-body">
                  <div className="aj-home-signal-summary">
                    <div className="aj-home-signal-stat">
                      <span>Feed</span>
                      <strong>{FEED_LABELS[feed]}</strong>
                    </div>
                    <div className="aj-home-signal-stat">
                      <span>Timeframe</span>
                      <strong>5 minute</strong>
                    </div>
                    <div className="aj-home-signal-stat">
                      <span>Instrument</span>
                      <strong>
                        {selectedInstrument
                          ? instrumentLabel(selectedInstrument)
                          : "Not selected"}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="aj-home-column">
              <section className="aj-home-panel">
                <div className="aj-home-panel-header">
                  <div>
                    <h2 className="aj-home-panel-title">
                      Live Signals
                    </h2>
                    <div className="aj-home-panel-description">
                      Strategy signal monitoring
                    </div>
                  </div>
                  <Activity size={17} color="#4ade80" />
                </div>

                <div className="aj-home-panel-body">
                  <div className="aj-home-signal-banner">
                    <div>
                      <div className="aj-home-signal-label">
                        SIGNAL ENGINE
                      </div>
                      <div className="aj-home-signal-name">
                        Awaiting confirmed signal
                      </div>
                      <div className="aj-home-signal-note">
                        Connect the existing signal source to
                        show real entries and exits.
                      </div>
                    </div>
                    <span className="aj-home-signal-chip">
                      MONITORING
                    </span>
                  </div>

                  <div className="aj-home-execution-fields">
                    <div className="aj-home-execution-row">
                      <span>Feed</span>
                      <strong>{FEED_LABELS[feed]}</strong>
                    </div>
                    <div className="aj-home-execution-row">
                      <span>Indicator</span>
                      <strong>AJIndicator · SuperTrend</strong>
                    </div>
                    <div className="aj-home-execution-row">
                      <span>Direction</span>
                      <strong>Awaiting signal</strong>
                    </div>
                    <div className="aj-home-execution-row">
                      <span>Instrument</span>
                      <strong>
                        {selectedInstrument
                          ? instrumentLabel(selectedInstrument)
                          : "Not selected"}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="aj-home-panel">
                <div className="aj-home-panel-header">
                  <div>
                    <h2 className="aj-home-panel-title">
                      Options Execution
                    </h2>
                    <div className="aj-home-panel-description">
                      Broker instrument search and selection
                    </div>
                  </div>
                  <Layers3 size={17} color="#60a5fa" />
                </div>

                <div className="aj-home-panel-body">
                  {/* Keep the original instrument search JSX
                      and selected-instrument JSX here. */}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeHomePanel !== "charts" && (
          <section className="aj-home-panel">
            <div className="aj-home-panel-header">
              <h2 className="aj-home-panel-title">
                {HOME_PANEL_ITEMS.find(
                  (item) => item.key === activeHomePanel
                )?.label}
              </h2>
            </div>
            <div className="aj-home-empty-state">
              Workspace content will be integrated in the
              sidebar implementation step.
            </div>
          </section>
        )}

        <div className="aj-home-prototype-note">
          AJ Institutional · {FEED_LABELS[feed]} · Homepage
          skeleton · No live orders are submitted by this layout.
        </div>
      </div>
    </div>
  </main>
);
*/
// ============================================================
// AJ INSTITUTIONAL — HOMEPAGE SKELETON
// PART 4: RESPONSIVE LAYOUT + LEFT SIDEBAR PANELS
//
// Append the CSS to the existing <style> block.
// The sidebar keys must match HomePanelKey from Part 2.
// ============================================================

.aj-home-shell,
.aj-home-shell * {
  box-sizing: border-box;
}

.aj-home-shell button {
  font: inherit;
}

.aj-home-shell .aj-home-main {
  scrollbar-width: thin;
  scrollbar-color: #334155 transparent;
}

.aj-home-shell .aj-home-main::-webkit-scrollbar {
  width: 7px;
}

.aj-home-shell .aj-home-main::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: #334155;
}

.aj-home-sidebar {
  position: sticky;
  top: 0;
  height: 100%;
  min-height: calc(100vh - 62px);
}

.aj-home-sidebar-item {
  flex-shrink: 0;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.aj-home-sidebar-item:focus-visible,
.aj-home-button:focus-visible,
.aj-home-feed-switch button:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.aj-home-dashboard-grid > *,
.aj-home-column > *,
.aj-home-panel {
  min-width: 0;
}

.aj-home-panel-header > div {
  min-width: 0;
}

.aj-home-panel-title {
  line-height: 1.4;
}

.aj-home-page-heading {
  align-items: center;
}

.aj-home-chart-placeholder {
  position: relative;
  overflow: hidden;
}

.aj-home-chart-placeholder::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    transparent 60%,
    rgba(8, 13, 22, 0.16)
  );
}

.aj-home-chart-placeholder > * {
  position: relative;
  z-index: 1;
}

.aj-theme-light .aj-home-chart-placeholder::after {
  background: linear-gradient(
    180deg,
    transparent 60%,
    rgba(241, 245, 249, 0.18)
  );
}

.aj-home-panel-header {
  flex-wrap: wrap;
}

.aj-home-panel-body {
  min-width: 0;
}

.aj-home-execution-row strong {
  max-width: 65%;
  overflow-wrap: anywhere;
}

.aj-home-signal-banner {
  align-items: center;
}

.aj-home-signal-name {
  line-height: 1.4;
}

.aj-home-signal-chip {
  white-space: nowrap;
}

.aj-home-feed-switch {
  flex-shrink: 0;
}

.aj-home-sidebar-item span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aj-home-bottom-nav {
  display: none;
}

// ------------------------------------------------------------
// Sidebar panel title and content layout
// ------------------------------------------------------------

.aj-home-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.aj-home-section-heading h2 {
  margin: 0;
  color: var(--aj-text);
  font-size: 15px;
  font-weight: 850;
}

.aj-home-section-heading p {
  margin: 5px 0 0;
  color: var(--aj-muted);
  font-size: 10px;
  line-height: 1.6;
}

.aj-home-workspace-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.aj-home-workspace-card {
  min-width: 0;
  padding: 15px;
  border: 1px solid var(--aj-border);
  border-radius: 12px;
  background: var(--aj-panel);
}

.aj-home-workspace-card-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
  color: var(--aj-text);
  font-size: 12px;
  font-weight: 850;
}

.aj-home-workspace-card-description {
  color: var(--aj-muted);
  font-size: 10px;
  line-height: 1.7;
}

.aj-home-workspace-row {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--aj-border);
}

.aj-home-workspace-row:last-child {
  border-bottom: 0;
}

.aj-home-workspace-row > span {
  color: var(--aj-muted);
  font-size: 10px;
}

.aj-home-workspace-row > strong {
  color: var(--aj-text);
  font-size: 10px;
  text-align: right;
  overflow-wrap: anywhere;
}

.aj-home-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.aj-home-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.aj-home-table th,
.aj-home-table td {
  padding: 12px 13px;
  border-bottom: 1px solid var(--aj-border);
  text-align: left;
  font-size: 10px;
}

.aj-home-table th {
  background: var(--aj-panel-alt);
  color: var(--aj-muted);
  font-weight: 800;
}

.aj-home-table td {
  color: var(--aj-text);
}

.aj-home-table tbody tr:last-child td {
  border-bottom: 0;
}

.aj-home-table tbody tr:hover td {
  background: var(--aj-panel-alt);
}

.aj-home-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 13px;
}

.aj-home-field label {
  color: var(--aj-muted);
  font-size: 10px;
  font-weight: 750;
}

.aj-home-field input,
.aj-home-field select,
.aj-home-field textarea {
  width: 100%;
  min-height: 37px;
  padding: 9px 11px;
  border: 1px solid var(--aj-border);
  border-radius: 8px;
  background: var(--aj-panel-alt);
  color: var(--aj-text);
  font: inherit;
  font-size: 11px;
  outline: none;
}

.aj-home-field input:focus,
.aj-home-field select:focus,
.aj-home-field textarea:focus {
  border-color: var(--aj-accent);
}

.aj-home-field input::placeholder,
.aj-home-field textarea::placeholder {
  color: var(--aj-muted);
}

.aj-home-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 23px;
  padding: 4px 8px;
  border: 1px solid var(--aj-border);
  border-radius: 999px;
  color: var(--aj-muted);
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.aj-home-pill-positive {
  color: var(--aj-positive);
  border-color: rgba(34, 197, 94, 0.24);
  background: rgba(34, 197, 94, 0.08);
}

.aj-home-pill-negative {
  color: var(--aj-negative);
  border-color: rgba(244, 63, 94, 0.24);
  background: rgba(244, 63, 94, 0.08);
}

.aj-home-notice {
  padding: 11px 12px;
  border: 1px solid var(--aj-border);
  border-radius: 9px;
  color: var(--aj-muted);
  font-size: 10px;
  line-height: 1.7;
}

.aj-home-notice-warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.06);
}

.aj-home-sidebar-group-label {
  align-self: stretch;
  margin: 5px 0 1px;
  color: #65758c;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
}

.aj-theme-light .aj-home-sidebar-group-label {
  color: #94a3b8;
}

.aj-theme-light .aj-home-workspace-card,
.aj-theme-light .aj-home-table td {
  background: #ffffff;
}

.aj-theme-light .aj-home-workspace-card-title,
.aj-theme-light .aj-home-workspace-row > strong,
.aj-theme-light .aj-home-table td {
  color: #172033;
}

.aj-theme-light .aj-home-table th {
  background: #f8fafc;
}

.aj-theme-light .aj-home-table tbody tr:hover td {
  background: #f8fafc;
}

// ------------------------------------------------------------
// Responsive dashboard layout
// ------------------------------------------------------------

@media (max-width: 1200px) {
  .aj-home-dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .aj-home-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .aj-home-column > .aj-home-panel {
    min-width: 0;
  }

  .aj-home-sidebar {
    position: static;
  }
}

@media (max-width: 850px) {
  .aj-home-topbar {
    gap: 10px;
    padding: 0 13px;
  }

  .aj-home-brand {
    min-width: 0;
  }

  .aj-home-topbar-center {
    display: none;
  }

  .aj-home-workspace-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .aj-home-column {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .aj-home-topbar {
    min-height: 56px;
  }

  .aj-home-brand-mark {
    width: 30px;
    height: 30px;
  }

  .aj-home-brand-name {
    font-size: 11px;
  }

  .aj-home-topbar-actions {
    gap: 6px;
  }

  .aj-home-topbar-actions .aj-home-button {
    min-height: 32px;
    padding: 0 8px;
    font-size: 9px;
  }

  .aj-home-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .aj-home-sidebar {
    position: sticky;
    z-index: 10;
    top: 0;
    height: auto;
    min-height: 0;
    flex-direction: row;
    align-items: stretch;
    justify-content: flex-start;
    gap: 5px;
    padding: 7px;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--aj-border);
  }

  .aj-home-sidebar-item {
    width: 62px;
    min-width: 62px;
    min-height: 43px;
    gap: 3px;
  }

  .aj-home-sidebar-item span {
    font-size: 8px;
  }

  .aj-home-main {
    padding: 12px;
  }

  .aj-home-page-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .aj-home-feed-switch {
    max-width: 100%;
  }

  .aj-home-panel-header {
    padding: 11px 12px;
  }

  .aj-home-panel-body {
    padding: 12px;
  }

  .aj-home-chart-placeholder {
    min-height: 220px;
    padding: 16px;
  }

  .aj-home-signal-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aj-home-signal-banner {
    align-items: flex-start;
  }

  .aj-home-signal-name {
    font-size: 13px;
  }

  .aj-home-execution-row {
    gap: 8px;
  }

  .aj-home-execution-row strong {
    max-width: 60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aj-home-shell *,
  .aj-home-shell *::before,
  .aj-home-shell *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
}

// ============================================================
// END PART 4
// Part 5 will finish the integration checklist and final
// JSX adjustments.
// ============================================================
/* ============================================================
   PART 5 — FINAL INTEGRATION
   Add the following wiring inside AlgoHome() and merge the
   JSX into the existing return. Keep existing broker search,
   instrument normalization, execution state, and terminal
   navigation logic intact.
   ============================================================ */

/* ---------- 1. Add to the icon imports if not already present ---------- */

// Activity,
// ChartNoAxesCombined,
// Star,
// SlidersHorizontal,
// ClipboardList,
// History,
// ShoppingBasket,
// Workflow,
// Sun,
// Moon,
// ExternalLink,

/* ---------- 2. Add inside AlgoHome(), alongside existing state ---------- */

type HomePanelKey =
  | "charts"
  | "wishlist"
  | "indicators"
  | "orders"
  | "order-history"
  | "basket"
  | "strategy-builder";

const HOME_PANEL_ITEMS: {
  id: HomePanelKey;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "charts", label: "Charts", icon: <Activity size={17} /> },
  { id: "wishlist", label: "Wishlist", icon: <Star size={17} /> },
  {
    id: "indicators",
    label: "Indicators & Settings",
    icon: <SlidersHorizontal size={17} />,
  },
  { id: "orders", label: "Orders", icon: <ClipboardList size={17} /> },
  {
    id: "order-history",
    label: "Order History",
    icon: <History size={17} />,
  },
  {
    id: "basket",
    label: "Basket",
    icon: <ShoppingBasket size={17} />,
  },
  {
    id: "strategy-builder",
    label: "Strategy Builder",
    icon: <Workflow size={17} />,
  },
];

const [activeHomePanel, setActiveHomePanel] =
  useState<HomePanelKey>("charts");

const [homeTheme, setHomeTheme] = useState<"dark" | "light">("dark");

/* ---------- 3. Add inside the existing component ---------- */

/*
  IMPORTANT:
  - Keep the existing openTerminal() implementation.
  - Keep the existing selectFeed() implementation.
  - Keep the existing symbol-search effect and its API URLs.
  - Do not replace existing search results or instrument metadata.
*/

const handleHomePanelChange = (panel: HomePanelKey) => {
  setActiveHomePanel(panel);

  // The Charts item should open the existing terminal route.
  if (panel === "charts") {
    openTerminal();
  }
};

/* ---------- 4. Merge this top-level shell into the existing return ---------- */

/*
  Place the shell around the existing homepage sections.
  Move existing sections into the matching slots below instead
  of duplicating their implementations.
*/

return (
  <div className={`aj-home-shell aj-theme-${homeTheme}`}>
    <header className="aj-home-topbar">
      <div className="aj-home-brand">
        <div className="aj-home-brand-mark">AJ</div>
        <div className="aj-home-brand-copy">
          <strong>AJ Institutional</strong>
          <span>Trading Workspace</span>
        </div>
      </div>

      <div className="aj-home-topbar-center">
        <span className="aj-home-market-status">
          <span className="aj-home-status-dot" />
          Market Workspace
        </span>
      </div>

      <div className="aj-home-topbar-actions">
        {/* Preserve the existing feed-selection state and handlers. */}
        <div className="aj-home-feed-switch">
          <button
            type="button"
            className={feed === "fyers" ? "is-active" : ""}
            onClick={() => selectFeed("fyers")}
          >
            FYERS
          </button>

          <button
            type="button"
            className={feed === "indstocks" ? "is-active" : ""}
            onClick={() => selectFeed("indstocks")}
          >
            IndStocks
          </button>
        </div>

        <button
          type="button"
          className="aj-home-icon-button"
          aria-label={
            homeTheme === "dark"
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
          onClick={() =>
            setHomeTheme((current) =>
              current === "dark" ? "light" : "dark"
            )
          }
        >
          {homeTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          className="aj-home-primary-button"
          onClick={openTerminal}
        >
          <ChartNoAxesCombined size={17} />
          Get Charts
          <ExternalLink size={14} />
        </button>
      </div>
    </header>

    <div className="aj-home-workspace">
      <aside className="aj-home-sidebar">
        <div className="aj-home-sidebar-heading">WORKSPACE</div>

        <nav className="aj-home-sidebar-nav" aria-label="Trading workspace">
          {HOME_PANEL_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={
                activeHomePanel === item.id
                  ? "aj-home-nav-item is-active"
                  : "aj-home-nav-item"
              }
              onClick={() => handleHomePanelChange(item.id)}
            >
              <span className="aj-home-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              <ChevronRight size={14} className="aj-home-nav-chevron" />
            </button>
          ))}
        </nav>

        <div className="aj-home-sidebar-footer">
          <span className="aj-home-status-dot" />
          <span>Workspace ready</span>
        </div>
      </aside>

      <main className="aj-home-main">
        <div className="aj-home-page-heading">
          <div>
            <span className="aj-home-eyebrow">TRADING OVERVIEW</span>
            <h1>Algo Trading Workspace</h1>
            <p>
              Monitor market signals, review instruments, and manage your
              strategy workflow.
            </p>
          </div>

          <div className="aj-home-heading-actions">
            <span className="aj-home-feed-badge">
              {feed === "fyers" ? "FYERS FEED" : "INDSTOCKS FEED"}
            </span>
          </div>
        </div>

        {/*
          EXISTING CONTENT INSERTION POINTS

          Move the original JSX into these areas without changing
          its logic or deleting existing sections:

          1. Dashboard / market snapshot:
             Existing market metrics, P&L cards, and signal overview.

          2. Main workspace:
             Existing signal engine, auto-trade controls, strategy
             status, pause/resume, and exit actions.

          3. Instrument search:
             Existing search input, loading/error states, search
             results, and canonical selected-instrument panel.

          4. Execution plan:
             Existing option execution details, targets, and risk
             information.

          5. Activity:
             Existing Positions, Orders, and History tabs and tables.

          6. Performance / strategy library:
             Existing performance statistics and strategy cards.

          Do not replace the existing JSX with placeholder data.
          Preserve its current event handlers and state references.
        */}

        <section className="aj-home-content">
          {/* INSERT EXISTING MARKET SNAPSHOT JSX HERE */}

          {/* INSERT EXISTING SIGNAL ENGINE JSX HERE */}

          {/* INSERT EXISTING INSTRUMENT SEARCH JSX HERE */}

          {/* INSERT EXISTING EXECUTION PLAN JSX HERE */}

          {/* INSERT EXISTING ACTIVITY TABS AND TABLES HERE */}

          {/* INSERT EXISTING PERFORMANCE / STRATEGY JSX HERE */}
        </section>

        <footer className="aj-home-footer">
          <span>AJ Institutional</span>
          <span>Trading decisions remain under your control.</span>
        </footer>
      </main>
    </div>
  </div>
);
/*
 * STEP 2 — COMBINED LEFT SIDEBAR
 * STEP 3 — SHARED DARK/LIGHT THEME FOUNDATION
 *
 * Add this as Part 6 after your previous parts.
 * This part defines the sidebar model, theme tokens, and shared
 * styling foundation. Parts 7–9 will provide the sidebar JSX,
 * theme switching, and responsive/component styling.
 *
 * Integration note:
 * Keep your existing feed selection, instrument-search APIs,
 * canonical instrument metadata, and openTerminal() function.
 */

import type { ReactNode } from "react";

type AlgoWorkspacePanel =
  | "charts"
  | "wishlist"
  | "indicators"
  | "orders"
  | "order-history"
  | "basket"
  | "strategy-builder";

type AlgoTheme = "dark" | "light";

type AlgoSidebarItem = {
  id: AlgoWorkspacePanel;
  label: string;
  description: string;
  icon: ReactNode;
};

const ALGO_SIDEBAR_ITEMS: AlgoSidebarItem[] = [
  {
    id: "charts",
    label: "Charts",
    description: "Open charting workspace",
    icon: <Activity size={18} />,
  },
  {
    id: "wishlist",
    label: "Wishlist",
    description: "Saved instruments",
    icon: <Star size={18} />,
  },
  {
    id: "indicators",
    label: "Indicators & Settings",
    description: "Indicators and chart preferences",
    icon: <SlidersHorizontal size={18} />,
  },
  {
    id: "orders",
    label: "Orders",
    description: "Review current orders",
    icon: <ClipboardList size={18} />,
  },
  {
    id: "order-history",
    label: "Order History",
    description: "Review past orders",
    icon: <History size={18} />,
  },
  {
    id: "basket",
    label: "Basket",
    description: "Build an instrument basket",
    icon: <ShoppingBasket size={18} />,
  },
  {
    id: "strategy-builder",
    label: "Strategy Builder",
    description: "Configure trading strategies",
    icon: <Workflow size={18} />,
  },
];

/*
 * Theme tokens:
 * Use these CSS custom properties for the shell, sidebar, panels,
 * charts, signal cards, and options execution cards.
 *
 * The hierarchy and spacing remain identical between themes.
 * Only surface colors, text contrast, borders, and shadows change.
 */

const ALGO_THEME_STYLES = `
.aj-workspace {
  --aj-radius-sm: 8px;
  --aj-radius-md: 12px;
  --aj-radius-lg: 16px;
  --aj-sidebar-width: 232px;
  --aj-topbar-height: 68px;
  --aj-space-1: 4px;
  --aj-space-2: 8px;
  --aj-space-3: 12px;
  --aj-space-4: 16px;
  --aj-space-5: 20px;
  --aj-space-6: 24px;
  --aj-font-sans: Inter, ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;

  font-family: var(--aj-font-sans);
  min-height: 100vh;
  width: 100%;
  color: var(--aj-text);
  background: var(--aj-page);
  transition:
    background-color 180ms ease,
    color 180ms ease;
}

.aj-workspace[data-theme="dark"] {
  color-scheme: dark;
  --aj-page: #090d14;
  --aj-topbar: #0d121b;
  --aj-sidebar: #0b1018;
  --aj-panel: #111824;
  --aj-panel-raised: #151e2b;
  --aj-panel-muted: #0d141e;
  --aj-input: #0a1019;
  --aj-border: #253041;
  --aj-border-strong: #344155;
  --aj-text: #edf2fa;
  --aj-text-secondary: #a2afc2;
  --aj-text-muted: #738197;
  --aj-accent: #7c8cff;
  --aj-accent-soft: rgba(124, 140, 255, 0.14);
  --aj-positive: #35c995;
  --aj-positive-soft: rgba(53, 201, 149, 0.12);
  --aj-negative: #ff6d83;
  --aj-negative-soft: rgba(255, 109, 131, 0.12);
  --aj-warning: #f0b75c;
  --aj-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.aj-workspace[data-theme="light"] {
  color-scheme: light;
  --aj-page: #f3f6fb;
  --aj-topbar: #ffffff;
  --aj-sidebar: #ffffff;
  --aj-panel: #ffffff;
  --aj-panel-raised: #f8faff;
  --aj-panel-muted: #f3f6fb;
  --aj-input: #ffffff;
  --aj-border: #dfe6f0;
  --aj-border-strong: #c8d2e1;
  --aj-text: #172033;
  --aj-text-secondary: #526078;
  --aj-text-muted: #78859a;
  --aj-accent: #4f61df;
  --aj-accent-soft: rgba(79, 97, 223, 0.09);
  --aj-positive: #11865f;
  --aj-positive-soft: rgba(17, 134, 95, 0.09);
  --aj-negative: #d63f59;
  --aj-negative-soft: rgba(214, 63, 89, 0.09);
  --aj-warning: #a96b0c;
  --aj-shadow: 0 8px 24px rgba(25, 42, 70, 0.06);
}

.aj-workspace *,
.aj-workspace *::before,
.aj-workspace *::after {
  box-sizing: border-box;
}

.aj-workspace button,
.aj-workspace input,
.aj-workspace select,
.aj-workspace textarea {
  font: inherit;
}

.aj-workspace button {
  -webkit-tap-highlight-color: transparent;
}

.aj-workspace svg {
  flex-shrink: 0;
}

.aj-workspace .aj-text-positive {
  color: var(--aj-positive);
}

.aj-workspace .aj-text-negative {
  color: var(--aj-negative);
}

.aj-workspace .aj-muted {
  color: var(--aj-text-muted);
}

.aj-workspace .aj-secondary {
  color: var(--aj-text-secondary);
}

.aj-workspace .aj-panel {
  min-width: 0;
  border: 1px solid var(--aj-border);
  border-radius: var(--aj-radius-md);
  background: var(--aj-panel);
  box-shadow: var(--aj-shadow);
}

.aj-workspace .aj-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--aj-space-3);
  min-width: 0;
  padding: 16px 18px;
  border-bottom: 1px solid var(--aj-border);
}

.aj-workspace .aj-panel-heading h2,
.aj-workspace .aj-panel-heading h3 {
  margin: 0;
  color: var(--aj-text);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.aj-workspace .aj-panel-body {
  min-width: 0;
  padding: 18px;
}

.aj-workspace .aj-eyebrow {
  color: var(--aj-text-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.aj-workspace .aj-divider {
  width: 100%;
  height: 1px;
  background: var(--aj-border);
}
`;
/*
 * STEP 2 — SIDEBAR COMPONENT AND NAVIGATION
 *
 * Put this component at module scope, outside AlgoHome().
 * It is intentionally controlled by props so the same sidebar
 * can be used with either theme without duplicating markup.
 */

type AlgoSidebarProps = {
  activePanel: AlgoWorkspacePanel;
  onPanelChange: (panel: AlgoWorkspacePanel) => void;
  onOpenCharts: () => void;
};

function AlgoWorkspaceSidebar({
  activePanel,
  onPanelChange,
  onOpenCharts,
}: AlgoSidebarProps) {
  const handleSelect = (panel: AlgoWorkspacePanel) => {
    onPanelChange(panel);

    // Charts uses the existing terminal-opening handler.
    if (panel === "charts") {
      onOpenCharts();
    }
  };

  return (
    <aside className="aj-sidebar">
      <div className="aj-sidebar-section-label">WORKSPACE</div>

      <nav className="aj-sidebar-nav" aria-label="Workspace navigation">
        {ALGO_SIDEBAR_ITEMS.map((item) => {
          const selected = activePanel === item.id;

          return (
            <button
              type="button"
              key={item.id}
              className={[
                "aj-sidebar-item",
                selected ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={selected ? "page" : undefined}
              title={item.description}
              onClick={() => handleSelect(item.id)}
            >
              <span className="aj-sidebar-item-icon">{item.icon}</span>

              <span className="aj-sidebar-item-label">{item.label}</span>

              {selected && (
                <span className="aj-sidebar-active-marker" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="aj-sidebar-bottom">
        <div className="aj-sidebar-connection-indicator">
          <span className="aj-sidebar-connection-dot" />
          <span>Workspace available</span>
        </div>
        <span className="aj-sidebar-bottom-caption">
          Select a section to continue
        </span>
      </div>
    </aside>
  );
}

/*
 * Add this CSS to the same style string as Part 6.
 * If you keep CSS in a separate stylesheet, place it there instead.
 */

const ALGO_SIDEBAR_STYLES = `
.aj-workspace-layout {
  display: grid;
  grid-template-columns: var(--aj-sidebar-width) minmax(0, 1fr);
  min-height: calc(100vh - var(--aj-topbar-height));
}

.aj-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: calc(100vh - var(--aj-topbar-height));
  padding: 20px 12px 16px;
  border-right: 1px solid var(--aj-border);
  background: var(--aj-sidebar);
}

.aj-sidebar-section-label {
  padding: 0 12px;
  margin: 2px 0 12px;
  color: var(--aj-text-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.aj-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.aj-sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 43px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--aj-text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    color 140ms ease,
    background 140ms ease,
    border-color 140ms ease;
}

.aj-sidebar-item:hover {
  color: var(--aj-text);
  background: var(--aj-panel-muted);
}

.aj-sidebar-item:focus-visible {
  outline: 2px solid var(--aj-accent);
  outline-offset: 2px;
}

.aj-sidebar-item.is-active {
  color: var(--aj-accent);
  border-color: var(--aj-border);
  background: var(--aj-accent-soft);
  font-weight: 650;
}

.aj-sidebar-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  color: inherit;
}

.aj-sidebar-item-label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
}

.aj-sidebar-active-marker {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--aj-accent);
}

.aj-sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: auto;
  padding: 18px 10px 4px;
  border-top: 1px solid var(--aj-border);
}

.aj-sidebar-connection-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--aj-text-secondary);
  font-size: 11px;
}

.aj-sidebar-connection-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--aj-positive);
  box-shadow: 0 0 0 3px var(--aj-positive-soft);
}

.aj-sidebar-bottom-caption {
  color: var(--aj-text-muted);
  font-size: 10px;
  line-height: 1.5;
}
`;
/*
 * STEP 3 — SHARED TOPBAR AND THEME SWITCHING
 *
 * Add this component at module scope, outside AlgoHome().
 * The theme switch changes CSS tokens only; it does not remount
 * chart, signal, instrument-search, or options-execution content.
 */

type AlgoWorkspaceTopbarProps = {
  theme: AlgoTheme;
  feed: Feed;
  onThemeChange: () => void;
  onFeedChange: (feed: Feed) => void;
  onOpenCharts: () => void;
};

function AlgoWorkspaceTopbar({
  theme,
  feed,
  onThemeChange,
  onFeedChange,
  onOpenCharts,
}: AlgoWorkspaceTopbarProps) {
  return (
    <header className="aj-topbar">
      <div className="aj-topbar-brand">
        <div className="aj-brand-symbol" aria-hidden="true">
          AJ
        </div>

        <div className="aj-brand-text">
          <strong>AJ Institutional</strong>
          <span>Trading Workspace</span>
        </div>
      </div>

      <div className="aj-topbar-center">
        <span className="aj-market-status">
          <span className="aj-market-status-dot" />
          <span>Market Workspace</span>
        </span>
      </div>

      <div className="aj-topbar-actions">
        <div className="aj-feed-switch" aria-label="Market data feed">
          <button
            type="button"
            className={feed === "fyers" ? "is-active" : ""}
            aria-pressed={feed === "fyers"}
            onClick={() => onFeedChange("fyers")}
          >
            FYERS
          </button>

          <button
            type="button"
            className={feed === "indstocks" ? "is-active" : ""}
            aria-pressed={feed === "indstocks"}
            onClick={() => onFeedChange("indstocks")}
          >
            IndStocks
          </button>
        </div>

        <button
          type="button"
          className="aj-topbar-icon-button"
          onClick={onThemeChange}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          className="aj-topbar-primary-button"
          onClick={onOpenCharts}
        >
          <ChartNoAxesCombined size={16} />
          <span>Get Charts</span>
          <ExternalLink size={13} />
        </button>
      </div>
    </header>
  );
}

/*
 * Add this CSS alongside the style constants from Parts 6 and 7.
 */

const ALGO_TOPBAR_STYLES = `
.aj-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: var(--aj-topbar-height);
  padding: 0 22px;
  border-bottom: 1px solid var(--aj-border);
  background: var(--aj-topbar);
}

.aj-topbar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 220px;
}

.aj-brand-symbol {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--aj-border-strong);
  border-radius: 10px;
  color: var(--aj-text);
  background: var(--aj-accent-soft);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.aj-brand-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.aj-brand-text strong {
  color: var(--aj-text);
  font-size: 13px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.aj-brand-text span {
  color: var(--aj-text-muted);
  font-size: 10px;
}

.aj-topbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.aj-market-status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 8px 11px;
  border: 1px solid var(--aj-border);
  border-radius: 999px;
  color: var(--aj-text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

.aj-market-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--aj-positive);
}

.aj-topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.aj-feed-switch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--aj-border);
  border-radius: 9px;
  background: var(--aj-panel-muted);
}

.aj-feed-switch button {
  min-height: 29px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--aj-text-secondary);
  background: transparent;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.aj-feed-switch button:hover {
  color: var(--aj-text);
}

.aj-feed-switch button.is-active {
  border-color: var(--aj-border);
  color: var(--aj-text);
  background: var(--aj-panel);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.aj-topbar-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--aj-border);
  border-radius: 9px;
  color: var(--aj-text-secondary);
  background: var(--aj-panel);
  cursor: pointer;
}

.aj-topbar-icon-button:hover {
  color: var(--aj-text);
  border-color: var(--aj-border-strong);
}

.aj-topbar-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 37px;
  padding: 0 12px;
  border: 1px solid var(--aj-accent);
  border-radius: 9px;
  color: #ffffff;
  background: var(--aj-accent);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: filter 140ms ease;
}

.aj-topbar-primary-button:hover {
  filter: brightness(1.08);
}

.aj-topbar button:focus-visible {
  outline: 2px solid var(--aj-accent);
  outline-offset: 2px;
}
`;
/*
 * STEP 3 — RESPONSIVE LAYOUT AND FINAL INTEGRATION
 *
 * 1. Move all imports to the top of AlgoHome.tsx.
 * 2. Keep the existing AlgoHome component and its broker/search logic.
 * 3. Add the state and wrapper below inside that component.
 * 4. Place the existing dashboard sections inside aj-workspace-content.
 * 5. Merge these CSS rules into your existing style block or stylesheet.
 */

/*
 * Add inside AlgoHome(), alongside the existing useState declarations.
 *
 * If your file already declares an equivalent state variable, reuse it
 * rather than declaring the same variable twice.
 */

const [algoWorkspaceTheme, setAlgoWorkspaceTheme] =
  useState<AlgoTheme>("dark");

const [algoWorkspacePanel, setAlgoWorkspacePanel] =
  useState<AlgoWorkspacePanel>("charts");

/*
 * Integration JSX
 *
 * This is the shared outer shell. Keep the actual chart, signal,
 * canonical instrument search, execution plan, and activity JSX
 * from your existing file in the indicated content area.
 */

const algoWorkspaceStyles = [
  ALGO_THEME_STYLES,
  ALGO_SIDEBAR_STYLES,
  ALGO_TOPBAR_STYLES,
  ALGO_RESPONSIVE_STYLES,
].join("\n");

/*
 * Use this structure in the existing return statement.
 * Replace the content placeholders with your existing JSX.
 */

return (
  <div
    className="aj-workspace"
    data-theme={algoWorkspaceTheme}
  >
    <style>{algoWorkspaceStyles}</style>

    <AlgoWorkspaceTopbar
      theme={algoWorkspaceTheme}
      feed={feed}
      onThemeChange={() =>
        setAlgoWorkspaceTheme((current) =>
          current === "dark" ? "light" : "dark"
        )
      }
      onFeedChange={selectFeed}
      onOpenCharts={openTerminal}
    />

    <div className="aj-workspace-layout">
      <AlgoWorkspaceSidebar
        activePanel={algoWorkspacePanel}
        onPanelChange={setAlgoWorkspacePanel}
        onOpenCharts={openTerminal}
      />

      <main className="aj-workspace-content">
        <div className="aj-workspace-page-heading">
          <div>
            <div className="aj-eyebrow">TRADING OVERVIEW</div>
            <h1>Algo Trading Workspace</h1>
            <p>
              Monitor market signals, review instruments, and manage your
              trading workflow.
            </p>
          </div>

          <div className="aj-workspace-feed-label">
            {feed === "fyers" ? "FYERS FEED" : "INDSTOCKS FEED"}
          </div>
        </div>

        {/*
          MOVE YOUR EXISTING JSX INTO THIS AREA.

          Keep these sections and their existing state references:

          - Market snapshot / summary metrics
          - Live signal and strategy controls
          - Existing instrument search and result list
          - Canonical selected-instrument details
          - Options execution / execution plan
          - Positions, Orders, and Order History
          - Performance and strategy library

          Do not leave placeholder comments in the final build.
          Do not create mock replacements for live broker data.
        */}

        <section className="aj-workspace-dashboard-grid">
          {/* Existing market snapshot JSX */}

          {/* Existing live signals / strategy controls JSX */}

          {/* Existing instrument search JSX */}

          {/* Existing options execution JSX */}
        </section>

        <section className="aj-workspace-activity">
          {/* Existing Positions / Orders / History JSX */}
        </section>

        <section className="aj-workspace-performance">
          {/* Existing performance / strategy library JSX */}
        </section>
      </main>
    </div>
  </div>
);

/* ---------- Responsive and shared component styling ---------- */

const ALGO_RESPONSIVE_STYLES = `
.aj-workspace-content {
  min-width: 0;
  width: 100%;
  padding: 24px;
  overflow-x: clip;
}

.aj-workspace-page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.aj-workspace-page-heading h1 {
  margin: 7px 0 6px;
  color: var(--aj-text);
  font-size: clamp(21px, 2vw, 28px);
  font-weight: 750;
  letter-spacing: -0.045em;
  line-height: 1.2;
}

.aj-workspace-page-heading p {
  max-width: 640px;
  margin: 0;
  color: var(--aj-text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.aj-workspace-feed-label {
  flex-shrink: 0;
  padding: 7px 10px;
  border: 1px solid var(--aj-border);
  border-radius: 7px;
  color: var(--aj-text-secondary);
  background: var(--aj-panel);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.aj-workspace-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: start;
  gap: 16px;
  min-width: 0;
}

.aj-workspace-activity,
.aj-workspace-performance {
  min-width: 0;
  margin-top: 18px;
}

.aj-workspace .aj-signal-card,
.aj-workspace .aj-options-card,
.aj-workspace .aj-chart-card {
  min-width: 0;
  color: var(--aj-text);
  border: 1px solid var(--aj-border);
  border-radius: var(--aj-radius-md);
  background: var(--aj-panel);
}

.aj-workspace input,
.aj-workspace select,
.aj-workspace textarea {
  color: var(--aj-text);
  border-color: var(--aj-border);
  background: var(--aj-input);
}

.aj-workspace input::placeholder,
.aj-workspace textarea::placeholder {
  color: var(--aj-text-muted);
}

.aj-workspace table {
  width: 100%;
  border-collapse: collapse;
  color: var(--aj-text);
}

.aj-workspace th {
  color: var(--aj-text-muted);
  background: var(--aj-panel-muted);
  font-size: 10px;
  font-weight: 700;
  text-align: left;
}

.aj-workspace th,
.aj-workspace td {
  padding: 11px 12px;
  border-bottom: 1px solid var(--aj-border);
  white-space: nowrap;
}

.aj-workspace td {
  color: var(--aj-text-secondary);
  font-size: 11px;
}

.aj-workspace tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 1100px) {
  .aj-workspace {
    --aj-sidebar-width: 208px;
  }

  .aj-workspace-content {
    padding: 18px;
  }

  .aj-topbar {
    gap: 12px;
    padding: 0 16px;
  }

  .aj-topbar-brand {
    min-width: auto;
  }

  .aj-topbar-center {
    display: none;
  }
}

@media (max-width: 760px) {
  .aj-workspace {
    --aj-topbar-height: 60px;
    --aj-sidebar-width: 64px;
  }

  .aj-topbar {
    padding: 0 10px;
  }

  .aj-brand-symbol {
    width: 33px;
    height: 33px;
  }

  .aj-brand-text,
  .aj-feed-switch,
  .aj-topbar-primary-button span,
  .aj-topbar-primary-button svg:last-child {
    display: none;
  }

  .aj-topbar-primary-button {
    width: 36px;
    padding: 0;
  }

  .aj-topbar-actions {
    gap: 6px;
  }

  .aj-sidebar {
    padding: 16px 7px 12px;
  }

  .aj-sidebar-section-label,
  .aj-sidebar-item-label,
  .aj-sidebar-active-marker,
  .aj-sidebar-bottom {
    display: none;
  }

  .aj-sidebar-item {
    justify-content: center;
    min-height: 43px;
    padding: 0;
  }

  .aj-sidebar-item-icon {
    width: auto;
  }

  .aj-workspace-content {
    padding: 14px 12px;
  }

  .aj-workspace-page-heading {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .aj-workspace-dashboard-grid {
    gap: 12px;
  }
}

@media (max-width: 440px) {
  .aj-workspace-page-heading h1 {
    font-size: 21px;
  }

  .aj-workspace-page-heading p {
    font-size: 11px;
  }

  .aj-workspace-feed-label {
    align-self: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aj-workspace,
  .aj-workspace *,
  .aj-workspace *::before,
  .aj-workspace *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;
/*
 * STEP 4 — INTEGRATE EXISTING FUNCTIONALITY
 * Part 10: Feed selection and URL synchronization.
 *
 * Goal:
 * - Preserve the existing FYERS and IndStocks feeds.
 * - Preserve the existing ?terminal=1 chart-terminal route.
 * - Avoid replacing working broker-feed logic.
 * - Keep feed selection synchronized with the URL.
 *
 * IMPORTANT:
 * Merge these helpers into the existing component. Do not add
 * duplicate feed state or duplicate openTerminal() functions.
 */

type AlgoFeed = "fyers" | "indstocks";

function normalizeAlgoFeed(value: string | null): AlgoFeed {
  return value === "indstocks" ? "indstocks" : "fyers";
}

/*
 * If your existing component already reads the URL to initialize
 * feed, retain that implementation instead of adding another one.
 *
 * Existing logic expected:
 *
 * const params = new URLSearchParams(window.location.search);
 * const initialFeed = normalizeAlgoFeed(params.get("feed"));
 *
 * const [feed, setFeed] = useState<Feed>(initialFeed);
 */

/*
 * Replace only the body of selectFeed() if your existing handler
 * does not already preserve other URL query parameters.
 *
 * Do not use this if your current handler performs additional
 * necessary initialization or cleanup; merge the URL update into it.
 */

const selectFeed = (nextFeed: Feed) => {
  setFeed(nextFeed);

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("feed", nextFeed);

  // Do not accidentally remove ?terminal=1 or unrelated parameters.
  window.history.replaceState(
    window.history.state,
    "",
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  );
};

/*
 * Preserve the existing terminal behavior.
 * If this already exists in AlgoHome.tsx, keep the original function.
 */

const openTerminal = () => {
  const terminalUrl = new URL(window.location.href);
  terminalUrl.searchParams.set("terminal", "1");

  window.open(
    terminalUrl.toString(),
    "_blank",
    "noopener,noreferrer"
  );
};

/*
 * Integration checks:
 *
 * 1. Selecting FYERS changes feed state to "fyers".
 * 2. Selecting IndStocks changes feed state to "indstocks".
 * 3. Unrelated URL parameters are preserved.
 * 4. The terminal opens separately with ?terminal=1.
 * 5. Existing chart and broker-feed code remains untouched.
 */
 /*
 * STEP 4 — EXISTING INSTRUMENT SEARCH INTEGRATION
 *
 * Keep your existing search endpoint contracts:
 *   /api/fyers/symbols/search?q=...
 *   /api/indstocks/symbols/search?q=...
 *
 * This part is a reference integration pattern. If the existing
 * file already has equivalent state, normalization, and debounce
 * logic, keep it rather than declaring duplicates.
 */

type AlgoInstrumentSearchResult = {
  symbol?: string;
  name?: string;
  exchange?: string;
  token?: string | number;
  instrumentId?: string | number;
  [key: string]: unknown;
};

type AlgoInstrumentSearchState = {
  query: string;
  results: AlgoInstrumentSearchResult[];
  loading: boolean;
  error: string | null;
};

/*
 * Existing state to reuse, if already declared:
 *
 * const [search, setSearch] = useState("");
 * const [searchResults, setSearchResults] = useState<Instrument[]>([]);
 * const [searchLoading, setSearchLoading] = useState(false);
 * const [searchError, setSearchError] = useState<string | null>(null);
 * const searchAbortRef = useRef<AbortController | null>(null);
 */

/*
 * Build the correct endpoint from the currently selected feed.
 * Do not normalize away broker-specific fields from returned rows.
 */

function getInstrumentSearchEndpoint(
  feed: Feed,
  query: string
): string {
  const endpoint =
    feed === "indstocks"
      ? "/api/indstocks/symbols/search"
      : "/api/fyers/symbols/search";

  const params = new URLSearchParams({ q: query });

  return `${endpoint}?${params.toString()}`;
}

/*
 * Reuse the existing instrument normalizer.
 *
 * Do not introduce a replacement normalizer if your current
 * normalizeInstrument() preserves canonical fields such as
 * exchange, token, instrumentId, expiry, strike, optionType,
 * lotSize, and broker-specific metadata.
 */

/*
 * Reference request pattern to merge into the existing debounced
 * search effect. Do not run this in parallel with a second existing
 * search effect.
 */

async function requestInstrumentSearch(
  feed: Feed,
  query: string,
  signal: AbortSignal
): Promise<unknown> {
  const response = await fetch(
    getInstrumentSearchEndpoint(feed, query),
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Instrument search failed (${response.status})`
    );
  }

  return response.json();
}

/*
 * Inside the existing debounced useEffect:
 *
 * 1. Trim the query.
 * 2. Clear results for an empty query.
 * 3. Abort the previous request.
 * 4. Create a new AbortController.
 * 5. Call requestInstrumentSearch(feed, query, controller.signal).
 * 6. Extract rows using your existing response-shape handling.
 * 7. Normalize each row with your existing normalizer.
 * 8. Ignore AbortError; surface other errors.
 * 9. Abort the request during effect cleanup.
 *
 * Keep the existing debounce duration if it is already working.
 */
 /*
 * STEP 4 — SEPARATE PROTOTYPE METRICS FROM REAL ACCOUNT DATA
 *
 * Prototype values must never be presented as live broker balances,
 * real P&L, or actual executed orders.
 */

type MetricSource = "prototype" | "broker";

type AccountMetric = {
  label: string;
  value: string;
  source: MetricSource;
  note?: string;
};

type AccountSnapshot = {
  availableMargin?: number;
  usedMargin?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  asOf?: string;
};

/*
 * Explicit prototype-only examples.
 *
 * Keep your current mock metrics if they already exist, but make
 * their prototype status visible in the UI.
 */

const PROTOTYPE_METRIC_LABEL = "PROTOTYPE DATA";

function formatMetricCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

/*
 * A real broker metric should only be rendered from a verified
 * account response. Missing broker data must remain unavailable,
 * not silently fall back to demo values.
 */

function formatBrokerMetric(
  value: number | undefined,
  source: MetricSource
): string {
  if (source !== "broker" || typeof value !== "number") {
    return "—";
  }

  if (!Number.isFinite(value)) {
    return "—";
  }

  return formatMetricCurrency(value);
}

/*
 * Use this small badge wherever mock P&L, mock balances, or sample
 * performance data appear.
 */

function PrototypeDataBadge() {
  return (
    <span className="aj-prototype-badge">
      <span aria-hidden="true" />
      Prototype · Not live account data
    </span>
  );
}

/*
 * Example of a clearly labeled prototype metric card.
 * Use this for demo values only; do not substitute it for a
 * real broker-account component.
 */

function PrototypeMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <section
      className="aj-panel aj-prototype-metric"
      aria-label={`${label}, prototype data`}
    >
      <div className="aj-prototype-metric-heading">
        <span>{label}</span>
        <PrototypeDataBadge />
      </div>

      <strong>{value}</strong>

      {detail ? <p>{detail}</p> : null}
    </section>
  );
}

/*
 * Add this CSS to the existing theme stylesheet.
 */

const ALGO_DATA_SOURCE_STYLES = `
.aj-workspace .aj-prototype-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  padding: 5px 7px;
  border: 1px solid var(--aj-border);
  border-radius: 6px;
  color: var(--aj-text-secondary);
  background: var(--aj-panel-muted);
  font-size: 9px;
  font-weight: 650;
  line-height: 1.3;
}

.aj-workspace .aj-prototype-badge > span {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--aj-warning);
}

.aj-workspace .aj-prototype-metric {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.aj-workspace .aj-prototype-metric-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--aj-text-secondary);
  font-size: 11px;
}

.aj-workspace .aj-prototype-metric > strong {
  color: var(--aj-text);
  font-size: 23px;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.aj-workspace .aj-prototype-metric > p {
  margin: 0;
  color: var(--aj-text-muted);
  font-size: 10px;
  line-height: 1.6;
}
`;
/*
 * STEP 4 — FINAL INTEGRATION CHECKLIST AND SAFE MERGE
 *
 * This part adds the final theme style combination and a small
 * reusable section heading for data-source clarity.
 *
 * Do not paste duplicate declarations if equivalent helpers already
 * exist in your file. Merge the new styles into your existing array.
 */

const ALGO_STEP4_STYLES = [
  ALGO_THEME_STYLES,
  ALGO_SIDEBAR_STYLES,
  ALGO_TOPBAR_STYLES,
  ALGO_RESPONSIVE_STYLES,
  ALGO_DATA_SOURCE_STYLES,
].join("\n");

function AlgoSectionHeading({
  title,
  subtitle,
  source,
}: {
  title: string;
  subtitle?: string;
  source?: "prototype" | "broker";
}) {
  return (
    <div className="aj-section-heading">
      <div className="aj-section-heading-copy">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {source === "prototype" ? <PrototypeDataBadge /> : null}

      {source === "broker" ? (
        <span className="aj-broker-data-badge">
          Broker data
        </span>
      ) : null}
    </div>
  );
}

const ALGO_SECTION_HEADING_STYLES = `
.aj-workspace .aj-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
  margin-bottom: 14px;
}

.aj-workspace .aj-section-heading-copy {
  min-width: 0;
}

.aj-workspace .aj-section-heading-copy h2 {
  margin: 0;
  color: var(--aj-text);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.aj-workspace .aj-section-heading-copy p {
  margin: 5px 0 0;
  color: var(--aj-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.aj-workspace .aj-broker-data-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid var(--aj-border);
  border-radius: 6px;
  color: var(--aj-text-secondary);
  background: var(--aj-panel);
  font-size: 9px;
  font-weight: 650;
}
`;

/*
 * FINAL MERGE NOTES
 *
 * 1. Keep only one declaration of Feed, setFeed, selectFeed,
 *    openTerminal, normalizeInstrument, and the search state.
 *
 * 2. Preserve the original API paths:
 *      /api/fyers/symbols/search?q=...
 *      /api/indstocks/symbols/search?q=...
 *
 * 3. Do not replace the existing search-result parser with a generic
 *    parser unless it matches the actual API response structure.
 *
 * 4. Do not overwrite the canonical instrument object with only
 *    symbol/name fields; retain the original broker metadata.
 *
 * 5. Do not label sample positions, mock P&L, or static strategy
 *    results as live account information.
 *
 * 6. Merge ALGO_STEP4_STYLES and ALGO_SECTION_HEADING_STYLES into
 *    the style string or stylesheet used by your actual component.
 *
 * 7. The shell's children must be the real existing JSX sections,
 *    not placeholder comments.
 *
 * 8. Check the original project for already-imported icons before
 *    adding imports. Add any missing icons from lucide-react.
 *
 * 9. Build and fix TypeScript errors before moving to the next step.
 */
 