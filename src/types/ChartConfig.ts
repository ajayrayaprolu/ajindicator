//======================================
// src/types/ChartConfig.ts
// AJ v2 - Chart Configuration
//======================================

import type {
  ChartStyle
} from "../components/ChartStyleSelector";

//======================================
// CHART INDICATORS
//======================================

export interface ChartIndicators {

  ema: boolean;

  vwap: boolean;

  rsi: boolean;

  atr: boolean;

  adx: boolean;

  ajindicator: boolean;

}

//======================================
// CHART CONFIGURATION
//======================================

export interface CandleColors {
  upColor: string;
  downColor: string;
  borderUpColor: string;
  borderDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
}


export interface ChartConfig {
  id: number;
  symbol: string;
  displayName?: string;
  yahooSymbol?: string;
  timeframe: string;
  datasource: string;
  chartStyle: ChartStyle;
  indicators: ChartIndicators;
  candleColors?: CandleColors;
  exchange?: string;
  feedSource?: string;
  underlying?: string;
  expiry?: string;
  strike?: number;
  optionType?: string;
}