//=================================================
// AJ Institutional Indicator V2
// src/indicators/AJIndicator/core/StateMachine.ts
//=================================================
//
// PURPOSE
// -------------------------------------------------
// StateMachine is the single lifecycle authority responsible
// for committing deterministic trade-state transitions.
//
// It converts validated strategy, AI/SMC, authority, execution,
// and runtime-position inputs into ONE controlled lifecycle state.
//
// StateMachine must NOT:
//   - calculate trading signals
//   - perform execution planning
//   - calculate TP/SL
//   - manage position sizing
//   - independently recalculate exit conditions
//   - generate repeated BUY/SELL events
//
// StateMachine ONLY commits lifecycle state transitions.
//
//=================================================
//
// AJ V2 LIFECYCLE FLOW
//=================================================
//
//                    AJDecisionEngine
//                           │
//                           ▼
//                  Context / AI / SMC
//                           │
//                           ▼
//                      Authority
//                           │
//                           ▼
//                     StateMachine
//                  (Lifecycle Authority)
//                           │
//              ┌────────────┴────────────┐
//              │                         │
//            ARMED                   CONFIRMED
//                                        │
//                                        ▼
//                               ExecutionEngine
//                                        │
//                              ┌─────────┴─────────┐
//                              │                   │
//                           BLOCKED             APPROVED
//                              │                   │
//                              ▼                   ▼
//                          CONFIRMED            EXECUTED
//                                                  │
//                                                  ▼
//                                               MANAGE
//                                                  │
//                                                  ▼
//                                                EXIT
//                                                  │
//                                                  ▼
//                                               CLOSED
//                                                  │
//                                                  ▼
//                                              RE-ENTRY
//
//=================================================
//
// CORE LIFECYCLE STATES
//=================================================
//
// SCAN
//   Search for a valid trade opportunity.
//
// ARMED
//   Entry conditions have been detected and the trade setup
//   has been armed for confirmation.
//
// CONFIRMED
//   Required strategy, AI/SMC, authority, and execution gates
//   have been satisfied. The trade is ready for execution.
//
// EXECUTED
//   Actual execution acknowledgement has been received.
//   This state represents an execution event, not merely
//   execution-plan approval.
//
// MANAGE
//   An active position is being managed through TP progression,
//   break-even, trailing, scale-in/scale-out, risk management,
//   and other position-management rules.
//
// CLOSED
//   The active trade has been closed through SL, TP3, emergency
//   exit, timeout, reversal, or another valid closing condition.
//
// RE-ENTRY
//   A previously closed trade may become eligible for a new
//   entry only when the ReEntryEngine confirms eligibility.
//
//=================================================
//
// COMPONENT OWNERSHIP
//=================================================
//
// | Phase | Component                              | Responsibility |
// |------ |----------------------------------------|---------------|
// | 16A   | StateMachine / LifecycleEngine         | Own deterministic lifecycle-state transitions. |
// | 16B   | ExecutionEngine                        | Perform execution planning, validation, and approval only. It must not create a runtime position. |
// | 16C   | Lifecycle / Runtime Execution          | Move CONFIRMED → EXECUTED only after execution acknowledgement. |
// | 16D   | TradeManagement                        | Position sizing, TP progression, break-even, scale-in/out, trailing, live risk, and exposure management. |
// | 16E   | ExitEngine / TradeManagement           | Evaluate TP, SL, timeout, emergency, reversal, and other exit conditions. |
// | 16F   | LifecycleEngine / ReEntryEngine        | Close/reset lifecycle and activate re-entry only when eligibility conditions are satisfied. |
//
//=================================================
//
// ENTRY EVENT PRINCIPLE
//=================================================
//
// A BUY/SELL marker represents a ONE-SHOT lifecycle event.
//
// Direction alone must NEVER be used to generate an entry marker.
//
// Example:
//
//   tradeDirectionFinal === 1
//
// may remain TRUE across many candles.
//
// This does NOT mean:
//
//   BUY
//   BUY
//   BUY
//   BUY
//
// Instead, AJ V2 generates an entry event only when:
//
//   enteredExecuted === true
//
// Therefore:
//
//   StateMachine
//        │
//        └── enteredExecuted = true
//                    │
//                    ▼
//              AJSignalBuilder
//                    │
//                    ▼
//                BUY / SELL
//
// Once the trade enters MANAGE, no new entry marker is generated
// until a valid new lifecycle entry occurs.
//
//=================================================
//
// STATE TRANSITION SAFETY
//=================================================
//
// StateMachine uses a mutually exclusive switch-based transition
// model so that only ONE lifecycle transition can be committed
// during a single evaluation.
//
// This prevents a single candle from progressing through multiple
// states such as:
//
//   CONFIRMED → EXECUTED → MANAGE
//
// during the same evaluation.
//
// Each evaluation commits at most ONE lifecycle transition.
//
//=================================================
//
// FIXES / HARDENING PROVIDED
//=================================================
//
// | Problem | AJ V2 Fix |
// |---------|-----------|
// | Multiple lifecycle transitions could occur during one candle | StateMachine uses a mutually exclusive switch-based transition model. |
// | Execution-plan approval was treated as runtime execution | ExecutionEngine was corrected so planning approval does not automatically create a runtime position. |
// | `positionClosed = !positionOpen` could create false close events | ExecutionEngine no longer derives a close event simply because a position is not currently open. |
// | A zero-size position could be converted into a fake 1-unit position | TradeManagement was corrected to allow a true zero position instead of forcing a minimum position of 1. |
// | Historical BUY/SELL markers were artificially limited to two per direction | AJSignalBuilder was corrected to preserve valid one-shot lifecycle entry events rather than applying `slice(-2)`. |
// | Trade direction could remain BUY/SELL across multiple candles | Entry markers remain driven by `enteredExecuted`, not persistent trade direction. |
// | Emergency exit could be evaluated after a normal position transition | LifecycleEngine exit/emergency handling was given higher priority than normal execution/position transitions. |
// | Bearish structure could incorrectly trigger reversal for SHORT trades | ExitEngine reversal logic was made direction-aware: LONG reacts to bearish reversal; SHORT reacts to bullish reversal. |
// | Lifecycle contract definitions required unnecessary modification | LifecycleResult / LifecycleTypes contracts: NO CHANGE. |
// | Signal normalization logic was not the source of repeated lifecycle events | SignalEngine normalization: NO CHANGE. |
// | ChartEngine could contain duplicate identical markers | ChartEngine's exact duplicate filtering: NO CHANGE. |
// | Duplicate StateMachine diagnostic logging existed | Redundant `executedGate` diagnostic block was removed; the complete diagnostic block was retained. |
//
//=================================================
//
// IMPORTANT DESIGN RULES
//=================================================
//
// 1. StateMachine is the lifecycle transition authority.
//
// 2. ExecutionEngine is a planning component.
//    Execution approval is NOT automatically equivalent to
//    broker/runtime execution acknowledgement.
//
// 3. Runtime position state must come from the runtime execution
//    context, not from planned execution approval.
//
// 4. `enteredExecuted` is an event flag, not a persistent state.
//
// 5. BUY/SELL markers must be generated from lifecycle entry events,
//    not from persistent LONG/SHORT direction.
//
// 6. MANAGE must not continuously generate new entry events.
//
// 7. CLOSED must not be interpreted as a new entry.
//
// 8. Re-entry must be explicitly controlled by ReEntryEngine.
//
// 9. TP, SL, trailing, break-even, scale-in/out, and position
//    management remain owned by the execution-management layer.
//
// 10. ExitEngine determines exit conditions; StateMachine consumes
//     the resulting lifecycle event instead of independently
//     recalculating exit logic.
//
//=================================================
//
// AJ V2 TARGET BEHAVIOR
//=================================================
//
// ONE TRADE:
//
//   SCAN
//     ↓
//   ARMED
//     ↓
//   CONFIRMED
//     ↓
//   EXECUTED  ← ONE entry event / ONE BUY or SELL marker
//     ↓
//   MANAGE
//     ↓
//   TP / SL / EXIT / REVERSAL / TIMEOUT
//     ↓
//   CLOSED
//
// During MANAGE:
//
//   NO NEW BUY
//   NO NEW SELL
//   NO repeated entry markers
//
// A new BUY/SELL event is permitted only when a new lifecycle
// entry is legitimately established, including an explicitly
// eligible re-entry.
//
//=================================================
//
// RESULT
//=================================================
//
// AJ V2 separates:
//
//   SIGNAL DETECTION
//        ↓
//   TRADE CONFIRMATION
//        ↓
//   EXECUTION PLANNING
//        ↓
//   EXECUTION ACKNOWLEDGEMENT
//        ↓
//   POSITION MANAGEMENT
//        ↓
//   EXIT
//        ↓
//   CLOSED / RE-ENTRY
//
// This separation prevents persistent direction flags,
// execution-plan approval, or position-state defaults from
// producing repeated BUY/SELL lifecycle markers.
//
//=================================================
//==============================================================
import { EngineState } from "../core/EngineState";
import type {StateMachineInputs} from "./StateMachineTypes";
import type {StateMachineResult} from "./StateMachineResult";

