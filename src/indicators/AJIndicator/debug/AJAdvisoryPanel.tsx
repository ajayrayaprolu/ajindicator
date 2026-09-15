//======================================================
// src/indicators/AJIndicator/debug/AJAdvisoryPanel.tsx
// AJ Advisory Panel
//
// Plain-English trading advisory card, shown alongside
// AJDebugOverlay when Debug mode is enabled.
//
// This is a PRESENTATION COMPONENT ONLY - it translates
// the same DebugEngine snapshot AJDebugOverlay already
// reads into human-readable phrases. It performs no
// scoring, no bias calculation, no trading logic.
//======================================================

import { useEffect, useState } from "react";

import {
    DebugEngine,
    type DebugData
} from "../../../debug/DebugEngine";

import type { AJDebugTradeReasons } from "./AJDebugBuilder";

import { ActiveChartStore } from "../../../store/ActiveChartStore";

//======================================================
// COPY MAPPING
//======================================================

function marketMoodText(directionText?: string): {
    label: string;
    color: string;
} {

    if (directionText === "LONG") {
        return { label: "Bullish Momentum", color: "var(--success-text)" };
    }

    if (directionText === "SHORT") {
        return { label: "Bearish Momentum", color: "var(--danger-text)" };
    }

    return { label: "Neutral / Waiting", color: "var(--text-muted)" };

}

function mentorAdviceText(debug: DebugData): string {

    const state =
        debug.engineState ?? debug.state ?? "SCAN";

    if (state === "SCAN") {
        return "No clear setup yet - stay on the sidelines.";
    }

    if (state === "ARMED") {
        return "Setup forming - wait for confirmation before entering.";
    }

    if (state === "CONFIRMED" || state === "EXECUTED") {
        return debug.directionText === "LONG"
            ? "Only plan CE entries on this setup."
            : debug.directionText === "SHORT"
                ? "Only plan PE entries on this setup."
                : "Conditions confirmed - check option side before entry.";
    }

    if (state === "MANAGE") {
        return "Trade is live - manage risk, do not add fresh entries.";
    }

    return "No active recommendation right now.";

}

function readinessText(debug: DebugData): string {

    if (debug.blockReason && debug.blockReason !== "READY") {
        return debug.blockReason === "NO SCORE"
            ? "Score too low - conditions not aligned yet."
            : debug.blockReason === "SCORE BLOCKED"
                ? "Authority gate has blocked entries right now."
                : debug.blockReason === "NO BREAKOUT"
                    ? "Waiting for a breakout to confirm direction."
                    : debug.blockReason;
    }

    return "Conditions are aligned - execution is ready.";

}

//======================================================
// COMPONENT
//======================================================

interface AJAdvisoryPanelProps {
    onOptionFocus?: (symbol: string) => void;
}

export default function AJAdvisoryPanel({
    onOptionFocus
}: AJAdvisoryPanelProps) {

    const [debug, setDebug] =
        useState<DebugData | null>(null);

    useEffect(() => {

        const id = setInterval(() => {

            if (!DebugEngine.isEnabled()) {
                setDebug(null);
                return;
            }

            const chartId =
                ActiveChartStore.getActiveChart();

            if (!chartId) {
                setDebug(null);
                return;
            }

            setDebug(
                DebugEngine.get(chartId)
            );

        }, 500);

        return () => clearInterval(id);

    }, []);

    if (
        !DebugEngine.isEnabled() ||
        !debug
    ) {
        return null;
    }

    const mood =
        marketMoodText(debug.directionText);

    return (

        <div
            style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-primary)",
                borderRadius: 8,
                marginTop: 10,
                overflow: "hidden",
                fontFamily: "inherit"
            }}
        >

            {/* HEADER */}
            <div
                style={{
                    padding: "10px 14px",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text-heading)",
                    background: "var(--bg-panel-secondary)",
                    borderBottom: "1px solid var(--border-primary)"
                }}
            >
                🧭 AJ Advisory
            </div>

            {/* ROWS */}
            <div
                style={{
                    padding: "6px 0",
                    maxHeight: 340,
                    overflowY: "auto"
                }}
            >

                <Row
                    label="Market Mood"
                    value={mood.label}
                    valueColor={mood.color}
                />

                <Row
                    label="Mentor Advice"
                    value={mentorAdviceText(debug)}
                />

                <Row
                    label="Readiness"
                    value={readinessText(debug)}
                />

                {
                    debug.tradeReasons && (
                        <ReasonRow reasons={debug.tradeReasons} />
                    )
                }

                {
                    debug.optionSymbol &&
                    debug.optionSymbol !== "-" ? (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 12,
                                padding: "4px 14px",
                                fontSize: 11,
                                lineHeight: 1.35
                            }}
                        >
                            <span
                                style={{
                                    color: "var(--text-muted)",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    minWidth: 100
                                }}
                            >
                                Option Focus
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    onOptionFocus?.(
                                        debug.optionSymbol as string
                                    )
                                }
                                title="Open this option on the active chart"
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    padding: 0,
                                    margin: 0,
                                    color: "var(--accent-primary)",
                                    textAlign: "right",
                                    fontWeight: 700,
                                    cursor: onOptionFocus
                                        ? "pointer"
                                        : "default",
                                    textDecoration: onOptionFocus
                                        ? "underline"
                                        : "none",
                                    textUnderlineOffset: 2,
                                    fontFamily: "inherit",
                                    fontSize: 11
                                }}
                            >
                                {debug.optionSymbol}
                            </button>
                        </div>
                    ) : (
                        <Row
                            label="Option Focus"
                            value={
                                debug.directionText === "LONG"
                                    ? "CE side"
                                    : debug.directionText === "SHORT"
                                        ? "PE side"
                                        : "Not decided yet"
                            }
                            valueColor="var(--accent-primary)"
                        />
                    )
                }

            </div>

        </div>

    );

}

