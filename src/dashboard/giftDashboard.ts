import { DashboardStore } from "./DashboardStore";

export function giftDashboard() {

  return {

    recommendations:
      DashboardStore.get()
        .recommendations
  };
}
