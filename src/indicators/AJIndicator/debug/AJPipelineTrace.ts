//validate Score Mode : Architecture.Make it a runtime cache.
//Adding trading logic and build observability.
//AJPipelineTrace should NOT be only a logger. It should become the canonical runtime telemetry object that every engine writes into.
//Score Mode                              
//===============================================
//Runtime                                   Chart
//     │                                        │                               
//     ▼                                        ▼
//Context                                    PipelineTrace
//     │                                        │
//     ▼                                        ▼
//ScoreEngine                                Debug Panel
//     │                                        │
//     ▼                                        ▼
//ExecutionAuthority                      Console (optional)
//     │                                        │
//     ▼                                        ▼
//StateMachine                           Chart Labels (optional)
//     │
//     ▼
//ExecutionEngine
//     │
//     ▼
//Dashboard
//     │
//     ▼
//Chart
//==================================================================
//                    AJ PIPELINE
//                         │
//        ┌────────────────┼────────────────┐
//        │                │                │
//        ▼                ▼                ▼
//     Context           Score             AI/SMC
//     Engine            Engine             Engines
//        │                │                │
//        └────────────────┼────────────────┘
//                         ▼
//                  AJPipelineTrace
//                         │
//          ┌──────────────┼──────────────┐
//          ▼              ▼              ▼
//     Runtime Cache    Debug Panel    Dashboard
//                         │
//                         ▼
//                  Console optional
//                         ▲
//                         │
//                  AJLoggingGate
// Context Engine
//       │
//       ▼
//  EngineDiagnostic
//       │
//       ▼
// AJPipelineTrace
//       │
//       ├────────► Runtime
//       │
//       ├────────► Dashboard
//       │
//       ├────────► Debug Panel
//       │
//       └────────► AJLoggingGate
//                      │
//           isEnabled()==true ?
//               │
//         yes───┴────no
//         │            │
//  Console      nothing printed
//======================================================
// src/indicators/AJIndicator/debug/AJPipelineTrace.ts
//
// Canonical AJ Pipeline Runtime Telemetry
//
// RESPONSIBILITY
//
// AJPipelineTrace is the canonical runtime telemetry
// object for the AJ pipeline.
//
// Every pipeline engine can write its execution state
// into this object.
//
// Consumers:
//
// • Debug Panel
// • Runtime Cache
// • Dashboard
// • Chart labels
// • Optional console diagnostics
//
// IMPORTANT
//
// AJPipelineTrace does NOT know about:
//
// • AJLoggingGate
// • console
// • React
// • Workspace8
// • DebugEngine
//
// Logging is a separate concern.
//
//======================================================
//======================================================
// PIPELINE STAGE
//======================================================
import type { EngineDiagnostic } from "./EngineDiagnostic";
//=======================================================

export interface PipelineStage {
    executed: boolean;
    passed: boolean;
    message: string;
    value?: number;
    details?: Record<string, unknown>;

}

//======================================================
// PIPELINE STAGE NAME
//======================================================
export type AJPipelineStageName =
    | "runtime"
    | "context"
    | "score"
    | "ai"
    | "smc"
    | "authority"
    | "stateMachine"
    | "execution";

//======================================================
// TRADE MODE
//======================================================
export type AJTradeMode =
    | "SCORE"
    | "AI"
    | "AI_SMC"
    | "CONFIDENCE";

//======================================================
// SCORE BREAKDOWN
//======================================================
export interface AJScoreBreakdown {
    context: number;
    insideBar: number;
    ema: number;
    vwap: number;
    adx: number;
    cvd: number;
    boost: number;
}

//======================================================
// PIPELINE SNAPSHOT
//======================================================

export interface AJPipelineSnapshot {

    //--------------------------------------------------
    // BAR
    //--------------------------------------------------
    symbol: string;
    timeframe: string;
    chartId: string;
    barIndex: number;
    timestamp: number;

    //--------------------------------------------------
    // TRADE MODE
    //--------------------------------------------------
    tradeMode: AJTradeMode;

    //--------------------------------------------------
    // PIPELINE STAGES
    //--------------------------------------------------
    runtime: PipelineStage;
    context: PipelineStage;
    score: PipelineStage;
    ai: PipelineStage;
    smc: PipelineStage;
    authority: PipelineStage;
    stateMachine: PipelineStage;
    execution: PipelineStage;

    //--------------------------------------------------
    // SCORE
    //--------------------------------------------------
    longScore: number;
    shortScore: number;
    tradeScore: number;
    direction: number;

    //--------------------------------------------------
    // SCORE BREAKDOWN
    //--------------------------------------------------
    scoreBreakdown: AJScoreBreakdown;

    //--------------------------------------------------
    // AI
    //--------------------------------------------------
    aiScoreLong: number;
    aiScoreShort: number;
    aiBestScore: number;
    aiBestDir: number;

    //--------------------------------------------------
    // SMC
    //--------------------------------------------------
    smcCorePass: boolean;

    //--------------------------------------------------
    // AUTHORITY
    //--------------------------------------------------
    authorityApproved: boolean;

