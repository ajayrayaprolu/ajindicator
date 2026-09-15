import type {
  Trade
}
from "./Trade";

export class EquityCurve {

  static build(
    trades: Trade[]
  ) {

    const curve: number[] = [];

    let equity = 0;

    for (const trade of trades) {

      equity += trade.pnl;

      curve.push(
        equity
      );

    }

    return curve;

  }

}
