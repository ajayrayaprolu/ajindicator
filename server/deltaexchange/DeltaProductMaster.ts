//==========================================
// server/deltaexchange/DeltaProductMaster.ts
//
// Delta Exchange product (contract) master.
//
// GET /v2/products  -> every tradable product on Delta:
//   { symbol, product_id, contract_type, underlying_asset_symbol,
//     strike_price, expiry_date_time, spot_index, contract_value,
//     tick_size, lot_size, settle_price_symbol, ... }
//
// contract_type values seen on Delta:
//   perpetual_futures, futures, call_options, put_options,
//   interest_rate_swaps, spot (etc.)
//
// This master is the ONLY source for option resolution -
// canonical option identity (underlying + expiry + strike + CE/PE)
// is matched against the downloaded products; symbols are never
// constructed synthetically. Same rule the other adapters follow
// in server/feeds/OptionContractResolver.ts.
//==========================================

import axios from "axios";

const REST_API = process.env.DELTA_API_BASE ?? "https://api.india.delta.exchange";

interface DeltaProduct {
    symbol?: string;
    product_id?: number;
    id?: number;
    contract_type?: string;
    // India master: underlying is a nested object
    // { symbol: "BTC", ... }, not a flat string field.
    underlying_asset?: { symbol?: string };
    underlying_asset_symbol?: string;
    strike_price?: string | number;
    // India master: no expiry_date_time; the option
    // expiry is carried in settlement_time and in the
    // symbol itself (C-BTC-93000-301026 = 30 Oct 2026).
    settlement_time?: string;
    expiry_date_time?: string;
    tick_size?: string | number;
    lot_size?: string | number;
    state?: string;
    [key: string]: unknown;
}

// In-memory master cache, refreshed lazily (mirrors how the
// other adapters keep their downloaded masters).
let productsCache: DeltaProduct[] | null = null;
let productsCacheTime = 0;
const PRODUCTS_CACHE_MS = 6 * 60 * 60 * 1000;   // 6h - contract master, slow-moving

//==========================================
// DOWNLOAD / CACHE
//==========================================

export async function getDeltaProducts(
    forceRefresh: boolean = false
): Promise<DeltaProduct[]> {

    if (
        !forceRefresh &&
        productsCache &&
        Date.now() - productsCacheTime < PRODUCTS_CACHE_MS
    ) {
        return productsCache;
    }

    const response = await axios.get(
        `${REST_API}/v2/products`,
        { timeout: 20000 }
    );

    const rows = response?.data?.result;
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("Delta /v2/products returned no products");
    }

    productsCache = rows;
    productsCacheTime = Date.now();

    console.log(`[DELTA] Product master: ${rows.length} products loaded`);

    return rows;
}

//==========================================
// OPTION LOOKUP
//
// Canonical identity -> Delta native product.
// Returns null when no contract matches; never invents a symbol.
//==========================================

export interface DeltaOptionLookup {
    underlying: string;   // e.g. "BTC"
    expiry: string;       // ISO date string or ddMMMyyyy
    strike: number;
    optionType: "CE" | "PE";
}

export interface DeltaResolvedOption {
    symbol: string;
    productId: number;
    contractType: string;
    underlying: string;
    expiryIso?: string;
    strike: number;
    optionType: "CE" | "PE";
    lotSize?: number;
    tickSize?: number;
    raw: DeltaProduct;
}

function normalizeUnderlying(u: string): string {
    return String(u ?? "").trim().toUpperCase();
}

// India master carries the underlying as a nested object
// (p.underlying_asset.symbol); the global master used a
// flat underlying_asset_symbol string. Support both.
function productUnderlying(p: DeltaProduct): string {
    return String(
        p?.underlying_asset?.symbol ??
        p?.underlying_asset_symbol ??
        ""
    ).trim().toUpperCase();
}

// India master has no expiry_date_time. The option expiry
// is settlement_time (12:00 UTC on expiry day) and is also
// embedded in the symbol (C-BTC-93000-301026 = ddMMyy).
// Prefer settlement_time; fall back to parsing the symbol.
function productExpiry(p: DeltaProduct): string | undefined {
    if (p?.settlement_time) {
        return String(p.settlement_time);
    }
    const m = String(p?.symbol ?? "").match(/-(\d{2})(\d{2})(\d{2})$/);
    if (m) {
        const day = m[1];
        const month = m[2];
        const year = 2000 + Number(m[3]);
        return `${year}-${month}-${day}T12:00:00Z`;
    }
    return undefined;
}

// Accepts "27JUN25", "2025-06-27", ISO strings - matches against the
// product's expiry_date_time by calendar day (UTC).
function expiryMatches(
    expiryInput: string,
    productExpiryValue?: string
): boolean {
    if (!productExpiryValue) return false;

    const inMs = Date.parse(expiryInput);
    const prodMs = Date.parse(productExpiryValue);
    if (!Number.isFinite(inMs) || !Number.isFinite(prodMs)) return false;

    const inDate = new Date(inMs);
    const prodDate = new Date(prodMs);

    return (
        inDate.getUTCFullYear() === prodDate.getUTCFullYear() &&
        inDate.getUTCMonth() === prodDate.getUTCMonth() &&
        inDate.getUTCDate() === prodDate.getUTCDate()
    );
}

