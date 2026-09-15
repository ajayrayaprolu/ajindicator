//======================================================
// AJ LOGGING GATE
//======================================================
//
// File:
// AJLoggingGate.ts
//
// Path:
// src/indicators/AJIndicator/debug/AJLoggingGate.ts
//
// Purpose:
// Canonical global logging gate for AJ Indicator.
//
// Responsibilities:
//
// • Controls AJ console diagnostic emission.
// • Provides one global ON/OFF state.
// • Allows all AJ engines to use the same logging gate.
// • Prevents individual engines from maintaining their
//   own logging switches.
//
// IMPORTANT:
//
// This gate controls CONSOLE OUTPUT ONLY.
//
// It MUST NOT control:
//
// • AJPipelineTrace
// • Runtime state
// • Runtime cache
// • Debug snapshots
// • Dashboard state
// • Pipeline execution
// • Confidence calculation
// • Scanner execution
//
// Architecture:
//
// Workspace8
//     │
//     ▼
// AJLoggingGate
//     │
//     ├── ON  ──► Console output
//     │
//     └── OFF ──► No console output
//
// AJPipelineTrace remains independent.
// 		
// Workspace8
// │
// ├── Scanner [✓]
// ├── Debug   [✓]
// └── Logging [✓]
//           │
//           ▼
//    AJLoggingGate
//           │
//           ├───────────────┐
//           │               │
//        ON │            OFF│
//           ▼               ▼
//     Console output     No console
//           │               │
//           └───────┬───────┘
//                   │
//                   ▼
//            AJ Pipeline
//                   │
//       ┌───────────┼──────────────┐
//       ▼           ▼              ▼
//    Context     Confidence      Payload
//    Engine       Engine         Builder
//       │           │              │
//       └───────────┼──────────────┘
//                   ▼
//            AJPipelineTrace
//                   │
//         ┌─────────┼──────────┐
//         ▼         ▼          ▼
//    Runtime      Debug      Dashboard
//     Cache       Panel       Phase 16
//
//========================================================
import type { EngineDiagnostic} from "./EngineDiagnostic";
//========================================================
export class AJLoggingGate {

    //--------------------------------------------------
    // GLOBAL STATE
    //--------------------------------------------------

    private static enabled = false;

    //--------------------------------------------------
    // ENABLE / DISABLE
    //--------------------------------------------------

    /**
     * Enable or disable AJ console logging globally.
     *
     * This does NOT affect AJPipelineTrace or any
     * runtime pipeline state.
     */
    static setEnabled(
        enabled: boolean
    ): void {

        AJLoggingGate.enabled =
            Boolean(enabled);

    }

	//--------------------------------------------------
	// READ STATE
	//--------------------------------------------------
	
	/**
	* Returns the current global AJ logging state.
	*/
	static isEnabled(): boolean {
	
		return AJLoggingGate.enabled;
	
	}
	
	//--------------------------------------------------
	// TOGGLE
	//--------------------------------------------------
	
	/**
	* Toggle AJ console logging.
	*
	* Returns the new logging state.
	*/
	static toggle(): boolean {
	
		const next =
			!AJLoggingGate.enabled;
	
		AJLoggingGate.enabled =
			next;
	
		return next;
	
	}

    //--------------------------------------------------
    // LOG
    //--------------------------------------------------

    /**
     * Controlled replacement for console.log().
     */
    static log(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.log(
            ...args
        );

    }

    //--------------------------------------------------
    // INFO
    //--------------------------------------------------

    /**
     * Controlled replacement for console.info().
     */
    static info(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.info(
            ...args
        );

    }

    //--------------------------------------------------
    // WARN
    //--------------------------------------------------

    /**
     * Controlled replacement for console.warn().
     */
    static warn(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.warn(
            ...args
        );

    }

    //--------------------------------------------------
    // ERROR
    //--------------------------------------------------

    /**
     * Controlled replacement for console.error().
     */
    static error(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.error(
            ...args
        );

    }

    //--------------------------------------------------
    // DEBUG
    //--------------------------------------------------

    /**
     * Controlled replacement for console.debug().
     */
    static debug(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.debug(
            ...args
        );

    }

