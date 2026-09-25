$path = ".\server\zerodha\nativeWebSocket.js"
Copy-Item $path "$path.bak2" -Force

$content = Get-Content $path -Raw

$oldBase = 'const WS_BASE_URL = "wss://ws.kite.trade";'
$newBase = 'const WS_BASE_URL = "wss://ws.kite.trade/";'

$oldUrl = @'
    const url =
        `${WS_BASE_URL}?api_key=${encodeURIComponent(apiKey)}` +
        `&access_token=${encodeURIComponent(accessToken)}`;
'@

$newUrl = @'
    const url =
        `${WS_BASE_URL}?api_key=${apiKey}` +
        `&access_token=${accessToken}` +
        `&uid=${Date.now()}`;
'@

$baseCount = ([regex]::Matches($content, [regex]::Escape($oldBase))).Count
$urlCount = ([regex]::Matches($content, [regex]::Escape($oldUrl))).Count

if ($baseCount -ne 1 -or $urlCount -ne 1) {
    Write-Host "ERROR: base=$baseCount url=$urlCount (expected 1 each) - no changes made" -ForegroundColor Red
} else {
    $content = $content.Replace($oldBase, $newBase).Replace($oldUrl, $newUrl)
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Updated WS_BASE_URL and URL construction to match official SDK exactly" -ForegroundColor Green
}

Select-String -Path $path -Pattern "uid=" -Quiet