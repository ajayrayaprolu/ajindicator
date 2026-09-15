//================================
// \src\backtest\BacktestEngine.ts
//=================================
import type {Signal} from "../runtime/signals/Signal";
import type {Trade} from "./Trade";
import {PerformanceMetrics} from "./PerformanceMetrics";

export class BacktestEngine {

  static run(
    signals: Signal[]
  ) {

    const trades: Trade[] = [];

    let entry:

      Signal | null = null;

    for (
      const signal
      of signals
    ) {

      if (

        signal.action === "BUY" &&

        !entry

      ) {

        entry = signal;

      }

      if (

        signal.action === "SELL" &&

        entry

      ) {

        const pnl =

          signal.price -
          entry.price;

        trades.push({

          entryTime:
            entry.time,

          exitTime:
            signal.time,

          entryPrice:
            entry.price,

          exitPrice:
            signal.price,

          side:
            "LONG",

          pnl,

          returnPct:

            pnl /
            entry.price *
            100,

          barsHeld: 0

        });

        entry = null;

      }

    }

    return {

      trades,

      totalTrades:
        trades.length,

      winRate:

        PerformanceMetrics.winRate(
          trades
        ),

      netProfit:

        PerformanceMetrics.netProfit(
          trades
        ),

      expectancy:

        PerformanceMetrics.expectancy(
          trades
        )

    };

  }

}
