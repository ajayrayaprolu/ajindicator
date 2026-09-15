export interface Trade {

  entryTime: number;

  exitTime: number;

  entryPrice: number;

  exitPrice: number;

  side:
    | "LONG"
    | "SHORT";

  pnl: number;

  returnPct: number;

  barsHeld: number;

}
