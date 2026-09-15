//======================================================
// IndicatorRuntime.ts :\src\runtime\IndicatorRuntime.ts
// Canonical Mixed Runtime
// Supports both Legacy Indicators and AJ Payload Indicators
//======================================================

import type { Candle } from "../types/Candle";
import type {AJIndicatorPayload, AJIndicatorResult} from "../indicators/AJIndicator/AJTypes";
import { IndicatorRegistry } from "./IndicatorRegistry";

//import type {LegacyIndicator, PayloadIndicator, RuntimeIndicator} from "./IndicatorRegistry";

//======================================================
// LEGACY RESULT
//======================================================

export interface LegacyRuntimeResult {
    type: "legacy";
    name: string;
    values: unknown;
}

//======================================================
// AJ RESULT
//======================================================

export interface AJRuntimeIndicatorResult {
    type: "aj";
    name: string;
    result: AJIndicatorResult;
}

//======================================================
// UNION
//======================================================

export type IndicatorRuntimeResult =
    | LegacyRuntimeResult
    | AJRuntimeIndicatorResult;

//======================================================
// RUNTIME
//======================================================
//======================================================

export class IndicatorRuntime {

    //--------------------------------------------------
    // EXECUTE LEGACY INDICATOR
    //--------------------------------------------------

    static executeLegacy(
        name: string,
        candles: Candle[]
    ): LegacyRuntimeResult | null {
		
        const runtimeIndicator =
            IndicatorRegistry.get(name);
        
        if (!runtimeIndicator)
            return null;
        
        if (runtimeIndicator.kind !== "legacy")
            return null;
        
        const result =
            runtimeIndicator.calculate(
                candles
            );

        return {
            type: "legacy",
            name,
            values: result
        };
    }

    //--------------------------------------------------
    // EXECUTE AJ INDICATOR
    //--------------------------------------------------

    static executeAJ(
        name: string,
        payload: AJIndicatorPayload
    ): AJRuntimeIndicatorResult | null {

        const runtimeIndicator =
            IndicatorRegistry.get(name);
        
        if (!runtimeIndicator)
            return null;
        
        if (runtimeIndicator.kind !== "payload")
            return null;
        
        const result =
            runtimeIndicator.calculate(
                payload
            );

        return {
            type: "aj",
            name,
            result
        };
    }

    //--------------------------------------------------
    // AUTO EXECUTE
    //--------------------------------------------------

    static execute(
        name: string,
        input: Candle[] | AJIndicatorPayload
    ): IndicatorRuntimeResult | null {
        if (Array.isArray(input)) {
            return this.executeLegacy(
                name,
                input
            );
        }
        return this.executeAJ(
            name,
            input
        );
    }

}

