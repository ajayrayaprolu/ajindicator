/****************************************************************************************
 * File:
 * StrategyHost.ts
 *
 * Path:
 * src/runtime/hosts/StrategyHost.ts
 *
 * Purpose:
 * Runtime host responsible for orchestrating the execution of the
 * AJ Institutional Decision Pipeline.
 *
 * StrategyHost provides the runtime entry point that invokes AJHost,
 * manages execution lifecycle hooks and serves as the bridge between
 * the platform runtime and the institutional trading engines.
 *
 * Responsibilities:
 * -----------------
 * • Initialize runtime host resources.
 * • Execute the AJ indicator pipeline.
 * • Coordinate runtime lifecycle callbacks.
 * • Provide extension points for future portfolio synchronization.
 * • Manage runtime initialization and shutdown.
 *
 * This host does NOT:
 * -------------------
 * • Calculate trading signals.
 * • Build runtime context.
 * • Perform market analysis.
 * • Calculate confidence.
 * • Perform authority decisions.
 * • Execute risk calculations.
 *
 * Those responsibilities belong to the AJ engine layer.
 *
 * Runtime Architecture
 *
 * RuntimeContext
 *        │
 *        ▼
 * AJRuntimeContextBuilder
 *        │
 *        ▼
 * AJPayloadBuilder
 *        │
 *        ▼
 * StrategyHost
 *        │
 *        ▼
 * AJHost
 *        │
 *        ▼
 * AJDecisionEngine
 *        │
 *        ▼
 * ExecutionResult
 *
 * Design Principles:
 * ------------------
 * • Stateless orchestration.
 * • Lifecycle management.
 * • Platform-independent host.
 * • No duplicated business logic.
 * • Extension-ready runtime.
 *
 * Phase:
 * -------
 * Phase 15.5 – Runtime Host Layer
 *
 * Future Enhancements:
 * --------------------
 * Phase 16:
 * • Portfolio synchronization.
 * • Dashboard notifications.
 * • Trade replay support.
 * • Runtime telemetry.
 * • Performance metrics.
 ****************************************************************************************/

import type { RuntimeResult } from "../RuntimeResult";

import { AJHost } from "../../indicators/AJIndicator/hosts";

//======================================================
// STRATEGY HOST
//======================================================

export class StrategyHost extends AJHost {

    //--------------------------------------------------
    // PORTFOLIO STATS
    //--------------------------------------------------

    private activePositions = 0;
    private closedPositions = 0;
    private totalPnL = 0;

    //--------------------------------------------------
    // INITIALIZE
    //--------------------------------------------------

    initialize(): void {

        this.reset();

    }

    //--------------------------------------------------
    // SHUTDOWN
    //--------------------------------------------------

    shutdown(): void {

        this.reset();

    }

    //--------------------------------------------------
    // PROCESS BAR
    //--------------------------------------------------

    processBar(
        runtimeResult: RuntimeResult
    ): any {
    
        const result =
            this.execute(
                runtimeResult
            );
        
        // Local portfolio bookkeeping
        if (result.runtimePanel.executionAllowed) {
            this.activePositions++;
        }
        
        return result;
    }

    //--------------------------------------------------
    // BEFORE
    //--------------------------------------------------

    protected override beforeProcess(): void {
        // Reserved for future portfolio synchronization
    }

    //--------------------------------------------------
    // AFTER
    //--------------------------------------------------

    protected override afterProcess(): void {
    
        //--------------------------------------------------
        // Reserved for future portfolio synchronization
        //--------------------------------------------------
    
    }

    //--------------------------------------------------
    // ACTIVE
    //--------------------------------------------------

    getActivePositions(): number {
        return this.activePositions;
    }

    //--------------------------------------------------
    // CLOSED
    //--------------------------------------------------

    getClosedPositions(): number {
        return this.closedPositions;
    }

    //--------------------------------------------------
    // PNL
    //--------------------------------------------------

    getTotalPnL(): number {
        return this.totalPnL;
    }

    //--------------------------------------------------
    // RESET
    //--------------------------------------------------

    override reset(): void {
        super.reset();
        this.activePositions = 0;
        this.closedPositions = 0;
        this.totalPnL = 0;
    }

}
