export interface Candle {
    time?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface TradeLevels {
    entry?: number;
    sl?: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
}

export interface TradeContext {
    direction: number;
    bias: number;
    score: number;
    confidence: number;
}
