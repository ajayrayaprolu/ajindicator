//\src\runtime\execution\ExecutionEngine.ts
//src/runtime/execution/ExecutionEngine.ts        <-- Generic platform execution
//src/indicators/AJIndicator/execution/ExecutionEngine.ts        <-- AJ institutional execution
//                 RuntimeEngine
//                      │
//                      ▼
//               AJIndicator.calculate()
//                      │
//                      ▼
//              AJDecisionEngine.evaluate()
//                      │
//                      ▼
//      AJ ExecutionEngine.evaluate()
//                      │
//          ┌───────────┴────────────┐
//          │                        │
//          ▼                        ▼
// Runtime ExecutionEngine     TradeManagement
// (generic platform)          Trailing
//                             ReEntry
//                             Lifecycle
//                             Exit
//======================================================
// src/runtime/execution/ExecutionEngine.ts
// Canonical Platform Execution Engine
// Generic platform execution only
// Responsibilities// • Entry readiness// • Position status// • TP/SL detection// • Generic lifecycle transition//
// No institutional logic// No trailing stop// No re-entry// No AI// No execution scoring
//======================================================
//======================================================
// src/runtime/execution/ExecutionEngine.ts
// Generic Platform Execution Engine
//======================================================

import { EngineState } from "../../core/EngineState";
import type {RuntimeExecutionResult} from "./ExecutionResult";

//======================================================
// INPUT
//======================================================

export interface RuntimeExecutionInput {

    //--------------------------------------------------
    // ENGINE
    //--------------------------------------------------

    state: EngineState;
    tradeDirection: number;

    //--------------------------------------------------
    // PRICE
    //--------------------------------------------------

    entryPrice: number;
    currentPrice: number;
    high: number;
    low: number;

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    stopLoss: number;
    tp1: number;
    tp2: number;
    tp3: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    positionSize: number;

    //--------------------------------------------------
    // RV-EXEC-01
    //
    // barIndex was previously absent, so tp/sl detection
    // checked input.high/input.low - the CURRENT candle's
    // range - with no memory of which candle the trade
    // armed on. A trade could hit TP3/SL on the very same
    // candle it entered (its high/low simply spanning that
    // level), instantly cascading ARMED -> CLOSED in one
    // tick with zero real exposure. barIndex/entryBarIndex
    // let us require at least one candle to have closed
    // after entry before a hit can register.
    //--------------------------------------------------

    barIndex: number;
    entryBarIndex: number;

}

//======================================================
// EXECUTION ENGINE
//======================================================

export class ExecutionEngine {

    static evaluate(
        input: RuntimeExecutionInput
    ): RuntimeExecutionResult {

        //--------------------------------------------------
        // DEFAULT
        //--------------------------------------------------

        let tp1Hit = false;
        let tp2Hit = false;
        let tp3Hit = false;
        let stopLossHit = false;

        //--------------------------------------------------
        // RV-EXEC-01
        // Only allow TP/SL detection once at least one
        // candle has closed after the entry candle. The
        // entry candle's own high/low is not eligible -
        // it's where the plan was JUST computed, not real
        // post-entry price action.
        //--------------------------------------------------

        const pastEntryCandle =
            input.barIndex > input.entryBarIndex;

        //--------------------------------------------------
        // LONG
        //--------------------------------------------------

        if (pastEntryCandle && input.tradeDirection === 1) {

            tp1Hit = input.high >= input.tp1;
            tp2Hit = input.high >= input.tp2;
            tp3Hit = input.high >= input.tp3;

            stopLossHit =
                input.low <= input.stopLoss;

        }

        //--------------------------------------------------
        // SHORT
        //--------------------------------------------------

        else if (pastEntryCandle && input.tradeDirection === -1) {

            tp1Hit = input.low <= input.tp1;
            tp2Hit = input.low <= input.tp2;
            tp3Hit = input.low <= input.tp3;

            stopLossHit =
                input.high >= input.stopLoss;

        }

        //--------------------------------------------------
        // TRADE STATUS
        //--------------------------------------------------

        const positionClosed = tp3Hit || stopLossHit;
        const closeTrade = positionClosed;

        //--------------------------------------------------
        // STATE
        //--------------------------------------------------

        const currentState =
            input.state;

        const nextState =
            positionClosed
                ? EngineState.SCAN
                : input.state;

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            canEnter: input.state === EngineState.CONFIRMED,
            inPosition: input.positionSize > 0,
            tp1Hit,
            tp2Hit,
            tp3Hit,
            stopLossHit,
            positionClosed,
            closeTrade,
            currentState,
            nextState
        };
    }
}
