$path = ".\nodemon.json"
Copy-Item $path "$path.bak1" -Force

$json = Get-Content $path -Raw | ConvertFrom-Json
$ignoreList = [System.Collections.Generic.List[string]]::new([string[]]$json.ignore)

$additions = @(
    "server/zerodha/instruments.json",
    "server/zerodha/session.json"
)

foreach ($item in $additions) {
    if (-not $ignoreList.Contains($item)) {
        $ignoreList.Add($item)
    }
}

$json.ignore = $ignoreList.ToArray()
$json | ConvertTo-Json -Depth 5 | Set-Content -Path $path

Write-Host "Updated nodemon.json" -ForegroundColor Green
Get-Content $path