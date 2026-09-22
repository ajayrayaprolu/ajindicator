Copy-Item .\server\index.js .\server\index.js.bak3 -Force

$lines = Get-Content .\server\index.js

# 1. Add searchIndstocksSymbols to the existing symbols.js import
$importIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*loadContractMaster\s*$') { $importIdx = $i; break }
}

# 2. Find the getHistory call inside the fallback helper, to resolve the symbol first
$callIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'indstocksFeed\.getHistory\(String\(rawSymbol') { $callIdx = $i; break }
}

if ($importIdx -lt 0 -or $callIdx -lt 0) {
    Write-Host "ERROR: anchor(s) not found -> import=$importIdx call=$callIdx" -ForegroundColor Red
} else {
    $lines[$importIdx] = $lines[$importIdx] -replace 'loadContractMaster', 'loadContractMaster,`n    searchIndstocksSymbols'
    $lines[$importIdx] = $lines[$importIdx] -replace '`n', "`n"

    $resolveBlock = @(
        '                let indstocksSymbol = String(rawSymbol ?? "").trim();',
        '                if (indstocksSymbol && !/^[A-Z]+_\d+$/i.test(indstocksSymbol)) {',
        '                    const normalizedQuery = indstocksSymbol.toUpperCase().replace(/-EQ$/, "").replace(/\s+/g, "");',
        '                    const matches = searchIndstocksSymbols(indstocksSymbol, 20);',
        '                    const exactMatch = Array.isArray(matches)',
        '                        ? matches.find((m) => String(m?.tradingSymbol ?? m?.displayName ?? "").toUpperCase().replace(/\s+/g, "") === normalizedQuery)',
        '                        : null;',
        '                    if (exactMatch?.symbol) {',
        '                        indstocksSymbol = exactMatch.symbol;',
        '                        console.log("[ALICEBLUE HISTORY] IndStocks name resolved:", { rawSymbol, indstocksSymbol });',
        '                    }',
        '                }'
    )

    $before = $lines[0..($callIdx-1)]
    $after = $lines[$callIdx..($lines.Count-1)]
    $after[0] = $after[0] -replace 'String\(rawSymbol \?\? ""\)', 'indstocksSymbol'

    Set-Content -Path .\server\index.js -Value ($before + $resolveBlock + $after)
    Write-Host "Inserted IndStocks name-resolution lookup before line $($callIdx+1)" -ForegroundColor Green
}

Select-String -Path .\server\index.js -Pattern "searchIndstocksSymbols" -Quiet