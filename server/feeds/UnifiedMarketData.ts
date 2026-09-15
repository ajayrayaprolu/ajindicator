//=============================================
// server\feeds\UnifiedMarketData.ts
//=============================================

import type { Candle } from "../types/Candle";

export function getMockCandles(): Candle[] {
  return [
    {
      time: 1,
      open: 100,
      high: 110,
      low: 95,
      close: 108,
      volume: 1000,
    },
    {
      time: 2,
      open: 108,
      high: 120,
      low: 105,
      close: 118,
      volume: 1200,
    },
  ];
}
