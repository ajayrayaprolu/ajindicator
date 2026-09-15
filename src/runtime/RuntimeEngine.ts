/****************************************************************************************
 * File:
 * RuntimeEngine.ts
 *
 * Path:
 * src/runtime/RuntimeEngine.ts
 *
 * Purpose:
 * Central runtime orchestration engine for the AJ Institutional Trading Platform.
 *
 * This engine coordinates the complete institutional decision pipeline by
 * transforming raw market data into an enriched runtime context, executing the
 * AJ Indicator engine, and adapting institutional outputs back into the
 * platform runtime model.
 *
 * Responsibilities:
 * -----------------
 * • Build the institutional runtime context.
 * • Construct the AJ Indicator execution payload.
 * • Execute the complete AJ Decision Engine pipeline.
 * • Coordinate Trend, Momentum, Market Structure, Liquidity,
 *   Multi-Timeframe, Risk Qualification, Confidence,
 *   Authority and Execution engines.
 * • Adapt institutional outputs into the platform RuntimeResult.
 * • Expose helper APIs for payload creation, runtime generation,
 *   indicator execution and full pipeline execution.
 *
 * This engine is an orchestrator only.
 * It contains no trading strategy, market analysis,
 * confidence scoring, authority logic or execution logic.
 *
 * Those responsibilities belong to the individual AJ engines.
 *
 * AJ Runtime Architecture
 * -----------------------
 *
 *                RuntimeContext
 *                       │
 *                       ▼
 *         AJRuntimeContextBuilder
 *                       │
 *                       ▼
 *             AJPayloadBuilder
 *                       │
 *                       ▼
 *             AJDecisionEngine
 *                       │
 *                       ├──────── Trend
 *                       ├──────── Momentum
 *                       ├──────── Market Structure
 *                       ├──────── Liquidity
 *                       ├──────── Order Flow
 *                       ├──────── Volatility
 *                       ├──────── Multi-Timeframe
 *                       ├──────── Risk Qualification
 *                       ├──────── Confidence
 *                       ├──────── Authority
 *                       └──────── Execution
 *                       │
 *                       ▼
 *             AJRuntimeEngine
 *                       │
 *                       ▼
 *                RuntimeResult
 *
 * Design Principles:
 * ------------------
 * • Stateless orchestration.
 * • Modular institutional architecture.
 * • Single responsibility.
 * • Engine isolation.
 * • Platform-independent orchestration.
 * • Strongly typed runtime contracts.
 * • No duplicated calculations.
 * • Compile-time contract validation.
 *
 * Phase:
 * -------
 * Phase 15.5 – Runtime Integration Layer
 *
 * Future Enhancements:
 * --------------------
 * Phase 16:
 * • Dashboard synchronization.
 * • Visualization overlays.
 * • Mentor explanations.
 * • Confidence breakdown widgets.
 * • Educational tooltips.
 * • Smart chart annotations.
 ****************************************************************************************/

import type { RuntimeContext } from "./RuntimeContext";
export type { RuntimeResult } from "./RuntimeResult";
import type { RuntimeResult } from "./RuntimeResult";
import type { AJRuntimeContext } from "../indicators/AJIndicator/AJRuntimeContext";

import type {
    AJIndicatorPayload,
    AJIndicatorResult
} from "../indicators/AJIndicator/AJTypes";

import { AJRuntimeContextBuilder } from "../indicators/AJIndicator/AJRuntimeContextBuilder";
import { AJPayloadBuilder } from "../indicators/AJIndicator/AJPayloadBuilder";
import { AJRuntimeEngine } from "../indicators/AJIndicator/AJRuntimeEngine";
import { AJDecisionEngine } from "../indicators/AJIndicator/AJDecisionEngine";

//=================================================================================
export class RuntimeEngine {

    //--------------------------------------------------
    // CORE PIPELINE ENGINE
    //--------------------------------------------------

    private readonly decisionEngine =
        new AJDecisionEngine();

    //--------------------------------------------------
    // PRIMARY RUNTIME ENTRY POINT
    //--------------------------------------------------

    evaluate(
        runtime: RuntimeContext
    ): RuntimeResult {

        //--------------------------------------------------
        // BUILD INSTITUTIONAL RUNTIME CONTEXT
        //--------------------------------------------------

        const ajRuntime: AJRuntimeContext =
            AJRuntimeContextBuilder.build(
                runtime
            );

        //--------------------------------------------------
        // BUILD AJ EXECUTION PAYLOAD
        //--------------------------------------------------

        const payload: AJIndicatorPayload =
            AJPayloadBuilder.build(
                runtime,
                ajRuntime
            );

        //--------------------------------------------------
        // EXECUTE AJ DECISION PIPELINE
        //--------------------------------------------------

        const indicatorResult: AJIndicatorResult =
            this.decisionEngine.evaluate(
                payload
            );

        //--------------------------------------------------
        // ADAPT PLATFORM RUNTIME RESULT
        //--------------------------------------------------

        const runtimeResult: RuntimeResult =
            AJRuntimeEngine.buildRuntimeResult(
                runtime,
                ajRuntime,
                indicatorResult
            );
		
		//--------------------------------------------------
        // RETURN FINAL RESULT
        //--------------------------------------------------

        return runtimeResult;
    }

    //--------------------------------------------------
    // CONVENIENCE API
    //--------------------------------------------------

    run(
        runtime: RuntimeContext
    ): RuntimeResult {

        return this.evaluate(runtime);

    }

    //--------------------------------------------------
    // PIPELINE API
    //--------------------------------------------------

    evaluateIndicator(
        runtime: RuntimeContext
    ): AJIndicatorResult {

        const ajRuntime: AJRuntimeContext =
            AJRuntimeContextBuilder.build(
                runtime
            );

        const payload: AJIndicatorPayload =
            AJPayloadBuilder.build(
                runtime,
                ajRuntime
            );

        const indicatorResult: AJIndicatorResult =
            this.decisionEngine.evaluate(
                payload
            );return indicatorResult;

    }

    //--------------------------------------------------
    // PAYLOAD API
    //--------------------------------------------------

    buildPayload(
        runtime: RuntimeContext
    ): AJIndicatorPayload {

        const ajRuntime: AJRuntimeContext =
            AJRuntimeContextBuilder.build(
                runtime
            );

        return AJPayloadBuilder.build(
            runtime,
            ajRuntime
        );

    }
	//--------------------------------------------------
    // AJ RUNTIME API
    //--------------------------------------------------

    buildAJRuntime(
        runtime: RuntimeContext
    ): AJRuntimeContext {

        return AJRuntimeContextBuilder.build(
            runtime
        );

    }

    //--------------------------------------------------
    // FULL PIPELINE EXECUTION API
    //--------------------------------------------------

    executePipeline(
        runtime: RuntimeContext
    ): {
        ajRuntime: AJRuntimeContext;
        payload: AJIndicatorPayload;
        indicatorResult: AJIndicatorResult;
        runtimeResult: RuntimeResult;
    } {

        const ajRuntime: AJRuntimeContext =
            AJRuntimeContextBuilder.build(
                runtime
            );

        const payload: AJIndicatorPayload =
            AJPayloadBuilder.build(
                runtime,
                ajRuntime
            );

        const indicatorResult: AJIndicatorResult =
            this.decisionEngine.evaluate(
                payload
            );

        const runtimeResult: RuntimeResult =
            AJRuntimeEngine.buildRuntimeResult(
                runtime,
                ajRuntime,
                indicatorResult
            );return {

            ajRuntime,

            payload,

            indicatorResult,

            runtimeResult

        };

    }

}

