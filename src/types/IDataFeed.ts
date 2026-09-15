//=============================
// .\src\types\IDataFeed.ts
//============================

import type { Candle } from "./Candle";

//=========================================

export interface IDataFeed {

  getHistory(
    symbol: string,
    timeframe?: string
  ): Promise<Candle[]>;

  subscribe?(
    symbol: string,
    callback: (
      candle: Candle
    ) => void
  ): void;

  disconnect?(): void;

}
