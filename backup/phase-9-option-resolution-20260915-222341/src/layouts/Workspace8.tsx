/******************************************************************************
*  File:
*  Workspace8.tsx
* 
*  Path:
*  src/layouts/Workspace8.tsx.New
* 
*  Purpose:
*  Workspace8 is the top-level AJ runtime workspace controller.
*  
*  It is responsible for:
*  
* • chart layout management
* • chart configuration
* • scanner UI activation
* • debug UI activation
* • global logging UI activation
* • connecting the Logging checkbox to AJLoggingGate
* • rendering the chart workspace
* • rendering optional right-side diagnostic panels
* • 
* • It is not responsible for:
* • 
* • pipeline scoring
* • context calculation
* • AI/SMC logic
* • execution authority
* • state-machine logic
* • pipeline telemetry generation
* • deciding whether individual engines should log
* • modifying AJPipelineTrace
* • 
* • The architectural boundary is:
*
* Workspace8
*      │
*      ▼
* hartWindow
*     │
*     ├──────── RuntimeEngine
*     └──────── AJHost
*                 │
*                 ▼
*           AJIndicator
*                 │
*                 ▼
*        AJDecisionEngine
*                 │
*                 ▼
*       AJIndicatorResult
*                 │
*                 ▼
* hartEngine (renderer only)
* 
*                   Workspace8
*                       │
*         ┌─────────────┼─────────────┐
*         │             │             │
*         ▼             ▼             ▼
*      Scanner        Debug         Logging 
*    checkbox        checkbox      checkbox
*         │             │             │
*         ▼             ▼             ▼
*  ScannerPanel    DebugEngine   AJLoggingGate
*                                     │
*                                     ▼
*                            ┌────────┴────────┐
*                            │                 │
*                           OFF               ON
*                            │                 │
*                         no-op             Console
* ==============================================================							  
* 
*                        AJ Runtime
*                            │
*                            ▼
*                   ┌─────────────────┐
*                   │  ContextEngine  │
*                   └────────┬────────┘
*                            │
*                            │ AJPipelineTrace.stage()
*                            ▼
*                   ┌─────────────────┐
*                   │   ScoreEngine   │
*                   └────────┬────────┘
*                            │
*                            │ AJPipelineTrace.update()
*                            ▼
*                   ┌─────────────────┐
*                   │    AI / SMC     │
*                   └────────┬────────┘
*                            │
*                            ▼
*                   ┌────────────────────┐
*                   │  AJPipelineTrace   │
*                   │                    │
*                   │ CURRENT CACHE      │
*                   │        +           │
*                   │ HISTORY            │
*                   └─────────┬──────────┘
*                             │
*               ┌─────────────┼─────────────┐
*               │             │             │
*               ▼             ▼             ▼
*            Debug        Dashboard       Chart
*            Panel
*****************************************************************************/
import { useState, useEffect } from "react";
import { ActiveChartStore } from "../store/ActiveChartStore";
import { AJDashboardAdapter } from "@/dashboard/AJDashboardAdapter";
import IndicatorSettingsPanel from "../components/IndicatorSettingsPanel";
import SymbolSelector from "../components/SymbolSelector";
import DataSourceSelector from "../components/DataSourceSelector";
import TimeframeSelector from "../components/TimeframeSelector";
import ChartIndicatorMenu from "../components/ChartIndicatorMenu";
import ChartStyleSelector, {type ChartStyle} from "../components/ChartStyleSelector";
import AIActionsMenu from "../components/AIActionsMenu";
import ThemeToggle from "../components/ThemeToggle";
import ChartWindow from "../components/ChartWindow";
import ScannerPanel from "../components/ScannerPanel";
import WatchlistPanel from "../components/WatchlistPanel";
import { WatchlistStore } from "../store/WatchlistStore";
import AJDebugOverlay from "@/indicators/AJIndicator/debug/AJDebugOverlay";
import AJAdvisoryPanel from "@/indicators/AJIndicator/debug/AJAdvisoryPanel";
import { DebugEngine } from "../debug/DebugEngine";
import { WorkspaceStore } from "../store/WorkspaceStore";
import type { ChartConfig, ChartIndicators } from "../types/ChartConfig";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";

