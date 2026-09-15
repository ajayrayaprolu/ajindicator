/****************************************************************************************
 * File:
 * SignalEngine.ts
 *
 * Path:
 * src/runtime/signals/SignalEngine.ts
 *
 * AJ v2 - Runtime Signal Normalization Engine
 *
 * Purpose
 * -------
 * SignalEngine is the canonical runtime signal normalization engine within
 * the AJ v2 Institutional Trading Framework.
 *
 * The engine transforms validated AJDecisionResult objects into a
 * standardized Signal model used throughout the runtime, visualization,
 * backtesting and reporting subsystems.
 *
 * SignalEngine does not generate trading decisions. It consumes decisions
 * already approved by the institutional execution pipeline and converts
 * them into normalized runtime signals.
 *
 * Responsibilities
 * ----------------
 * • Filter executable decisions.
 * • Ignore rejected decisions.
 * • Normalize approved decisions.
 * • Build runtime Signal objects.
 * • Maintain chronological signal ordering.
 * • Aggregate signal statistics.
 * • Produce immutable Signal collections.
 *
 * Functional Areas
 * ----------------
 *
 * Signal Normalization
 * • Convert AJDecisionResult into Signal.
 * • Standardize runtime signal format.
 * • Normalize execution metadata.
 *
 * Execution Filtering
 * • Validate execution authorization.
 * • Ignore non-executable decisions.
 * • Ignore neutral directions.
 *
 * Signal Ordering
 * • Sort signals chronologically.
 * • Preserve execution sequence.
 *
 * Signal Aggregation
 * • Count BUY signals.
 * • Count SELL signals.
 * • Count SHORT signals.
 * • Count COVER signals.
 * • Count executable signals.
 * • Calculate average trade score.
 * • Produce runtime summary statistics.
 *
 * Inputs
 * ------
 * SignalEngine consumes:
 *
 * • AJDecisionResult
 * • Runtime index
 * • Runtime timestamp
 *
 * Outputs
 * -------
 * SignalEngine produces:
 *
 * Normalized Signals
 * • Signal[]
 *
 * Runtime Summary
 * • Total signals
 * • Executable signals
 * • Buy count
 * • Sell count
 * • Short count
 * • Cover count
 * • Average trade score
 *
 * Upstream Dependencies
 * ---------------------
 * SignalEngine consumes outputs from:
 *
 * • AJDecisionEngine
 * • ExecutionAuthority
 * • Normalize
 *
 * Downstream Consumers
 * --------------------
 * Signal objects are consumed by:
 *
 * • RuntimeEngine
 * • ChartEngine
 * • Backtesting Engine
 * • Performance Analytics
 * • Trade History
 * • Reporting Dashboard
 * • Strategy Evaluation
 *
 * Design Principles
 * -----------------
 * • Single Responsibility Principle.
 * • Deterministic normalization.
 * • Immutable output.
 * • Runtime-only transformation.
 * • No business logic.
 * • No signal generation.
 * • No execution authorization.
 * • No trade qualification.
 * • No position management.
 * • No risk calculation.
 * • No runtime mutation.
 *
 * AJ v2 Runtime Pipeline
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
 * AJDecisionResult
 *        │
 *        ▼
 * SignalEngine
 *        │
 *        ▼
 * Normalize
 *        │
 *        ▼
 * Signal[]
 *        │
 *        ▼
 * Runtime / Charts / Backtesting / Analytics
 *
 * Notes
 * -----
 * • SignalEngine does not create BUY or SELL decisions.
 * • It only converts approved decisions into runtime signals.
 * • ExecutionAuthority remains the sole owner of execution approval.
 * • AIConfidenceEngine remains the sole owner of confidence evaluation.
 * • ExecutionEngine remains the sole owner of execution planning.
 * • SignalEngine performs no market analysis.
 * • SignalEngine performs no indicator calculations.
 * • SignalEngine performs no risk qualification.
 * • SignalEngine performs no trade execution.
 * • Signal represents the canonical runtime signal model used throughout
 *   the AJ v2 Institutional Trading Framework.
 ****************************************************************************************/

import type { AJDecisionResult } from "../../indicators/AJIndicator/AJTypes";
import type { Signal } from "./Signal";
import { Normalize } from "./normalize";

export class SignalEngine {
	
    //--------------------------------------------------
    // BUILD SIGNALS
    //--------------------------------------------------

	static normalize(
		results: {
			index: number;
			time: number;
			decision: AJDecisionResult;
		}[]
	): Signal[] {
	
		const signals: Signal[] = [];
	
		for (const row of results) {
	
			const d = row.decision;
	
			if (
				d.longSignal === true &&
				d.canExecute === true
			) {
	
				signals.push(
					Normalize.toSignal(
						d,
						row.index,
						row.time
					)
				);
	
				continue;
			}
	
			if (
				d.shortSignal === true &&
				d.canExecute === true
			) {
	
				signals.push(
					Normalize.toSignal(
						d,
						row.index,
						row.time
					)
				);
			}
		}
	
		signals.sort(
			(a, b) =>
				a.time - b.time
		);
	
		return signals;
	}

    //--------------------------------------------------
    // SUMMARY
    //--------------------------------------------------

    static aggregate(signals: Signal[]) {

        const buyCount =
            signals.filter(
                s=>s.action==="BUY"
            ).length;

        const sellCount =
            signals.filter(
                s=>s.action==="SELL"
            ).length;

        const shortCount =
            signals.filter(
                s=>s.action==="SHORT"
            ).length;

        const coverCount =
            signals.filter(
                s=>s.action==="COVER"
            ).length;

        const averageScore =
            signals.length===0
                ?0
                :signals.reduce(
                    (x,s)=>x+s.tradeScore,
                    0
                )/signals.length;

        return {
            total: signals.length,
            executableSignals: signals.filter(s=>s.executionAllowed).length,
            buyCount,
            sellCount,
            shortCount,
            coverCount,
            averageScore
        };
    }
}

