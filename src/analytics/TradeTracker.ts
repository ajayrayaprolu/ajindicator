export interface TradeRecord {

  id: string;

  symbol: string;

  direction: "LONG" | "SHORT";

  entryPrice: number;

  exitPrice: number;

  pnl: number;

  pnlPercent: number;

  timestamp: number;
}

export class TradeTracker {

  private static trades: TradeRecord[] = [];

  static addTrade(
    trade: TradeRecord
  ): void {

    this.trades.push(
      trade
    );
  }

  static getTrades(): TradeRecord[] {

    return [
      ...this.trades
    ];
  }

  static clear(): void {

    this.trades = [];
  }
}