//======================================================
// REASON FOR TRADE
//======================================================

function ReasonRow({
    reasons
}: {
    reasons: AJDebugTradeReasons;
}) {

    const [open, setOpen] = useState(false);

    return (

        <div style={{ padding: "6px 14px", fontSize: 12 }}>

			<button
				type="button"
				onClick={() => setOpen(v => !v)}
				title={
					open
						? "Hide the gate-by-gate breakdown"
						: "Show the gate-by-gate breakdown"
				}
				aria-expanded={open}
				style={{
					width: "100%",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: 12,
					padding: 0,
					margin: 0,
					border: "none",
					background: "transparent",
					color: "inherit",
					cursor: "pointer",
					userSelect: "none",
					textAlign: "left",
					fontFamily: "inherit",
					fontSize: "inherit"
				}}
			>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						color: "var(--text-muted)",
						fontWeight: 600,
						flexShrink: 0
					}}
				>
					<span
						aria-hidden="true"
						style={{
							display: "inline-block",
							width: 0,
							height: 0,
							borderLeft: "5px solid transparent",
							borderRight: "5px solid transparent",
							borderTop: open
								? "none"
								: "6px solid var(--text-muted)",
							borderBottom: open
								? "6px solid var(--text-muted)"
								: "none"
						}}
					/>
			
					<span>
						Reason for Trade
					</span>
				</span>
			
				<span
					style={{
						color: "var(--accent-primary)",
						fontWeight: 600,
						textAlign: "right"
					}}
				>
					{reasons.summary}
				</span>
			</button>

            {
                open && (
                    <div
                        style={{
                            marginTop: 8,
                            padding: 10,
                            background: "var(--bg-panel-secondary)",
                            border: "1px solid var(--border-primary)",
                            borderRadius: 6,
                            maxHeight: 220,
                            overflowY: "auto"
                        }}
                    >

                        {
                            reasons.gates.map(gate => (
                                <div
                                    key={gate.label}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "3px 0",
                                        color: gate.passed ? "var(--success-text)" : "var(--danger-text)"
                                    }}
                                >
                                    <span>{gate.label}</span>
                                    <span>{gate.value}</span>
                                </div>
                            ))
                        }

                        {
                            reasons.negativeFactors.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>
                                        Blocking Factors
                                    </div>
                                    {
                                        reasons.negativeFactors.map(f => (
                                            <div key={f} style={{ color: "var(--danger-text)" }}>
                                                â€¢ {f}
                                            </div>
                                        ))
                                    }
                                </div>
                            )
                        }

                    </div>
                )
            }

        </div>

    );

}

//======================================================
// ROW
//======================================================

function Row({
    label,
    value,
    valueColor
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                padding: "4px 14px",
                fontSize: 11,
                lineHeight: 1.35
            }}
        >

            <span
                style={{
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    flexShrink: 0,
                    minWidth: 100
                }}
            >
                {label}
            </span>

            <span
                style={{
                    color: valueColor ?? "var(--text-primary)",
                    textAlign: "right",
                    fontWeight: 600
                }}
            >
                {value}
            </span>

        </div>

    );

}
