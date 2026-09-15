//======================================================
// AJ v2 DEBUG OVERLAY
//======================================================
//
// File:
// src/debug/DebugOverlay.tsx
//
// Purpose:
// TradingView-style developer diagnostic UI for the
// AJ Institutional Indicator.
//
// AJDebugOverlay is a PRESENTATION COMPONENT.
//
// It does NOT:
// • calculate trading signals
// • calculate scores
// • calculate confidence
// • calculate AI decisions
// • calculate SMC decisions
// • calculate authority
// • modify pipeline state
// • make execution decisions
//
// It ONLY:
// • reads DebugEngine state
// • identifies the active chart
// • retrieves the current DebugData snapshot
// • formats the snapshot using buildDebugText()
// • renders the AJ v2 diagnostic dashboard
// • displays pipeline lifecycle status
//
//======================================================
// AJ v2 DATA FLOW
//======================================================
//
// AJDecisionEngine
//       │
//       ▼
// ContextResult
//       │
//       ▼
// ConfidenceResult
//       │
//       ▼
// AIResult
//       │
//       ▼
// SMCResult
//       │
//       ▼
// AuthorityResult
//       │
//       ▼
// StateResult
//       │
//       ▼
// Runtime / AJDecisionSnapshot
//       │
//       ▼
// AJDebugBuilder
//       │
//       ▼
// DebugData
//       │
//       ▼
// DebugEngine
//       │
//       ▼
// AJDebugOverlay
//       │
//       ▼
// TradingView-style Debug Dashboard
//
//======================================================
// RESPONSIBILITY BOUNDARY
//======================================================
//
// AJDebugOverlay
//      │
//      ├── READ DebugEngine
//      ├── READ ActiveChartStore
//      ├── CALL buildDebugText()
//      └── RENDER UI
//
// It must NOT call:
//
// • ContextEngine
// • ScoreEngine
// • ConfidenceEngine
// • AIEngine
// • SMC Engine
// • AuthorityEngine
// • ExecutionEngine
//
//======================================================
// AJ v2 ARCHITECTURAL PRINCIPLE
//======================================================
//
// Runtime engines produce canonical data.
//
// AJDebugBuilder converts canonical AJ v2 data
// into developer-facing DebugData.
//
// DebugEngine stores/serves the debug snapshot.
//
// AJDebugOverlay renders that snapshot.
//
// Therefore:
//
//        BUSINESS LOGIC
//              │
//              ▼
//       CANONICAL AJ v2
//              │
//              ▼
//        DEBUG ADAPTER
//              │
//              ▼
//         DEBUG MODEL
//              │
//              ▼
//           UI ONLY
//
// The debug UI must never become a second
// implementation of the trading pipeline.
//
//======================================================

import {useEffect, useState} from "react";

import {
    DebugEngine,
    buildDebugText,
    type DebugData
} from "../../../debug/DebugEngine";

import {ActiveChartStore} from "../../../store/ActiveChartStore";

//======================================================

