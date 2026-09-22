Copy-Item .\server\index.js .\server\index.js.bak6 -Force

$lines = Get-Content .\server\index.js

$anchorIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'if \(indexMatch\?\.exchange && indexMatch\?\.securityId\) \{') { $anchorIdx = $i; break }
}

if ($anchorIdx -eq -1) {
    Write-Host "ERROR: anchor not found" -ForegroundColor Red
} else {
    $targetIdx = $anchorIdx + 1
    $lines[$targetIdx] = '                        indstocksSymbol = `${indexMatch.exchange}_${indexMatch.securityId}`;'
    Set-Content -Path .\server\index.js -Value $lines
    Write-Host "Fixed line $($targetIdx+1)" -ForegroundColor Green
}

Select-String -Path .\server\index.js -Pattern '\$\{indexMatch\.exchange\}_\$\{indexMatch\.securityId\}' -Quiet