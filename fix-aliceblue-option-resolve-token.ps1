$path = ".\server\aliceblue\optionsRoute.js"

Copy-Item $path "$path.bak6" -Force

$lines = Get-Content $path

$found = $false

for ($i = 0; $i -lt $lines.Count; $i++) {

    if ($lines[$i] -match '^\s*symbol:\s*`\$\{contract\.exchange\}\|\$\{contract\.token\}`') {

        $insertAt = $i + 1

        $lines = @(
            $lines[0..$i]
            "        token: contract.token,"
            $lines[$insertAt..($lines.Count - 1)]
        )

        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host "ERROR: toApiShape() symbol line not found" -ForegroundColor Red
    exit 1
}

Set-Content -Path $path -Value $lines

Write-Host "Added token to AliceBlue option API shape." -ForegroundColor Green

Select-String -Path $path -Pattern 'token:\s*contract\.token' -Quiet