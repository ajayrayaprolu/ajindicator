//==========================================
// server/binance/SymbolMapper.ts
//==========================================

export function mapSymbol(
    symbol: string,
    source: string = "binance"
): string {

    if (
        source.toLowerCase() !== "binance"
    ) {
        return String(symbol ?? "")
            .trim();
    }

    return String(symbol ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}