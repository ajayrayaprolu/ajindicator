//============================
// src\data\SymbolMaster.ts
//=============================

export interface SymbolInfo {

  symbol: string;

  name: string;

  assetClass:
    | "INDEX"
    | "STOCK"
    | "CRYPTO"
    | "FOREX"
    | "COMMODITY";

  datasource:
    | "Yahoo"
    | "Binance";

}

export const SYMBOL_MASTER: SymbolInfo[] = [

  // ======================
  // INDEX
  // ======================

  {
    symbol: "NIFTY",
    name: "NIFTY 50",
    assetClass: "INDEX",
    datasource: "Yahoo"
  },

  {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY",
    assetClass: "INDEX",
    datasource: "Yahoo"
  },

  {
    symbol: "SENSEX",
    name: "SENSEX",
    assetClass: "INDEX",
    datasource: "Yahoo"
  },

  // ======================
  // STOCKS
  // ======================

  {
    symbol: "RELIANCE",
    name: "Reliance",
    assetClass: "STOCK",
    datasource: "Yahoo"
  },

  {
    symbol: "TCS",
    name: "TCS",
    assetClass: "STOCK",
    datasource: "Yahoo"
  },

  {
    symbol: "INFY",
    name: "Infosys",
    assetClass: "STOCK",
    datasource: "Yahoo"
  },

  {
    symbol: "ADANIPORTS",
    name: "Adani Ports",
    assetClass: "STOCK",
    datasource: "Yahoo"
  },

  // ======================
  // CRYPTO
  // ======================

  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    assetClass: "CRYPTO",
    datasource: "Binance"
  },

  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    assetClass: "CRYPTO",
    datasource: "Binance"
  },

  {
    symbol: "SOLUSDT",
    name: "Solana",
    assetClass: "CRYPTO",
    datasource: "Binance"
  },

  // ======================
  // FOREX
  // ======================

  {
    symbol: "USDINR",
    name: "USDINR",
    assetClass: "FOREX",
    datasource: "Yahoo"
  },

  // ======================
  // COMMODITY
  // ======================

  // Display/search symbol remains XAUUSD.
  // Binance resolver automatically maps this to
  // the Binance-supported XAUUSDT Futures instrument.
  {
    symbol: "XAUUSD",
    name: "Gold",
    assetClass: "COMMODITY",
    datasource: "Binance"
  }

];