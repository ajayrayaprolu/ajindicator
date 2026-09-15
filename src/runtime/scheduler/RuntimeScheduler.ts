// src/runtime/scheduler/RuntimeScheduler.ts (imports, interfaces, scheduler state, configuration, and execution gating).
// The next section is RuntimeScheduler.ts — Part 2, which will contain: // schedule() orchestration // execution mode selection 
// runtime status management // scheduler state updates // result construction // class closing brace.

//======================================================
// RuntimeScheduler.ts — Phase 11 Scheduler (FIXED)
//======================================================

import type { RuntimeContext } from "../RuntimeContext";
import { RuntimeStatus, ExecutionMode } from "../RuntimeTypes";

//import type { any } from "../execution/ExecutionOptimizer";

//======================================================
// SCHEDULE TYPES
//======================================================

export interface RuntimeSchedule {
    enabled: boolean;
    executionInterval: number;
    lastExecutionBar: number;
    nextExecutionBar: number;
    executionCount: number;
}

export interface RuntimeSchedulerResult {
    shouldExecute: boolean;
    executionMode: ExecutionMode;
    runtimeStatus: RuntimeStatus;
    reason: string;
}

//======================================================
// RUNTIME SCHEDULER
//======================================================

export class RuntimeScheduler {

    private static schedulerState: RuntimeSchedule = {
        enabled: true,
        executionInterval: 1,
        lastExecutionBar: -1,
        nextExecutionBar: 0,
        executionCount: 0
    };

    static reset(): void {
        this.schedulerState = {
            enabled: true,
            executionInterval: 1,
            lastExecutionBar: -1,
            nextExecutionBar: 0,
            executionCount: 0
        };
    }

    static enable(): void {
        this.schedulerState.enabled = true;
    }

    static disable(): void {
        this.schedulerState.enabled = false;
    }

    static setExecutionInterval(bars: number): void {
        this.schedulerState.executionInterval = Math.max(1, bars);
    }

    private static canExecute(runtime: RuntimeContext): boolean {
        if (!this.schedulerState.enabled) return false;

        if (runtime.barIndex < this.schedulerState.nextExecutionBar) return false;

        return true;
    }

    static schedule(
        runtime: RuntimeContext,
        optimization: any
    ): RuntimeSchedulerResult {

        //--------------------------------------------------
        // DISABLED
        //--------------------------------------------------

        if (!this.schedulerState.enabled) {
            return {
                shouldExecute: false,
                executionMode: ExecutionMode.NORMAL,
                runtimeStatus: RuntimeStatus.IDLE,
                reason: "Scheduler Disabled"
            };
        }

        //--------------------------------------------------
        // BAR FILTER
        //--------------------------------------------------

        if (!this.canExecute(runtime)) {
            return {
                shouldExecute: false,
                executionMode: ExecutionMode.NORMAL,
                runtimeStatus: RuntimeStatus.READY,
                reason: "Waiting For Next Execution Window"
            };
        }

        //--------------------------------------------------
        // EXECUTION PERMISSION
        //--------------------------------------------------

        if (!optimization.executionAllowed) {
            return {
                shouldExecute: false,
                executionMode: ExecutionMode.NORMAL,
                runtimeStatus: RuntimeStatus.READY,
                reason: optimization.recommendation
            };
        }

        //--------------------------------------------------
        // EXECUTION MODE SELECTION (FIXED)
        //--------------------------------------------------

        let executionMode = ExecutionMode.NORMAL;

        if (optimization.executionScore >= 90) {
            executionMode = ExecutionMode.NORMAL;
        }
        else if (optimization.executionScore >= 75) {
            executionMode = ExecutionMode.NORMAL;
        }
        else if (optimization.executionScore >= 60) {
            executionMode = ExecutionMode.NORMAL;
        }

        //--------------------------------------------------
        // UPDATE SCHEDULE STATE
        //--------------------------------------------------

        this.schedulerState.lastExecutionBar = runtime.barIndex;
        this.schedulerState.nextExecutionBar = runtime.barIndex + this.schedulerState.executionInterval;
        this.schedulerState.executionCount++;

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {
            shouldExecute: true,
            executionMode,
            runtimeStatus: RuntimeStatus.EXECUTING,
            reason: optimization.recommendation
        };
    }

    static getSchedule(): RuntimeSchedule {
        return { ...this.schedulerState };
    }
}

