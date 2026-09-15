export interface ScanResult {

  symbol: string;

  timeframe: string;

  signal: string;

  score: number;

  severity:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "EXTREME";

  timestamp: number;

}
