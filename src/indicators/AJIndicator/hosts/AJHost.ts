/****************************************************************************************
 * File:
 * AJHost.ts
 *
 * Path:
 * src/indicators/AJIndicator/hosts/AJHost.ts
 *
 * Purpose:
 * Canonical Institutional Host for the AJ Trading Platform.
 *
 * AJHost is the presentation adapter between the institutional trading
 * engine and every rendering consumer (ChartEngine, Dashboard,
 * Runtime Panel, Replay Engine and future visualization modules).
 *
 * It converts the canonical RuntimeResult into a renderer-friendly,
 * immutable HostResult without performing any trading decisions.
 *
 * Responsibilities:
 * -----------------
 * • Adapt RuntimeResult into a presentation payload.
 * • Build chart markers.
 * • Build horizontal price lines.
 * • Normalize institutional zones.
 * • Build runtime dashboard information.
 * • Aggregate overlays.
 * • Publish runtime diagnostics.
 * • Execute lifecycle hooks.
 *
 * This host NEVER:
 * ----------------
 * • Generates signals.
 * • Calculates indicators.
 * • Performs market analysis.
 * • Calculates confidence.
 * • Calculates risk.
 * • Performs authority decisions.
 * • Executes trades.
 *
 * Those responsibilities belong to the institutional engines.
 *
 * AJ Runtime Architecture
 *
 * RuntimeEngine
 *        │
 *        ▼
 * RuntimeResult
 *        │
 *        ▼
 * AJHost
 *        │
 *        ├──────── Runtime Panel
 *        ├──────── Chart Markers
 *        ├──────── Price Lines
 *        ├──────── Institutional Zones
 *        ├──────── Smart Overlays
 *        ├──────── Debug Information
 *        └──────── Statistics
 *        │
 *        ▼
 * ChartEngine
 * Dashboard
 * Replay Engine
 * Analytics
 *
 * Design Principles:
 * ------------------
 * • Stateless rendering adapter.
 * • Immutable host payload.
 * • Strongly typed contracts.
 * • No duplicated calculations.
 * • Rendering-independent architecture.
 * • Visualization-ready for Phase 16.
 *
 * Phase:
 * -------
 * Phase 15.5 – Runtime Host Layer
 *
 * Future Enhancements (Phase 16):
 * -------------------------------
 * • Market Mood
 * • Retail Trap Banner
 * • Smart Money Dashboard
 * • Confidence Breakdown
 * • Mentor Explanation
 * • Educational Tooltips
 * • Smart Zones
 * • Institutional Heatmap
 ****************************************************************************************/

import type { RuntimeResult } from "../../../runtime/RuntimeResult";
import { SignalEngine } from "../../../runtime/signals/SignalEngine";
import { AJSignalBuilder } from "../../../runtime/signals/AJSignalBuilder";

//======================================================
// HOST TYPES
//======================================================

export interface HostPriceLine {

    type:string;

    price:number;

    color:string;

    title:string;

}

export interface HostZone {

    type:string;

    zones:any[];

}

export interface RuntimePanel {

    engineState:string;

    direction:

        | "LONG"

        | "SHORT"

        | "NONE";

    tradeGrade:string;

    confidence:number;

    executionAllowed:boolean;

    entryPrice:number | null;

    stopLoss:number | null;

    tp1:number | null;

    tp2:number | null;

    tp3:number | null;

    reEntryPrice:number | null;

    reEntryStopLoss:number | null;

    regime:string;

    tradeScore:number;

    symbol:string;

    optionSymbol:string;

}

export interface HostResult {

    //--------------------------------------------------
    // RAW
    //--------------------------------------------------

    runtimeResult:RuntimeResult;

    decisionResult:any;

    //--------------------------------------------------
    // VISUALS
    //--------------------------------------------------

    signals:any[];

    markers:any[];

    priceLines:HostPriceLine[];

    demandZones:any[];

    supplyZones:any[];

    targetZones:any[];

    neutralZones:any[];

    fvgZones:any[];

    liquidityZones:any[];

    orderBlockZones:any[];

    overlays:Record<string, unknown>;

    //--------------------------------------------------
    // PANELS
    //--------------------------------------------------

    runtimePanel:RuntimePanel;

    //--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    debug:any;

    //--------------------------------------------------
    // STATS
    //--------------------------------------------------

    stats:Record<string, unknown>;

}

//======================================================
// AJ HOST
//======================================================

export class AJHost {

    //--------------------------------------------------
    // DECISION HISTORY (per chart)
    //
    // SignalEngine.normalize() expects a chronological
    // array of past decisions, but execute() only ever
    // receives ONE decision per cycle (the current bar).
    // This rolling buffer turns single-bar calls into the
    // history SignalEngine/AJSignalBuilder were built to
    // consume - without it, markers could never appear no
    // matter what those two classes computed internally.
    //--------------------------------------------------

