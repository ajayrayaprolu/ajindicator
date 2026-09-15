//=====================================
// src\config\SymbolRegistry.ts
//====================================

export const SymbolRegistry = {

  NIFTY: {
    yahoo: "^NSEI",
    zerodha: "NIFTY 50",
    upstox: "NSE_INDEX|Nifty 50",
    dhan: "NIFTY 50",
    aliceblue: "Nifty 50"
  },

  BANKNIFTY: {
    yahoo: "^NSEBANK",
    zerodha: "NIFTY BANK",
    upstox: "NSE_INDEX|Nifty Bank",
    dhan: "NIFTY BANK",
    aliceblue: "Nifty Bank"
  },

  SENSEX: {
    yahoo: "^BSESN",
    zerodha: "SENSEX",
    upstox: "SENSEX",
    dhan: "SENSEX",
    aliceblue: "SENSEX"
  },

  // ==============================
  // BINANCE
  // ==============================

  BTCUSDT: {
    yahoo: "BTCUSDT",
    binance: "BTCUSDT"
  },

  ETHUSDT: {
    yahoo: "ETHUSDT",
    binance: "ETHUSDT"
  },

  SOLUSDT: {
    yahoo: "SOLUSDT",
    binance: "SOLUSDT"
  },

  // XAUUSD remains the application/search symbol.
  // BinanceInstrumentResolver resolves it automatically
  // to XAUUSDT / futures at runtime.
  XAUUSD: {
    yahoo: "XAUUSD",
    binance: "XAUUSDT"
  },

  USDINR: {
    yahoo: "USDINR"
  },

  RELIANCE: {
    yahoo: "RELIANCE.NS",
    dhan: "2885"
  },

  TCS: {
    yahoo: "TCS.NS",
    dhan: "11536"
  },

  INFY: {
    yahoo: "INFY.NS",
    dhan: "1594"
  },

  HDFCBANK: {
    yahoo: "HDFCBANK",
    dhan: "1333"
  },

  SBIN: {
    yahoo: "SBIN",
    dhan: "3045"
  },

  ADANIPORTS: {
    yahoo: "ADANIPORTS",
    dhan: "3054"
  }

};