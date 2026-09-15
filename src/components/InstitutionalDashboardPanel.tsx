//===============================================
// src/components/InstitutionalDashboardPanel.tsx
//=================================================

import { DashboardStore }
from "../dashboard/DashboardStore";

export default function InstitutionalDashboardPanel() {

  const state =

    DashboardStore.get();

  return (

    <div>

      <h3>Institutional Dashboard</h3>

      <div>
        Portfolio:
        {state.portfolioValue}
      </div>

      <div>
        Exposure:
        {state.exposure}
      </div>

      <div>
        Risk:
        {state.risk}
      </div>

      <div>
        Recommendations:
        {state.recommendations}
      </div>

    </div>

  );

}
