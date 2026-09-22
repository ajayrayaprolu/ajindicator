Copy-Item .\server\index.js.bak3 .\server\index.js -Force
Copy-Item .\server\index.js .\server\index.js.bak4 -Force

$lines = Get-Content .\server\index.js

$importIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*loadContractMaster\s*$') { $importIdx = $i; break }
}

$callIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'indstocksFeed\.getHistory\(String\(rawSymbol') { $callIdx = $i; break }
}

if ($importIdx -lt 0 -or $callIdx -lt 0) {
    Write-Host "ERROR: anchor(s) not found -> import=$importIdx call=$callIdx" -ForegroundColor Red
} else {
    $lines[$importIdx] = "    loadContractMaster,`n    getAllIndstocksSymbols"

    $resolveBlock = @(
        '                let indstocksSymbol = String(rawSymbol ?? "").trim();',
        '                if (indstocksSymbol && !/^[A-Z]+_\d+$/i.test(indstocksSymbol)) {',
        '                    const normalizedQuery = indstocksSymbol.toUpperCase().replace(/-EQ$/, "").replace(/\s+/g, "");',
        '                    const allIndstocksSymbols = getAllIndstocksSymbols();',
        '                    const indexMatch = Array.isArray(allIndstocksSymbols)',
        '                        ? allIndstocksSymbols.find((m) => {',
        '                            const type = String(m?.type ?? m?.instrumentType ?? "").toUpperCase();',
        '                            if (!type.includes("INDEX")) return false;',
        '                            const name = String(m?.tradingSymbol ?? m?.displayName ?? m?.symbol ?? "").toUpperCase().replace(/\s+/g, "");',
        '                            return name === normalizedQuery;',
        '                        })',
        '                        : null;',
        '                    if (indexMatch?.symbol) {',
        '                        indstocksSymbol = indexMatch.symbol;',
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

Select-String -Path .\server\index.js -Pattern "getAllIndstocksSymbols" -Quiet