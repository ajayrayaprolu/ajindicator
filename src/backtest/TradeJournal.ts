import type {
  Trade
}
from "./Trade";

export class TradeJournal {

  static export(
    trades: Trade[]
  ) {

    return trades.map(
      trade => ({

        entryTime:
          trade.entryTime,

        exitTime:
          trade.exitTime,

        entryPrice:
          trade.entryPrice,

        exitPrice:
          trade.exitPrice,

        side:
          trade.side,

        pnl:
          trade.pnl,

        returnPct:
          trade.returnPct,

        barsHeld:
          trade.barsHeld

      })
    );

  }

}
