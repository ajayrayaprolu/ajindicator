Copy-Item .\server\index.js.bak1 .\server\index.js -Force
Copy-Item .\server\index.js .\server\index.js.bak2 -Force

$lines = Get-Content .\server\index.js

$routeIdx = -1
for ($i = 1; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '"/api/aliceblue/history"' -and $lines[$i-1] -match 'app\.get\(') { $routeIdx = $i; break }
}
$tryIdx = -1
if ($routeIdx -ge 0) {
    for ($i = $routeIdx; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*try \{\s*$') { $tryIdx = $i; break }
    }
}
$resultIdx = -1
if ($tryIdx -ge 0) {
    for ($i = $tryIdx; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'const result\s*=') { $resultIdx = $i; break }
    }
}
$successReturnIdx = -1
if ($resultIdx -ge 0) {
    for ($i = $resultIdx; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'return res\.json\(\{') { $successReturnIdx = $i; break }
    }
}
$catchIdx = -1
if ($successReturnIdx -ge 0) {
    for ($i = $successReturnIdx; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'catch\s*\(error\)\s*\{') { $catchIdx = $i; break }
    }
}

if ($routeIdx -lt 0 -or $tryIdx -lt 0 -or $resultIdx -lt 0 -or $successReturnIdx -lt 0 -or $catchIdx -lt 0) {
    Write-Host "ERROR: anchor(s) not found -> route=$routeIdx try=$tryIdx result=$resultIdx successReturn=$successReturnIdx catch=$catchIdx" -ForegroundColor Red
} else {
    $helperBlock = @(
        '        const tryIndstocksFallback = async (rawSymbol, tf) => {',
        '            try {',
        '                const indstocksFeed = feedManager.getFeed("indstocks");',
        '                if (!indstocksFeed || typeof indstocksFeed.getHistory !== "function") { return null; }',
        '                const fallbackResult = await indstocksFeed.getHistory(String(rawSymbol ?? ""), tf);',
        '                const fallbackCandles =',
        '                    Array.isArray(fallbackResult)',
        '                        ? fallbackResult',
        '                        : (Array.isArray(fallbackResult?.candles) ? fallbackResult.candles : []);',
        '                return fallbackCandles.length > 0 ? fallbackCandles : null;',
        '            } catch (fallbackError) {',
        '                console.warn("[ALICEBLUE HISTORY] IndStocks fallback also failed:", fallbackError?.message ?? fallbackError);',
        '                return null;',
        '            }',
        '        };',
        ''
    )
    $successFallbackBlock = @(
        '            if (!candles || candles.length === 0) {',
        '                const fallbackCandles = await tryIndstocksFallback(symbol, timeframe);',
        '                if (fallbackCandles) {',
        '                    return res.json({ candles: fallbackCandles, freshness: null, source: "indstocks" });',
        '                }',
        '            }',
        ''
    )
    $catchFallbackBlock = @(
        '            const fallbackCandles = await tryIndstocksFallback(req.query.symbol, req.query.timeframe ?? "1m");',
        '            if (fallbackCandles) {',
        '                return res.json({ candles: fallbackCandles, freshness: null, source: "indstocks" });',
        '            }',
        ''
    )

    $part1 = $lines[0..($tryIdx-1)]
    $part2 = $lines[$tryIdx..($successReturnIdx-1)]
    $part3 = $lines[$successReturnIdx..$catchIdx]
    $part4 = $lines[($catchIdx+1)..($lines.Count-1)]

    Set-Content -Path .\server\index.js -Value ($part1 + $helperBlock + $part2 + $successFallbackBlock + $part3 + $catchFallbackBlock + $part4)
    Write-Host "Patched general fallback (helper@$tryIdx success@$successReturnIdx catch@$catchIdx)" -ForegroundColor Green
}

Select-String -Path .\server\index.js -Pattern "tryIndstocksFallback" -Quiet