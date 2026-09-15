/****************************************************************************************
 * File:AJRuntimeEngine.ts
 * Path: src\indicators\AJIndicator\AJRuntimeEngine.ts
 *
 * Purpose:
 * Runtime → Dashboard bridge for the AJ Institutional Indicator.
 *
 * Responsibility:
 * Converts the completed AJ runtime and decision pipeline into the
 * normalized RuntimeResult consumed by the dashboard, runtime panel,
 * visualization layer and future platform integrations.
 *
 * This class performs NO trading logic.
 * It is strictly an adapter between the runtime pipeline and presentation.
 *
 * AJ v2 Architecture
 *
 * Runtime
 *      │
 *      ▼
 * Decision Pipeline
 *      │
 *      ▼
 * AJRuntimeEngine
 *      │
 *      ▼
 * Dashboard
 *      ▼
 * Visuals
 *      ▼
 * Runtime Panel
 ****************************************************************************************/

import { AJDashboardAdapter } from "../../dashboard/AJDashboardAdapter";
import type { RuntimeResult } from "../../runtime/RuntimeResult";

export class AJRuntimeEngine {

    //--------------------------------------------------
    // UPDATE DASHBOARD
    //--------------------------------------------------

    static update(
        runtimeResult: RuntimeResult | any
    ): void {

        if (!runtimeResult) {
            return;
        }

        //--------------------------------------------------
        // Runtime Panel already formatted
        //--------------------------------------------------

        if (runtimeResult.runtimePanel) {
            AJDashboardAdapter.update(
                runtimeResult.runtime?.symbol ??
                runtimeResult.ajRuntime?.symbol ??
                "",
                runtimeResult.runtimePanel
            );
            return;
        }

        //--------------------------------------------------
        // Decision
        //--------------------------------------------------

        const decision =
            runtimeResult.decision ??
            runtimeResult.decisionResult;
        if (!decision) {
            return;
        }

        //--------------------------------------------------
        // Dashboard Payload
        //--------------------------------------------------

        AJDashboardAdapter.update(
            runtimeResult.runtime?.symbol ??
            runtimeResult.ajRuntime?.symbol ??
            "",

            {

                //--------------------------------------------------
                // Lifecycle
                //--------------------------------------------------

                engineState:
                    decision.lifecycleState ??
                    decision.state?.engineState ??
                    "SCAN",

                //--------------------------------------------------
                // Direction
                //--------------------------------------------------

                direction:
                    decision.direction === 1
                        ? "LONG"
                        : decision.direction === -1
                            ? "SHORT"
                            : "-",

                //--------------------------------------------------
                // Confidence
                //--------------------------------------------------

                confidence:
                    decision.confidence ??
                    runtimeResult.ajRuntime?.executionConfidence ??
                    0,

                //--------------------------------------------------
                // Option
                //--------------------------------------------------

                optionSymbol:
                    decision.optionSymbol ??
                    "-",

                //--------------------------------------------------
                // Levels
                //--------------------------------------------------

                entryPrice:
                    decision.entryPrice ?? null,
                stopLoss:
                    decision.stopLoss ?? null,
                tp1:
                    decision.tp1 ?? null,
                tp2:
                    decision.tp2 ?? null,
                tp3:
                    decision.tp3 ?? null,

                //--------------------------------------------------
                // Re-entry
                //--------------------------------------------------

                reEntryPrice:
                    decision.execution?.reentryPrice ??
                    decision.reEntryPrice ??
                    null,

                reEntryStopLoss:
                    decision.execution?.reEntryStopLoss ??
                    decision.reEntryStopLoss ??
                    null
            }

        );

    }

    //--------------------------------------------------
    // BUILD RUNTIME RESULT
    //--------------------------------------------------

    static buildRuntimeResult(
        runtime: any,
        ajRuntime: any,
        indicatorResult: any
    ): RuntimeResult | any {
        const decision =
            indicatorResult ??
            {};

        return {

            //--------------------------------------------------
            // Core
            //--------------------------------------------------

            runtime,
            ajRuntime,
            decision,
            indicatorResult,

            //--------------------------------------------------
            // Runtime Intelligence
            //--------------------------------------------------

            runtimeIntelligence:
                ajRuntime.runtimeIntelligence,

            //--------------------------------------------------
            // Dashboard Panel
            //--------------------------------------------------

            runtimePanel: {

                //--------------------------------------------------
                // Lifecycle
                //--------------------------------------------------

                engineState:
                    decision.lifecycleState ??
                    decision.state?.engineState ??
                    decision.engineState ??
                    "SCAN",

                //--------------------------------------------------
                // Direction
                //--------------------------------------------------

                direction:
                    decision.direction === 1
                        ? "LONG"
                        : decision.direction === -1
                            ? "SHORT"
                            : "NONE",

                //--------------------------------------------------
                // Confidence
                //--------------------------------------------------

                confidence:
                    decision.confidence ??
                    ajRuntime.executionConfidence ??
                    0,

                //--------------------------------------------------
                // Option
                //--------------------------------------------------

                optionSymbol:
                    decision.optionSymbol ??
                    "-",

                //--------------------------------------------------
                // Trade Levels
                //--------------------------------------------------

                entryPrice:
                    decision.entryPrice ?? null,
                stopLoss:
                    decision.stopLoss ?? null,
                tp1:
                    decision.tp1 ?? null,
                tp2:
                    decision.tp2 ?? null,
                tp3:
                    decision.tp3 ?? null,

                //--------------------------------------------------
                // Re-entry
                //--------------------------------------------------

                reEntryPrice:
                    decision.execution?.reentryPrice ??
                    decision.reEntryPrice ??
                    null,

                reEntryStopLoss:
                    decision.execution?.reEntryStopLoss ??
                    decision.reEntryStopLoss ??
                    null
            }

        };

    }

}