$path = ".\src\components\ChartWindow.tsx"
Copy-Item $path "$path.bak3" -Force

$lines = Get-Content $path

$idx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'INDSTOCKS HISTORY') { $idx = $i; break }
}
$commentStartIdx = -1
if ($idx -ge 0) {
    for ($i = $idx; $i -ge 0; $i--) {
        if ($lines[$i] -match '^\s*//--+\s*$') { $commentStartIdx = $i; break }
    }
}

if ($commentStartIdx -lt 0) {
    Write-Host "ERROR: INDSTOCKS HISTORY comment block start not found" -ForegroundColor Red
} else {
    $fn = @(
        '    //--------------------------------------------------',
        '    // ZERODHA HISTORY',
        '    //',
        '    // Zerodha REST market data currently returns 403 for',
        '    // this account (subscription gate, not a code issue -',
        '    // verified against the official untouched SDK too).',
        '    // The backend route already attempts real Zerodha REST',
        '    // first and transparently falls back to FYERS - this',
        '    // just calls that same endpoint. Canonical option',
        '    // identity is sent as extra params so the backend can',
        '    // resolve options via FYERS directly, without needing',
        '    // Zerodha''s own native compact symbol text.',
        '    //--------------------------------------------------',
        '',
        '    async function loadZerodhaHistory() {',
        '',
        '        if (datasource !== "zerodha" && datasource !== "Zerodha") {',
        '            return;',
        '        }',
        '',
        '        if (!zerodhaLoggedIn) {',
        '            return;',
        '        }',
        '',
        '        if (!symbol) {',
        '            return;',
        '        }',
        '',
        '        try {',
        '',
        '            const isZerodhaOption =',
        '                Boolean(',
        '                    underlying &&',
        '                    expiry &&',
        '                    Number.isFinite(strike) &&',
        '                    optionType &&',
        '                    /^(CE|PE)$/i.test(optionType)',
        '                );',
        '',
        '            const optionParams =',
        '                isZerodhaOption',
        '                    ? `&underlying=${encodeURIComponent(underlying!)}&expiry=${encodeURIComponent(expiry!)}&strike=${encodeURIComponent(String(strike))}&optionType=${encodeURIComponent(String(optionType).toUpperCase())}`',
        '                    : "";',
        '',
        '            const zerodhaSymbol =',
        '                String(symbol ?? "").trim().toUpperCase();',
        '',
        '            const response =',
        '                await fetch(',
        '                    `/api/zerodha/history/${encodeURIComponent(zerodhaSymbol)}?timeframe=${encodeURIComponent(timeframe)}${optionParams}`',
        '                );',
        '',
        '            if (!response.ok) {',
        '',
        '                let details: string | undefined;',
        '',
        '                try {',
        '                    const errorBody = await response.json();',
        '                    details = errorBody?.details ?? errorBody?.error;',
        '                } catch {',
        '                    // not JSON',
        '                }',
        '',
        '                throw new Error(details || `Zerodha history request failed: ${response.status}`);',
        '            }',
        '',
        '            const data = await response.json();',
        '',
        '            const history =',
        '                Array.isArray(data)',
        '                    ? data',
        '                    : Array.isArray(data?.candles)',
        '                        ? data.candles',
        '                        : [];',
        '',
        '            if (!mounted) {',
        '                return;',
        '            }',
        '',
        '            setCandles(history);',
        '',
        '            setFeedError(',
        '                history.length > 0',
        '                    ? null',
        '                    : "Zerodha returned no historical candles."',
        '            );',
        '',
        '        }',
        '        catch (error: unknown) {',
        '',
        '            if (!mounted) {',
        '                return;',
        '            }',
        '',
        '            console.error("[ChartWindow] Zerodha history failed", error);',
        '',
        '            setFeedError(',
        '                error instanceof Error',
        '                    ? error.message',
        '                    : "Unable to load Zerodha historical data."',
        '            );',
        '        }',
        '    }',
        ''
    )
    $lines = $lines[0..($commentStartIdx-1)] + $fn + $lines[$commentStartIdx..($lines.Count-1)]
    Set-Content -Path $path -Value $lines
    Write-Host "Inserted loadZerodhaHistory before line $($commentStartIdx+1)" -ForegroundColor Green
}

Select-String -Path $path -Pattern "async function loadZerodhaHistory" -Quiet