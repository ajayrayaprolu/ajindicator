$path = ".\server\zerodha\nativeWebSocket.js"
Copy-Item $path "$path.bak1" -Force

$content = Get-Content $path -Raw

$old = 'socket = new WebSocket(url);'
$new = @'
socket = new WebSocket(url, {
        headers: {
            "X-Kite-Version": "3",
            "User-Agent": "AJInstitutional-ZerodhaNativeWS/1.0"
        }
    });
'@

$count = ([regex]::Matches($content, [regex]::Escape($old))).Count

if ($count -ne 1) {
    Write-Host "ERROR: expected 1 match, found $count - no changes made" -ForegroundColor Red
} else {
    $content = $content.Replace($old, $new)
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Added X-Kite-Version header to WebSocket handshake" -ForegroundColor Green
}

Select-String -Path $path -Pattern "X-Kite-Version" -Quiet