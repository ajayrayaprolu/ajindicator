$path = ".\server\aliceblue\symbols.js"
Copy-Item $path "$path.bak5" -Force

$lines = Get-Content $path
$idx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*return symbol;\s*$') {
        if ($lines[$i-2] -match 'BANKEX' -or $lines[$i-4] -match 'BANKEX') {
            $idx = $i
            break
        }
    }
}

if ($idx -lt 0) {
    Write-Host "ERROR: target 'return symbol;' line not found" -ForegroundColor Red
} else {
    $indent = [regex]::Match($lines[$idx], '^\s*').Value
    $lines[$idx] = "${indent}return symbol.replace(/-EQ`$/, `"`").replace(/-BE`$/, `"`").replace(/-SM`$/, `"`");"
    Set-Content -Path $path -Value $lines
    Write-Host "Fixed extractUnderlying() fallback (line $($idx+1))" -ForegroundColor Green
}

Select-String -Path $path -Pattern 'return symbol\.replace' -Quiet