$path = ".\server\index.js"
Copy-Item $path "$path.bak10" -Force

$content = Get-Content $path -Raw

$old = "            try {`r`n                const zerodhaRow = getInstrument"
$new = "            fs.appendFileSync(`"./zerodha-fallback-debug.log`", ``[`${new Date().toISOString()}] Fallback catch block entered for symbol=`${symbol}`` + `"\n`");`r`n            try {`r`n                const zerodhaRow = getInstrument"

$count = ([regex]::Matches($content, [regex]::Escape($old))).Count

if ($count -ne 1) {
    Write-Host "ERROR: expected 1 match, found $count - no changes made" -ForegroundColor Red
} else {
    $content = $content.Replace($old, $new)
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Added file-based entry log to Zerodha fallback" -ForegroundColor Green
}

Select-String -Path $path -Pattern "Fallback catch block entered" -Quiet