import type {
  TradeRecord
} from "./TradeTracker";

export interface Metrics {

  totalTrades: number;

  wins: number;

  losses: number;

  winRate: number;

  totalPnL: number;

  avgPnL: number;
}

export class PerformanceMetrics {

  static calculate(
    trades: TradeRecord[]
  ): Metrics {

    const wins =
      trades.filter(
        t => t.pnl > 0
      ).length;

    const losses =
      trades.filter(
        t => t.pnl <= 0
      ).length;

    const totalPnL =
      trades.reduce(
        (a, b) => a + b.pnl,
        0
      );

    return {

      totalTrades:
        trades.length,

      wins,

      losses,

      winRate:
        trades.length > 0
          ? (wins / trades.length) * 100
          : 0,

      totalPnL,

      avgPnL:
        trades.length > 0
          ? totalPnL / trades.length
          : 0
    };
  }
}
