/****************************************************************************************
 * AJInstitutional.entry.ts
 *
 * OpenAlgo custom-indicator entry for the rebuilt AJ Institutional indicator.
 *
 * The entry is deliberately thin:
 *   OpenAlgo OHLCV/settings
 *          -> OpenAlgoAdapter
 *          -> RuntimeEngine
 *          -> AJDecisionEngine
 *          -> AJHost
 *          -> OpenAlgo plot/marker/dashboard payload
 *
 * The institutional calculations stay in src/.
 ****************************************************************************************/

import {
    OpenAlgoAdapter,
    type OpenAlgoBar,
    type OpenAlgoRunOptions,
    type OpenAlgoResultRow,
} from "../src/runtime/hosts/OpenAlgoAdapter";

type InputDef = {
    name: string;
    label: string;
    type: "boolean" | "number" | "string" | "select";
    default: unknown;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    group?: string;
};

const inputs: InputDef[] = [
    { name: "useVWAP", label: "VWAP", type: "boolean", default: true, group: "Filters" },
    { name: "useCVD", label: "CVD", type: "boolean", default: true, group: "Filters" },
    { name: "enableADXStrength", label: "ADX Strength", type: "boolean", default: true, group: "Filters" },
    { name: "enableAMDProtection", label: "AMD Protection", type: "boolean", default: false, group: "Filters" },
    { name: "enableCPRRejection", label: "CPR Rejection", type: "boolean", default: false, group: "Filters" },

    { name: "biasSMA", label: "Bias SMA", type: "number", default: 50, min: 2, max: 500, step: 1, group: "Trend" },
    { name: "emaFast", label: "EMA Fast", type: "number", default: 9, min: 1, max: 200, step: 1, group: "Trend" },
    { name: "emaSlow", label: "EMA Slow", type: "number", default: 21, min: 2, max: 500, step: 1, group: "Trend" },

    { name: "slATR", label: "SL ATR", type: "number", default: 1.5, min: 0.1, max: 20, step: 0.1, group: "Risk" },
    { name: "atrLength", label: "ATR", type: "number", default: 14, min: 2, max: 200, step: 1, group: "Risk" },
    { name: "cprBuffer", label: "CPR Buffer", type: "number", default: 0.15, min: 0, max: 10, step: 0.01, group: "Risk" },

    {
        name: "tradeEngineMode",
        label: "Score Engine",
        type: "select",
        default: "SCORE",
        options: ["SCORE", "AI", "AI_SMC"],
        group: "AI Trade",
    },
    { name: "scoreScalperEnabled", label: "Score Scalper", type: "boolean", default: false, group: "AI Trade" },
    { name: "aiScalperEnabled", label: "AI Scalper", type: "boolean", default: false, group: "AI Trade" },
    {
        name: "smcProfile",
        label: "AI+SMC Scalper",
        type: "select",
        default: "SCALPER",
        options: ["SAFE", "SWING", "SCALPER"],
        group: "AI Trade",
    },
    { name: "enableAdvancedCrypto", label: "Advanced Crypto Mode", type: "boolean", default: false, group: "AI Trade" },

    {
        name: "syncMode",
        label: "Sync Mode",
        type: "select",
        default: "NSE + SPX (ALL)",
        options: ["NSE ↔ BN", "SPX ↔ BTC", "NSE + SPX (ALL)", "Sync OFF"],
        group: "Smart Trade Sync",
    },
    { name: "spxDetach", label: "SPX Detach", type: "number", default: 3, min: 0, max: 50, step: 1, group: "Smart Trade Sync" },
    { name: "spxReattach", label: "SPX Reattach", type: "number", default: 2, min: 0, max: 50, step: 1, group: "Smart Trade Sync" },
    { name: "bnDetach", label: "BN Detach", type: "number", default: 3, min: 0, max: 50, step: 1, group: "Smart Trade Sync" },
    { name: "bnReattach", label: "BN Reattach", type: "number", default: 2, min: 0, max: 50, step: 1, group: "Smart Trade Sync" },
    { name: "syncBars", label: "Sync Bars", type: "number", default: 3, min: 1, max: 100, step: 1, group: "Smart Trade Sync" },
    { name: "desyncBars", label: "Desync Bars", type: "number", default: 2, min: 1, max: 100, step: 1, group: "Smart Trade Sync" },

    { name: "developerRuntimeOverride", label: "Developer Runtime Override", type: "boolean", default: false, group: "Developer Testing Mode" },

    { name: "showZones", label: "Zones", type: "boolean", default: true, group: "Visibility" },
    { name: "showRRPosition", label: "RR Position", type: "boolean", default: true, group: "Visibility" },
    { name: "showTradeLevels", label: "Trade Levels", type: "boolean", default: true, group: "Visibility" },
    { name: "trailingSL", label: "Trailing SL", type: "boolean", default: true, group: "Visibility" },
    { name: "reEntry", label: "Re-entry", type: "boolean", default: true, group: "Visibility" },
    { name: "showSignals", label: "BUY/SELL Signals", type: "boolean", default: true, group: "Visibility" },
    { name: "algoOptions", label: "Algo Options", type: "boolean", default: false, group: "Visibility" },
    { name: "greeksModel", label: "Greeks Model", type: "boolean", default: false, group: "Visibility" },

    { name: "maximumRiskPercent", label: "Maximum Risk %", type: "number", default: 1, min: 0, max: 100, step: 0.1, group: "Risk" },
    { name: "riskReward", label: "Risk Reward", type: "number", default: 2, min: 0.1, max: 20, step: 0.1, group: "Risk" },
];

