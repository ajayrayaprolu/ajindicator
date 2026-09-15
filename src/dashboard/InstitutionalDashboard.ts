//==========================================
// src/dashboard/InstitutionalDashboard.ts
//===========================================

import { DashboardStore } from "./DashboardStore";

export function institutionalDashboard() {

  const state =
    DashboardStore.get();

  return {

    portfolioValue:
      state.portfolioValue,

    exposure:
      state.exposure,

    risk:
      state.risk,

    pnl:
      state.pnl,

    winRate:
      state.winRate,

    activeTrades:
      state.activeTrades
  };
}
