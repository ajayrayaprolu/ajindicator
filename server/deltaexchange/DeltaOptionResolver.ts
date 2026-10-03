//==========================================
// server/deltaexchange/DeltaOptionResolver.ts
//
// Canonical option identity -> Delta Exchange contract.
//
// Drop-in datasource adapter for server/feeds/OptionContractResolver.ts:
//
//   import { resolveDeltaOptionContract } from "../deltaexchange/DeltaOptionResolver.ts";
//   case "DELTAEXCHANGE": return resolveDeltaOptionContract(input);
//
// Because Delta's option master is downloaded over HTTP (not a local
// CSV master like the Indian brokers), the resolver here is async -
// the switch-case in OptionContractResolver.ts wraps it with await.
//
// NEVER constructs a symbol: a contract that does not exist in the
// /v2/products master resolves to null ("unsupported"), same rule
// as Yahoo/Binance.
//==========================================

import {
    getDeltaOptionContract,
    getDeltaNearestOptionContract,
    getDeltaOptionExpiries,
    type DeltaOptionLookup,
    type DeltaResolvedOption
} from "./DeltaProductMaster.ts";

export type DeltaOptionDatasource =
    | "DELTAEXCHANGE"
    | "DELTA EXCHANGE"
    | "DELTA"
    | string;

export interface ResolvedOptionContractLike {
    datasource: string;
    canonical: DeltaOptionLookup;

    symbol?: string;
    productId?: number;

    exchange?: string;
    segment?: string;

    lotSize?: number;
    tickSize?: number;

    raw?: unknown;
}

export function isDeltaDatasource(datasource: string): boolean {
    const p = String(datasource ?? "").trim().toUpperCase().replace(/[\s_-]/g, "");
    return p === "DELTAEXCHANGE" || p === "DELTA";
}

/**
 * Resolve one canonical option identity against Delta's product master.
 * Returns null when the contract does not exist - never a synthetic symbol.
 */
export async function resolveDeltaOptionContract(
    input: DeltaOptionLookup
): Promise<ResolvedOptionContractLike | null> {

    // Exact strike first; fall back to the nearest listed
    // strike on the same expiry/type when AJ's computed
    // strike is not on Delta's grid.
    let contract: DeltaResolvedOption | null =
        await getDeltaOptionContract(input);

    let snapped = false;

    if (!contract) {
        contract =
            await getDeltaNearestOptionContract(input);
        snapped = true;
    }

    if (!contract) {
        return null;
    }

    return {
        datasource: "DELTAEXCHANGE",
        snapped,
        canonical: {
            underlying: contract.underlying,
            expiry: contract.expiryIso ?? input.expiry,
            strike: contract.strike,
            optionType: contract.optionType
        },

        symbol: contract.symbol,
        productId: contract.productId,

        // Delta trades everything under one exchange umbrella
        exchange: "DELTA",
        segment: contract.contractType,

        lotSize: contract.lotSize,
        tickSize: contract.tickSize,

        raw: contract.raw
    };
}

/**
 * Expiry list for the UI selector (canonical ISO strings).
 */
export async function listDeltaOptionExpiries(
    underlying: string
): Promise<string[]> {
    return getDeltaOptionExpiries(underlying);
}