const plots = [
    { id: "entryPrice", label: "ENTRY", type: "line", color: "#00BFFF", width: 2 },
    { id: "stopLoss", label: "SL", type: "line", color: "#FF3333", width: 2 },
    { id: "tp1", label: "TP1", type: "line", color: "#00FF66", width: 1 },
    { id: "tp2", label: "TP2", type: "line", color: "#00FF66", width: 1 },
    { id: "tp3", label: "TP3", type: "line", color: "#00FF66", width: 1 },

    { id: "equilibrium", label: "Equilibrium", type: "line", color: "#FFD54F", width: 1 },
    { id: "ema20", label: "EMA 20", type: "line", color: "#42A5F5", width: 1 },
    { id: "ema50", label: "EMA 50", type: "line", color: "#AB47BC", width: 1 },
    { id: "ema200", label: "EMA 200", type: "line", color: "#FF9800", width: 2 },
    { id: "vwap", label: "VWAP", type: "line", color: "#00BCD4", width: 1 },

    { id: "bullFVGTop", label: "Bull FVG Top", type: "line", color: "#26A69A", width: 1 },
    { id: "bullFVGBottom", label: "Bull FVG Bottom", type: "line", color: "#26A69A", width: 1 },
    { id: "bearFVGTop", label: "Bear FVG Top", type: "line", color: "#EF5350", width: 1 },
    { id: "bearFVGBottom", label: "Bear FVG Bottom", type: "line", color: "#EF5350", width: 1 },
];

function value<T>(
    map: Record<string, unknown>,
    key: string,
    fallback: T
): T {
    return (
        map[key] === undefined ||
        map[key] === null
            ? fallback
            : map[key]
    ) as T;
}

function barsFromContext(ctx: any): OpenAlgoBar[] {
    const raw =
        Array.isArray(ctx)
            ? ctx
            : Array.isArray(ctx?.bars)
                ? ctx.bars
                : Array.isArray(ctx?.candles)
                    ? ctx.candles
                    : Array.isArray(ctx?.data)
                        ? ctx.data
                        : Array.isArray(ctx?.ohlcv)
                            ? ctx.ohlcv
                            : [];

    return raw.map((b: any, i: number) => ({
        time: Number(b?.time ?? b?.timestamp ?? i),
        open: Number(b?.open ?? b?.o ?? 0),
        high: Number(b?.high ?? b?.h ?? 0),
        low: Number(b?.low ?? b?.l ?? 0),
        close: Number(b?.close ?? b?.c ?? 0),
        volume: Number(b?.volume ?? b?.v ?? 0),
    }));
}

