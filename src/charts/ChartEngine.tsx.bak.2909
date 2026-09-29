/**************************************************************************************************
// 
// - File:
// - ChartEngine.tsx
// -
// - Purpose:
// - Pure rendering layer for the AJ v2 chart.
// -
// - Responsibility:
// - Render candles, selected overlays, AJ markers, price lines, institutional zones, and dashboard.
// -
// - AJ v2 Flow:
// - ChartWindow â†’ RuntimeEngine â†’ AJHost â†’ hostResult â†’ ChartEngine.
// -
// - ChartEngine receives:
// - candles, indicators, chartId, timeframe, and hostResult.
// -
// - ChartEngine uses:
// - OverlayManager for EMA/VWAP calculations and InstitutionalZonePrimitive for zone rendering.
// -
// - AJ Institutional rendering occurs only when:
// - indicators.ajindicator === true.
// -
// - ChartEngine DOES NOT:
// - Execute AJHost, RuntimeEngine, AJIndicator, trading logic, state machine, or business decisions.
// -
// - Final Rule:
// - AJ Engines decide â†’ RuntimeEngine processes â†’ AJHost adapts â†’ ChartWindow orchestrates â†’ ChartEngine renders.
// /**************************************************************************************************
// 
// - AJ v2 ARCHITECTURE:
// -
// - ChartWindow
// -      â”‚
// -      â”œâ”€â”€ Candle Lifecycle
// -      â”œâ”€â”€ RuntimeContext
// -      â”‚
// -      â–¼
// - RuntimeEngine
// -      â”‚
// -      â–¼
// - RuntimeResult
// -      â”‚
// -      â–¼
// - AJHost
// -      â”‚
// -      â–¼
// - AJIndicator
// -      â”‚
// -      â–¼
// - AJDecisionEngine
// -      â”‚
// -      â”œâ”€â”€ Context
// -      â”œâ”€â”€ Market State
// -      â”œâ”€â”€ Order Flow
// -      â”œâ”€â”€ Market Structure
// -      â”œâ”€â”€ Liquidity
// -      â”œâ”€â”€ Order Block
// -      â”œâ”€â”€ Trend
// -      â”œâ”€â”€ Price Action
// -      â”œâ”€â”€ Momentum
// -      â”œâ”€â”€ Volatility
// -      â”œâ”€â”€ Multi-Timeframe
// -      â”œâ”€â”€ Risk
// -      â”œâ”€â”€ Confidence
// -      â”œâ”€â”€ Authority
// -      â”œâ”€â”€ State Machine
// -      â””â”€â”€ Execution
// -      â”‚
// -      â–¼
// - AJIndicatorResult
// -      â”‚
// -      â–¼
// - AJHost Output
// -      â”‚
// -      â–¼
// - ChartEngine
// -      â”‚
// -      â”œâ”€â”€ Candles
// -      â”œâ”€â”€ EMA / VWAP
// -      â”œâ”€â”€ Markers
// -      â”œâ”€â”€ Entry / SL / TP
// -      â”œâ”€â”€ Demand / Supply
// -      â”œâ”€â”€ FVG / Liquidity
// -      â””â”€â”€ Institutional Dashboard
// -      â”‚
// -      â–¼
// - Lightweight Charts
// -
// - AJ v2 OWNERSHIP:
// - Market Data
// - ChartWindow â†’ Runtime Lifecycle & Orchestration
// - RuntimeEngine â†’ Runtime Processing
// - AJIndicator â†’ Public AJ Facade
// - AJDecisionEngine â†’ Institutional Pipeline
// - AJ Engines â†’ Business Logic
// - AJRuntimeParameters â†’ Runtime Thresholds
// - AJHost â†’ AJ Runtime/Renderer Adapter
// - ChartEngine â†’ Visualization Only
// -
// - FINAL RULE:
// - Engines decide â†’ Runtime processes â†’ AJHost adapts â†’ ChartWindow orchestrates
// - â†’ ChartEngine renders â†’ Lightweight Charts displays.
// 
//**************************************************************************************************/

import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    createChart,
    CandlestickSeries,
    LineSeries,
    createSeriesMarkers
} from "lightweight-charts";

import type {
    IChartApi,
    ISeriesApi,
    IPriceLine,
    UTCTimestamp
} from "lightweight-charts";

import type { Candle } from "../types/Candle";
import type { ChartIndicators } from "../types/ChartConfig";
import { OverlayManager } from "./OverlayManager";
import { InstitutionalZonePrimitive } from "./primitives/InstitutionalZonePrimitive";
import { TradeLevelRenderer } from "./TradeLevelRenderer";
import { ActiveChartStore } from "../store/ActiveChartStore";
import { DebugEngine } from "../debug/DebugEngine";
import { AJDashboardAdapter } from "@/dashboard/AJDashboardAdapter";
import { DashboardFormatter } from "@/dashboard/DashboardFormatter";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
import { RuntimeParameters } from "@/runtime/config/RuntimeParameters";
import { useTheme } from "@/theme/ThemeContext";
import ChartSettingsPanel from "../components/ChartSettingsPanel";

//========================================================
const CHART_THEME_COLORS: Record<"dark" | "light", {
    background: string;
    text: string;
    grid: string;
    border: string;
}> = {
    dark: {
        background: "#0b0b0b",
        text: "#bdbdbd",
        grid: "#202020",
        border: "#2b2b2b"
    },
    light: {
        background: "#ffffff",
        text: "#4f5963",
        grid: "#e4e8ec",
        border: "#c7cdd4"
    }
};