    //--------------------------------------------------
    // LIFECYCLE
    //--------------------------------------------------
    lifecycle: string;
	
	//--------------------------------------------------
	// ENGINE DIAGNOSTICS
	//--------------------------------------------------
	diagnostics: EngineDiagnostic[];

}

//======================================================
// AJ PIPELINE TRACE
//======================================================
export class AJPipelineTrace {

    //--------------------------------------------------
    // CURRENT RUNTIME CACHE
    //
    // One current snapshot per chart.
    //--------------------------------------------------
    private static cache =
        new Map<
            string,
            AJPipelineSnapshot
        >();

    //--------------------------------------------------
    // HISTORY
    //
    // Historical snapshots per chart.
    //--------------------------------------------------
    private static history =
        new Map<
            string,
            AJPipelineSnapshot[]
        >();

    //--------------------------------------------------
    // HISTORY LIMIT
    //--------------------------------------------------
    private static readonly MAX_HISTORY =
        200;

    //--------------------------------------------------
    // DEFAULT STAGE
    //--------------------------------------------------
    private static createStage(
        message: string = ""
    ): PipelineStage {

        return {
            executed: false,
            passed: false,
            message
        };
    }

    //--------------------------------------------------
    // DEFAULT SCORE BREAKDOWN
    //--------------------------------------------------

    private static createScoreBreakdown():
        AJScoreBreakdown {

        return {
            context: 0,
            insideBar: 0,
            ema: 0,
            vwap: 0,
            adx: 0,
            cvd: 0,
            boost: 0
        };
    }

    //--------------------------------------------------
    // CREATE DEFAULT SNAPSHOT
    //--------------------------------------------------

    private static createDefaultSnapshot(
        chartId: string
    ): AJPipelineSnapshot {

        return {

            //--------------------------------------------------
            // BAR
            //--------------------------------------------------
            symbol: "",
            timeframe: "",
            chartId,
            barIndex: 0,
            timestamp: 0,

            //--------------------------------------------------
            // TRADE MODE
            //--------------------------------------------------
            tradeMode: "SCORE",

            //--------------------------------------------------
            // PIPELINE
            //--------------------------------------------------
            runtime:
                this.createStage(),
            context:
                this.createStage(),
            score:
                this.createStage(),
            ai:
                this.createStage("SKIPPED"),
            smc:
                this.createStage("SKIPPED"),
            authority:
                this.createStage(),
            stateMachine:
                this.createStage(),
            execution:
                this.createStage(),

            //--------------------------------------------------
            // SCORE
            //--------------------------------------------------
            longScore: 0,
            shortScore: 0,
            tradeScore: 0,
            direction: 0,

            //--------------------------------------------------
            // SCORE BREAKDOWN
            //--------------------------------------------------
            scoreBreakdown:
                this.createScoreBreakdown(),

            //--------------------------------------------------
            // AI
            //--------------------------------------------------
            aiScoreLong: 0,
            aiScoreShort: 0,
            aiBestScore: 0,
            aiBestDir: 0,

            //--------------------------------------------------
            // SMC
            //--------------------------------------------------
            smcCorePass: false,

            //--------------------------------------------------
            // AUTHORITY
            //--------------------------------------------------
            authorityApproved: false,

            //--------------------------------------------------
            // LIFECYCLE
            //--------------------------------------------------
            lifecycle: "SCAN",
			
			//--------------------------------------------------
			// DIAGNOSTICS
			//--------------------------------------------------
			diagnostics: []
        };
    }

    //--------------------------------------------------
    // BEGIN BAR
    //--------------------------------------------------

    static begin(
        chartId: string,
        snapshot: Partial<AJPipelineSnapshot> = {}
    ): AJPipelineSnapshot {

        const base =
            this.createDefaultSnapshot(
                chartId
            );

        const next: AJPipelineSnapshot = {
            ...base,
            ...snapshot,
            chartId,

            //--------------------------------------------------
            // Protect nested defaults
            //--------------------------------------------------

            runtime: {
                ...base.runtime,
                ...(snapshot.runtime ?? {})
            },

            context: {
                ...base.context,
                ...(snapshot.context ?? {})
            },

            score: {
                ...base.score,
                ...(snapshot.score ?? {})
            },

            ai: {
                ...base.ai,
                ...(snapshot.ai ?? {})
            },

            smc: {
                ...base.smc,
                ...(snapshot.smc ?? {})
            },

            authority: {
                ...base.authority,
                ...(snapshot.authority ?? {})
            },

            stateMachine: {
                ...base.stateMachine,
                ...(snapshot.stateMachine ?? {})
            },

            execution: {
                ...base.execution,
                ...(snapshot.execution ?? {})
            },

            scoreBreakdown: {
                ...base.scoreBreakdown,
                ...(snapshot.scoreBreakdown ?? {})
            }

        };

        //--------------------------------------------------
        // CURRENT CACHE
        //--------------------------------------------------

        this.cache.set(
            chartId,
            next
        );

        //--------------------------------------------------
        // HISTORY
        //--------------------------------------------------
        const list =
            this.history.get(chartId)
            ??
            [];

        list.push(
            structuredClone(
                next
            )
        );

        while (
            list.length >
            this.MAX_HISTORY
        ) {
            list.shift();
        }

        this.history.set(
            chartId,
            list
        );
        return next;
    }

