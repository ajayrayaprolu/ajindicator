//======================================================
// src\runtime\Portfolio\PortfolioRiskResult.ts : PortfolioRiskResult.ts
// Canonical Portfolio Risk Contract
//======================================================
//======================================================
// PortfolioRiskResult.ts
// Canonical Phase 11 Portfolio Risk Contract
//======================================================

export interface PortfolioRiskResult {

    //--------------------------------------------------
    // RISK
    //--------------------------------------------------

    riskAllowed: boolean;

    portfolioRisk: number;

    positionRisk: number;

    recommendedRisk: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------

    maxPositionSize: number;

    //--------------------------------------------------
    // UTILIZATION
    //--------------------------------------------------

    dailyRiskUsed: number;

    exposure: number;

    correlationRisk: number;

    //--------------------------------------------------
    // RECOMMENDATION
    //--------------------------------------------------

    recommendation: string;

}
