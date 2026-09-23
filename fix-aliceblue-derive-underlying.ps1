$path = ".\server\aliceblue\optionsRoute.js"

Copy-Item $path "$path.bak7" -Force

$lines = Get-Content $path

$start = -1
$end = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*function deriveUnderlying\(contract\)') {
        $start = $i
        break
    }
}

if ($start -lt 0) {
    Write-Host "ERROR: deriveUnderlying() start not found" -ForegroundColor Red
    exit 1
}

for ($i = $start; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*}\s*$') {
        $end = $i
        break
    }
}

if ($end -lt 0) {
    Write-Host "ERROR: deriveUnderlying() end not found" -ForegroundColor Red
    exit 1
}

$replacement = @(
'function deriveUnderlying(contract) {',
'',
'    const symbol =',
'        String(contract?.symbol ?? contract?.tradingSymbol ?? "").toUpperCase();',
'',
'    if (symbol.startsWith("BANKNIFTY")) return "BANKNIFTY";',
'    if (symbol.startsWith("FINNIFTY")) return "FINNIFTY";',
'    if (symbol.startsWith("MIDCPNIFTY")) return "MIDCPNIFTY";',
'    if (symbol.startsWith("NIFTY")) return "NIFTY";',
'    if (symbol.startsWith("BANKEX")) return "BANKEX";',
'    if (symbol.startsWith("SENSEX")) return "SENSEX";',
'',
'    return symbol',
'        .replace(/-EQ$/, "")',
'        .replace(/-BE$/, "")',
'        .replace(/-SM$/, "");',
'}'
)

$lines = @(
    $lines[0..($start - 1)]
    $replacement
    $lines[($end + 1)..($lines.Count - 1)]
)

Set-Content -Path $path -Value $lines

Write-Host "Fixed AliceBlue deriveUnderlying() equity fallback." -ForegroundColor Green

Select-String -Path $path -Pattern 'replace\(/-EQ\$\s*,?\s*""\)' -Quiet