function optionsFromContext(ctx: any): OpenAlgoRunOptions {
    const i =
        ctx?.inputs ??
        ctx?.settings ??
        ctx?.params ??
        {};

    const symbol =
        String(
            ctx?.symbol ??
            ctx?.metadata?.symbol ??
            ""
        );

    const chartId =
        String(
            ctx?.chartId ??
            ctx?.metadata?.chartId ??
            symbol ??
            "AJInstitutional"
        );

    return {
        chartId,
        symbol,
        timeframe:
            String(
                ctx?.timeframe ??
                ctx?.interval ??
                "5m"
            ),

        datasource:
            String(
                ctx?.datasource ??
                "openalgo"
            ),

        exchange:
            String(
                ctx?.exchange ??
                ""
            ),

        broker:
            String(
                ctx?.broker ??
                ctx?.datasource ??
                "openalgo"
            ),

        accountId:
            String(
                ctx?.accountId ??
                ""
            ),

        isOptionsMode:
            Boolean(
                ctx?.isOptionsMode ??
                ctx?.isOptionChart ??
                false
            ),

        underlying:
            String(
                ctx?.underlying ??
                symbol
            ),

        strike:
            Number(
                ctx?.strike ??
                0
            ),

        strikeStep:
            Number(
                ctx?.strikeStep ??
                50
            ),

        currentOptionType:
            String(
                ctx?.currentOptionType ??
                ""
            ),

        isMirrorOptionChart:
            Boolean(
                ctx?.isMirrorOptionChart ??
                false
            ),

        tradeEngineMode:
            value(
                i,
                "tradeEngineMode",
                "SCORE"
            ) as any,

        smcProfile:
            value(
                i,
                "smcProfile",
                "SCALPER"
            ) as any,

        developerRuntimeOverride:
            Boolean(
                value(
                    i,
                    "developerRuntimeOverride",
                    false
                )
            ),

        useVWAP:
            Boolean(
                value(
                    i,
                    "useVWAP",
                    true
                )
            ),

        useCVD:
            Boolean(
                value(
                    i,
                    "useCVD",
                    true
                )
            ),

        enableADXStrength:
            Boolean(
                value(
                    i,
                    "enableADXStrength",
                    true
                )
            ),

        enableAMDProtection:
            Boolean(
                value(
                    i,
                    "enableAMDProtection",
                    false
                )
            ),

        enableCPRRejection:
            Boolean(
                value(
                    i,
                    "enableCPRRejection",
                    false
                )
            ),

        biasSMA:
            Number(
                value(
                    i,
                    "biasSMA",
                    50
                )
            ),

        emaFast:
            Number(
                value(
                    i,
                    "emaFast",
                    9
                )
            ),

        emaSlow:
            Number(
                value(
                    i,
                    "emaSlow",
                    21
                )
            ),

        slATR:
            Number(
                value(
                    i,
                    "slATR",
                    1.5
                )
            ),

        atrLength:
            Number(
                value(
                    i,
                    "atrLength",
                    14
                )
            ),

        cprBuffer:
            Number(
                value(
                    i,
                    "cprBuffer",
                    0.15
                )
            ),

        scoreScalperEnabled:
            Boolean(
                value(
                    i,
                    "scoreScalperEnabled",
                    false
                )
            ),

        aiScalperEnabled:
            Boolean(
                value(
                    i,
                    "aiScalperEnabled",
                    false
                )
            ),

        enableAdvancedCrypto:
            Boolean(
                value(
                    i,
                    "enableAdvancedCrypto",
                    false
                )
            ),

        cryptoBTCMode:
            Boolean(
                value(
                    i,
                    "cryptoBTCMode",
                    true
                )
            ),

        syncMode:
            value(
                i,
                "syncMode",
                "NSE + SPX (ALL)"
            ) as any,

        spxDetach:
            Number(
                value(
                    i,
                    "spxDetach",
                    3
                )
            ),

        spxReattach:
            Number(
                value(
                    i,
                    "spxReattach",
                    2
                )
            ),

        bnDetach:
            Number(
                value(
                    i,
                    "bnDetach",
                    3
                )
            ),

        bnReattach:
            Number(
                value(
                    i,
                    "bnReattach",
                    2
                )
            ),

        syncBars:
            Number(
                value(
                    i,
                    "syncBars",
                    3
                )
            ),

        desyncBars:
            Number(
                value(
                    i,
                    "desyncBars",
                    2
                )
            ),

        showTradeLevels:
            Boolean(
                value(
                    i,
                    "showTradeLevels",
                    true
                )
            ),

        trailingSL:
            Boolean(
                value(
                    i,
                    "trailingSL",
                    true
                )
            ),

        reEntry:
            Boolean(
                value(
                    i,
                    "reEntry",
                    true
                )
            ),

        showDashboard:
            Boolean(
                value(
                    i,
                    "showDashboard",
                    true
                )
            ),

        showTradeDebug:
            Boolean(
                value(
                    i,
                    "showTradeDebug",
                    true
                )
            ),

        showZones:
            Boolean(
                value(
                    i,
                    "showZones",
                    true
                )
            ),

        showRRPosition:
            Boolean(
                value(
                    i,
                    "showRRPosition",
                    true
                )
            ),

        algoOptions:
            Boolean(
                value(
                    i,
                    "algoOptions",
                    false
                )
            ),

        greeksModel:
            Boolean(
                value(
                    i,
                    "greeksModel",
                    false
                )
            ),

        maximumRiskPercent:
            Number(
                value(
                    i,
                    "maximumRiskPercent",
                    1
                )
            ),

        riskReward:
            Number(
                value(
                    i,
                    "riskReward",
                    2
                )
            ),
    };
}