export default function AJDebugOverlay() {

    const [

        debug,
        setDebug
    ] =
    useState<DebugData | null>(
        null
    );

	//--------------------------------------------------
    // POLL DEBUG ENGINE
    //--------------------------------------------------

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
	
			DebugEngine.setActiveChart(
				chartId
			);
	
			setDebug(
				DebugEngine.get(chartId)
			);
	
		}, 500);
	
		return () => {
			clearInterval(id);
		};
	
	}, []);

    //--------------------------------------------------
    // DEBUG DISABLED
    //--------------------------------------------------

    if (
        !DebugEngine.isEnabled()
    ) {
        return null;
    }

	//--------------------------------------------------
	// AJ INDICATOR / DEBUG SNAPSHOT STATUS
	//--------------------------------------------------
	
	const hasDebugData =
		DebugEngine.hasData();
	
	//--------------------------------------------------
	// AJ INDICATOR NOT ACTIVE ANYWHERE
	//--------------------------------------------------
	
	if (
		!hasDebugData
	) {
		return (
			<div
				style={{
					width: "100%",
					height: 120,
					minHeight: 120,
					boxSizing: "border-box",
					background: "rgba(0,0,0,0.78)",
					color: "#ffaa00",
					border: "1px solid #ffaa00",
					borderRadius: 6,
					padding: 15,
					fontSize: 12,
					fontWeight: 700,
					fontFamily:
						"'Consolas','Cascadia Mono','Courier New',monospace",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					textAlign: "center",
					whiteSpace: "normal"
				}}
			>
				<span>
					Enable AJ Institutional Indicator
					<br />
					to view Debug Data
				</span>
			</div>
		);
	}
	
	//--------------------------------------------------
	// AJ DATA EXISTS BUT ACTIVE CHART HAS NO SNAPSHOT
	//--------------------------------------------------
	
	if (
		!debug
	) {
		return (
			<div
				style={{
					width: "100%",
					height: 120,
					minHeight: 120,
					boxSizing: "border-box",
					background: "rgba(0,0,0,0.78)",
					color: "#ffaa00",
					border: "1px solid #ffaa00",
					borderRadius: 6,
					padding: 15,
					fontSize: 12,
					fontWeight: 700,
					fontFamily:
						"'Consolas','Cascadia Mono','Courier New',monospace",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					textAlign: "center",
					whiteSpace: "normal"
				}}
			>
				<span>
					AJ Debug Data Not Available
					<br />
					Select a chart with AJ Institutional Indicator enabled
				</span>
			</div>
		);
	}

    //--------------------------------------------------
    // RENDER
    //--------------------------------------------------
    
    return (
    
		<div
			style={{
				width: "100%",
				height: 360,
				minHeight: 360,
				maxHeight: 360,
				overflow: "hidden",
				boxSizing: "border-box",
				background: "var(--console-background)",
				color: "var(--console-text)",
				border: "1px solid var(--console-border)",
				borderRadius: 6,
				padding: 10,
				fontFamily:	"'Consolas','Cascadia Mono','Courier New',monospace",
				fontSize: 11,
				lineHeight: "16px",
				whiteSpace: "pre",
				wordBreak: "normal",
				overflowWrap: "normal"
			}}
		>
			<pre
				style={{
					margin: 0,
					padding: 0,
					width: "100%",
					maxWidth: "100%",
					boxSizing: "border-box",
					whiteSpace: "pre",
					wordBreak: "normal",
					overflowWrap: "normal",
					overflow: "hidden",
					fontFamily:	"'Consolas','Cascadia Mono','Courier New',monospace",
					fontSize: 11,
					lineHeight: "16px",
					tabSize: 4
				}}
			>
    
			{buildDebugText(debug)
				.split("\n")
				.map((line, index) => (
					<span key={index}>
						{line
							.split(/(\[X\])/g)
							.map((part, i) =>
								part === "[X]"
									? (
										<span
											key={i}
											style={{
												color: "#ff3333",
												fontWeight: 700
											}}
										>
											[X]
										</span>
									)
									: part
							)
						}
						{"\n"}
					</span>
				))
			}
            </pre>
            <div
                style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily:
                        "'Consolas','Cascadia Mono','Courier New',monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    userSelect: "none"
                }}
            >
                {[
                    "SCAN",
                    "ARMED",
                    "CONFIRMED",
                    "EXECUTED",
                    "MANAGE",
                    "CLOSED"
                ].map((step, index) => {
    
                    const current =
    
                        debug.engineState ??
                        debug.state ??
                        "SCAN";
    
                    const order = [
                        "SCAN",
                        "ARMED",
                        "CONFIRMED",
                        "EXECUTED",
                        "MANAGE",
                        "CLOSED"
                    ];
    
                    const currentIndex =
                        order.indexOf(current);
    
                    const color =
    
                        index < currentIndex
                            ? "#00aa55"
                            : index === currentIndex
                                ? "#00ff44"
                                : "#555555";
    
                    return (
    
                        <span
                            key={step}
                            style={{
                                color,
                                minWidth: 78,
                                textAlign: "center"
                            }}
                        >
                            {step}
    
                        </span>
    
                    );
    
                })}
    
            </div>
    
        </div>
    
    );

}