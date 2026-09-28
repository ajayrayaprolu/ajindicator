$path = ".\server\index.js"
Copy-Item $path "$path.bak13" -Force

$lines = Get-Content $path

$importIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'import indstocksEquitySearchRouter') { $importIdx = $i; break }
}
$mountIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '"/api/indstocks/symbols"') { $mountIdx = $i; break }
}

if ($importIdx -lt 0 -or $mountIdx -lt 0) {
    Write-Host "ERROR: anchors not found -> import=$importIdx mount=$mountIdx" -ForegroundColor Red
} else {
    $lines = $lines[0..$importIdx] + @(
        'import zerodhaOptionsRouter from "./zerodha/optionsRoute.js";',
        'import zerodhaEquitySearchRouter from "./zerodha/equitySearchRoute.js";'
    ) + $lines[($importIdx+1)..($lines.Count-1)]

    $mountIdx += 2

    $mountEndIdx = -1
    for ($i = $mountIdx; $i -lt $mountIdx + 6; $i++) {
        if ($lines[$i].Trim() -eq ');') { $mountEndIdx = $i; break }
    }

    if ($mountEndIdx -lt 0) {
        Write-Host "ERROR: mount closing not found" -ForegroundColor Red
    } else {
        $lines = $lines[0..$mountEndIdx] + @(
            '',
            'app.use(',
            '    "/api/zerodha/options",',
            '    zerodhaOptionsRouter',
            ');',
            '',
            'app.use(',
            '    "/api/zerodha/symbols",',
            '    zerodhaEquitySearchRouter',
            ');'
        ) + $lines[($mountEndIdx+1)..($lines.Count-1)]

        Set-Content -Path $path -Value $lines
        Write-Host "Mounted Zerodha options + symbols routers" -ForegroundColor Green
    }
}

Select-String -Path $path -Pattern "zerodhaEquitySearchRouter" -AllMatches | Measure-Object