function rowsToOutput(
    rows: OpenAlgoResultRow[],
    settings: Record<string, unknown>
) {
    const showSignals =
        Boolean(
            value(
                settings,
                "showSignals",
                true
            )
        );

    const showConfidence =
        Boolean(
            value(
                settings,
                "showConfidence",
                true
            )
        );

    return {
        plots: Object.fromEntries(
            plots.map(
                p => [
                    p.id,
                    rows.map(
                        r => {
                            const raw =
                                (r as any)[p.id];

                            return (
                                raw === undefined
                                    ? null
                                    : raw
                            );
                        }
                    )
                ]
            )
        ),

        /*
         * OpenAlgo custom-indicator hosts can consume these side-channel
         * objects without changing the 14 primary plot contract.
         */
        markers:
            showSignals
                ? rows
                    .filter(
                        r => r.execMarker
                    )
                    .map(
                        r => r.execMarker
                    )
                : [],

        lifecycleEvents:
            rows
                .map(
                    (r, index) => ({
                        index,
                        time: r.time,
                        lifecycle: r.lifecycle,
                        direction:
                            r.tradeDirectionFinal,
                        executionAllowed:
                            r.executionAllowed,
                        entryPrice:
                            r.entryPrice,
                        stopLoss:
                            r.stopLoss,
                        tp1:
                            r.tp1,
                        tp2:
                            r.tp2,
                        tp3:
                            r.tp3,
                        reEntryPrice:
                            r.reEntryPrice,
                        reEntryStopLoss:
                            r.reEntryStopLoss,
                    })
                ),

        dashboard:
            rows.length
                ? {
                    ...(
                        rows[
                            rows.length - 1
                        ].runtimePanel ??
                        {}
                    ),
                    confidence:
                        showConfidence
                            ? rows[
                                rows.length - 1
                            ].confidenceValue
                            : null,
                    frozenPlan:
                        {
                            entryPrice:
                                rows[
                                    rows.length - 1
                                ].entryPrice,
                            stopLoss:
                                rows[
                                    rows.length - 1
                                ].stopLoss,
                            tp1:
                                rows[
                                    rows.length - 1
                                ].tp1,
                            tp2:
                                rows[
                                    rows.length - 1
                                ].tp2,
                            tp3:
                                rows[
                                    rows.length - 1
                                ].tp3,
                        },
                }
                : null,

        debug:
            rows.length
                ? rows[
                    rows.length - 1
                ].debug
                : null,

        zones:
            rows.length
                ? rows[
                    rows.length - 1
                ].zones
                : [],

        runtime:
            rows.length
                ? rows[
                    rows.length - 1
                ].runtime
                : null,

        rows,
    };
}

/*
 * Main calculation entry — called by the OpenAlgo chart-indicator runtime as
 * calc(bars, settings, store, ctx), per the registerIndicator contract.
 * `bars` already arrives as { time, open, high, low, close, volume }[];
 * `settings` is the flat map of current input values, keyed exactly as
 * declared in `inputs` below.
 */
