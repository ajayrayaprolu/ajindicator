$path = ".\server\index.js"
Copy-Item $path "$path.bak12" -Force

$lines = Get-Content $path

# 1. Add a small DDMon -> ISO expiry helper, right before the Zerodha history route
$routeIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '"/api/zerodha/history/:symbol"') { $routeIdx = $i; break }
}
$appGetIdx = -1
if ($routeIdx -ge 0) {
    for ($i = $routeIdx; $i -ge 0; $i--) {
        if ($lines[$i] -match '^\s*app\.get\(\s*$') { $appGetIdx = $i; break }
    }
}

if ($appGetIdx -lt 0) {
    Write-Host "ERROR: Zerodha history route app.get( not found" -ForegroundColor Red
} else {
    $helperBlock = @(
        'function zerodhaCanonicalExpiryToISO(value) {',
        '    const raw = String(value ?? "").trim().toUpperCase();',
        '    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) { return raw; }',
        '    const months = { JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12" };',
        '    const m = raw.match(/^(\d{1,2})[\s-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/);',
        '    if (!m) { return raw; }',
        '    const day = m[1].padStart(2, "0");',
        '    const month = months[m[2]];',
        '    const currentYear = new Date().getFullYear();',
        '    let expiry = `${currentYear}-${month}-${day}`;',
        '    const expiryDate = new Date(`${expiry}T00:00:00`);',
        '    const today = new Date();',
        '    today.setHours(0, 0, 0, 0);',
        '    if (expiryDate < today) { expiry = `${currentYear + 1}-${month}-${day}`; }',
        '    return expiry;',
        '}',
        ''
    )
    $lines = $lines[0..($appGetIdx-1)] + $helperBlock + $lines[$appGetIdx..($lines.Count-1)]
    Write-Host "Added zerodhaCanonicalExpiryToISO helper before line $($appGetIdx+1)" -ForegroundColor Green
}

Set-Content -Path $path -Value $lines
$lines = Get-Content $path

# 2. Rebuild the fallback body to check canonical params first
$startIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'const fallbackTimeframe = req\.query\.timeframe') { $startIdx = $i; break }
}
$endAnchorIdx = -1
if ($startIdx -ge 0) {
    for ($i = $startIdx; $i -lt $startIdx + 60; $i++) {
        if ($lines[$i] -match 'ZERODHA HISTORY\] FYERS fallback also failed') { $endAnchorIdx = $i; break }
    }
}
$catchIdx = -1
if ($endAnchorIdx -ge 0) {
    for ($i = $endAnchorIdx; $i -ge $startIdx; $i--) {
        if ($lines[$i] -match '^\s*\}\s*catch\s*\(fallbackError\)\s*\{\s*$') { $catchIdx = $i; break }
    }
}

if ($startIdx -lt 0 -or $catchIdx -lt 0) {
    Write-Host "ERROR: fallback anchors not found -> start=$startIdx catch=$catchIdx" -ForegroundColor Red
} else {
    $newBody = @(
        '            try {',
        '                const canonicalUnderlying = String(req.query.underlying ?? "").trim();',
        '                const canonicalExpiry = String(req.query.expiry ?? "").trim();',
        '                const canonicalStrike = req.query.strike;',
        '                const canonicalType = String(req.query.optionType ?? "").trim().toUpperCase();',
        '                let fyersCandles = null;',
        '                if (canonicalUnderlying && canonicalExpiry && canonicalStrike && /^(CE|PE)$/.test(canonicalType)) {',
        '                    const isoExpiry = zerodhaCanonicalExpiryToISO(canonicalExpiry);',
        '                    const contract = getFyersOptionContract({',
        '                        underlying: canonicalUnderlying,',
        '                        expiry: isoExpiry,',
        '                        strike: Number(canonicalStrike),',
        '                        optionType: canonicalType',
        '                    });',
        '                    if (contract?.symbolTicker) {',
        '                        fyersCandles = await getFyersHistory(contract.symbolTicker, fallbackTimeframe);',
        '                    }',
        '                }',
        '                if (!fyersCandles) {',
        '                    const zerodhaRow = getInstrument("NSE", fallbackSymbol) || getInstrument("NFO", fallbackSymbol) || getInstrument("BSE", fallbackSymbol) || getByTradingSymbol(fallbackSymbol);',
        '                    if (zerodhaRow) {',
        '                        const isOption = zerodhaRow.instrument_type === "CE" || zerodhaRow.instrument_type === "PE";',
        '                        if (isOption) {',
        '                            const cleanUnderlying = String(zerodhaRow.name ?? "").replace(/^"+|"+$/g, "").trim();',
        '                            const contract = getFyersOptionContract({',
        '                                underlying: cleanUnderlying,',
        '                                expiry: zerodhaRow.expiry,',
        '                                strike: Number(zerodhaRow.strike),',
        '                                optionType: zerodhaRow.instrument_type',
        '                            });',
        '                            if (contract?.symbolTicker) {',
        '                                fyersCandles = await getFyersHistory(contract.symbolTicker, fallbackTimeframe);',
        '                            }',
        '                        } else {',
        '                            const fyersSymbol = resolveFyersSymbol(fallbackSymbol);',
        '                            fyersCandles = await getFyersHistory(fyersSymbol, fallbackTimeframe);',
        '                        }',
        '                    }',
        '                }',
        '                if (Array.isArray(fyersCandles) && fyersCandles.length > 0) {',
        '                    console.log("[ZERODHA HISTORY] FYERS fallback succeeded:", { symbol: fallbackSymbol, count: fyersCandles.length });',
        '                    return res.json(fyersCandles);',
        '                }'
    )
    $lines = $lines[0..$startIdx] + $newBody + $lines[$catchIdx..($lines.Count-1)]
    Write-Host "Rebuilt Zerodha fallback with canonical-param-first logic" -ForegroundColor Green
}

Set-Content -Path $path -Value $lines
Select-String -Path $path -Pattern "zerodhaCanonicalExpiryToISO" -AllMatches | Measure-Object