export async function getDeltaOptionContract(
    input: DeltaOptionLookup,
    forceRefresh: boolean = false
): Promise<DeltaResolvedOption | null> {

    const underlying = normalizeUnderlying(input.underlying);
    const strike = Number(input.strike);
    const optionType = String(input.optionType ?? "").trim().toUpperCase();

    if (!underlying || !Number.isFinite(strike) || (optionType !== "CE" && optionType !== "PE")) {
        return null;
    }

    const wantedType =
        optionType === "CE" ? "call_options" : "put_options";

    const products = await getDeltaProducts(forceRefresh);

    const matches = (products as DeltaProduct[]).filter(p =>
        p?.contract_type === wantedType &&
        productUnderlying(p) === underlying &&
        Math.abs(Number(p?.strike_price) - strike) < 1e-9 &&
        expiryMatches(input.expiry, productExpiry(p)) &&
        String(p?.state ?? "live").toLowerCase() === "live"
    );

    if (matches.length === 0) {
        return null;
    }

    // Deterministic pick: nearest expiry then lowest product_id.
    matches.sort((a, b) =>
        (Number(new Date(productExpiry(a) ?? 0)) -
            Number(new Date(productExpiry(b) ?? 0))) ||
        (Number(a?.product_id ?? 0) - Number(b?.product_id ?? 0))
    );

    const p = matches[0];

    return {
        symbol: String(p.symbol ?? ""),
        productId: Number(p.product_id ?? p.id ?? 0),
        contractType: String(p.contract_type ?? ""),
        underlying,
        expiryIso: productExpiry(p),
        strike,
        optionType: optionType === "CE" ? "CE" : "PE",
        lotSize: Number(p.lot_size) || undefined,
        tickSize: Number(p.tick_size) || undefined,
        raw: p
    };
}

//==========================================
// NEAREST CONTRACT FALLBACK
//
// AJ computes ATM/ITM/OTM strikes arithmetically from the
// underlying price; Delta's strike grid is coarser (BTC in
// 500/1000 steps, ETH in 10/25 steps), so an exact strike
// often does not exist. This picks the NEAREST live
// contract from the real product master - still never a
// synthetic symbol, just the closest listed contract.
//==========================================

export async function getDeltaNearestOptionContract(
    input: DeltaOptionLookup,
    forceRefresh: boolean = false
): Promise<DeltaResolvedOption | null> {

    const underlying = normalizeUnderlying(input.underlying);
    const strike = Number(input.strike);
    const optionType = String(input.optionType ?? "").trim().toUpperCase();

    if (!underlying || !Number.isFinite(strike) || (optionType !== "CE" && optionType !== "PE")) {
        return null;
    }

    const wantedType =
        optionType === "CE" ? "call_options" : "put_options";

    const products = await getDeltaProducts(forceRefresh);

    // First: same expiry day, nearest strike.
    let candidates = (products as DeltaProduct[]).filter(p =>
        p?.contract_type === wantedType &&
        productUnderlying(p) === underlying &&
        expiryMatches(input.expiry, productExpiry(p)) &&
        String(p?.state ?? "live").toLowerCase() === "live"
    );

    // Fall back: nearest available expiry at all (AJ may
    // compute an expiry date Delta does not list).
    if (candidates.length === 0) {
        candidates = (products as DeltaProduct[]).filter(p =>
            p?.contract_type === wantedType &&
            productUnderlying(p) === underlying &&
            String(p?.state ?? "live").toLowerCase() === "live"
        );
        const wanted = Date.parse(input.expiry);
        if (Number.isFinite(wanted)) {
            candidates.sort((a, b) =>
                Math.abs(Number(new Date(productExpiry(a) ?? 0)) - wanted) -
                Math.abs(Number(new Date(productExpiry(b) ?? 0)) - wanted)
            );
        }
    }

    if (candidates.length === 0) {
        return null;
    }

    // Sort: closest expiry first, then closest strike
    // within that expiry. (Sorting by strike alone would
    // pick an oct-5 contract over the oct-30 one just
    // because its strike is nearer.)
    const wantedMs = Date.parse(input.expiry);

    candidates.sort((a, b) => {

        if (Number.isFinite(wantedMs)) {

            const da =
                Math.abs(Number(new Date(productExpiry(a) ?? 0)) - wantedMs);
            const db =
                Math.abs(Number(new Date(productExpiry(b) ?? 0)) - wantedMs);

            if (da !== db) {
                return da - db;
            }
        }

        return Math.abs(Number(a?.strike_price) - strike) -
                Math.abs(Number(b?.strike_price) - strike) ||
            (Number(a?.product_id ?? 0) - Number(b?.product_id ?? 0));
    });

    const p = candidates[0];

    return {
        symbol: String(p.symbol ?? ""),
        productId: Number(p.product_id ?? p.id ?? 0),
        contractType: String(p.contract_type ?? ""),
        underlying,
        expiryIso: productExpiry(p),
        strike: Number(p.strike_price),
        optionType: optionType === "CE" ? "CE" : "PE",
        lotSize: Number(p.lot_size) || undefined,
        tickSize: Number(p.tick_size) || undefined,
        raw: p
    };
}

//==========================================
// EXPIRY LIST (for the UI expiry selector)
//==========================================

export async function getDeltaOptionExpiries(
    underlying: string
): Promise<string[]> {

    const u = normalizeUnderlying(underlying);
    const products = await getDeltaProducts();

    const set = new Set<string>();
    for (const p of products as DeltaProduct[]) {
        if (
            (p?.contract_type === "call_options" || p?.contract_type === "put_options") &&
            productUnderlying(p) === u &&
            productExpiry(p)
        ) {
            set.add(String(productExpiry(p)));
        }
    }

    return Array.from(set).sort();
}