function calc(
    bars: OpenAlgoBar[],
    settings: Record<string, unknown>,
    _store: Record<string, unknown>,
    ctx?: {
        symbol?: string;
        interval?: string;
        chartId?: string;
        exchange?: string;
        broker?: string;
        accountId?: string;
        isOptionsMode?: boolean;
        underlying?: string;
        strike?: number;
        strikeStep?: number;
        currentOptionType?: string;
        isMirrorOptionChart?: boolean;
    }
) {
    const options = optionsFromContext({
        inputs: settings,
        symbol: ctx?.symbol,
        chartId: ctx?.chartId ?? ctx?.symbol,
        timeframe: ctx?.interval,
        exchange: ctx?.exchange,
        broker: ctx?.broker,
        accountId: ctx?.accountId,
        isOptionsMode: ctx?.isOptionsMode,
        underlying: ctx?.underlying,
        strike: ctx?.strike,
        strikeStep: ctx?.strikeStep,
        currentOptionType: ctx?.currentOptionType,
        isMirrorOptionChart: ctx?.isMirrorOptionChart,
    });

    const rows = OpenAlgoAdapter.run(bars, options);
    const lastIndex = rows.length - 1;
    const out: Record<string, unknown> = {};

    for (const p of plots) {
        out[p.id] = rows.map((r) => {
            const raw = (r as any)[p.id];
            return raw === undefined ? null : raw;
        });
    }

    out.execMarker = rows.map((r) => r.execMarker ?? null);

    // Every column any hook (markers/table/draws/background/barColors/
    // alerts) reads must be explicitly returned by calc, even when it
    // isn't a declared plot. table() reads tradeDirectionFinal,
    // engineState, executionAllowed, confidenceValue, optionSymbol;
    // draws() reads zones.
    out.tradeDirectionFinal = rows.map((r) => r.tradeDirectionFinal ?? 0);
    out.engineState = rows.map((r) => r.engineState ?? null);
    out.executionAllowed = rows.map((r) => r.executionAllowed ?? false);
    out.confidenceValue = rows.map((r) => r.confidenceValue ?? null);
    out.optionSymbol = rows.map((r) => r.optionSymbol ?? null);
    out.zones = rows.map((r) => r.zones ?? []);

    out.lifecycleEvents = rows.map((r, index) => ({
        index,
        time: r.time,
        lifecycle: r.lifecycle,
        direction: r.tradeDirectionFinal,
        executionAllowed: r.executionAllowed,
        entryPrice: r.entryPrice,
        stopLoss: r.stopLoss,
        tp1: r.tp1,
        tp2: r.tp2,
        tp3: r.tp3,
        reEntryPrice: r.reEntryPrice,
        reEntryStopLoss: r.reEntryStopLoss,
    }));

    return out;
}

/*
 * Real dashboard readout, per contract.md's table() hook: { rows: [[cell,
 * cell], ...] }, each cell a { text } object — bare strings render as
 * "undefined" in the actual renderer (confirmed against the shipped
 * dashboard_table.js example, not just the doc comment).
 */
function table({ bars, values, settings }: any) {
    const i = bars.length - 1;
    if (i < 0) return null;
    const showConfidence = Boolean(value(settings, "showConfidence", true));
    const t = (v: unknown) => ({ text: String(v) });
    const num = (v: unknown) => (v == null || Number.isNaN(v) ? "-" : Number(v).toFixed(2));

    const rows: unknown[][] = [
        [t("Direction"), t(values.tradeDirectionFinal?.[i] > 0 ? "Long" : values.tradeDirectionFinal?.[i] < 0 ? "Short" : "Flat")],
        [t("Engine State"), t(values.engineState?.[i] ?? "-")],
        [t("Executable"), t(values.executionAllowed?.[i] ? "Yes" : "Blocked")],
    ];
    if (showConfidence && values.confidenceValue?.[i] != null) {
        rows.push([t("Confidence"), t(Number(values.confidenceValue[i]).toFixed(0))]);
    }
    // frozenPlan: the locked entry/SL/TP levels for the active trade, if
    // any — mirrors AJDecisionEngine's tradePlanLock/dashboardTradePlan,
    // surfaced here as the table's trade-plan rows.
    const frozenPlan = {
        entryPrice: values.entryPrice?.[i],
        stopLoss: values.stopLoss?.[i],
        tp1: values.tp1?.[i],
        tp2: values.tp2?.[i],
        tp3: values.tp3?.[i],
    };
    if (frozenPlan.entryPrice != null) rows.push([t("Entry"), t(num(frozenPlan.entryPrice))]);
    if (frozenPlan.stopLoss != null) rows.push([t("SL"), t(num(frozenPlan.stopLoss))]);
    if (frozenPlan.tp1 != null) rows.push([t("TP1"), t(num(frozenPlan.tp1))]);
    if (frozenPlan.tp2 != null) rows.push([t("TP2"), t(num(frozenPlan.tp2))]);
    if (frozenPlan.tp3 != null) rows.push([t("TP3"), t(num(frozenPlan.tp3))]);
    if (values.optionSymbol?.[i]) rows.push([t("Option"), t(values.optionSymbol[i])]);

    return { rows };
}

