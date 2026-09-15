import { DashboardService } from "./DashboardService";

export function professionalDashboard() {

  return DashboardService.get(
    "AJ_MASTER"
  );
}
