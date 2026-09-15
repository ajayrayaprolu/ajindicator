//RuntimeContext (base platform contract)
//\src\runtime\RuntimeContext.ts "It will contain only: Market, Candle data, OHLCV, Session / Bar,
// Position, Risk, Runtime flags, Trade lifecycle,Options, Engine state,Broker/platform values,User settings
//RuntimeContext = platform/base runtime contract.
//AJRuntimeContext = enriched institutional/AI context.
//RuntimeResult = final pipeline output that references AJRuntimeContext.

//======================================================
// RuntimeContext.ts
// Base Platform Runtime Contract
//======================================================

import type { Candle } from "../types/Candle";
import { EngineState } from "../core/EngineState";

export interface RuntimeContext {

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    chartId: string;
    symbol: string;
    timeframe: string;
    datasource: string;

    //--------------------------------------------------
    // CANDLE DATA
    //--------------------------------------------------

    candles: Candle[];
    current: Candle;
    previous: Candle;

    //--------------------------------------------------
    // BAR INFORMATION
    //--------------------------------------------------

    barIndex: number;
    timestamp: number;

    //--------------------------------------------------
    // CURRENT OHLCV
    //--------------------------------------------------

    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;

    //--------------------------------------------------
    // POSITION
    //--------------------------------------------------
    
    tradeDirection: number;
    
    entryPrice: number;
    
    stopLoss: number;
    
    slPrice: number;
    
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    
    tp1: number;
    tp2: number;
    tp3: number;
    
    currentPrice: number;
    
    positionSize: number;
    
    positionOpen: boolean;
    
    inPosition: boolean;
    
    //--------------------------------------------------
    // RISK
    //--------------------------------------------------
    
    atr: number;
    
    riskATR: number;
    
    slBuffer: number;
    
    tp1RR: number;
    tp2RR: number;
    tp3RR: number;

    //--------------------------------------------------
    // OPTIONS
    //--------------------------------------------------

    isOptionsMode: boolean;
    isOptionChart: boolean;
    isMirrorOptionChart: boolean;

    underlying: string;
    strike: number;
    strikeStep: number;

    currentOptionType: string;

    greekExecOk: boolean;
    greekOptionMode: boolean;

    //--------------------------------------------------
    // RUNTIME FLAGS
    //--------------------------------------------------

    enableAITradeSafety: boolean;
    enableAISMCMode: boolean;

    tradeLifecycleLocked: boolean;

    useVWAP: boolean;
    useCVD: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionName: string;

    sessionOpen: boolean;

    sessionHigh: number;
    sessionLow: number;

    dayHigh: number;
    dayLow: number;

    marketOpen: boolean;
    marketClose: boolean;

    //--------------------------------------------------
    // PLATFORM / BROKER
    //--------------------------------------------------

    exchange: string;
    broker: string;
    accountId: string;

    currency: string;

    tickSize: number;
    lotSize: number;
    pointValue: number;

    pricePrecision: number;
    quantityPrecision: number;

    //--------------------------------------------------
    // ORDER
    //--------------------------------------------------

    orderId: string;

    orderActive: boolean;
    orderFilled: boolean;
    orderCancelled: boolean;

    //--------------------------------------------------
    // POSITION STATE
    //--------------------------------------------------

    positionSide: number;

    unrealizedPnL: number;
    realizedPnL: number;

    //--------------------------------------------------
    // PLATFORM ENGINE STATE
    //--------------------------------------------------
    
    state: EngineState;
    
    engineState: EngineState;

    //--------------------------------------------------
    // EXTENSIONS
    //--------------------------------------------------

    metadata?: Record<string, unknown>;
    tags?: string[];
}
