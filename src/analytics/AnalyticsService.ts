import {
  TradeTracker
} from "./TradeTracker";

import {
  PerformanceMetrics
} from "./PerformanceMetrics";

export class AnalyticsService {

  static getMetrics() {

    const trades =
      TradeTracker.getTrades();

    return PerformanceMetrics.calculate(
      trades
    );
  }

  static getPnL(): number {

    return this
      .getMetrics()
      .totalPnL;
  }

  static getWinRate(): number {

    return this
      .getMetrics()
      .winRate;
  }

  static getTradeCount(): number {

    return this
      .getMetrics()
      .totalTrades;
  }
}
