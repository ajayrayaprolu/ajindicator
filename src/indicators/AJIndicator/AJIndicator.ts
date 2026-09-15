/******************************************************************************
 * File:
 * AJIndicator.ts
 *
 * Path:
 * src/indicators/AJIndicator/AJIndicator.ts
 *
 * Purpose:
 * Public entry point (Facade) for the AJ Institutional Trading System.
 *
 * This class represents the canonical indicator exposed to TradingView,
 * backtesting, strategy execution, replay mode, and future API integrations.
 *
 * AJIndicator intentionally contains NO trading logic.
 * It simply accepts the market payload, forwards it to the
 * AJDecisionEngine, and returns the canonical AJIndicatorResult.
 *
 * Responsibilities:
 *
 * ---------------------------------------------------------------------------
 * • Receive the canonical AJIndicatorPayload
 * • Execute the complete AJ institutional pipeline
 * • Delegate all business logic to AJDecisionEngine
 * • Return a fully populated AJIndicatorResult
 * • Provide a stable public API for the trading system
 *
 * This class DOES NOT:
 *
 * ---------------------------------------------------------------------------
 * • Calculate indicators
 * • Detect market structure
 * • Detect liquidity
 * • Evaluate Smart Money Concepts
 * • Compute confidence
 * • Compute authority
 * • Calculate trend
 * • Calculate momentum
 * • Perform risk management
 * • Execute trade logic
 * • Maintain runtime state
 * • Read runtime thresholds
 * • Make trading decisions
 *
 * All trading intelligence belongs inside AJDecisionEngine and the
 * specialized engines that compose the AJ v2 architecture.
 *
 * ---------------------------------------------------------------------------
 * AJ v2 Architecture
 *
 * TradingView Chart
 *
 *      │
 *      ▼
 *
 * AJIndicator
 * (Public Facade)
 *
 *      │
 *      ▼
 *
 * AJDecisionEngine
 *
 *      │
 *      ├──────── Runtime Context
 *      ├──────── Market Context
 *      ├──────── Order Flow Engine
 *      ├──────── Market Structure Engine
 *      ├──────── Liquidity Engine
 *      ├──────── Order Block Engine
 *      ├──────── Trend Engine
 *      ├──────── Price Action Engine
 *      ├──────── Momentum Engine
 *      ├──────── Volatility Engine
 *      ├──────── Multi-Timeframe Engine
 *      ├──────── Risk Engine
 *      ├──────── Confidence Engine
 *      ├──────── Authority Engine
 *      ├──────── Institutional Engine
 *      ├──────── State Machine
 *      ├──────── Trade Engine
 *      └──────── Visualization Engine
 *
 *      │
 *      ▼
 *
 * AJIndicatorResult
 *
 * ---------------------------------------------------------------------------
 * Public API
 *
 * calculate(
 *      payload: AJIndicatorPayload
 * ): AJIndicatorResult
 *
 * Input:
 *
 *      AJIndicatorPayload
 *
 *      {
 *          candle,
 *          indicators,
 *          marketStructure,
 *          session,
 *          volume
 *      }
 *
 * Output:
 *
 *      AJIndicatorResult
 *
 *      {
 *          action,
 *          score,
 *          confidence,
 *          authority,
 *          entry,
 *          stopLoss,
 *          targets,
 *          dashboard,
 *          debug
 *      }
 *
 * ---------------------------------------------------------------------------
 * Runtime Flow
 *
 * New Candle
 *      │
 *      ▼
 *
 * AJIndicator.calculate(payload)
 *      │
 *      ▼
 *
 * AJDecisionEngine.evaluate(payload)
 *      │
 *      ▼
 *
 * Complete Institutional Pipeline
 *      │
 *      ▼
 *
 * AJIndicatorResult
 *      │
 *      ▼
 *
 * TradingView Renderer
 *
 * ---------------------------------------------------------------------------
 * Design Goals
 *
 * • Single Responsibility Principle
 * • Stable public interface
 * • Thin facade implementation
 * • Complete engine isolation
 * • Easy unit testing
 * • Runtime configurable
 * • Engine extensibility
 * • Future-proof architecture
 *
 * AJIndicator should remain intentionally small.
 * As AJ evolves (v3, v4, AI modules, Order Flow modules, Options modules),
 * this file should rarely change. All enhancements belong inside the
 * decision pipeline, preserving a stable public API.
 ******************************************************************************/

import { AJDecisionEngine } from "./AJDecisionEngine";

import type {
    AJIndicatorPayload,
    AJIndicatorResult
} from "./AJTypes";

//======================================================
// AJ INDICATOR
//======================================================

export class AJIndicator {

    //--------------------------------------------------
    // DECISION ENGINE
    //--------------------------------------------------

    private readonly engine =
        new AJDecisionEngine();

    //--------------------------------------------------
    // CALCULATE
    //--------------------------------------------------

    calculate(
        payload: AJIndicatorPayload
    ): AJIndicatorResult {

        //--------------------------------------------------
        // EXECUTE COMPLETE PIPELINE
        //--------------------------------------------------

        const result =
            this.engine.evaluate(
                payload
            );

        //--------------------------------------------------
        // RETURN CANONICAL RESULT
        //--------------------------------------------------

        return result;

    }

}