import {
  AnalyticsService
} from "./AnalyticsService";

import {
  InstitutionalRanking
} from "./InstitutionalRanking";

export class AJAnalyticsAdapter {

  static buildSnapshot() {

    const metrics =
      AnalyticsService.getMetrics();

    const rank =
      InstitutionalRanking.rank(
        metrics.winRate
      );

    return {

      totalTrades:
        metrics.totalTrades,

      wins:
        metrics.wins,

      losses:
        metrics.losses,

      pnl:
        metrics.totalPnL,

      winRate:
        metrics.winRate,

      averagePnL:
        metrics.avgPnL,

      institutionalGrade:
        rank.grade
    };
  }
}
