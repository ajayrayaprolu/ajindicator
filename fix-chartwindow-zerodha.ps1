$path = ".\src\components\ChartWindow.tsx"
Copy-Item $path "$path.bak2" -Force

$content = Get-Content $path -Raw

$oldStub = @'
    if (
        datasource === "zerodha" ||
        datasource === "Zerodha"
    ) {

        if (!zerodhaLoggedIn) {

            setCandles([]);
            setFeedError(null);

        }

        return () => {

            mounted = false;

        };

    }
'@

$newBlock = @'
    if (
        datasource === "zerodha" ||
        datasource === "Zerodha"
    ) {

        setCandles([]);
        setFeedError(null);

        if (!zerodhaLoggedIn) {

            return () => {

                mounted = false;

            };

        }

        loadZerodhaHistory();

        const timer =
            window.setInterval(
                loadZerodhaHistory,
                15000
            );

        return () => {
            mounted = false;
            window.clearInterval(timer);
        };
    }
'@

$count = ([regex]::Matches($content, [regex]::Escape($oldStub))).Count

if ($count -ne 1) {
    Write-Host "ERROR: expected 1 match for the stub block, found $count - no changes made" -ForegroundColor Red
} else {
    $content = $content.Replace($oldStub, $newBlock)
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Replaced Zerodha stub with functional block" -ForegroundColor Green
}

Select-String -Path $path -Pattern "loadZerodhaHistory\(\)" -Quiet