import type {
Trade
}
from "./Trade";

export class PerformanceMetrics {

static winRate(
trades: Trade[]
) {

if (!trades.length)
  return 0;

const wins =
  trades.filter(
    t => t.pnl > 0
  ).length;

return (
  wins /
  trades.length
) * 100;

}

static netProfit(
trades: Trade[]
) {

return trades.reduce(
  (sum, t) =>
    sum + t.pnl,
  0
);

}

static expectancy(
trades: Trade[]
) {

if (!trades.length)
  return 0;

return (
  this.netProfit(
    trades
  ) /
  trades.length
);

}

static profitFactor(
trades: Trade[]
) {

const grossProfit =
  trades
    .filter(
      t => t.pnl > 0
    )
    .reduce(
      (s, t) =>
        s + t.pnl,
      0
    );

const grossLoss =
  Math.abs(

    trades
      .filter(
        t => t.pnl < 0
      )
      .reduce(
        (s, t) =>
          s + t.pnl,
        0
      )

  );

if (grossLoss === 0)
  return grossProfit;

return (
  grossProfit /
  grossLoss
);

}

static maxDrawdown(
equityCurve: number[]
) {

let peak = 0;
let maxDD = 0;

for (
  const equity
  of equityCurve
) {

  peak =
    Math.max(
      peak,
      equity
    );

  const dd =
    peak - equity;

  maxDD =
    Math.max(
      maxDD,
      dd
    );

}

return maxDD;

}

}
