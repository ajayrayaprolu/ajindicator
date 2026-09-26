$path = ".\src\components\ChartWindow.tsx"
Copy-Item $path "$path.bak4" -Force

$lines = Get-Content $path

$markerIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'ZERODHA history skipped - not logged in') { $markerIdx = $i; break }
}
if ($markerIdx -lt 0) { Write-Host "ERROR: old inline marker not found" -ForegroundColor Red; exit 1 }

$ifIdx = -1
for ($i = $markerIdx; $i -ge 0; $i--) {
    if ($lines[$i] -match '^\s*if \(\s*$' -and ($lines[$i+1] -match 'datasource === "zerodha"' -or $lines[$i+2] -match 'datasource === "zerodha"')) {
        $ifIdx = $i
        break
    }
}
if ($ifIdx -lt 0) { Write-Host "ERROR: opening if( not found" -ForegroundColor Red; exit 1 }

$ifIndent = [regex]::Match($lines[$ifIdx], '^\s*').Value

$invokeIdx = -1
for ($i = $markerIdx; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq 'loadZerodhaHistory();') { $invokeIdx = $i; break }
}
if ($invokeIdx -lt 0) { Write-Host "ERROR: invocation line not found" -ForegroundColor Red; exit 1 }

$closeIdx = -1
for ($i = $invokeIdx; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -eq "${ifIndent}}") { $closeIdx = $i; break }
}
if ($closeIdx -lt 0) { Write-Host "ERROR: closing brace not found" -ForegroundColor Red; exit 1 }

Write-Host "Found block: if( at $($ifIdx+1), close at $($closeIdx+1)" -ForegroundColor Cyan

$replacement = @(
    "${ifIndent}if (",
    "${ifIndent}    datasource === `"zerodha`" ||",
    "${ifIndent}    datasource === `"Zerodha`"",
    "${ifIndent}) {",
    "",
    "${ifIndent}    setCandles([]);",
    "${ifIndent}    setFeedError(null);",
    "",
    "${ifIndent}    if (!zerodhaLoggedIn) {",
    "${ifIndent}        return () => {",
    "${ifIndent}            mounted = false;",
    "${ifIndent}        };",
    "${ifIndent}    }",
    "",
    "${ifIndent}    loadZerodhaHistory();",
    "",
    "${ifIndent}    const timer =",
    "${ifIndent}        window.setInterval(",
    "${ifIndent}            loadZerodhaHistory,",
    "${ifIndent}            15000",
    "${ifIndent}        );",
    "",
    "${ifIndent}    return () => {",
    "${ifIndent}        mounted = false;",
    "${ifIndent}        window.clearInterval(timer);",
    "${ifIndent}    };",
    "${ifIndent}}"
)

$lines = $lines[0..($ifIdx-1)] + $replacement + $lines[($closeIdx+1)..($lines.Count-1)]
Set-Content -Path $path -Value $lines
Write-Host "Replaced old inline block with call to top-level loadZerodhaHistory()" -ForegroundColor Green