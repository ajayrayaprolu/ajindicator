//======================================================
// IndicatorRegistry.ts :\src\runtime\IndicatorRegistry.ts
// Canonical Mixed Indicator Registry
// Supports both Legacy Indicators and AJ Payload Indicators
//IndicatorRegistry
//       │
//       ├── kind = legacy
//       │        │
//       │        └── executeLegacy()
//       │
//       └── kind = payload
//                │
//                └── executeAJ()
//======================================================

import type { Candle } from "../types/Candle";

import { EMA } from "../indicators/EMA";
import { VWAP } from "../indicators/VWAP";
import { RSI } from "../indicators/RSI";
import { ATR } from "../indicators/ATR";
import { ADX } from "../indicators/ADX/ADX";

import type {
    AJIndicatorPayload,
    AJIndicatorResult
} from "../indicators/AJIndicator/AJTypes";

//======================================================
// LEGACY INDICATOR
//======================================================

export interface LegacyIndicator {

    kind: "legacy";

    calculate(
        candles: Candle[]
    ): unknown;

}

//======================================================
// PAYLOAD INDICATOR
//======================================================

export interface PayloadIndicator {

    kind: "payload";

    calculate(
        payload: AJIndicatorPayload
    ): AJIndicatorResult;

}

//======================================================
// UNION
//======================================================

export type RuntimeIndicator =
    | LegacyIndicator
    | PayloadIndicator;

//======================================================
// REGISTRY
//======================================================

export class IndicatorRegistry {

    private static readonly indicators:
        Record<string, RuntimeIndicator> = {

        //--------------------------------------------------
        // EMA
        //--------------------------------------------------

        EMA: {
            kind: "legacy",
            calculate(
                candles: Candle[]
            ) {

                return EMA.calculate(
                    candles.map(
                        c => c.close
                    ),
                    20
                );

            }

        },

        //--------------------------------------------------
        // VWAP
        //--------------------------------------------------

        VWAP: {
            kind: "legacy",
            calculate(
                candles: Candle[]
            ) {

                return VWAP.calculate(
                    candles
                );

            }

        },

        //--------------------------------------------------
        // RSI
        //--------------------------------------------------

        RSI: {
            kind: "legacy",
            calculate(
                candles: Candle[]
            ) {

                return RSI.calculate(
                    candles.map(
                        c => c.close
                    ),
                    14
                );

            }

        },

        //--------------------------------------------------
        // ATR
        //--------------------------------------------------

        ATR: {
            kind: "legacy",
            calculate(
                candles: Candle[]
            ) {

                return ATR.calculate(
                    candles,
                    14
                );

            }

        },

        //--------------------------------------------------
        // ADX
        //--------------------------------------------------

        ADX: {
            kind: "legacy",
            calculate(
                candles: Candle[]
            ) {

                return ADX.calculate(
                    candles
                );

            }

        },

        //--------------------------------------------------
        // AJ INSTITUTIONAL ENGINE
        //--------------------------------------------------

        AJINDICATOR: {
            kind: "payload",
			
            calculate(
                _payload: AJIndicatorPayload
            ) {
            
                throw new Error(
                    "AJHost is no longer callable from IndicatorRegistry."
                );
            
            }

        }

    };

    //--------------------------------------------------
    // GET
    //--------------------------------------------------

    static get(
        name: string
    ): RuntimeIndicator | undefined {

        return this.indicators[name];

    }

    //--------------------------------------------------
    // REGISTER
    //--------------------------------------------------

    static register(
        name: string,
        indicator: RuntimeIndicator
    ): void {

        this.indicators[name] =
            indicator;

    }

    //--------------------------------------------------
    // REMOVE
    //--------------------------------------------------

    static unregister(
        name: string
    ): void {

        delete this.indicators[name];

    }

    //--------------------------------------------------
    // EXISTS
    //--------------------------------------------------

    static has(
        name: string
    ): boolean {

        return name in this.indicators;

    }

    //--------------------------------------------------
    // LIST
    //--------------------------------------------------

    static list(): string[] {

        return Object.keys(
            this.indicators
        );

    }

}