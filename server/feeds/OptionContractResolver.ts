/****************************************************************
 * server/feeds/OptionContractResolver.ts
 *
 * Canonical option identity -> datasource-specific contract resolver.
 * | Layer                    | Responsibility                                                   |
 * | ------------------------ | ---------------------------------------------------------------- |
 * | `OptionContractResolver` | Canonical option identity                                        |
 * | `AJDecisionEngine`       | Recommendation/decision only                                     |
 * | `ChartWindow`            | Carry canonical metadata; no broker-specific option construction |
 * | `SymbolSelector`         | Search/display → canonical metadata                              |
 * | `FYERS adapter`          | Canonical → FYERS native symbol                                  |
 * | `INDSTOCKS adapter`      | Canonical → exchange/securityId                                  |
 * | `AliceBlue adapter`      | Canonical → exchange|token                                       |
 * | `WebSocket`              | Subscribe using resolved native instrument                       |
 * | `History`                | Request using resolved native instrument                         |
 * 
 *
 * IMPORTANT:
 * - This file does NOT construct broker option symbols.
 * - Existing datasource masters remain authoritative.
 * - FYERS resolves through getFyersOptionContract().
 * - Alice Blue resolves through searchAliceBlueOptions().
 * - INDstocks resolves through searchIndstocksOptions().
 * - Yahoo/Binance do not receive synthetic option symbols.
 *	Yahoo/Binance + option
 *        ↓
 *	unsupported
 *        ↓
 *	NO SYNTHETIC SYMBOL
 *
 *                       Current                                                                  Future
 * ****************************************************************************************************************
 *                        UI / Watchlist / Search                                              Canonical Option                            
 *                                  │                                                         {
 *                                  ▼                                                           underlying: "NIFTY",
 *                     Canonical option identity                                                expiry: ...,
 *                  underlying + expiry + strike + CE/PE                                        strike: 23400,
 *                                  │                                                           optionType: "CE"
 *                                  ▼                                                         }
 *                    datasource-specific resolver                                                      │  
 *                                  │                                                                   ▼
 *             ┌────────────────────┼────────────────────┐                                    CanonicalSymbolResolution
 *             ▼                    ▼                    ▼ 								(server/feeds/OptionContractResolver)
 *          FYERS               AliceBlue            INDstocks                                          │
 *             │                    │                    │                      				datasource switch
 *      symbolMaster.js       symbols.js            symbols.js                     ┌────────────────────┼────────────────────┐ 
 *             │                    │                    │                         ▼                    ▼                    ▼
 *			   ▼                    ▼                    ▼                       FYERS             AliceBlue            INDstocks
 *      native FYERS symbol   native contract       exchange/securityId            │                    │                    │         
 *                                                                         	       ▼                    ▼                    ▼
 *																			 existing master         existing master      existing master
 *                                                                           native symbol           token/symbol          securityId         								
 *********************************************************************************************************************************************/   

import {
    getFyersOptionContract
} from "../fyers/symbolMaster.js";

import {
    searchAliceBlueOptions
} from "../aliceblue/symbols.js";

import {
    searchIndstocksOptions
} from "../indstocks/symbols.js";

export type OptionDatasource =
    | "FYERS"
    | "ALICEBLUE"
    | "INDSTOCKS"
    | "YAHOO"
    | "BINANCE"
    | string;

export type OptionType =
    | "CE"
    | "PE";

export interface OptionContractIdentity {
    underlying: string;
    expiry: string;
    strike: number;
    optionType: OptionType;
}

export interface ResolvedOptionContract {
    datasource: string;
    canonical: OptionContractIdentity;

    symbol?: string;
    tradingSymbol?: string;
    token?: string | number;
    securityId?: string | number;

    exchange?: string;
    segment?: string;

    lotSize?: number;
    tickSize?: number;

    raw?: unknown;
}

function normalizeDatasource(
    datasource: string
): string {
    return String(datasource ?? "")
        .trim()
        .toUpperCase();
}

function normalizeOptionType(
    optionType: string
): OptionType | null {
    const value =
        String(optionType ?? "")
            .trim()
            .toUpperCase();

    if (value === "CE") {
        return "CE";
    }

    if (value === "PE") {
        return "PE";
    }

    return null;
}

