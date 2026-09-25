$path = ".\server\index.js"
Copy-Item $path "$path.bak9" -Force

$lines = Get-Content $path

# 1. Add getInstrument + getByTradingSymbol to the zerodha/instruments.js import
$idx1 = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*instrumentCount\s*$') { $idx1 = $i; break }
}
if ($idx1 -lt 0) {
    Write-Host "ERROR: instrumentCount import line not found" -ForegroundColor Red
} else {
    $lines[$idx1] = $lines[$idx1] + ","
    $lines = $lines[0..$idx1] + @("    getInstrument,", "    getByTradingSymbol") + $lines[($idx1+1)..($lines.Count-1)]
    Write-Host "Added getInstrument/getByTradingSymbol import after line $($idx1+1)" -ForegroundColor Green
}

# 2. Add getFyersOptionContract to the fyers/symbolMaster.js import
$idx2 = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'getFyersContractByTicker') { $idx2 = $i; break }
}
if ($idx2 -lt 0) {
    Write-Host "ERROR: getFyersContractByTicker import line not found" -ForegroundColor Red
} else {
    $lines = $lines[0..$idx2] + @("    getFyersOptionContract,") + $lines[($idx2+1)..($lines.Count-1)]
    Write-Host "Added getFyersOptionContract import after line $($idx2+1)" -ForegroundColor Green
}

# 3. Insert the FYERS fallback into the Zerodha history route's catch block
$zErrIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '\[ZERODHA HISTORY\]') { $zErrIdx = $i; break }
}
$zCatchIdx = -1
if ($zErrIdx -ge 0) {
    for ($i = $zErrIdx; $i -ge 0; $i--) {
        if ($lines[$i] -match 'catch\s*\(error\)\s*\{') { $zCatchIdx = $i; break }
    }
}

if ($zCatchIdx -lt 0) {
    Write-Host "ERROR: Zerodha history catch block not found" -ForegroundColor Red
} else {
    $fallbackBlock = @(
        '            try {',
        '                const zerodhaRow = getInstrument("NSE", symbol) || getInstrument("NFO", symbol) || getInstrument("BSE", symbol) || getByTradingSymbol(symbol);',
        '                if (zerodhaRow) {',
        '                    const isOption = zerodhaRow.instrument_type === "CE" || zerodhaRow.instrument_type === "PE";',
        '                    let fyersCandles = null;',
        '                    if (isOption) {',
        '                        const cleanUnderlying = String(zerodhaRow.name ?? "").replace(/^"+|"+$/g, "").trim();',
        '                        const contract = getFyersOptionContract({',
        '                            underlying: cleanUnderlying,',
        '                            expiry: zerodhaRow.expiry,',
        '                            strike: Number(zerodhaRow.strike),',
        '                            optionType: zerodhaRow.instrument_type',
        '                        });',
        '                        if (contract?.symbolTicker) {',
        '                            fyersCandles = await getFyersHistory(contract.symbolTicker, timeframe);',
        '                        }',
        '                    } else {',
        '                        const fyersSymbol = resolveFyersSymbol(symbol);',
        '                        fyersCandles = await getFyersHistory(fyersSymbol, timeframe);',
        '                    }',
        '                    if (Array.isArray(fyersCandles) && fyersCandles.length > 0) {',
        '                        console.log("[ZERODHA HISTORY] FYERS fallback succeeded:", { symbol, isOption, count: fyersCandles.length });',
        '                        return res.json(fyersCandles);',
        '                    }',
        '                }',
        '            } catch (fallbackError) {',
        '                console.warn("[ZERODHA HISTORY] FYERS fallback also failed:", fallbackError?.message ?? fallbackError);',
        '            }',
        ''
    )
    $insertAt = $zCatchIdx + 1
    $lines = $lines[0..$zCatchIdx] + $fallbackBlock + $lines[$insertAt..($lines.Count-1)]
    Write-Host "Inserted Zerodha -> FYERS fallback after catch block at line $($zCatchIdx+1)" -ForegroundColor Green
}

Set-Content -Path $path -Value $lines
Select-String -Path $path -Pattern "FYERS fallback succeeded" -Quiet