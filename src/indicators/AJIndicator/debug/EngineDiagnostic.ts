//======================================================
// EngineDiagnostic.ts
//
// Canonical diagnostics contract for every AJ engine.
//
// PURPOSE
//
// Standardizes engine diagnostics so that every engine
// returns the same diagnostic shape.
//
// IMPORTANT
//
// • No business logic
// • No console logging
// • No AJLoggingGate dependency
// • Pure data contract
//
//======================================================

export type EngineStatus =
    | "PASSED"
    | "FAILED"
    | "SKIPPED";

export type EngineMetrics =
    Record<string, unknown>;

export interface EngineDiagnostic {

    //--------------------------------------------------
    // Engine Name
    //--------------------------------------------------

    engine: string;

    //--------------------------------------------------
    // Execution Status
    //--------------------------------------------------

    status: EngineStatus;

    //--------------------------------------------------
    // Final Engine Decision
    //--------------------------------------------------

    decision: string;

    //--------------------------------------------------
    // Optional Score
    //--------------------------------------------------

    score?: number;

    //--------------------------------------------------
    // Optional Threshold
    //--------------------------------------------------

    threshold?: number;

    //--------------------------------------------------
    // Human-readable reasons
    //--------------------------------------------------

    reasons: string[];

    //--------------------------------------------------
    // Arbitrary metrics
    //--------------------------------------------------

    metrics: EngineMetrics;

}

export class EngineDiagnosticBuilder {

    static create(
        diagnostic: Partial<EngineDiagnostic> & {
            engine: string;
        }
    ): EngineDiagnostic {

        return {

            engine: diagnostic.engine,

            status: diagnostic.status ?? "SKIPPED",

            decision: diagnostic.decision ?? "",

            score: diagnostic.score,

            threshold: diagnostic.threshold,

            reasons: diagnostic.reasons ?? [],

            metrics: diagnostic.metrics ?? {}

        };

    }

}