/*
 * Real zone drawings, per contract.md (1.7.1): time/price-anchored boxes.
 * NOTE: assumes OpenAlgoAdapter's zonesAtBar entries carry
 * { low, high, from, to, type, label } — matches the field names the old
 * ajindicator.js draws() consumed. Flag me if the shape differs; I don't
 * have the exact zonesAtBar construction site to confirm.
 */
const ZONE_FILL: Record<string, string> = {
    bullOB: "#26A69A", bearOB: "#EF5350",
    bullFVG: "#26A69A", bearFVG: "#EF5350",
    liquidity: "#FFD54F",
};

function draws({ bars, values, settings }: any) {
    if (!Boolean(value(settings, "showZones", true))) return [];
    const i = bars.length - 1;
    if (i < 0) return [];
    const zones = values.zones?.[i];
    if (!Array.isArray(zones)) return [];
    return zones
        .filter((z: any) => z && z.low != null && z.high != null && z.from != null && z.to != null)
        .map((z: any) => ({
            kind: "box",
            from: { time: z.from, price: z.high },
            to: { time: z.to, price: z.low },
            fillColor: ZONE_FILL[z.type] || "#888888",
            opacity: 0.2,
            text: z.label || z.type,
        }));
}

const registryInputs = inputs.map((i) => ({
    key: i.name,
    type: i.type === "string" ? "text" : i.type,
    label: i.label,
    default: i.default,
    ...(i.options ? { options: i.options.map((o) => ({ label: o, value: o })) } : {}),
    ...(i.min !== undefined ? { min: i.min } : {}),
    ...(i.max !== undefined ? { max: i.max } : {}),
    ...(i.step !== undefined ? { step: i.step } : {}),
}));

const registryPlots = plots.map((p) => ({
    key: p.id,
    type: p.type,
    title: p.label,
    style: { color: p.color, lineWidth: p.width },
}));

const indicator = {
    id: "aj-institutional",
    name: "AJInstitutional",
    shortName: "AJInstitutional",
    version: "2.0.1",
    description:
        "AJ Institutional AI + SMC institutional decision engine with frozen execution plan, lifecycle, re-entry, dashboard, debug and institutional zones.",
    placement: "onchart" as const,

    inputs,
    plots,

    calculate: calc,
    run: calc,
    execute: calc,

    metadata: {
        family: "AJ Institutional",
        engineModes: ["SCORE", "AI", "AI_SMC"],
        plotCount: 14,
        inputCount: 36,
        features: [
            "frozen trade snapshot",
            "closed snapshot persistence",
            "BUY/SELL execution markers",
            "lifecycle events",
            "re-entry",
            "institutional zones",
            "dashboard",
            "debug",
            "confidence visibility",
            "chart isolation",
            "replay reset",
        ],
    },
};

/*
 * The registerIndicator contract (validate.mjs, customIndicators.ts): the
 * default export is called ONCE with { registerIndicator, ...api } and must
 * call registerIndicator(descriptor).
 */
export default function ({ registerIndicator }: { registerIndicator: (d: unknown) => void }) {
    registerIndicator({
        id: indicator.id,
        name: indicator.name,
        category: "Custom",
        placement: indicator.placement,
        inputs: registryInputs,
        plots: registryPlots,
        calc,
        markers: ({ values, settings }: any) => {
            const showSignals = Boolean(value(settings, "showSignals", true));
            if (!showSignals) return [];
            return (values.execMarker ?? []).filter(Boolean);
        },
        draws,
        table,
    });
}

export { indicator, calc };