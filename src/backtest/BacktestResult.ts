import type {
  Trade
}
from "./Trade";

export interface BacktestResult {

  trades: Trade[];

  totalTrades: number;

  winningTrades: number;

  losingTrades: number;

  winRate: number;

  netProfit: number;

  profitFactor: number;

  expectancy: number;

  maxDrawdown: number;

}
