//=======================================
// .\server\feeds\SymbolMapper.ts
//======================================

import { SymbolRegistry }
from "../config/SymbolRegistry";

export function mapSymbol(
  symbol: string,
  datasource: string
): string {

  const item =
    SymbolRegistry[
      symbol as keyof typeof SymbolRegistry
    ];

  if (!item) {
    return symbol;
  }

  const key =
    datasource.toLowerCase();

  return (
    item[
      key as keyof typeof item
    ] || symbol
  );
}