    private static decisionHistory:
        Record<string, { index:number; time:number; decision:any }[]> = {};

    //--------------------------------------------------
    // STATIC ENTRY
    //--------------------------------------------------

    static run(

        runtimeResult:RuntimeResult

    ):HostResult {

        return new AJHost().execute(

            runtimeResult

        );

    }

    //--------------------------------------------------
    // EXECUTE
    //--------------------------------------------------

    execute(

        runtimeResult:RuntimeResult

    ):HostResult {

        //--------------------------------------------------
        // BEFORE PROCESS
        //--------------------------------------------------

        this.beforeProcess();

        //--------------------------------------------------
        // DECISION
        //--------------------------------------------------

        const decisionResult =

            runtimeResult.decision;

        //--------------------------------------------------
        // BUILD PRICE LINES
        //--------------------------------------------------

        const priceLines =

            this.buildPriceLines(

                decisionResult

            );

        //--------------------------------------------------
        // BUILD ZONES
        //--------------------------------------------------

        const zones =

            this.buildZones(

                decisionResult

            );

        //--------------------------------------------------
        // BUILD SIGNALS
        //
        // Computed once per cycle, then reused for markers -
        // so the current bar is only pushed into history once
        // per execute() call, not twice.
        //--------------------------------------------------

        const signals =

            this.buildSignals(

                runtimeResult

            );

        //--------------------------------------------------
        // BUILD MARKERS
        //--------------------------------------------------

        const markers =

            this.buildMarkers(

                signals

            );

        //--------------------------------------------------
        // BUILD OVERLAYS
        //--------------------------------------------------

        const overlays =

            this.buildOverlays(

                decisionResult

            );

        //--------------------------------------------------
        // DEBUG
        //--------------------------------------------------

        const debug =

            decisionResult?.debug ??

            null;

        //--------------------------------------------------
        // RUNTIME PANEL
        //--------------------------------------------------

        const runtimePanel =

            this.buildRuntimePanel(

                decisionResult

            );

        //--------------------------------------------------
        // STATS
        //--------------------------------------------------

        const stats =

            decisionResult?.stats ??

            {};

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        const hostResult: HostResult = {
            runtimeResult,
            decisionResult,
            signals,
            markers,
            priceLines,
            demandZones:zones.demandZones,
            supplyZones:zones.supplyZones,
            targetZones:zones.targetZones,
            neutralZones:zones.neutralZones,
            fvgZones:zones.fvgZones,
            liquidityZones:zones.liquidityZones,
            orderBlockZones:zones.orderBlockZones,
            overlays,
            runtimePanel,
            debug,
            stats
        };

        //--------------------------------------------------
        // AFTER PROCESS
        //--------------------------------------------------

        this.afterProcess();

        //--------------------------------------------------
        // IMMUTABLE RESULT
        //--------------------------------------------------

        return Object.freeze(
            hostResult
        );
    }

    //--------------------------------------------------
    // BUILD PRICE LINES
    //--------------------------------------------------

    protected buildPriceLines(
        decisionResult:any
    ): HostPriceLine[] {
        const lines:
            HostPriceLine[] = [];
        if (
            decisionResult?.entryPrice != null
        ) {
            lines.push({
                type:"ENTRY",
                price:
                    decisionResult.entryPrice,
                color:"#00BFFF",
                title:"ENTRY"
            });
        }
        if (
            decisionResult?.stopLoss != null
        ) {
            lines.push({
                type:"SL",
                price:
                    decisionResult.stopLoss,
                color:"#FF3333",
                title:"STOP LOSS"
            });
        }
        if (
            decisionResult?.tp1 != null
        ) {
            lines.push({
                type:"TP1",
                price:
                    decisionResult.tp1,
                color:"#00FF66",
                title:"TP1"
            });
        }
        if (
            decisionResult?.tp2 != null
        ) {
            lines.push({
                type:"TP2",
                price:
                    decisionResult.tp2,
                color:"#00FF66",
                title:"TP2"
            });
        }
        if (
            decisionResult?.tp3 != null
        ) {
            lines.push({
                type:"TP3",
                price:
                    decisionResult.tp3,
                color:"#00FF66",
                title:"TP3"
            });
        }
        return lines;
    }

    //--------------------------------------------------
    // BUILD ZONES
    //--------------------------------------------------

    protected buildZones(
        decisionResult:any
    ) {
        return {
            demandZones:
                decisionResult?.demandZones ??
                [],
            supplyZones:
                decisionResult?.supplyZones ??
                [],
            targetZones:
                decisionResult?.targetZones ??
                [],
            neutralZones:
                decisionResult?.neutralZones ??
                [],
            fvgZones:
                decisionResult?.fvgZones ??
                [],
            liquidityZones:
                decisionResult?.liquidityZones ??
                [],
            orderBlockZones:
                decisionResult?.orderBlockZones ??
                []
        };
    }

