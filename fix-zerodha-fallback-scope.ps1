$path = ".\server\index.js"
Copy-Item $path "$path.bak11" -Force

$content = Get-Content $path -Raw

$replacements = @(
    @{
        old = '            fs.appendFileSync("./zerodha-fallback-debug.log", `[${new Date().toISOString()}] Fallback catch block entered for symbol=${symbol}` + "\n");'
        new = '            const fallbackSymbol = decodeURIComponent(req.params.symbol ?? "").toUpperCase();' + "`r`n" + '            const fallbackTimeframe = req.query.timeframe || "1minute";' + "`r`n" + '            fs.appendFileSync("./zerodha-fallback-debug.log", `[${new Date().toISOString()}] Fallback catch block entered for symbol=${fallbackSymbol}` + "\n");'
    },
    @{
        old = '                const zerodhaRow = getInstrument("NSE", symbol) || getInstrument("NFO", symbol) || getInstrument("BSE", symbol) || getByTradingSymbol(symbol);'
        new = '                const zerodhaRow = getInstrument("NSE", fallbackSymbol) || getInstrument("NFO", fallbackSymbol) || getInstrument("BSE", fallbackSymbol) || getByTradingSymbol(fallbackSymbol);'
    },
    @{
        old = '                            fyersCandles = await getFyersHistory(contract.symbolTicker, timeframe);'
        new = '                            fyersCandles = await getFyersHistory(contract.symbolTicker, fallbackTimeframe);'
    },
    @{
        old = '                        const fyersSymbol = resolveFyersSymbol(symbol);'
        new = '                        const fyersSymbol = resolveFyersSymbol(fallbackSymbol);'
    },
    @{
        old = '                        fyersCandles = await getFyersHistory(fyersSymbol, timeframe);'
        new = '                        fyersCandles = await getFyersHistory(fyersSymbol, fallbackTimeframe);'
    },
    @{
        old = '                        console.log("[ZERODHA HISTORY] FYERS fallback succeeded:", { symbol, isOption, count: fyersCandles.length });'
        new = '                        console.log("[ZERODHA HISTORY] FYERS fallback succeeded:", { symbol: fallbackSymbol, isOption, count: fyersCandles.length });'
    }
)

$allOk = $true
foreach ($r in $replacements) {
    $count = ([regex]::Matches($content, [regex]::Escape($r.old))).Count
    if ($count -ne 1) {
        Write-Host "ERROR: expected 1 match, found $count for:" -ForegroundColor Red
        Write-Host $r.old
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host "No changes made - fix the mismatches above first." -ForegroundColor Red
} else {
    foreach ($r in $replacements) {
        $content = $content.Replace($r.old, $r.new)
    }
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Fixed all 6 scoping references" -ForegroundColor Green
}

Select-String -Path $path -Pattern "fallbackSymbol" -AllMatches | Measure-Object