//============================================================================

const WATCHLIST_STORAGE_KEY = "ajWatchlists";

interface WatchlistItem {
  symbol: string;
  displayName?: string;
  exchange?: string;
  type?: string;
  feedSource?: string;
  yahooSymbol?: string | null;
  expiry?: string;
  strike?: number;
  optionType?: string;
  underlying?: string;
}

type Watchlists = WatchlistItem[][];

function loadWatchlists(): Watchlists {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);

    if (!raw) {
      return [[], [], [], []];
    }

    const parsed = JSON.parse(raw);

    if (
      Array.isArray(parsed) &&
      parsed.length === 4 &&
      parsed.every(Array.isArray)
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }

  return [[], [], [], []];
}

function IconButton({
  icon,
  title,
  active = false,
  onClick
}: {
  icon: string;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        minWidth: 30,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "var(--accent-bg)" : "transparent",
        border: active
          ? "1px solid var(--success)"
          : "1px solid transparent",
        borderRadius: 4,
        color: active ? "var(--success-text)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 17,
        lineHeight: 1,
        flexShrink: 0
      }}
    >
      {icon}
    </button>
  );
}

export default function Workspace8() {
  const savedWorkspace = WorkspaceStore.load();

  const defaultIndicators: ChartIndicators = {
    ema: true,
    vwap: true,
    rsi: false,
    atr: false,
    adx: false,
    ajindicator: false
  };

const defaultCharts: ChartConfig[] = [
  {
    id: 1,
    symbol: "NIFTY",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 2,
    symbol: "BANKNIFTY",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 3,
    symbol: "BTCUSDT",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 4,
    symbol: "ETHUSDT",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 5,
    symbol: "SENSEX",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 6,
    symbol: "USDINR",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 7,
    symbol: "XAUUSD",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  },

  {
    id: 8,
    symbol: "RELIANCE",
    timeframe: "1m",
    datasource: "Yahoo",
    chartStyle: "candles",
    indicators: { ...defaultIndicators }
  }
];

  const [layout, setLayout] = useState(
    savedWorkspace?.layout ?? 8
  );

  const [charts, setCharts] = useState<ChartConfig[]>(
    savedWorkspace?.charts ?? defaultCharts
  );

  const [activeChartId, setActiveChartId] =
    useState<number>(
      savedWorkspace?.charts?.[0]?.id ??
      defaultCharts[0].id
    );

  const activeChart =
    charts.find(chart => chart.id === activeChartId) ??
    charts[0];

  const [
    showIndicatorSettings,
    setShowIndicatorSettings
  ] = useState(false);

  const [
    selectedIndicator,
    setSelectedIndicator
  ] = useState<keyof ChartIndicators>("ajindicator");

  const [
    expandedChartId,
    setExpandedChartId
  ] = useState<number | null>(null);

  const [
    scannerEnabled,
    setScannerEnabled
  ] = useState(false);

  const [
    watchlistEnabled,
    setWatchlistEnabled
  ] = useState(false);

  const [
    debugEnabled,
    setDebugEnabled
  ] = useState(
    DebugEngine.isEnabled()
  );

  const [
    loggingEnabled,
    setLoggingEnabled
  ] = useState(
    AJLoggingGate.isEnabled()
  );

  const [
    ,
    setWatchlists
  ] = useState<Watchlists>(
    loadWatchlists
  );

  useEffect(() => {
    const exists = charts.some(
      chart => chart.id === activeChartId
    );

    if (!exists && charts.length > 0) {
      activateChart(charts[0].id);
    }
  }, [charts, activeChartId]);

  useEffect(() => {
    if (activeChart) {
      activateChart(activeChart.id);
    }
  }, []);

  useEffect(() => {
    WorkspaceStore.save({
      layout,
      charts
    });
  }, [layout, charts]);

  useEffect(() => {
    function onWatchlistUpdate(event: Event) {
      const customEvent =
        event as CustomEvent<Watchlists>;

      if (Array.isArray(customEvent.detail)) {
        setWatchlists(
          customEvent.detail
        );
      }
    }

    window.addEventListener(
      "aj:watchlist:update",
      onWatchlistUpdate
    );

    return () => {
      window.removeEventListener(
        "aj:watchlist:update",
        onWatchlistUpdate
      );
    };
  }, []);

  function activateChart(id: number) {
    setActiveChartId(id);

    const chartId = String(id);

    ActiveChartStore.setActiveChart(chartId);
    DebugEngine.setActiveChart(chartId);
    AJDashboardAdapter.setActiveChart(chartId);
  }

  function updateChartIndicators(
    id: number,
    indicators: ChartIndicators
  ) {
    setCharts(prev =>
      prev.map(chart =>
        chart.id === id
          ? {
              ...chart,
              indicators
            }
          : chart
      )
    );
  }

  function updateSymbol(
    id: number,
    symbol: string,
    yahooSymbol?: string,
    displayName?: string
  ) {
    setCharts(prev =>
      prev.map(chart =>
        chart.id === id
          ? {
              ...chart,
              symbol,
              yahooSymbol,
              displayName
            }
          : chart
      )
    );
  }

  function updateTimeframe(
    id: number,
    timeframe: string
  ) {
    setCharts(prev =>
      prev.map(chart =>
        chart.id === id
          ? {
              ...chart,
              timeframe
            }
          : chart
      )
    );
  }

  function updateDatasource(
    id: number,
    datasource: string
  ) {
    setCharts(prev =>
      prev.map(chart =>
        chart.id === id
          ? {
              ...chart,
              datasource
            }
          : chart
      )
    );
  }
 

//======================================
// UPDATE CHART STYLE
//======================================

function updateChartStyle(
  id: number,
  chartStyle: ChartStyle
) {

  setCharts(prev =>
    prev.map(chart =>
      chart.id === id
        ? {
            ...chart,
            chartStyle
          }
        : chart
    )
  );

}

//======================================
// UPDATE CANDLE COLORS
//======================================

function updateCandleColors(
  id: number,
  candleColors: NonNullable<ChartConfig["candleColors"]>
) {

  setCharts(prev =>
    prev.map(chart =>
      chart.id === id
        ? {
            ...chart,
            candleColors
          }
        : chart
    )
  );

}

  function scannerOpenSymbol(symbol: string) {
    if (!activeChart) {
      return;
    }

    updateSymbol(
      activeChart.id,
      symbol
    );
  }

  function watchlistOpenSymbol(
  item: WatchlistItem | string
  ) {
  if (!activeChart) {
	  return;
  }
  
  if (typeof item === "string") {
	  updateSymbol(
	  activeChart.id,
	  item,
	  undefined,
	  item
	  );
	  return;
  }
  
  updateSymbol(
	  activeChart.id,
	  item.symbol,
	  item.yahooSymbol ?? undefined,
	  item.displayName || item.symbol
  );
  }

  function toggleExpand(id: number) {
    setExpandedChartId(
      previous =>
        previous === id
          ? null
          : id
    );
  }

  function addToWatchlist(
    item: WatchlistItem,
    tabIndex: number
  ) {
    if (
      tabIndex < 0 ||
      tabIndex > 3 ||
      !item.symbol
    ) {
      return;
    }

    const normalized =
      item.symbol
        .trim()
        .toUpperCase();

    // WatchlistPanel reads exclusively from the WatchlistStore
    // singleton (src/store/WatchlistStore.ts) - it does NOT read
    // this component's local state or its own localStorage writes.
    // Writing here through the real store is what actually makes
    // an added symbol show up in the panel.
	
    WatchlistStore.add(tabIndex, {
      ...item,
      symbol: normalized,
      displayName: item.displayName || normalized,
      exchange: item.exchange ?? "",
      type: item.type ?? "",
      feedSource: item.feedSource ?? "",
      yahooSymbol: item.yahooSymbol ?? undefined
    });

    setWatchlistEnabled(true);
  }

  const gridColumns =
    layout === 1 ? 1 :
    layout === 2 ? 2 :
    layout === 4 ? 2 :
    layout === 6 ? 3 :
    layout === 8 ? 4 :
    layout === 9 ? 3 :
    layout === 12 ? 4 :
    layout === 16 ? 4 :
    4;

  const gridRows =
    Math.ceil(
      layout / gridColumns
    );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)"
      }}
    >
		{/*================================================
					GLOBAL CHART TOOLBAR
		================================================*/}

      <div
        style={{
          height: 42,
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 8px",
          background: "var(--bg-toolbar)",
          borderBottom: "1px solid var(--border-primary)",
          overflow: "visible",
          position: "relative",
          zIndex: 10000
        }}
      >
	  	{/*================================================
		              ACTIVE CHART CONTROLS
		================================================*/}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            minWidth: 0,
            flex: 1
          }}
        >
          {activeChart && (
            <>
              <SymbolSelector
                value={activeChart.symbol}
                displayName={activeChart.displayName}
                datasource={activeChart.datasource}
                onChange={(
                  symbol,
                  yahooSymbol,
                  displayName
                ) =>
                  updateSymbol(
                    activeChart.id,
                    symbol,
                    yahooSymbol,
                    displayName
                  )
                }
                onAddToWatchlist={(
                  result,
                  tabIndex
                ) =>
                  addToWatchlist(
                    result,
                    tabIndex
                  )
                }
              />

              <span
                title={`${activeChart.datasource} feed`}
                style={{
                  fontSize: 12,
                  lineHeight: 1,
                  flexShrink: 0
                }}
              >
                🟢
              </span>

              <DataSourceSelector
                datasource={
                  activeChart.datasource
                }
                onChange={datasource =>
                  updateDatasource(
                    activeChart.id,
                    datasource
                  )
                }
              />

              <TimeframeSelector
                value={
                  activeChart.timeframe
                }
                onChange={timeframe =>
                  updateTimeframe(
                    activeChart.id,
                    timeframe
                  )
                }
              />

				<ChartIndicatorMenu
				indicators={
					activeChart.indicators
				}
				onChange={indicators =>
					updateChartIndicators(
					activeChart.id,
					indicators
					)
				}
				onSettings={indicator => {
				
					setSelectedIndicator(
					indicator
					);
				
					setShowIndicatorSettings(
					true
					);
				
				}}
				/>
				
				<ThemeToggle />
				
				<ChartStyleSelector
				value={
					activeChart.chartStyle ??
					"candles"
				}
				onChange={style =>
					updateChartStyle(
					activeChart.id,
					style
					)
				}
				/>
				
				{/*===================
						EXPAND CHART
				======================*/}
				
				<button
					type="button"
					onClick={() =>
					toggleExpand(
						activeChart.id
					)
					}
					title={
					expandedChartId ===
					activeChart.id
						? "Restore chart"
						: "Expand chart"
					}
					aria-label={
					expandedChartId ===
					activeChart.id
						? "Restore chart"
						: "Expand chart"
					}
					style={{
						width: 32,
						height: 32,
						minWidth: 32,
						padding: 0,
		
						background:
							"transparent",
		
						border:
							"1px solid transparent",
		
						borderRadius: 4,
		
						color:
							"#f2f2f2",
		
						cursor:
							"pointer",
		
						fontSize: 22,
		
						fontWeight: 900,
		
						lineHeight: 1,
		
						display:
							"inline-flex",
		
						alignItems:
							"center",
		
						justifyContent:
							"center",
		
						flexShrink: 0,
		
						opacity: 1,
		
						textShadow:
							"0 0 1px #ffffff, 0 0 2px rgba(255,255,255,0.45)",
		
						WebkitFontSmoothing:
							"antialiased"
					}}
              >
                {
                  expandedChartId ===
                  activeChart.id
                    ? "🗗"
                    : "⛶"
                }
              </button>
			  <AIActionsMenu />
            </>
          )}
        </div>
		
		{/*================================================
			          GLOBAL ICON TOOLBAR 
		================================================*/}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
            color: "var(--text-primary)",
            opacity: 1
          }}
        >

          {/*----------------------------------------------
              CHART LAYOUT
          ----------------------------------------------*/}

          <IconButton
            icon="▦"
            title={`Chart layout: ${layout}`}
            active={true}
            onClick={() => {

              const layouts = [
                1,
                2,
                4,
                6,
              ];

              const index =
                layouts.indexOf(
                  layout
                );

              setLayout(
                layouts[
                  (index + 1) %
                  layouts.length
                ]
              );

            }}
          />

          {/*----------------------------------------------
              SCANNER
          ----------------------------------------------*/}

          <IconButton
            icon="⌕"
            title={
              scannerEnabled
                ? "Disable scanner"
                : "Enable scanner"
            }
            active={
              scannerEnabled
            }
            onClick={() =>
              setScannerEnabled(
                value =>
                  !value
              )
            }
          />

          {/*----------------------------------------------
              DEBUG
          ----------------------------------------------*/}

          <IconButton
            icon="🐞"
            title={
              debugEnabled
                ? "Disable debug"
                : "Enable debug"
            }
            active={
              debugEnabled
            }
            onClick={() => {

              const next =
                !debugEnabled;

              setDebugEnabled(
                next
              );

              DebugEngine.setEnabled(
                next
              );

            }}
          />

          {/*----------------------------------------------
              LOGGING
          ----------------------------------------------*/}

          <IconButton
            icon="≋"
            title={
              loggingEnabled
                ? "Disable logging"
                : "Enable logging"
            }
            active={
              loggingEnabled
            }
            onClick={() => {

              const next =
                AJLoggingGate.toggle();

              setLoggingEnabled(
                next
              );

            }}
          />

          {/*----------------------------------------------
              WATCHLIST
          ----------------------------------------------*/}

          <IconButton
            icon="★"
            title={
              watchlistEnabled
                ? "Hide watchlist"
                : "Show watchlist"
            }
            active={
              watchlistEnabled
            }
            onClick={() =>
              setWatchlistEnabled(
                value =>
                  !value
              )
            }
          />

        </div>

      </div>
	  
	  {/*================================================
							WORKSPACE
		================================================*/}
		
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0
        }}
      >
	  	{/*================================================
							CHART AREA 
		================================================*/}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            width: 0,
            display: "grid",
            gridTemplateColumns:
              expandedChartId === null
                ? `repeat(${gridColumns}, minmax(0,1fr))`
                : "1fr",
            gridTemplateRows:
              expandedChartId === null
                ? `repeat(${gridRows}, minmax(0,1fr))`
                : "1fr",
            gap: 3,
            overflow: "hidden",
            alignItems: "stretch",
            justifyItems: "stretch"
          }}
        >
          {(expandedChartId === null
            ? charts.slice(
                0,
                layout
              )
            : charts.filter(
                chart =>
                  chart.id ===
                  expandedChartId
              )
          ).map(chart => (
            <ChartWindow
              key={chart.id}
              chartId={String(
                chart.id
              )}
              symbol={chart.symbol}
              displayName={chart.displayName}
              yahooSymbol={chart.yahooSymbol}
              datasource={chart.datasource}
              timeframe={chart.timeframe}
              indicators={chart.indicators}
              isActive={
                activeChartId ===
                chart.id
              }
              onActivate={() =>
                activateChart(
                  chart.id
                )
              }
              candleColors={chart.candleColors}
              onCandleColorsChange={colors =>
                updateCandleColors(
                  chart.id,
                  colors
                )
              }
            />
          ))}
        </div>

        {activeChart &&
          showIndicatorSettings && (
            <IndicatorSettingsPanel
              chartId={String(
                activeChart.id
              )}
              indicator={
                selectedIndicator
              }
              onClose={() =>
                setShowIndicatorSettings(
                  false
                )
              }
            />
          )}
		  
		{/*================================================
				RIGHT INFORMATION PANEL
		================================================*/}

        {(scannerEnabled ||
          debugEnabled ||
          watchlistEnabled) && (
          <div
            style={{
              width: 380,
              minWidth: 380,
              flexShrink: 0,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderLeft:
                "1px solid var(--border-primary)",
              background: "var(--bg-panel)"
            }}
          >
            {debugEnabled && (
              <>
                <AJDebugOverlay />
                <AJAdvisoryPanel
				 onOptionFocus={watchlistOpenSymbol}
				/>
              </>
            )}

            {scannerEnabled && (
              <ScannerPanel
                onSelectSymbol={
                  scannerOpenSymbol
                }
              />
            )}

            {watchlistEnabled && (
              <WatchlistPanel
                onSelectSymbol={
                  watchlistOpenSymbol
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}