//=====================
// /src/types/candles.ts
//====================
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