function normalizeIdentity(
    input: OptionContractIdentity
): OptionContractIdentity | null {
    const underlying =
        String(input?.underlying ?? "")
            .trim()
            .toUpperCase();

    const expiry =
        String(input?.expiry ?? "")
            .trim();

    const strike =
        Number(input?.strike);

    const optionType =
        normalizeOptionType(
            input?.optionType
        );

    if (
        !underlying ||
        !expiry ||
        !Number.isFinite(strike) ||
        strike <= 0 ||
        !optionType
    ) {
        return null;
    }

    return {
        underlying,
        expiry,
        strike,
        optionType
    };
}

/**
 * Resolve one canonical option identity using the existing
 * datasource-specific contract master.
 */
export function resolveOptionContract(
    datasource: OptionDatasource,
    input: OptionContractIdentity
): ResolvedOptionContract | null {
    const canonical =
        normalizeIdentity(input);

    if (!canonical) {
        return null;
    }

    const provider =
        normalizeDatasource(datasource);

    //==================================================
    // FYERS
    //==================================================
    //
    // NEVER construct:
    // NSE:NIFTY15SEP23100PE-EQ
    //
    // The FYERS option master owns the native symbol.
    //==================================================

    if (provider === "FYERS") {
        const contract =
            getFyersOptionContract({
                underlying:
                    canonical.underlying,
                expiry:
                    canonical.expiry,
                strike:
                    canonical.strike,
                optionType:
                    canonical.optionType
            });

        if (!contract) {
            return null;
        }

        return {
            datasource: provider,
            canonical,

            symbol:
                contract.symbolTicker,

            tradingSymbol:
                contract.symbolTicker,

            exchange:
                contract.exchange,

            segment:
                contract.segment,

            lotSize:
                contract.lotSize,

            tickSize:
                contract.tickSize,

            raw: contract
        };
    }

    //==================================================
    // ALICE BLUE
    //==================================================

    if (
        provider === "ALICEBLUE" ||
        provider === "ALICE BLUE"
    ) {
        const matches =
            searchAliceBlueOptions({
                underlying:
                    canonical.underlying,
                expiry:
                    canonical.expiry,
                strike:
                    canonical.strike,
                optionType:
                    canonical.optionType,
                limit: 5
            });

        const contract =
            Array.isArray(matches) &&
            matches.length > 0
                ? matches[0]
                : null;

        if (!contract) {
            return null;
        }

        return {
            datasource: provider,
            canonical,

            symbol:
                contract.symbol ??
                contract.formattedName,

            tradingSymbol:
                contract.tradingSymbol ??
                contract.trading_symbol ??
                contract.formattedName,

            token:
                contract.token,

            exchange:
                contract.exchange,

            segment:
                contract.exchangeSegment,

            lotSize:
                contract.lotSize,

            tickSize:
                contract.tickSize,

            raw: contract
        };
    }

    //==================================================
    // INDSTOCKS
    //==================================================

    //==================================================
    // INDSTOCKS
    //==================================================

    if (provider === "INDSTOCKS") {

        const matches =
            searchIndstocksOptions({
                underlying: canonical.underlying,
                expiry: canonical.expiry,
                strike: canonical.strike,
                optionType: canonical.optionType,
                limit: 5
            });

        const contract =
            Array.isArray(matches) && matches.length > 0
                ? matches[0]
                : null;

        if (!contract) {
            return null;
        }

        return {
            datasource: provider,
            canonical,

            symbol:
                `${contract.exchange}_${contract.securityId}`,

            tradingSymbol:
                contract.tradingSymbol,

            token:
                contract.securityId,

            securityId:
                contract.securityId,

            exchange:
                contract.exchange,

            segment:
                contract.segment,

            lotSize:
                contract.lotSize,

            tickSize:
                contract.tickSize,

            raw:
                contract
        };
    }

    //==================================================
    // YAHOO / BINANCE
    //==================================================
    //
    // These feeds do not get synthetic broker option
    // symbols. Returning null makes unsupported option
    // capability explicit instead of generating a bad
    // symbol.
    //==================================================

    if (
        provider === "YAHOO" ||
        provider === "BINANCE"
    ) {
        return null;
    }

    // Unknown datasource:
    // do not guess a symbol format.
    return null;
}

/**
 * Convenience capability check.
 *
 * This deliberately reports only whether this resolver
 * knows how to resolve options for the datasource.
 */
export function supportsOptionContracts(
    datasource: OptionDatasource
): boolean {
    const provider =
        normalizeDatasource(datasource);

    return (
        provider === "FYERS" ||
        provider === "ALICEBLUE" ||
        provider === "ALICE BLUE" ||
        provider === "INDSTOCKS"
    );
}