//======================================================
// LIGHTWEIGHT CHART LINE-DATA NORMALIZER
//
// All LineSeries data must be:
// - valid
// - unique by timestamp
// - ascending by timestamp
//
// Candle data has its own normalizer below. Overlay
// series must also be normalized because they are built
// from the raw candle array.
//======================================================

function normalizeLineData(
    points: any[]
): any[] {

    const toEpochSeconds = (
        raw: unknown
    ): number | null => {

        if (raw == null) {
            return null;
        }

        const num =
            typeof raw === "number"
                ? raw
                : Number(raw);

        if (Number.isFinite(num)) {
            return num > 1e12
                ? Math.floor(num / 1000)
                : Math.floor(num);
        }

        if (typeof raw === "string") {

            const parsed =
                Date.parse(raw);

            if (Number.isFinite(parsed)) {
                return Math.floor(
                    parsed / 1000
                );
            }

        }

        return null;

    };

    const normalized =
        points
            .map((point: any) => {

                const time =
                    toEpochSeconds(
                        point?.time
                    );

                const value =
                    Number(point?.value);

                if (
                    time == null ||
                    !Number.isFinite(value)
                ) {
                    return null;
                }

                return [
                    time,
                    {
                        time:
                            time as UTCTimestamp,
                        value
                    }
                ] as const;

            })
            .filter(
                (
                    entry
                ): entry is readonly [
                    number,
                    any
                ] =>
                    entry !== null
            );

    return Array.from(
        new Map(normalized)
            .values()
    ).sort(
        (a, b) =>
            Number(a.time) -
            Number(b.time)
    );

}

//======================================================
// ZONE TOOLTIP TEXT
//
// Plain-English explanation shown on hover only - never
// drawn on the canvas, so it never clutters the chart.
//======================================================

function getZoneTooltip(zone: any): string {

    const label =
        (zone.label ?? "").toLowerCase();

    const isBear =
        label.includes("bear");

    switch (zone.type) {

        case "fvg":
            return isBear
                ? "Bearish Fair Value Gap - price left an imbalance here. It may pull back up to fill this gap before continuing lower."
                : "Bullish Fair Value Gap - price left an imbalance here. It may pull back down to fill this gap before continuing higher.";

        case "orderBlock":
            return isBear
                ? "Resistance Order Block (Bearish OB) - Supply zone. The last up-candle before a strong down-move; sellers likely entered here, and price may react lower on a retest."
                : "Support Order Block (Bullish OB) - Demand zone. The last down-candle before a strong up-move; buyers likely entered here, and price may react higher on a retest.";

        case "liquidity":
            return "Liquidity zone - stop-losses are likely clustered here. Expect a sharp wick to sweep this level before the real move starts.";

        case "demand":
            return "Demand zone - buyers stepped in here before. Watch for a bounce if price returns to this area.";

        case "supply":
            return "Supply zone - sellers stepped in here before. Watch for a rejection if price returns to this area.";

        case "target":
            return "Target zone - the projected take-profit area for the current trade plan.";

        case "neutral":
            return "Neutral zone - recent trading range with no clear directional edge.";

        default:
            return zone.label ?? "Institutional zone";

    }

}

//======================================================
// Renderer Input
//======================================================

export interface ChartEngineProps {

    chartId:string;
    candles:Candle[];
    symbol:string;
    timeframe:string;
    indicators:ChartIndicators;
    hostResult:any;

    candleColors?: {
        upColor: string;
        downColor: string;
        borderUpColor: string;
        borderDownColor: string;
        wickUpColor: string;
        wickDownColor: string;
    };

    onCandleColorsChange?: (colors: {
        upColor: string;
        downColor: string;
        borderUpColor: string;
        borderDownColor: string;
        wickUpColor: string;
        wickDownColor: string;
    }) => void;
}


//======================================================

export default function ChartEngine({

    chartId,
    candles,
    timeframe,
    indicators,
    hostResult,
    candleColors,
    onCandleColorsChange

}: ChartEngineProps) {
	
	//--------------------------------------------------
    // CANDLE COUNTDOWN
    //--------------------------------------------------

    const [countdown, setCountdown] =
        useState("00:00");

    const { theme } =
        useTheme();

    const [showChartSettings, setShowChartSettings] =
        useState(false);

    const resolvedCandleColors =
        candleColors ?? {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderUpColor: "#26a69a",
            borderDownColor: "#ef5350",
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350"
        };

    const [hoverTooltip, setHoverTooltip] =
        useState<{ x: number; y: number; text: string } | null>(null);

    const zonesForHoverRef =
        useRef<any[]>([]);

    //--------------------------------------------------
    // CHART
    //--------------------------------------------------

    const chartRef =
        useRef<HTMLDivElement>(null);

    const chart =
        useRef<IChartApi | null>(null);

    //--------------------------------------------------
    // SERIES
    //--------------------------------------------------

    const candleSeries =
        useRef<ISeriesApi<"Candlestick"> | null>(null);

    const emaSeries =
        useRef<ISeriesApi<"Line"> | null>(null);

    const vwapSeries =
        useRef<ISeriesApi<"Line"> | null>(null);

    const rsiSeries =
        useRef<ISeriesApi<"Line"> | null>(null);

    const atrSeries =
        useRef<ISeriesApi<"Line"> | null>(null);

    const adxSeries =
        useRef<ISeriesApi<"Line"> | null>(null);

    //--------------------------------------------------
    // PRICE LINE CACHE
    //--------------------------------------------------

    const nativePriceLines =
        useRef<IPriceLine[]>([]);

    //--------------------------------------------------
    // DIFF CACHE
    //--------------------------------------------------

    const previousMarkers =
        useRef("");

    const previousPriceLines =
        useRef("");

    const previousDemand =
        useRef("");

    const previousSupply =
        useRef("");

    const previousTarget =
        useRef("");

    const previousNeutral =
        useRef("");

    const previousFVG =
        useRef("");

    const previousLiquidity =
        useRef("");

    const previousOrderBlock =
        useRef("");

    //--------------------------------------------------
    // INITIAL VIEW ONLY
    //--------------------------------------------------

    const initialFitDone =
        useRef(false);
	
    //--------------------------------------------------
    // INSTITUTIONAL PRIMITIVES
    //--------------------------------------------------

    const demandPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);

    const supplyPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);

    const targetPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);

    const neutralPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);

    const fvgPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);

    const liquidityPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);

    const orderBlockPrimitive =
        useRef<InstitutionalZonePrimitive | null>(null);
