$path = ".\src\components\SymbolSelector.tsx"
Copy-Item $path "$path.bak1" -Force

$content = Get-Content $path -Raw

$edits = @(
    @{
        old = 'const isIndstocks = String(datasource ?? "").toLowerCase() === "indstocks";'
        new = 'const isIndstocks = String(datasource ?? "").toLowerCase() === "indstocks";' + "`r`n" + '    const isZerodha = String(datasource ?? "").toLowerCase() === "zerodha";'
    },
    @{
        old = @'
            if (isIndstocks) {

                const params = new URLSearchParams({
                    underlying: text.toUpperCase(),
                    limit: "100"
                });

                const response = await fetch(`/api/indstocks/options/search?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
'@
        new = @'
            if (isZerodha) {

                const params = new URLSearchParams({
                    underlying: text.toUpperCase(),
                    limit: "100"
                });

                const response = await fetch(`/api/zerodha/options/search?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                return Array.isArray(data.results)
                    ? data.results.map((item: any) => ({
                        symbol: item.symbol,
                        displayName: item.displayName,
                        exchange: item.exchange,
                        type: "OPTION",
                        feedSource: "ZERODHA",
                        expiry: item.expiry,
                        strike: item.strike,
                        optionType: item.optionType,
                        underlying: item.underlying
                    }))
                    : [];
            }

            if (isIndstocks) {

                const params = new URLSearchParams({
                    underlying: text.toUpperCase(),
                    limit: "100"
                });

                const response = await fetch(`/api/indstocks/options/search?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
'@
    },
    @{
        old = 'const url = fyers
                ? `/api/fyers/symbols/search?q=${encodeURIComponent(text)}`
                : isAliceBlue
                    ? `/api/aliceblue/symbols/search?q=${encodeURIComponent(text)}`
                    : isIndstocks
                        ? `/api/indstocks/symbols/search?q=${encodeURIComponent(text)}`
                        : `/api/symbols/search?q=${encodeURIComponent(text)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const allResults: SymbolSearchResult[] = Array.isArray(data.results) ? data.results : [];'
        new = 'const url = fyers
                ? `/api/fyers/symbols/search?q=${encodeURIComponent(text)}`
                : isAliceBlue
                    ? `/api/aliceblue/symbols/search?q=${encodeURIComponent(text)}`
                    : isIndstocks
                        ? `/api/indstocks/symbols/search?q=${encodeURIComponent(text)}`
                        : isZerodha
                            ? `/api/zerodha/symbols/search?q=${encodeURIComponent(text)}`
                            : `/api/symbols/search?q=${encodeURIComponent(text)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const allResults: SymbolSearchResult[] = Array.isArray(data.results) ? data.results : [];'
    },
    @{
        old = 'if (!fyers && !isAliceBlue && !isIndstocks) {
                return allResults;
            }'
        new = 'if (!fyers && !isAliceBlue && !isIndstocks && !isZerodha) {
                return allResults;
            }'
    },
    @{
        old = 'const optionQuery = (fyers || isAliceBlue || isIndstocks) ? parseFyersOptionQuery(text) : null;'
        new = 'const optionQuery = (fyers || isAliceBlue || isIndstocks || isZerodha) ? parseFyersOptionQuery(text) : null;'
    },
    @{
        old = 'const endpoint =
                fyers
                    ? "/api/fyers/options/search"
                    : isAliceBlue
                        ? "/api/aliceblue/options/search"
                        : "/api/indstocks/options/search";

            const feedSourceLabel =
                fyers ? "FYERS" : isAliceBlue ? "ALICEBLUE" : "INDSTOCKS";'
        new = 'const endpoint =
                fyers
                    ? "/api/fyers/options/search"
                    : isAliceBlue
                        ? "/api/aliceblue/options/search"
                        : isIndstocks
                            ? "/api/indstocks/options/search"
                            : "/api/zerodha/options/search";

            const feedSourceLabel =
                fyers ? "FYERS" : isAliceBlue ? "ALICEBLUE" : isIndstocks ? "INDSTOCKS" : "ZERODHA";'
    },
    @{
        old = 'const url = fyers
                ? `/api/fyers/symbols/search?q=${encodeURIComponent(text)}`
                : isAliceBlue
                    ? `/api/aliceblue/symbols/search?q=${encodeURIComponent(text)}`
                    : isIndstocks
                        ? `/api/indstocks/symbols/search?q=${encodeURIComponent(text)}`
                        : `/api/symbols/search?q=${encodeURIComponent(text)}`;
			

        const response = await fetch(url);'
        new = 'const url = fyers
                ? `/api/fyers/symbols/search?q=${encodeURIComponent(text)}`
                : isAliceBlue
                    ? `/api/aliceblue/symbols/search?q=${encodeURIComponent(text)}`
                    : isIndstocks
                        ? `/api/indstocks/symbols/search?q=${encodeURIComponent(text)}`
                        : isZerodha
                            ? `/api/zerodha/symbols/search?q=${encodeURIComponent(text)}`
                            : `/api/symbols/search?q=${encodeURIComponent(text)}`;
			

        const response = await fetch(url);'
    }
)

$allOk = $true
foreach ($e in $edits) {
    $count = ([regex]::Matches($content, [regex]::Escape($e.old))).Count
    if ($count -ne 1) {
        Write-Host "ERROR: expected 1 match, found $count for an edit block (first 60 chars): $($e.old.Substring(0, [Math]::Min(60, $e.old.Length)))" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host "No changes made - fix the mismatches above first." -ForegroundColor Red
} else {
    foreach ($e in $edits) {
        $content = $content.Replace($e.old, $e.new)
    }
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Wired isZerodha into all search paths" -ForegroundColor Green
}

Select-String -Path $path -Pattern "isZerodha" -AllMatches | Measure-Object