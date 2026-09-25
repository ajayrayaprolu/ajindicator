$path = ".\server\zerodha\token.js"
Copy-Item $path "$path.bak1" -Force

$lines = Get-Content $path

$returnIndices = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*return\s*$') {
        $returnIndices += $i
    }
}

Write-Host "Found $($returnIndices.Count) bare 'return' lines at:" ($returnIndices | ForEach-Object { $_ + 1 }) -ForegroundColor Cyan

foreach ($idx in $returnIndices) {

    $indent = [regex]::Match($lines[$idx], '^\s*').Value
    $lines[$idx] = "${indent}return ("

    $termIdx = -1
    for ($j = $idx + 1; $j -lt $idx + 20; $j++) {
        if ($lines[$j].TrimEnd() -match ';\s*$') {
            $termIdx = $j
            break
        }
    }

    if ($termIdx -eq -1) {
        Write-Host "ERROR: no terminator found after line $($idx+1)" -ForegroundColor Red
        continue
    }

    $lines[$termIdx] = $lines[$termIdx] -replace ';\s*$', ');'
    Write-Host "Fixed return at line $($idx+1), terminator at line $($termIdx+1)" -ForegroundColor Green
}

Set-Content -Path $path -Value $lines
Select-String -Path $path -Pattern '^\s*return\s*$' -Quiet