//--------------------------------------------------
    // HOST PAYLOAD
    //--------------------------------------------------
    
    const markers =
        hostResult?.markers ?? [];
    
    //--------------------------------------------------
    // REMOVE UNUSED VALUES
    //--------------------------------------------------
    
    // stats and signals are intentionally not required by
    // the renderer. Rendering is driven by markers,
    // price lines and runtime panel only.
    
    //--------------------------------------------------
    // TRADE LEVELS
    // ENTRY / SL / TP Renderer
    //--------------------------------------------------

    const priceLines =
        indicators.ajindicator
            ?
            TradeLevelRenderer.build({
                entryPrice: hostResult?.runtimePanel?.entryPrice,
                stopLoss: hostResult?.runtimePanel?.stopLoss,
                tp1: hostResult?.runtimePanel?.tp1,
                tp2: hostResult?.runtimePanel?.tp2,
                tp3: hostResult?.runtimePanel?.tp3,
                executionAllowed:
                    hostResult?.runtimePanel?.executionAllowed
            }).levels
            :
            [];

    //--------------------------------------------------
    // ZONE DECLUTTER
    //
    // Keep only the single most recent, still-unmitigated
    // zone per category. A zone counts as mitigated once
    // the latest close has traded through its range -
    // at that point it has already done its job and just
    // adds visual noise if left on screen.
    //--------------------------------------------------

    const latestClose =
        candles.length > 0
            ? Number(candles[candles.length - 1].close)
            : null;

    function isMitigated(zone: any): boolean {

        if (
            latestClose == null ||
            !Number.isFinite(latestClose)
        ) {
            return false;
        }

        return (
            latestClose <= zone.high &&
            latestClose >= zone.low
        );
    }

    function latestUnmitigated(zones: any[]): any[] {

        const valid =
            zones.filter(
                (z: any) =>
                    z &&
                    z.low != null &&
                    z.high != null &&
                    !isMitigated(z)
            );

        return valid.length > 0
            ? [valid[valid.length - 1]]
            : [];
    }
	
    //--------------------------------------------------
    // SMC ZONES
    //
    // RV-28
    // showZones was set on RuntimeParameters.forChart(chartId) by
    // AJSettingsBridge.apply(), but ChartEngine never read it â€” the
    // checkbox was fully wired up to a value nothing consumed. Read
    // it live here so toggling the setting actually shows/hides
    // zones.
    //--------------------------------------------------

    const zonesEnabled =
        indicators.ajindicator &&
        RuntimeParameters.forChart(chartId).showZones;

    const demandZones =
        zonesEnabled
            ? latestUnmitigated(hostResult?.demandZones ?? [])
            : [];
    const supplyZones =
        zonesEnabled
            ? latestUnmitigated(hostResult?.supplyZones ?? [])
            : [];
    const targetZones =
        zonesEnabled
            ? hostResult?.targetZones ?? []
            : [];
    const neutralZones =
        zonesEnabled
            ? hostResult?.neutralZones ?? []
            : [];
    const fvgZones =
        zonesEnabled
            ? latestUnmitigated(hostResult?.fvgZones ?? [])
            : [];
    const liquidityZones =
        zonesEnabled
            ? latestUnmitigated(hostResult?.liquidityZones ?? [])
            : [];

	const orderBlockZones =
		zonesEnabled
			? latestUnmitigated(
				(
					hostResult?.orderBlockZones ??
					hostResult?.orderBlocks ??
					[]
				)
					.filter(
						(z: any) =>
							z &&
							z.low != null &&
							z.high != null
					)
					.map(
						(z: any) => ({
							...z,
							type: "orderBlock"
						})
					)
			)
			: [];

    useEffect(() => {

        zonesForHoverRef.current = [
            ...demandZones,
            ...supplyZones,
            ...fvgZones,
            ...liquidityZones,
            ...orderBlockZones
        ];

    }, [
        demandZones,
        supplyZones,
        fvgZones,
        liquidityZones,
        orderBlockZones
    ]);

    const runtimePanel =
        indicators.ajindicator
            ? hostResult?.runtimePanel
            : null;

    const dashboardView =
        runtimePanel
            ? DashboardFormatter.format(runtimePanel)
            : null;

    const isActive =
    
        ActiveChartStore.getActiveChart()
        ===
        chartId;

    //--------------------------------------------------
    // ACTIVE CHART OWNER
    //--------------------------------------------------
    
    const activateChart = () => {
    
        ActiveChartStore.setActiveChart(
            chartId
        );
    
        DebugEngine.setActiveChart(
            chartId
        );
    
        AJDashboardAdapter.setActiveChart(
            chartId
        );
    
        //--------------------------------------------------
        // Immediately refresh debug/dashboard ownership
        //--------------------------------------------------
    
        if (runtimePanel) {
    
            DebugEngine.update(
    
                chartId,
    
                runtimePanel
    
            );
    
        }
    
    };

    //--------------------------------------------------
    // CREATE CHART
    //--------------------------------------------------

    useEffect(() => {

        if (!chartRef.current) {
            return;
        }

        const chartColors =
            CHART_THEME_COLORS[theme];

        const chartBg = chartColors.background;
        const chartText = chartColors.text;
        const chartGrid = chartColors.grid;
        const chartBorder = chartColors.border;

        chart.current =
            createChart(
                chartRef.current,
                {

                    width:
                        chartRef.current.clientWidth,

                    height:
                        chartRef.current.clientHeight,

                    layout: {

                        background: {

                            color: chartBg

                        },

                        textColor: chartText

                    },

                    grid: {

                        vertLines: {

                            color: chartGrid

                        },

                        horzLines: {

                            color: chartGrid

                        }

                    },

                    rightPriceScale: {

                        borderColor: chartBorder

                    },

                    timeScale: {
                        borderColor:chartBorder,
                        timeVisible:true,
                        secondsVisible:false,
                        rightOffset:8,
                        fixLeftEdge:false,
                        fixRightEdge:false,
                        lockVisibleTimeRangeOnResize:true
                    },

                    localization:{

                        locale:"en-IN",

                        timeFormatter:(time:number)=>{

                            return new Intl.DateTimeFormat(

                                "en-IN",

                                {

                                    timeZone:"Asia/Kolkata",

                                    year:"numeric",

                                    month:"2-digit",

                                    day:"2-digit",

                                    hour:"2-digit",

                                    minute:"2-digit",

                                    hour12:false

                                }

                            ).format(

                                new Date(time*1000)

                            );

                        }

                    }

                }

            );
			
        chart.current.subscribeClick(() => {
        
            activateChart();
        
        });
        
        //--------------------------------------------------
        // Crosshair movement must never change
        // active chart ownership.
        //--------------------------------------------------

        chart.current.subscribeCrosshairMove((param: any) => {

            if (
                !param.point ||
                !candleSeries.current ||
                !chart.current
            ) {
                setHoverTooltip(null);
                return;
            }

            const price =
                candleSeries.current.coordinateToPrice(
                    param.point.y
                );

            const time =
                param.time;

            if (
                price == null ||
                time == null
            ) {
                setHoverTooltip(null);
                return;
            }

            const t =
                Number(time);

            const hovered =
                zonesForHoverRef.current.find(
                    (zone: any) => {

                        const from =
                            Number(zone.from);

                        const to =
                            Number(zone.to);

                        return (
                            t >= Math.min(from, to) &&
                            t <= Math.max(from, to) &&
                            price <= zone.high &&
                            price >= zone.low
                        );

                    }
                );

            setHoverTooltip(
                hovered
                    ? {
                        x: param.point.x,
                        y: param.point.y,
                        text: getZoneTooltip(hovered)
                    }
                    : null
            );

        });
        
                candleSeries.current =
                    chart.current.addSeries(
                        CandlestickSeries,
                        {
                            upColor: resolvedCandleColors.upColor,
                            downColor: resolvedCandleColors.downColor,
                            borderUpColor: resolvedCandleColors.borderUpColor,
                            borderDownColor: resolvedCandleColors.borderDownColor,
                            wickUpColor: resolvedCandleColors.wickUpColor,
                            wickDownColor: resolvedCandleColors.wickDownColor
                        }
                    );
        
        //--------------------------------------------------
        // INITIAL FIT ONLY
        //--------------------------------------------------

        requestAnimationFrame(() => {

            if (
                initialFitDone.current ||
                !chart.current
            ) {
                return;
            }

            chart.current
                .timeScale()
                .fitContent();

            initialFitDone.current = true;

        });

        //--------------------------------------------------
        // OVERLAY SERIES
        // Only visual indicators
        //
        // EMA  -> line
        // VWAP -> line
        //
        // AJ Institutional is NOT a line indicator.
        // AJ renders:
        // markers
        // trade levels
        // zones
        // dashboard
        //--------------------------------------------------

        emaSeries.current =
            chart.current.addSeries(
                LineSeries,
                {
                    color:"#00ff88",
                    lineWidth:2
                }
            );


        vwapSeries.current =
            chart.current.addSeries(
                LineSeries,
                {
                    color:"#ffaa00",
                    lineWidth:2
                }
            );


        rsiSeries.current =
            null;


        atrSeries.current =
            null;


        adxSeries.current =
            null;

        //--------------------------------------------------
        // INSTITUTIONAL PRIMITIVES
        //--------------------------------------------------

        demandPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        supplyPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        targetPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        neutralPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        fvgPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        liquidityPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        orderBlockPrimitive.current =
            new InstitutionalZonePrimitive(
                chart.current,
                candleSeries.current
            );

        //--------------------------------------------------
        // AUTO RESIZE
        //--------------------------------------------------

        const resizeObserver =
            new ResizeObserver(() => {

                if (
                    !chart.current ||
                    !chartRef.current
                ) {
                    return;
                }

                chart.current.resize(

                    chartRef.current.clientWidth,

                    chartRef.current.clientHeight

                );

            });

        resizeObserver.observe(
            chartRef.current
        );

        //--------------------------------------------------
        // CLEANUP
        //--------------------------------------------------

        return () => {
        
            resizeObserver.disconnect();
             
            //--------------------------------------------------
            // REMOVE PRICE LINES
            //--------------------------------------------------
        
            nativePriceLines.current.forEach(

                line => {

                    candleSeries.current
                        ?.removePriceLine(line);

                }

            );

            nativePriceLines.current = [];

            //--------------------------------------------------
            // DESTROY INSTITUTIONAL PRIMITIVES
            //--------------------------------------------------

            demandPrimitive.current?.destroy();
            supplyPrimitive.current?.destroy();
            targetPrimitive.current?.destroy();
            neutralPrimitive.current?.destroy();
            fvgPrimitive.current?.destroy();
            liquidityPrimitive.current?.destroy();
            orderBlockPrimitive.current?.destroy();

            demandPrimitive.current = null;
            supplyPrimitive.current = null;
            targetPrimitive.current = null;
            neutralPrimitive.current = null;
            fvgPrimitive.current = null;
            liquidityPrimitive.current = null;
            orderBlockPrimitive.current = null;

            chart.current?.remove();

            chart.current = null;

        };

    }, []);
	
    //--------------------------------------------------
    // DRAW CANDLES
    //--------------------------------------------------

    useEffect(() => {

        if (
            !candleSeries.current ||
            candles.length === 0
        ) {
            return;
        }

        //--------------------------------------------------
        // NORMALIZE TIME
        //
        // Feeds occasionally return time as a string, an
        // ISO date, or milliseconds instead of seconds.
        // Number(c.time) silently produces NaN for those,
        // which does not throw here but corrupts the sort
        // order and crashes lightweight-charts' setData()
        // assertion later, unmounting the whole chart tree.
        //--------------------------------------------------

        const toEpochSeconds = (raw: unknown): number | null => {

            if (raw == null) {
                return null;
            }

            const num =
                typeof raw === "number"
                    ? raw
                    : Number(raw);

            if (Number.isFinite(num)) {
                return num > 1e12
                    ? Math.floor(num / 1000)
                    : Math.floor(num);
            }

            if (typeof raw === "string") {
                const parsed = Date.parse(raw);
                if (Number.isFinite(parsed)) {
                    return Math.floor(parsed / 1000);
                }
            }

            return null;

        };

        const chartCandles = Array.from(
            new Map(
                candles
                    .map(c => {
                        const time = toEpochSeconds(c.time);
                        return time == null
                            ? null
                            : [
                                time,
                                {
                                    time: time as UTCTimestamp,
                                    open: Number(c.open),
                                    high: Number(c.high),
                                    low: Number(c.low),
                                    close: Number(c.close)
                                }
                            ] as const;
                    })
                    .filter(
                        (entry): entry is readonly [number, any] =>
                            entry !== null &&
                            Number.isFinite(entry[1].open) &&
                            Number.isFinite(entry[1].high) &&
                            Number.isFinite(entry[1].low) &&
                            Number.isFinite(entry[1].close)
                    )
            ).values()
        ).sort(
            (a, b) => Number(a.time) - Number(b.time)
        );

        if (chartCandles.length === 0) {
            return;
        }

        console.log(
            "[ChartEngine] setData",
            {
                count: chartCandles.length,
                first: chartCandles[0],
                last: chartCandles[chartCandles.length - 1]
            }
        );

        candleSeries.current.setData(chartCandles);

    }, [candles]);

    //--------------------------------------------------
    // DRAW EMA
    //--------------------------------------------------

	useEffect(() => {
	
		if (!emaSeries.current)
			return;
	
		emaSeries.current.setData(
	
			indicators.ema
				? normalizeLineData(
					OverlayManager
						.buildEMA(candles)
				)
				: []
	
		);
	
	}, [
	
		candles,
	
		indicators.ema
	
	]);

    //--------------------------------------------------
    // DRAW VWAP
    //--------------------------------------------------

	useEffect(() => {
	
		if (!vwapSeries.current)
			return;
	
		vwapSeries.current.setData(
	
			indicators.vwap
				? normalizeLineData(
					OverlayManager
						.buildVWAP(candles)
				)
				: []
	
		);
	
	}, [
	
		candles,
	
		indicators.vwap
	
	]);

    //--------------------------------------------------
    // DRAW RSI
    //--------------------------------------------------

	useEffect(() => {
	
		if (!rsiSeries.current)
			return;
	
		rsiSeries.current.setData(
	
			indicators.rsi
				? normalizeLineData(
					OverlayManager
						.buildRSI(candles)
				)
				: []
	
		);
	
	}, [
	
		candles,
	
		indicators.rsi
	
	]);

    //--------------------------------------------------
    // DRAW ATR
    //--------------------------------------------------

	useEffect(() => {
	
		if (!atrSeries.current)
			return;
	
		atrSeries.current.setData(
	
			indicators.atr
				? normalizeLineData(
					OverlayManager
						.buildATR(candles)
				)
				: []
	
		);
	
	}, [
	
		candles,
	
		indicators.atr
	
	]);
	
    //--------------------------------------------------
    // DRAW ADX
    //--------------------------------------------------

	useEffect(() => {
	
		if (!adxSeries.current)
			return;
	
		adxSeries.current.setData(
	
			indicators.adx
				? normalizeLineData(
					OverlayManager
						.buildADX(candles)
				)
				: []
	
		);
	
	}, [
	
		candles,
	
		indicators.adx
	
	]);

    //--------------------------------------------------
    // APPLY MARKERS
    //--------------------------------------------------
    
	useEffect(() => {
	
		if (!candleSeries.current)
			return;
	
		//--------------------------------------------------
		// AJ BUY / SELL EXECUTION MARKERS
		//
		// AJSignalBuilder already produces the canonical
		// Lightweight Charts marker contract:
		//
		// time
		// position
		// shape
		// color
		// text
		//--------------------------------------------------
	
		const executionMarkers =
			(markers ?? [])
				.filter((marker: any) =>
					marker &&
					Number.isFinite(Number(marker.time)) &&
					(
						marker.action === "BUY" ||
						marker.action === "SELL" ||
						marker.text === "BUY" ||
						marker.text === "SELL" ||
						marker.shape === "arrowUp" ||
						marker.shape === "arrowDown"
					)
				)
				.map((marker: any) => ({
	
					time:
						Number(marker.time) as UTCTimestamp,
	
					position:
						marker.position === "aboveBar"
							? "aboveBar"
							: "belowBar",
	
					shape:
						marker.shape === "arrowDown"
							? "arrowDown"
							: "arrowUp",
	
					color:
						marker.color ??
						(
							marker.shape === "arrowDown"
								? "#ff4444"
								: "#00C853"
						),
	
					text:
						marker.text ??
						(
							marker.action === "SELL"
								? "SELL"
								: "BUY"
						)
	
				}));
	
		//--------------------------------------------------
		// REMOVE DUPLICATES
		//--------------------------------------------------
	
		const uniqueMarkers =
			executionMarkers.filter(
				(
					marker: any,
					index: number,
					array: any[]
				) =>
					index ===
					array.findIndex(
						(m: any) =>
							Number(m.time) === Number(marker.time) &&
							m.position === marker.position &&
							m.shape === marker.shape &&
							m.text === marker.text
					)
			);
	
		//--------------------------------------------------
		// DIFF CHECK
		//--------------------------------------------------
	
		const state =
			JSON.stringify(uniqueMarkers);
	
		if (
			state === previousMarkers.current
		)
			return;
	
		previousMarkers.current =
			state;
	
		//--------------------------------------------------
		// RENDER
		//--------------------------------------------------
	
		createSeriesMarkers(
			candleSeries.current,
			uniqueMarkers
		);
	
	}, [
	
		markers
	
	]);

    //--------------------------------------------------
    // APPLY PRICE LINES
    //--------------------------------------------------

    useEffect(() => {

        if (!candleSeries.current)
            return;

        const state = JSON.stringify(priceLines);

        if (state === previousPriceLines.current)
            return;

        previousPriceLines.current = state;

        nativePriceLines.current.forEach(

            line => {
                candleSeries.current
                    ?.removePriceLine(line);
            }
        );

        nativePriceLines.current = [];
        priceLines.forEach((line: any) => {

            const nativeLine =

                candleSeries.current!.createPriceLine({
                    price:
                        line.price,
                    color:
                        line.color,
                    title:
                        line.title,
                    lineWidth:
                        line.lineWidth ?? 2,

                    //--------------------------------------------------
                    // TRADINGVIEW STYLE
                    //--------------------------------------------------

                    lineStyle:
                        line.id === "ENTRY"
                            ? 0
                            : 2,

                    //--------------------------------------------------
                    // SHOW PRICE LABEL LIKE TRADINGVIEW
                    //--------------------------------------------------

                    axisLabelVisible:
                        true
                });

            nativePriceLines.current.push(
                nativeLine
            );
        });

    }, [
        priceLines
    ]);

    //--------------------------------------------------
    // DEMAND
    //--------------------------------------------------

	useEffect(() => {
	
		const state =
			JSON.stringify(demandZones);
	
		if (state === previousDemand.current)
			return;
	
		previousDemand.current = state;
	
		if (!zonesEnabled) {
			demandPrimitive.current?.update([]);
			return;
		}
	
		demandPrimitive.current?.update(
			demandZones.filter(
				(z: any) =>
					z &&
					z.low != null &&
					z.high != null
			)
		);
	
	}, [
		demandZones,
		zonesEnabled
	]);

    //--------------------------------------------------
    // SUPPLY
    //--------------------------------------------------

    useEffect(() => {

        const state =
            JSON.stringify(supplyZones);

        if (state === previousSupply.current)
            return;

        previousSupply.current = state;

        supplyPrimitive.current?.update(
            supplyZones.filter(
                (z:any)=>
                    z &&
                    z.low!=null &&
                    z.high!=null
            )
        );

	}, [
		supplyZones,
		zonesEnabled
	]);

    //--------------------------------------------------
    // TARGET
    //--------------------------------------------------

    useEffect(() => {

        const state =
            JSON.stringify(targetZones);

        if (state === previousTarget.current)
            return;

        previousTarget.current = state;

        targetPrimitive.current?.update(
            targetZones

        );

	}, [
		targetZones,
		zonesEnabled
	]);

    //--------------------------------------------------
    // NEUTRAL
    //--------------------------------------------------

    useEffect(() => {

        const state =
            JSON.stringify(neutralZones);

        if (state === previousNeutral.current)
            return;

        previousNeutral.current = state;

        neutralPrimitive.current?.update(
            neutralZones

        );

	}, [
		neutralZones,
		zonesEnabled
	]);

    //--------------------------------------------------
    // FVG
    //--------------------------------------------------

    useEffect(() => {

        const state =
            JSON.stringify(fvgZones);

        if (state === previousFVG.current)
            return;

        previousFVG.current = state;

        fvgPrimitive.current?.update(
            fvgZones.filter(
                (z:any)=>
                    z &&
                    z.low!=null &&
                    z.high!=null
            )
        );

	}, [
		fvgZones,
		zonesEnabled
	]);
	
    //--------------------------------------------------
    // LIQUIDITY
    //--------------------------------------------------

    useEffect(() => {

        const state =
            JSON.stringify(liquidityZones);

        if (state === previousLiquidity.current)
            return;

        previousLiquidity.current = state;

        liquidityPrimitive.current?.update(
            liquidityZones.filter(
                (z:any)=>
                    z &&
                    z.low!=null &&
                    z.high!=null
            )
        );
		
	}, [
		liquidityZones,
		zonesEnabled
	]);

    //--------------------------------------------------
    // ORDER BLOCK
    //--------------------------------------------------

	useEffect(() => {
	
		if (!orderBlockPrimitive.current) {
			return;
		}
	
		const state =
			JSON.stringify(orderBlockZones);
	
		if (state === previousOrderBlock.current) {
			return;
		}
	
		previousOrderBlock.current = state;
	
		orderBlockPrimitive.current.update(
			zonesEnabled
				? orderBlockZones.filter(
					(z: any) =>
						z &&
						Number.isFinite(Number(z.low)) &&
						Number.isFinite(Number(z.high)) &&
						Number.isFinite(Number(z.from)) &&
						Number.isFinite(Number(z.to))
				)
				: []
		);
	
	}, [
		orderBlockZones,
		zonesEnabled
	]);

    //--------------------------------------------------
    // COUNTDOWN TIMER
    //--------------------------------------------------

    useEffect(() => {

        const tfMap:
            Record<string, number> = {

            "1m": 60,
            "3m": 180,
            "5m": 300,
            "15m": 900,
            "30m": 1800,
            "1h": 3600,
            "4h": 14400,
            "1d": 86400

        };


        const seconds =
            tfMap[timeframe] ?? 60;


        function update() {

            const now =
                Math.floor(
                    Date.now() / 1000
                );


            const start =
                Math.floor(
                    now / seconds
                ) * seconds;


            const left =
                start +
                seconds -
                now;


            setCountdown(

                String(
                    Math.floor(left / 60)
                )
                .padStart(2,"0")

                +

                ":"

                +

                String(
                    left % 60
                )
                .padStart(2,"0")

            );

        }


        update();


        const timer =
            setInterval(
                update,
                1000
            );


        return () =>
            clearInterval(timer);


    }, [timeframe]);
	
	//--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    useEffect(() => {

        if (
            !import.meta.env.DEV
        ) {
            return;
        }

        AJLoggingGate.log(
            "[ChartEngine] hostResult",
            hostResult
        );

    }, [

        hostResult

    ]);

    //--------------------------------------------------
    // APPLY CANDLE COLOR CHANGES LIVE
    //--------------------------------------------------

    useEffect(() => {

        if (!candleSeries.current) {
            return;
        }

        candleSeries.current.applyOptions({
            upColor: resolvedCandleColors.upColor,
            downColor: resolvedCandleColors.downColor,
            borderUpColor: resolvedCandleColors.borderUpColor,
            borderDownColor: resolvedCandleColors.borderDownColor,
            wickUpColor: resolvedCandleColors.wickUpColor,
            wickDownColor: resolvedCandleColors.wickDownColor
        });

    }, [
        resolvedCandleColors.upColor,
        resolvedCandleColors.downColor,
        resolvedCandleColors.borderUpColor,
        resolvedCandleColors.borderDownColor,
        resolvedCandleColors.wickUpColor,
        resolvedCandleColors.wickDownColor
    ]);
	
    //--------------------------------------------------
    // RE-APPLY THEME COLORS ON TOGGLE
    //--------------------------------------------------

    useEffect(() => {

        if (!chart.current) {
            return;
        }

        const chartColors =
            CHART_THEME_COLORS[theme];

        const chartBg = chartColors.background;
        const chartText = chartColors.text;
        const chartGrid = chartColors.grid;
        const chartBorder = chartColors.border;

        chart.current.applyOptions({

            layout: {
                background: { color: chartBg },
                textColor: chartText
            },

            grid: {
                vertLines: { color: chartGrid },
                horzLines: { color: chartGrid }
            },

            rightPriceScale: {
                borderColor: chartBorder
            },

            timeScale: {
                borderColor: chartBorder
            }

        });

    }, [theme]);

    //--------------------------------------------------
    // RENDER
    //--------------------------------------------------

    return (
        <div
            className="chart-engine"
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column"
            }}
        >

            {/*==================================================
                CHART
            ==================================================*/}

            <div
                ref={chartRef}
            
                tabIndex={0}
            
                onClick={activateChart}
            
                onMouseDown={activateChart}
            
                onFocus={activateChart}

                //--------------------------------------------------
                // RIGHT CLICK RESET
                //--------------------------------------------------

                onContextMenu={(e)=>{

                    e.preventDefault();

                    chart.current
                        ?.timeScale()
                        .fitContent();

                    initialFitDone.current = true;

                }}


                //--------------------------------------------------
                // DOUBLE CLICK RESET + RESIZE
                //--------------------------------------------------

                onDoubleClick={()=>{

                    if (
                        !chart.current ||
                        !chartRef.current
                    ) {
                        return;
                    }

                    chart.current.resize(
                        chartRef.current.clientWidth,
                        chartRef.current.clientHeight
                    );

                    chart.current
                        .timeScale()
                        .fitContent();

                    initialFitDone.current = true;

                }}


                style={{
                
                    flex:1,
                
                    position:"relative",
                
                    minWidth:0,
                
                    minHeight:0,
                
                    overflow:"hidden",
                
                    cursor:"crosshair",
                
                    border:
                
                        isActive
                
                            ? "2px solid #00ff88"
                
                            : "2px solid transparent",
                
                    borderRadius:4,
                
                    transition:"border .15s"
                
                }}
            >

                {/*==================================================
                    COUNTDOWN TIMER
                ==================================================*/}

                <div
                    style={{
                        position:"absolute",
                        top:4,
                        right:4,
                        background:
                            "var(--bg-panel)",
                        color:
                            "var(--success-text)",
                        padding:
                            "4px 8px",
                        borderRadius:4,
                        fontSize:12,
                        fontWeight:700,
                        pointerEvents:"none",
                        zIndex:999,
                        border: "1px solid var(--border-primary)",
                        boxShadow: "var(--shadow)"
                    }}
                >
                    {countdown}
                </div>

				{/*==================================================
                    CHART SETTINGS BUTTON
                ==================================================*/}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowChartSettings(v => !v);
                    }}
                    title="Chart settings"
                    style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--bg-panel)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 14,
                        zIndex: 999,
                        boxShadow: "var(--shadow)"
                    }}
                >
                    ⚙
                </button>

                {showChartSettings && (
                    <ChartSettingsPanel
                        colors={candleColors}
                        onChange={(newColors) => {
                            onCandleColorsChange?.(newColors);
                        }}
                        onClose={() => setShowChartSettings(false)}
                    />
                )}
				
                {hoverTooltip && (

                    <div
                        style={{
                            position: "absolute",
                            left: hoverTooltip.x + 14,
                            top: hoverTooltip.y + 14,
                            maxWidth: 260,
                            background: "var(--bg-panel)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-primary)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            fontSize: 12,
                            lineHeight: 1.4,
                            pointerEvents: "none",
                            zIndex: 1000,
                            boxShadow: "var(--shadow)"
                        }}
                    >
                        {hoverTooltip.text}
                    </div>

                )}

            </div>

            {/*==================================================
                RUNTIME PANEL
            ==================================================*/}

            {
                runtimePanel && (

                    <div
                        style={{
                            flex: "0 0 95px",
                            background:
                                "var(--bg-panel)",
                            border:
                                "1px solid var(--border-secondary)",
                            borderRadius:
                                6,
                            margin:
                                4,
                            overflow:
                                "hidden",
                            color:
                                "var(--text-primary)",
                            fontSize:
                                11
                        }}
                    >
                        {/*==========================================
                            DASHBOARD TITLE
                        ==========================================*/}

                        <div
                            style={{
								
                                height: 22,
                                display: "flex",
                                alignItems: "center",
                                paddingLeft: 8,
                                fontWeight: 600,
                                color: "var(--success-text)",
                                background: "var(--bg-panel-secondary)",
                                borderBottom: "1px solid var(--border-secondary)"
                            }}
                        >
                            AJ Institutional Dashboard
						
                        </div>
                        
                        {/*==========================================
                            HEADER ROW
                        ==========================================*/}
                        
                        <div
                            style={{
                                display:"grid",
                                gridTemplateColumns:
                                    "1fr 1fr 1.8fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
                                height:25,
                                borderBottom:
                                    "1px solid var(--border-secondary)",
                                textAlign:"center"
                            }}
                        >
                        
                            {
                                [
                                    "POSITION",
                                    "DIRECTION",
                                    "OPTION",
                                    "ENTRY",
                                    "SL",
                                    "TP1",
                                    "TP2",
                                    "TP3",
                                    "RE-ENTRY",
                                    "RE-ENTRY SL"
                                ].map(
                        
                                    h=>(
                        
                                        <div
                                            key={h}
                                            style={{
                                                borderRight:"1px solid var(--border-secondary)",
                                                display:"flex",
                                                alignItems:"center",
                                                justifyContent:"center",
                                                fontWeight:400,
                                                color:"var(--text-muted)"
                                            }}
                                        >
                                            {h}
                                        </div>
                        
                                    )
                        
                                )
                            }
                        
                        </div>

                        {/*==========================================
                            VALUE ROW
                        ==========================================*/}
                        
                        <div
                            style={{
                                display:"grid",
                                gridTemplateColumns:
                                    "1fr 1fr 1.8fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
                                height:35,
                                alignItems:"center",
                                textAlign:"center",
                                fontWeight:400
                            }}
                        >
                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.position}
                            </div>

                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.direction}
                            </div>

                            <div
                                style={{
                                    color:"var(--warning-text)",
                                    fontWeight:700,
                                    whiteSpace:"normal",
                                    wordBreak:"break-word",
                                    fontSize:10,
                                    lineHeight:"14px"
                                }}
                            >
                                {dashboardView?.option}
                            </div>
                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.entry}
                            </div>
                            <div style={{color:"var(--danger-text)", fontWeight:700}}>
                                {dashboardView?.stop}
                            </div>

                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.tp1}
                            </div>

                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.tp2}
                            </div>

                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.tp3}
                            </div>

                            <div style={{color:"var(--success-text)", fontWeight:700}}>
                                {dashboardView?.reEntry}
                            </div>

                            <div style={{color:"var(--danger-text)", fontWeight:700}}>
                                {dashboardView?.reEntrySL}
                            </div>
                        
                        </div>

                    </div>

                )
            }

        </div>

    );

}



