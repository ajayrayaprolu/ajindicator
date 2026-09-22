Copy-Item .\server\aliceblue\history.js .\server\aliceblue\history.js.bak3 -Force

$lines = Get-Content .\server\aliceblue\history.js
$marker = 'const data = response?.data;'
$matches = $lines | Select-String -Pattern $marker -SimpleMatch

if (-not $matches) {
    Write-Host "ERROR: could not find the line - no changes made." -ForegroundColor Red
} elseif ($matches.Count -gt 1) {
    Write-Host "ERROR: found $($matches.Count) matches, not safe to auto-edit. Line numbers:" -ForegroundColor Red
    $matches | ForEach-Object { Write-Host $_.LineNumber }
} else {
    $idx = $matches[0].LineNumber - 1
    $originalLine = $lines[$idx]
    $indent = [regex]::Match($originalLine, '^\s*').Value

    $newLines = @(
        "${indent}console.log(",
        "${indent}    `"[ALICEBLUE HISTORY] RAW RESPONSE DATA:`",",
        "${indent}    JSON.stringify(data)?.slice(0, 2000)",
        "${indent});"
    )

    $insertAt = $idx + 1
    $result = $lines[0..$idx] + $newLines + $lines[$insertAt..($lines.Count-1)]
    Set-Content -Path .\server\aliceblue\history.js -Value $result
    Write-Host "Inserted logging after line $($matches[0].LineNumber)" -ForegroundColor Green
}

Select-String -Path .\server\aliceblue\history.js -Pattern "RAW RESPONSE DATA" -Quiet