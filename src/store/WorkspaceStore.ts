/**************************************************************************************************

- File:
- WorkspaceStore.ts
-
- Purpose:
- Persistent workspace configuration store for the AJ v2 workspace.
-
- Responsibility:
- Save layout and ChartConfig[] to localStorage.
- Load persisted workspace configuration.
- Restore indicator defaults for backward compatibility.
- Clear persisted workspace configuration.
-
- AJ v2 Flow:
- Workspace8 → WorkspaceStore → localStorage
- localStorage → WorkspaceStore → Workspace8
-
- Workspace State:
- layout + charts[] + indicator configuration.
-
- Indicator Defaults:
- EMA/VWAP default ON.
- RSI/ATR/ADX/AJIndicator default OFF.
-
- This store DOES NOT:
- Execute trading logic, calculate indicators, run AJ engines, or manage runtime state.
-
- AJ v2 Rule:
- WorkspaceStore owns persistence only; Workspace8 owns UI/workspace orchestration; AJ runtime remains separate.

**************************************************************************************************/

import type {ChartConfig} from "../types/ChartConfig";
//===================================================================

export interface WorkspaceState {
    layout: number;
    charts: ChartConfig[];
}

const STORAGE_KEY = "AJ_WORKSPACE";

export class WorkspaceStore {

  static save(
    state: WorkspaceState
  ) {

    localStorage.setItem(

      STORAGE_KEY,

      JSON.stringify(
        state
      )

    );

  }

  static load():
    WorkspaceState | null {

    const raw =

      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw)
      return null;

    try {

      const state =
        JSON.parse(raw);

      state.charts =
        state.charts.map(
          (chart: any) => ({

            ...chart,

            indicators: {

              ema:
                chart.indicators?.ema ?? true,

              vwap:
                chart.indicators?.vwap ?? true,

              rsi:
                chart.indicators?.rsi ?? false,

              atr:
                chart.indicators?.atr ?? false,

              adx:
                chart.indicators?.adx ?? false,

              ajindicator:
                chart.indicators?.ajindicator ?? false

            }

          })
        );

      return state;

    }

    catch {

      return null;

    }

  }

  static clear() {

    localStorage.removeItem(
      STORAGE_KEY
    );

  }

}
