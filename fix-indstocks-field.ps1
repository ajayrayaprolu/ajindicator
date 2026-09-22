Copy-Item .\server\index.js .\server\index.js.bak5 -Force

$content = Get-Content .\server\index.js -Raw

$old = "                    if (indexMatch?.symbol) {`r`n                        indstocksSymbol = indexMatch.symbol;"
$new = "                    if (indexMatch?.exchange && indexMatch?.securityId) {`r`n                        indstocksSymbol = ``\${indexMatch.exchange}_\${indexMatch.securityId}``;"

$count = ([regex]::Matches($content, [regex]::Escape($old))).Count

if ($count -ne 1) {
    Write-Host "ERROR: expected 1 match, found $count - no changes made" -ForegroundColor Red
} else {
    $content = $content.Replace($old, $new)
    Set-Content -Path .\server\index.js -Value $content -NoNewline
    Write-Host "Fixed indexMatch.symbol -> exchange_securityId" -ForegroundColor Green
}

Select-String -Path .\server\index.js -Pattern "indexMatch.exchange" -Quiet