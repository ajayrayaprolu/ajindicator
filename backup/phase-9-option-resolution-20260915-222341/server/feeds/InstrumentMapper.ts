//=========================================
// server/feeds/InstrumentMapper.ts
//=========================================

import {
    InstrumentRegistry
} from "../../src/config/InstrumentRegistry.ts";

import {
    AJLoggingGate
} from "../../src/indicators/AJIndicator/debug/AJLoggingGate.ts";

//================================================================

export interface InstrumentSource {

    //--------------------------------------------------
    // Common
    //--------------------------------------------------

    symbol?: string;

    exchange?: string;

    //--------------------------------------------------
    // Zerodha
    //--------------------------------------------------

    instrumentToken?: number;

    //--------------------------------------------------
    // Dhan
    //--------------------------------------------------

    securityId?: string;

    //--------------------------------------------------
    // Upstox
    //--------------------------------------------------

    instrumentKey?: string;

    //--------------------------------------------------
    // Alice Blue
    //--------------------------------------------------

    token?: string;

    //--------------------------------------------------
    // Generic
    //--------------------------------------------------

    [key: string]: any;

}

//==================================================
// GENERIC INSTRUMENT RESOLVER
//==================================================

export function getInstrument(

    symbol: string,

    datasource: string

): InstrumentSource | null {

    const key =
        symbol
            .trim()
            .toUpperCase();

    const provider =
        datasource
            .trim()
            .toLowerCase();

    const item =
        InstrumentRegistry[
            key as keyof typeof InstrumentRegistry
        ];

    if (!item) {
        AJLoggingGate.warn(
            "[InstrumentMapper]",
            "Instrument not found:",
            key
        );
        return null;
    }

    const source =
        (item as any)[provider];
    if (!source) {
        AJLoggingGate.warn(
            "[InstrumentMapper]",
            `Provider '${provider}' not configured for ${key}`
        );
        return null;
    }
    return source;
}

//==================================================
// PROVIDER CONFIGURED ?
//==================================================

export function hasProvider(
    symbol: string,
    datasource: string
): boolean {
    return (
        getInstrument(
            symbol,
            datasource
        )
        !==
        null
    );
}

//==================================================
// PROVIDER SYMBOL
//==================================================

export function getProviderSymbol(
    symbol: string,
    datasource: string
): string {
    const source =
        getInstrument(
            symbol,
            datasource
        );
    return (
        source?.symbol
        ||
        symbol
    );
}

//==================================================
// ZERODHA TOKEN
//==================================================

export function getZerodhaToken(
    symbol: string
): number | undefined {
    return getInstrument(
        symbol,
        "zerodha"
    )?.instrumentToken;
}

//==================================================
// DHAN SECURITY ID
//==================================================

export function getDhanSecurityId(
    symbol: string
): string | undefined {
    return getInstrument(
        symbol,
        "dhan"
    )?.securityId;
}

//==================================================
// UPSTOX KEY
//==================================================

export function getUpstoxKey(
    symbol: string
): string | undefined {
    return getInstrument(
        symbol,
        "upstox"
    )?.instrumentKey;
}

//==================================================
// ALICEBLUE TOKEN
//==================================================

export function getAliceBlueInstrument(
    symbol: string
): InstrumentSource | undefined {

    return getInstrument(
        symbol,
        "aliceblue"
    ) ?? undefined;
}

export function getAliceBlueToken(
    symbol: string
): string | undefined {

    return getAliceBlueInstrument(
        symbol
    )?.token;
}