//==============================================================

export class StateMachine {
	
	//--------------------------------------------------
    // LIFECYCLE MEMORY
    //--------------------------------------------------

    private static lifecycleCache =

        new Map<
            string,
            {
                engineState: EngineState;
                signalBar: number;
                lastBias: number;
            }
        >();

    evaluate(
        inputs: StateMachineInputs
    ): StateMachineResult {


        //--------------------------------------------------
        // ROUTER
        //--------------------------------------------------

        const routeAISMC =
            inputs.enableAITradeSafety &&
            inputs.enableAISMCMode;


        const routeAI =
            inputs.enableAITradeSafety &&
            !inputs.enableAISMCMode;


        const routeOriginal =
            !inputs.enableAITradeSafety;

        //--------------------------------------------------
        // SCAN
        // Pine:
        // Opportunity only.
        // Never depends on Authority.
        //--------------------------------------------------
        
        const stateScanReady =
        
            !inputs.tradeLifecycleLocked &&
            !inputs.isMirrorOptionChart &&
            inputs.tradeScore >= inputs.minimumTradeScore &&
            inputs.tradeDirectionFinal !== 0;

        //--------------------------------------------------
        // MODE VALIDATION
        //--------------------------------------------------

        const genericReady =

            routeAISMC
                ? inputs.common_aiSmcCoreReady
                : routeAI
                ? inputs.common_aiCoreReady
                : inputs.common_originalCoreReady;

        //--------------------------------------------------
        // PER-CHART LIFECYCLE KEY
        //--------------------------------------------------
        
		const lifecycleKey =
			inputs.ajRuntime.chartId
			??
			inputs.ajRuntime.symbol
			??
			inputs.runtime.symbol
			??
			inputs.runtime.datasource
			??
			"GLOBAL";

        //--------------------------------------------------
        // RESTORE PREVIOUS LIFECYCLE
        //--------------------------------------------------
        
		const previous =
            StateMachine.lifecycleCache.get(
                lifecycleKey
            );

        //--------------------------------------------------
        // RV-11
        // ENGINE STATE VALIDATION
        //
        // Root cause, confirmed from the RV-10 trace: inputs.engineState
        // arrives as the number 0, not the string "SCAN". `0 ?? EngineState
        // .SCAN` evaluates to 0 because ?? only falls back on null/
        // undefined, never on 0. That numeric 0 then fails every
        // `engineState === EngineState.SCAN` check below (a number can
        // never strictly-equal a string), so SCAN -> ARMED could never
        // fire even with stateScanReady true every cycle â€” and the bad
        // value re-caches itself forever.
        //--------------------------------------------------

        const validEngineStates: readonly string[] =
            Object.values(EngineState);

        const rawEngineState =
            previous?.engineState
            ??
            inputs.engineState;

		let engineState: EngineState =
            typeof rawEngineState === "string" &&
            validEngineStates.includes(rawEngineState)
                ? (rawEngineState as EngineState)
                : EngineState.SCAN;

		//--------------------------------------------------
        // CONFIRM
        //--------------------------------------------------
        
        const stateConfirmReady =
            engineState === EngineState.ARMED &&
            genericReady &&
            inputs.executionAllowed &&
            inputs.tradeDirectionFinal !== 0;
        
        let signalBar =
            previous?.signalBar
            ??
            inputs.signalBar
            ??
            -1;
        
        let lastBias =
            previous?.lastBias
            ??
            inputs.lastBias
            ??
            0;

        let enteredArmed = false;
        let enteredConfirmed = false;
        let enteredExecuted = false;
        let enteredManage = false;
		let enteredClosed = false;

        //--------------------------------------------------
        // LIFECYCLE TRANSITION
        //
        // IMPORTANT:
        // Only ONE lifecycle transition is permitted per
        // evaluate() call.
        //--------------------------------------------------

        switch (engineState) {

            //--------------------------------------------------
            // CLOSED -> SCAN
            //--------------------------------------------------

            case EngineState.CLOSED: {

                engineState =
                    EngineState.SCAN;

                break;
            }

            //--------------------------------------------------
            // SCAN -> ARMED
            //--------------------------------------------------

            case EngineState.SCAN: {

                if (
                    stateScanReady
                ) {
                    engineState =
                        EngineState.ARMED;

                    signalBar =
                        inputs.barIndex;

                    lastBias =
                        inputs.tradeDirectionFinal;

                    enteredArmed =
                        true;
                }

                break;
            }

            //--------------------------------------------------
            // ARMED -> CONFIRMED
            //--------------------------------------------------

            case EngineState.ARMED: {

                if (
                    stateConfirmReady
                ) {
                    engineState =
                        EngineState.CONFIRMED;

                    enteredConfirmed =
                        true;
                }

                break;
            }

            //--------------------------------------------------
            // CONFIRMED -> EXECUTED
            //--------------------------------------------------

            case EngineState.CONFIRMED: {

                if (
                    inputs.executionAcknowledged
                ) {
                    engineState =
                        EngineState.EXECUTED;

                    enteredExecuted =
                        true;
                }

                break;
            }

            //--------------------------------------------------
            // EXECUTED -> MANAGE
            //--------------------------------------------------

            case EngineState.EXECUTED: {

                if (
                    inputs.positionOpen
                ) {
                    engineState =
                        EngineState.MANAGE;

                    enteredManage =
                        true;
                }

                break;
            }

            //--------------------------------------------------
            // MANAGE -> CLOSED
            //--------------------------------------------------

            case EngineState.MANAGE: {

                if (
                    inputs.positionClosed
                ) {
                    engineState =
                        EngineState.CLOSED;

                    enteredClosed =
                        true;
                }

                break;
            }

            //--------------------------------------------------
            // INVALID STATE
            //--------------------------------------------------

            default: {

                engineState =
                    EngineState.SCAN;

                break;
            }
        }

		//--------------------------------------------------
        // SAVE LIFECYCLE
        //--------------------------------------------------
// OLD
//        StateMachine.lifecycleCache.set(
//            lifecycleKey,
//            {
//                engineState,
//                signalBar,
//                lastBias
//            }
//        );
//
//        //--------------------------------------------------
//        // RV-10 STATE MACHINE TRACE (Temporary)
//        //
//        // Confirmed by enumerating every console tag across 3
//        // separate log captures: this file has never printed
//        // anything. AJPipelineTrace.stage() receives this exact
//        // data too but also produces no visible output. This is
//        // the only way to see these values right now.
//        //--------------------------------------------------
//
//        console.group("[RV-10 STATE MACHINE]", lifecycleKey);
//
//        console.table({
//            gates: {
//                tradeLifecycleLocked: inputs.tradeLifecycleLocked,
//                isMirrorOptionChart: inputs.isMirrorOptionChart,
//                tradeScore: inputs.tradeScore,
//                minimumTradeScore: inputs.minimumTradeScore,
//                tradeDirectionFinal: inputs.tradeDirectionFinal,
//                executionAllowed: inputs.executionAllowed
//            }
//        });
//
//        console.table({
//            readiness: {
//                routeAISMC,
//                routeAI,
//                routeOriginal,
//                stateScanReady,
//                genericReady,
//                stateConfirmReady
//            }
//        });
//
//        console.table({
//            executedGate: {
//                canEnter: inputs.canEnter,
//                entryPrice: inputs.entryPrice,
//                executionAcknowledged: inputs.executionAcknowledged,
//                positionOpen: inputs.positionOpen,
//                positionClosed: inputs.positionClosed
//            }
//        });
//
//        console.groupEnd();
//
//        return{
        
// NEW
        StateMachine.lifecycleCache.set(
            lifecycleKey,
            {
                engineState,
                signalBar,
                lastBias
            }
        );

        return{
			
            routeAISMC,
            routeAI,
            routeOriginal,
        
            stateScanReady,
            genericReady,
            stateConfirmReady,
        
            confirmEvent:
			    stateConfirmReady,
        
            cryptoReady_SCAN:stateScanReady,
            cryptoReady_CONFIRM:stateConfirmReady,
        
            indiaReady_SCAN:stateScanReady,
            indiaReady_CONFIRM:stateConfirmReady,
        
            indexTradeRunning:false,
            masterTradeMirror:false,
            engineState,
            signalBar,
            lastBias,
            bias:lastBias,
            enteredScan:false,
            enteredArmed,
            enteredConfirmed,
            enteredExecuted,
            enteredManage,
            enteredClosed,
        
			stateChanged:
				enteredArmed ||
				enteredConfirmed ||
				enteredExecuted ||
				enteredManage ||
				enteredClosed,
        
			readyForExecution:
				engineState === EngineState.EXECUTED ||
				engineState === EngineState.MANAGE
        };

    }

}
