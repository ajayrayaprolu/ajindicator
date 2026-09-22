# --- PART 1: restore AliceBlue's BSE/BCD/BFO block (confirmed correct - keep debug logs) ---

$lines = Get-Content .\server\aliceblue\history.js

$markerIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'TEMPORARILY DISABLED FOR TESTING') { $markerIdx = $i; break }
}

if ($markerIdx -eq -1) {
    Write-Host "PART 1: marker not found (already restored?) - skipping" -ForegroundColor Yellow
} else {
    $warnIdx = -1
    for ($i = $markerIdx; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'BSE/BCD/BFO pre-check disabled for testing') { $warnIdx = $i; break }
    }

    if ($warnIdx -eq -1) {
        Write-Host "PART 1 ERROR: end marker not found" -ForegroundColor Red
    } else {
        $restored = @()
        for ($i = $markerIdx + 1; $i -le ($warnIdx - 1); $i++) {
            if ($lines[$i] -match '^    // (.*)$') { $restored += $Matches[1] }
            else { $restored += $lines[$i] }
        }
        $before = $lines[0..($markerIdx-1)]
        $after = $lines[($warnIdx+1)..($lines.Count-1)]
        Set-Content -Path .\server\aliceblue\history.js -Value ($before + $restored + $after)
        Write-Host "PART 1: BSE/BCD/BFO block restored ($($restored.Count) lines)" -ForegroundColor Green
    }
}

# --- PART 2: redirect known index symbols to IndStocks (AliceBlue route only) ---

Copy-Item .\server\index.js .\server\index.js.bak1 -Force
$lines = Get-Content .\server\index.js

$awaitIdx = -1
for ($i = 0; $i -lt $lines.Count - 1; $i++) {
    if ($lines[$i] -match 'feed\.getHistory\(' -and $lines[$i+1] -match 'aliceBlueSymbol\s*,') { $awaitIdx = $i; break }
}

if ($awaitIdx -eq -1) {
    Write-Host "PART 2 ERROR: could not find feed.getHistory(aliceBlueSymbol call" -ForegroundColor Red
} else {
    $constIdx = -1
    for ($i = $awaitIdx; $i -ge 0; $i--) {
        if ($lines[$i] -match 'const result\s*=') { $constIdx = $i; break }
    }

    if ($constIdx -eq -1) {
        Write-Host "PART 2 ERROR: could not find 'const result =' line" -ForegroundColor Red
    } else {
        $insertBlock = @(
            '            // ALICEBLUE INDEX FALLBACK -> INDSTOCKS (AliceBlue chart API',
            '            // does not support index instruments - confirmed empirically).',
            '            // Resolution path/frontend unchanged; gated on the ORIGINAL',
            '            // requested symbol text. Add entries only once verified.',
            '            const ALICEBLUE_INDEX_TO_INDSTOCKS = {',
            '                "NIFTY": "NSE_40000001"',
            '            };',
            '            const aliceBlueRequestedUpper =',
            '                String(symbol ?? "").trim().toUpperCase();',
            '            const indstocksRedirectSymbol =',
            '                ALICEBLUE_INDEX_TO_INDSTOCKS[aliceBlueRequestedUpper];',
            '            if (indstocksRedirectSymbol) {',
            '                const indstocksFeed = feedManager.getFeed("indstocks");',
            '                if (indstocksFeed && typeof indstocksFeed.getHistory === "function") {',
            '                    console.log(',
            '                        "[ALICEBLUE HISTORY] Index redirect to IndStocks:",',
            '                        { requested: symbol, indstocksRedirectSymbol }',
            '                    );',
            '                    const indstocksCandles =',
            '                        await indstocksFeed.getHistory(indstocksRedirectSymbol, timeframe);',
            '                    return res.json({',
            '                        candles: Array.isArray(indstocksCandles) ? indstocksCandles : [],',
            '                        freshness: null,',
            '                        source: "indstocks"',
            '                    });',
            '                }',
            '            }',
            ''
        )
        $before = $lines[0..($constIdx-1)]
        $after = $lines[$constIdx..($lines.Count-1)]
        Set-Content -Path .\server\index.js -Value ($before + $insertBlock + $after)
        Write-Host "PART 2: IndStocks fallback inserted before line $($constIdx+1)" -ForegroundColor Green
    }
}

Select-String -Path .\server\aliceblue\history.js -Pattern "UNSUPPORTED_CHART_EXCHANGES" -Quiet
Select-String -Path .\server\index.js -Pattern "ALICEBLUE INDEX FALLBACK" -Quiet