    //--------------------------------------------------
    // BUILD MARKERS
    //--------------------------------------------------

    protected buildMarkers(

        signals:any[]

    ): any[] {

        return AJSignalBuilder.build(

            signals

        );

    }

    //--------------------------------------------------
    // BUILD SIGNALS
    //--------------------------------------------------

    protected buildSignals(

        runtimeResult:RuntimeResult

    ): any[] {

        const decision =
            runtimeResult?.decision;

        const runtime =
            runtimeResult?.runtime as any;

        if (!decision || !runtime) {
            return [];
        }

        const key =
            runtime.chartId ??
            runtime.symbol ??
            "GLOBAL";

        const time =
            runtime.current?.time ??
            Math.floor(Date.now() / 1000);

        const index =
            runtime.barIndex ??
            0;

        const history =
            AJHost.decisionHistory[key] ??
            [];

        const last =
            history[history.length - 1];

        if (!last || last.time !== time) {

            history.push({ index, time, decision });

        } else {

            // Same bar re-evaluated (e.g. a tick before the
            // candle closes) - replace rather than duplicate.
            history[history.length - 1] = { index, time, decision };

        }

        const trimmed =
            history.slice(-500);

        AJHost.decisionHistory[key] =
            trimmed;

        return SignalEngine.normalize(

            trimmed

        );

    }

    //--------------------------------------------------
    // BUILD OVERLAYS
    //--------------------------------------------------

    protected buildOverlays(
        decisionResult:any
    ): Record<string, unknown> {
        return {
            ...(decisionResult?.overlays ?? {})
        };
    }

    //--------------------------------------------------
    // BUILD RUNTIME PANEL
    //--------------------------------------------------

    protected buildRuntimePanel(
        decisionResult:any
    ): RuntimePanel {
        const tradeDirection =
            decisionResult?.dashboardDirection ??
            decisionResult?.tradeDirection ??
            decisionResult?.tradeDirectionFinal ??
            0;

        //--------------------------------------------------
        // CHART'S OWN SYMBOL
        //
        // If the chart itself is already an option contract
        // (ends CE/PE), the dashboard must echo that exact
        // contract - never a separate ATM/ITM/OTM
        // recommendation payload from decisionResult.debug.
        //--------------------------------------------------


        const chartSymbol =
            decisionResult?.runtimeResult?.symbol ??
            decisionResult?.symbol ??
            "";

        const isOptionChart =
            /(CE|PE)$/i.test(chartSymbol);

        const optionSymbol =
            isOptionChart
                ? chartSymbol
                : (
                    decisionResult?.debug?.optionSymbol ??
                    decisionResult?.optionSymbol ??
                    "-"
                );

        return {
            engineState:
                decisionResult?.currentState ??
                decisionResult?.lifecycleState ??
                "SCAN",
            direction:
                tradeDirection > 0
                    ? "LONG"
                    : tradeDirection < 0
                        ? "SHORT"
                        : "NONE",
            tradeGrade:
                decisionResult?.tradeGrade ??
                "-",
            confidence:
                decisionResult?.confidence ??
                decisionResult?.institutionalConfidence ??
                0,
            executionAllowed:
                decisionResult?.executionAllowed ??
                false,
            entryPrice:
                decisionResult?.entryPrice ??
                null,
            stopLoss:
                decisionResult?.stopLoss ??
                null,
            tp1:
                decisionResult?.tp1 ??
                null,
            tp2:
                decisionResult?.tp2 ??
                null,
            tp3:
                decisionResult?.tp3 ??
                null,
            reEntryPrice:
                decisionResult?.execution?.reentryPrice ??
                decisionResult?.reEntryPrice ??
                null,
            reEntryStopLoss:
                decisionResult?.execution?.reEntryStopLoss ??
                decisionResult?.reEntryStopLoss ??
                null,
            regime:
                decisionResult?.regime ??
                "-",
            tradeScore:
                decisionResult?.tradeScore ??
                0,
            symbol:
                chartSymbol,
            optionSymbol:
                optionSymbol
        };
    }

    //--------------------------------------------------
    // BEFORE PROCESS
    //--------------------------------------------------

    protected beforeProcess(): void {

        //--------------------------------------------------
        // Extension point:
        // • Runtime synchronization
        // • Dashboard preparation
        // • Portfolio synchronization
        //--------------------------------------------------

    }

    //--------------------------------------------------
    // AFTER PROCESS
    //--------------------------------------------------

    protected afterProcess(): void {

        //--------------------------------------------------
        // Extension point:
        // • Dashboard refresh
        // • Telemetry
        // • Analytics
        // • Replay synchronization
        //--------------------------------------------------

    }

    //--------------------------------------------------
    // RESET
    //--------------------------------------------------

    reset(): void {

        //--------------------------------------------------
        // Reserved for future host state.
        //--------------------------------------------------

    }

}