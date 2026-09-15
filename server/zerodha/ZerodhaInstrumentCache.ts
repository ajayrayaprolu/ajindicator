//=========================================
// src/feeds/ZerodhaInstrumentCache.ts
//=========================================
import axios from "axios";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
//=========================================================

export interface ZerodhaInstrument {
    instrument_token: number;
    exchange_token: number;
    tradingsymbol: string;
    name: string;
    exchange: string;
    segment: string;
    instrument_type: string;
    expiry?: string;
    strike?: number;
    tick_size: number;
    lot_size: number;
}

export class ZerodhaInstrumentCache {

    //--------------------------------------------------
    // CACHE
    //--------------------------------------------------

    private static loaded = false;

    private static instruments: ZerodhaInstrument[] = [];

    //--------------------------------------------------
    // INDEXES
    //--------------------------------------------------

    private static tokenIndex =
        new Map<number, ZerodhaInstrument>();

    private static symbolIndex =
        new Map<string, ZerodhaInstrument>();

    private static exchangeSymbolIndex =
        new Map<string, ZerodhaInstrument>();

    //--------------------------------------------------
    // DOWNLOAD FROM NODE SERVER
    //--------------------------------------------------

    static async initialize() {

        if (this.loaded) {
            return;
        }

        AJLoggingGate.log(
            "[ZERODHA CACHE] Loading..."
        );

        const response =
            await axios.get(
                "https://localhost:3001/api/zerodha/instruments"
            );

        this.instruments =
            response.data?.instruments ?? [];
		
		AJLoggingGate.log(
			"[ZERODHA CACHE]",
			"Server returned",
			this.instruments.length,
			"instruments"
		);

        this.buildIndexes();

        this.loaded = true;

        AJLoggingGate.log(
            "[ZERODHA CACHE]",
            this.instruments.length,
            "instruments loaded"
        );

    }

    //--------------------------------------------------
    // BUILD INDEXES
    //--------------------------------------------------

    private static buildIndexes() {
        this.tokenIndex.clear();
        this.symbolIndex.clear();
        this.exchangeSymbolIndex.clear();
        for (const instrument of this.instruments) {
            this.tokenIndex.set(
                instrument.instrument_token,
                instrument
            );

            this.symbolIndex.set(
                instrument.tradingsymbol.toUpperCase(),
                instrument
            );

            this.exchangeSymbolIndex.set(
                `${instrument.exchange}:${instrument.tradingsymbol}`.toUpperCase(),
                instrument
            );
        }
    }

    //--------------------------------------------------
    // LOOKUP
    //--------------------------------------------------

    static getByToken(
        token: number
    ) {
        return (
            this.tokenIndex.get(token)
            ||
            null
        );
    }

    static getByTradingSymbol(
        symbol: string
    ) {
        return (
            this.symbolIndex.get(
                symbol.toUpperCase()
            )
            ||
            null
        );
    }

    static getByExchangeSymbol(
        exchange: string,
        symbol: string
    ) {
        return (
            this.exchangeSymbolIndex.get(
                `${exchange}:${symbol}`.toUpperCase()
            )
            ||
            null
        );
    }

    //--------------------------------------------------
    // ALL
    //--------------------------------------------------

    static getAll() {
        return this.instruments;
    }

    //--------------------------------------------------
    // COUNT
    //--------------------------------------------------
    static count() {
        return this.instruments.length;
    }
}
