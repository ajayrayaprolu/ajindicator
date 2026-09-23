$path = ".\server\aliceblue\optionsRoute.js"
Copy-Item $path "$path.bak1" -Force

$lines = Get-Content $path

$anchorIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'DERIVE UNDERLYING FROM TRADING SYMBOL') { $anchorIdx = $i; break }
}

if ($anchorIdx -lt 0) {
    Write-Host "ERROR: anchor not found" -ForegroundColor Red
} else {
    $insertBefore = $anchorIdx - 1
    $helperBlock = @(
        '//======================================================',
        '// NORMALIZE UNDERLYING - strip a chart equity "-EQ" suffix',
        '// (e.g. "ADANIENT-EQ") down to the canonical option',
        '// underlying ("ADANIENT"), same normalization the inline',
        '// history.js option parser already applies.',
        '//======================================================',
        '',
        'function normalizeUnderlying(value) {',
        '    return String(value ?? "").trim().toUpperCase().replace(/-EQ$/i, "");',
        '}',
        ''
    )
    $lines = $lines[0..($insertBefore-1)] + $helperBlock + $lines[$insertBefore..($lines.Count-1)]
}

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'resolveExchangeForUnderlying\(underlying\)' -and $lines[$i] -notmatch 'function\s') {
        $lines[$i] = $lines[$i] -replace 'resolveExchangeForUnderlying\(underlying\)', 'resolveExchangeForUnderlying(normalizeUnderlying(underlying))'
    }
}

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*underlying,\s*$') {
        $indent = [regex]::Match($lines[$i], '^\s*').Value
        $lines[$i] = "${indent}underlying: normalizeUnderlying(underlying),"
    }
}

Set-Content -Path $path -Value $lines
Write-Host "Patched optionsRoute.js" -ForegroundColor Green
Select-String -Path $path -Pattern "function normalizeUnderlying" -Quiet