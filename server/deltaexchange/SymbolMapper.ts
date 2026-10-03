//==========================================
// server/deltaexchange/SymbolMapper.ts
//
// Canonical AJ symbol -> Delta Exchange native symbol.
//
// Delta native symbols (from GET /v2/products):
//   Perpetuals:      BTCUSD, ETHUSD, XRPUSD, ...
//   Dated futures:   BTC-27JUN25-100000 (call) / futures C-...
//   Options:         BTC-27JUN25-100000-C / -P
//   Moves/Moves:     MOVBUSD etc.
//
// The master of truth is the /v2/products download
// (see DeltaProductMaster.ts) - this mapper only normalizes
// the user-facing symbol, it never invents contracts.
//==========================================

export function mapSymbol(
    symbol: string,
    source: string = "deltaexchange"
): string {

    if (
        source.toLowerCase() !== "deltaexchange"
    ) {
        return String(symbol ?? "")
            .trim();
    }

    return String(symbol ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9._-]/g, "");
}