    //--------------------------------------------------
    // UPDATE SNAPSHOT
    //--------------------------------------------------
    static update(
        chartId: string,
        patch: Partial<AJPipelineSnapshot>
    ): AJPipelineSnapshot | undefined {

        const current =
            this.cache.get(
                chartId
            );


        if (!current) {

            return undefined;

        }

        //--------------------------------------------------
        // Top-level patch
        //--------------------------------------------------
        Object.assign(
            current,
            patch
        );

        //--------------------------------------------------
        // Nested stage protection
        //--------------------------------------------------
        if (patch.runtime) {
            current.runtime = {
                ...current.runtime,
                ...patch.runtime
            };
        }

        if (patch.context) {
            current.context = {
                ...current.context,
                ...patch.context
            };
        }

        if (patch.score) {
            current.score = {
                ...current.score,
                ...patch.score
            };
        }

        if (patch.ai) {
            current.ai = {
                ...current.ai,
                ...patch.ai
            };
        }

        if (patch.smc) {
            current.smc = {
                ...current.smc,
                ...patch.smc
            };
        }

        if (patch.authority) {
            current.authority = {
                ...current.authority,
                ...patch.authority
            };
        }

        if (patch.stateMachine) {
            current.stateMachine = {
                ...current.stateMachine,
                ...patch.stateMachine
            };
        }

        if (patch.execution) {
            current.execution = {
                ...current.execution,
                ...patch.execution
            };
        }
		
        if (patch.scoreBreakdown) {
            current.scoreBreakdown = {
                ...current.scoreBreakdown,
                ...patch.scoreBreakdown

            };
        }

        //--------------------------------------------------
        // UPDATE CURRENT HISTORY ENTRY
        //--------------------------------------------------
        const list =
            this.history.get(
                chartId
            );

        if (
            list &&
            list.length > 0
        ) {
            list[
                list.length - 1
            ] =
                structuredClone(
                    current
                );
        }
        return current;
    }


    //--------------------------------------------------
    // UPDATE PIPELINE STAGE
    //--------------------------------------------------
    static stage(
        chartId: string,
        stage: AJPipelineStageName,
        value: PipelineStage
    ): AJPipelineSnapshot | undefined {

        const current =
            this.cache.get(
                chartId
            );

        if (!current) {

            return undefined;

        }
        current[stage] = {
            ...value
        };

        //--------------------------------------------------
        // Synchronize latest history record.
        //--------------------------------------------------
        const list =
            this.history.get(
                chartId
            );

        if (
            list &&
            list.length > 0
        ) {
            list[
                list.length - 1
            ] =
                structuredClone(
                    current
                );

        }
        return current;
    }

	//--------------------------------------------------
	// APPEND DIAGNOSTIC
	//--------------------------------------------------
	static appendDiagnostic(
		chartId: string,
		diagnostic: EngineDiagnostic
	): AJPipelineSnapshot | undefined {
	
		const current =
			this.cache.get(chartId);
	
		if (!current) {
	
			return undefined;
	
		}
	
		current.diagnostics.push(
			diagnostic
		);
	
		const list =
			this.history.get(chartId);
	
		if (
			list &&
			list.length > 0
		) {
	
			list[
				list.length - 1
			] =
				structuredClone(
					current
				);
	
		}
	
		return current;
	
	}
	
    //--------------------------------------------------
    // GET CURRENT SNAPSHOT
    //--------------------------------------------------
    static get(
        chartId: string
    ): AJPipelineSnapshot | undefined {

        return this.cache.get(
            chartId
        );

    }
	
	//--------------------------------------------------
	// GET DIAGNOSTICS
	//--------------------------------------------------
	static getDiagnostics(
		chartId: string
	): EngineDiagnostic[] {
	
		return (
	
			this.cache
				.get(chartId)
				?.diagnostics
	
			??
	
			[]
	
		);
	
	}
	
    //--------------------------------------------------
    // GET HISTORY
    //--------------------------------------------------
    static getHistory(
        chartId: string
    ): AJPipelineSnapshot[] {

        return (
            this.history.get(
                chartId
            )
            ??
            []
        );

    }

    //--------------------------------------------------
    // CLEAR CURRENT CHART CACHE
    //--------------------------------------------------
	static clear(
		chartId: string
	): void {
	
		this.cache.delete(
			chartId
		);
	
	}

    //--------------------------------------------------
    // CLEAR CHART HISTORY
    //--------------------------------------------------
    static clearHistory(
        chartId: string
    ): void {

        this.history.delete(
            chartId
        );

    }

    //--------------------------------------------------
    // CLEAR EVERYTHING
    //--------------------------------------------------
    static clearAll(): void {
        this.cache.clear();
        this.history.clear();
    }

}