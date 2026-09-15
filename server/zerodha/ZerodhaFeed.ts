//=========================================
// src/feeds/ZerodhaFeed.ts
//=========================================

import axios from "axios";
import type { Candle } from "../types/Candle";
import type { IDataFeed } from "../types/IDataFeed";
import { getInstrument } from "./InstrumentMapper";
import { ZerodhaInstrumentCache } from "./ZerodhaInstrumentCache";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";

//===============================================================
export class ZerodhaFeed
implements IDataFeed {

    //--------------------------------------------------
    // HISTORY
    //--------------------------------------------------

    async getHistory(

        symbol: string,

        timeframe: string = "1minute"

    ): Promise<Candle[]> {

		//--------------------------------------------------
		// SESSION CHECK
		//--------------------------------------------------
		
		const session =
			await axios.get(
				"https://localhost:3001/api/zerodha/session"
			);
		
		if (!session.data?.loggedIn) {
		
			AJLoggingGate.warn(
		
				"[ZERODHA]",
		
				"User not logged in."
		
			);
		
			return [];
		
		}
		
		//--------------------------------------------------
		// Ensure cache loaded
		//--------------------------------------------------
		
		await ZerodhaInstrumentCache.initialize();

        //--------------------------------------------------
        // Registry Mapping
        //--------------------------------------------------

        const registry =

            getInstrument(
                symbol,
                "zerodha"
            );

        let instrumentToken =
            registry?.instrumentToken;

        //--------------------------------------------------
        // Cache fallback
        //--------------------------------------------------

        if (!instrumentToken) {

            const cacheInstrument =

                ZerodhaInstrumentCache
                    .getByTradingSymbol(
                        symbol
                    );

            instrumentToken =
                cacheInstrument
                    ?.instrument_token;

        }

        if (!instrumentToken) {

            AJLoggingGate.error(

                "[ZERODHA]",

                "Instrument not found:",

                symbol

            );

            return [];

        }

        //--------------------------------------------------
        // Fetch from Node server
        //--------------------------------------------------

        AJLoggingGate.log(

            "[ZERODHA]",

            symbol,

            "->",

            instrumentToken

        );

		let response;
		
		try {
		
			response =
				await axios.get(
		
					`https://localhost:3001/api/zerodha/history/${symbol}`,
		
					{
		
						params: {
		
							timeframe
		
						}
		
					}
		
				);
		
		}
		
		catch (error: any) {
		
			AJLoggingGate.warn(
		
				"[ZERODHA HISTORY]",
		
				error?.response?.data?.details ??
		
				error?.message
		
			);
		
			return [];
		
		}

        const rows =
            response.data ?? [];

        if (!Array.isArray(rows)) {

            AJLoggingGate.warn(
                "[ZERODHA] Invalid response"
            );

            return [];

        }

        //--------------------------------------------------
        // Convert to Candle[]
        //--------------------------------------------------

        const candles:Candle[] =

            rows

                .map(

                    (row:any) => {

                        //--------------------------------------------------
                        // API returns:
                        //
                        // {
                        //   date
                        //   open
                        //   high
                        //   low
                        //   close
                        //   volume
                        // }
                        //--------------------------------------------------

                        const epoch =

                            Math.floor(

                                new Date(
                                    row.date
                                ).getTime()

                                / 1000

                            );

                        return {

                            time: epoch,

                            open:
                                Number(
                                    row.open
                                ),

                            high:
                                Number(
                                    row.high
                                ),

                            low:
                                Number(
                                    row.low
                                ),

                            close:
                                Number(
                                    row.close
                                ),

                            volume:
                                Number(
                                    row.volume ?? 0
                                )

                        };

                    }

                )

                .filter(

                    candle =>

                        !Number.isNaN(
                            candle.open
                        )

                        &&

                        !Number.isNaN(
                            candle.high
                        )

                        &&

                        !Number.isNaN(
                            candle.low
                        )

                        &&

                        !Number.isNaN(
                            candle.close
                        )

                );

        //--------------------------------------------------
        // Diagnostics
        //--------------------------------------------------

        AJLoggingGate.log();

        AJLoggingGate.log(
            "================================="
        );

        AJLoggingGate.log(
            "ZERODHA HISTORY"
        );

        AJLoggingGate.log(
            "================================="
        );

        AJLoggingGate.log(
            "Symbol :",
            symbol
        );

        AJLoggingGate.log(
            "Token  :",
            instrumentToken
        );

        AJLoggingGate.log(
            "Candles:",
            candles.length
        );

        candles
            .slice(-10)
            .forEach(
                (
                    candle,
                    index
                ) => {
                    AJLoggingGate.log(
                        `BAR ${index}`,
                        {
                            time: candle.time,
                            open: candle.open,
                            high: candle.high,
                            low: candle.low,
                            close: candle.close,
                            volume: candle.volume
                        }
                    );
                }
            );

        AJLoggingGate.log(
            "================================="
        );
        AJLoggingGate.log();
        return candles;
    }

    //--------------------------------------------------
    // LIVE
    //--------------------------------------------------

	subscribe(
	
		symbol: string,
	
		callback: (
			candle: Candle
		) => void
	
	): void {
	
		AJLoggingGate.log(
			"[ZERODHA LIVE]",
			"Live subscription requested:",
			symbol
		);
	
		/*
		* Live Zerodha ticks are delivered by the server-side
		* KiteTicker/WebSocket path.
		*
		* This method intentionally does NOT poll history.
		*
		* The server-side FeedManager receives the normalized
		* KiteTicker tick and forwards it through the normal
		* candle/tick pipeline.
		*
		* History remains exclusively responsible for initial
		* chart backfill.
		*/
	
	}

    //--------------------------------------------------
    // DISCONNECT
    //--------------------------------------------------

	disconnect(): void {
		/*
		* No polling timer exists anymore.
		*
		* Zerodha live data is owned by the server-side
		* KiteTicker lifecycle.
		*/
	}

}