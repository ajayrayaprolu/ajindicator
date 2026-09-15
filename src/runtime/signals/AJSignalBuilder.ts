/****************************************************************************************
 * File:
 * AJSignalBuilder.ts
 *
 * Path:
 * src/runtime/signals/AJSignalBuilder.ts
 *
 * AJ v2 - Runtime Chart Marker Builder
 *
 * Purpose
 * -------
 * AJSignalBuilder is the canonical visualization adapter within the
 * AJ v2 Institutional Trading Framework.
 *
 * The builder converts normalized runtime Signal objects into TradingView-
 * compatible chart markers for graphical visualization.
 *
 * It renders only confirmed execution events and intentionally ignores
 * rejected, simulated or non-executed trade decisions.
 *
 * AJSignalBuilder is a visualization component only. It does not perform
 * market analysis, signal generation or execution authorization.
 *
 * Responsibilities
 * ----------------
 * • Convert runtime signals into chart markers.
 * • Display BUY execution markers.
 * • Display SELL execution markers.
 * • Filter non-executed signals.
 * • Filter non-authorized signals.
 * • Filter invalid trade scores.
 * • Generate TradingView-compatible marker objects.
 * • Preserve chronological execution visualization.
 * • Return immutable ChartMarker collections.
 *
 * Functional Areas
 * ----------------
 *
 * Signal Filtering
 * • Executed trades only.
 * • Execution-authorized trades only.
 * • Positive trade-score validation.
 *
 * Marker Generation
 * • BUY markers.
 * • SELL markers.
 * • Marker positioning.
 * • Marker shape selection.
 * • Marker labeling.
 *
 * Visualization
 * • TradingView-compatible format.
 * • Execution candle annotation.
 * • Chart overlay support.
 *
 * Marker Management
 * • Recent BUY markers.
 * • Recent SELL markers.
 * • Marker ordering.
 *
 * Inputs
 * ------
 * AJSignalBuilder consumes:
 *
 * • Signal[]
 *
 * Each Signal contains:
 *
 * • Execution status.
 * • Execution authorization.
 * • Trade direction.
 * • Trade score.
 * • Timestamp.
 *
 * Outputs
 * -------
 * AJSignalBuilder produces:
 *
 * AJSignalBuilder[]
 *
 * Each AJSignalBuilder contains:
 *
 * • Execution time.
 * • Marker position.
 * • Marker shape.
 * • Marker color.
 * • Marker label.
 *
 * Upstream Dependencies
 * ---------------------
 * AJSignalBuilder consumes outputs produced by:
 *
 * • SignalEngine
 * • Normalize
 * • RuntimeExecutionEngine
 *
 * Downstream Consumers
 * --------------------
 * ChartMarker objects are consumed by:
 *
 * • ChartEngine
 * • TradingView Renderer
 * • Workspace Charts
 * • Backtesting Visualization
 * • Trade Replay
 * • Performance Dashboard
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Pure visualization adapter.
 * • Deterministic rendering.
 * • Immutable output.
 * • No business logic.
 * • No signal generation.
 * • No execution authorization.
 * • No market analysis.
 * • No risk calculations.
 * • No position management.
 * • No runtime mutation.
 *
 * AJ v2 Visualization Pipeline
 *
 * RuntimeContextBuilder
 *        │
 *        ▼
 * ContextEngine
 *        │
 *        ▼
 * AIConfidenceEngine
 *        │
 *        ▼
 * ExecutionAuthority
 *        │
 *        ▼
 * ExecutionEngine
 *        │
 *        ▼
 * RuntimeExecutionEngine
 *        │
 *        ▼
 * SignalEngine
 *        │
 *        ▼
 * Normalize
 *        │
 *        ▼
 * AJSignalBuilder
 *        │
 *        ▼
 * ChartEngine
 *        │
 *        ▼
 * TradingView Chart
 *
 * Notes
 * -----
 * • AJSignalBuilder renders visualization objects only.
 * • It does not determine BUY or SELL decisions.
 * • It does not authorize execution.
 * • It does not calculate confidence.
 * • It does not evaluate market structure.
 * • It does not calculate risk.
 * • It does not execute trades.
 * • It does not manage positions.
 * • It visualizes only confirmed execution events.
 * • ChartMarker represents the canonical chart annotation contract used
 *   throughout the AJ v2 Institutional Trading Framework.
 ****************************************************************************************/

import type {Signal} from "./Signal";

//======================================================
// TradingView Marker Contract
//======================================================

export interface ChartMarker {

    time:number;
    position:
        "aboveBar" |
        "belowBar";
    shape:
        "arrowUp" |
        "arrowDown";
    color:string;
    text:string;
}

//======================================================

export class AJSignalBuilder {

    static build(
        signals:Signal[]
    ):ChartMarker[] {
    
        const buyMarkers:ChartMarker[]=[];
        const sellMarkers:ChartMarker[]=[];

        for(const signal of signals){

            //--------------------------------------------------
            // Pine execution only
            //--------------------------------------------------

            if(!signal.enteredExecuted)
                continue;

            if(!signal.executionAllowed)
                continue;

            if(signal.tradeScore<=0)
                continue;

            const isBuy =
                signal.action==="BUY";

            const marker:ChartMarker={

                time:signal.time,

                position:
                    isBuy
                        ?"belowBar"
                        :"aboveBar",

                shape:
                    isBuy
                        ?"arrowUp"
                        :"arrowDown",

                color:
                    "#00C853",

                text:
                    isBuy
                        ?"BUY"
                        :"SELL"

            };

            if(isBuy)
                buyMarkers.push(marker);
            else
                sellMarkers.push(marker);
        }

    return [

        ...buyMarkers,

        ...sellMarkers

    ];

    }

}