    //--------------------------------------------------
    // TRACE
    //--------------------------------------------------

    /**
     * Controlled replacement for console.trace().
     */
    static trace(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.trace(
            ...args
        );

    }

    //--------------------------------------------------
    // GROUP
    //--------------------------------------------------

    /**
     * Controlled replacement for console.group().
     */
    static group(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.group(
            ...args
        );

    }

    //--------------------------------------------------
    // GROUP COLLAPSED
    //--------------------------------------------------

    /**
     * Controlled replacement for console.groupCollapsed().
     */
    static groupCollapsed(
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.groupCollapsed(
            ...args
        );

    }

    //--------------------------------------------------
    // GROUP END
    //--------------------------------------------------

    /**
     * Controlled replacement for console.groupEnd().
     */
    static groupEnd(): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.groupEnd();

    }

    //--------------------------------------------------
    // TABLE
    //--------------------------------------------------

    /**
     * Controlled replacement for console.table().
     */
    static table(
        data?: unknown,
        properties?: string[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.table(
            data,
            properties
        );

    }

    //--------------------------------------------------
    // ASSERT
    //--------------------------------------------------

    /**
     * Controlled replacement for console.assert().
     */
    static assert(
        condition?: boolean,
        ...args: unknown[]
    ): void {

        if (
            !AJLoggingGate.enabled
        ) {
            return;
        }

        console.assert(
            condition,
            ...args
        );

    }
	
	//--------------------------------------------------
	// SECTION PRINTER
	//--------------------------------------------------
	
	static printSection(
		title: string
	): void {
	
		if (!AJLoggingGate.enabled) {
			return;
		}
	
		console.log("");
		console.log("=====================================");
		console.log(title.toUpperCase());
		console.log("=====================================");
	
	}
	
	//--------------------------------------------------
	// DECISION PRINTER
	//--------------------------------------------------
	
	static printDecision(
		label: string,
		value: unknown
	): void {
	
		if (!AJLoggingGate.enabled) {
			return;
		}
	
		console.log(
			`${label.padEnd(14)} ${String(value)}`
		);
	
	}
	
	//--------------------------------------------------
	// METRICS PRINTER
	//--------------------------------------------------
	
	static printMetrics(
		metrics: Record<string, unknown>
	): void {
	
		if (!AJLoggingGate.enabled) {
			return;
		}
	
		const entries =
			Object.entries(metrics);
	
		if (entries.length === 0) {
			return;
		}
	
		console.log("");
		console.log("Metrics");
	
		for (const [key, value] of entries) {
	
			console.log(
				`${key.padEnd(24)} ${String(value)}`
			);
	
		}
	
	}
	
	//--------------------------------------------------
	// DIAGNOSTIC PRINTER
	//--------------------------------------------------
	
	static logDiagnostic(
		diagnostic: EngineDiagnostic
	): void {
	
		if (!AJLoggingGate.enabled) {
			return;
		}
	
		this.printSection(
			diagnostic.engine
		);
	
		this.printDecision(
			"Status",
			diagnostic.status
		);
	
		this.printDecision(
			"Decision",
			diagnostic.decision
		);
	
		if (
			diagnostic.score !== undefined
		) {
	
			this.printDecision(
				"Score",
				diagnostic.score
			);
	
		}
	
		if (
			diagnostic.threshold !== undefined
		) {
	
			this.printDecision(
				"Threshold",
				diagnostic.threshold
			);
	
		}
	
		if (
			diagnostic.reasons.length > 0
		) {
	
			console.log("");
			console.log("Reasons");
	
			for (const reason of diagnostic.reasons) {
	
				console.log(`✔ ${reason}`);
	
			}
	
		}
	
		this.printMetrics(
			diagnostic.metrics
		);
	
	}

	//--------------------------------------------------
	// PIPELINE SUMMARY
	//--------------------------------------------------
	
	static logPipeline(
		diagnostics: EngineDiagnostic[]
	): void {
	
		if (!AJLoggingGate.enabled) {
			return;
		}
	
		this.printSection(
			"Pipeline Summary"
		);
	
		for (const item of diagnostics) {
	
			console.log(
				`${item.engine.padEnd(20)} ${item.status}`
			);
	
		}
	
	}
}