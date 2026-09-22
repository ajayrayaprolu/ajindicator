Copy-Item .\server\aliceblue\history.js .\server\aliceblue\history.js.bak2 -Force

$lines = Get-Content .\server\aliceblue\history.js
$marker = 'const liveUnavailable ='
$matches = $lines | Select-String -Pattern $marker -SimpleMatch

if (-not $matches) {
    Write-Host "ERROR: still could not find the line - no changes made." -ForegroundColor Red
} elseif ($matches.Count -gt 1) {
    Write-Host "ERROR: found $($matches.Count) matches, not safe to auto-edit. Line numbers:" -ForegroundColor Red
    $matches | ForEach-Object { Write-Host $_.LineNumber }
} else {
    $idx = $matches[0].LineNumber - 1
    $originalLine = $lines[$idx]
    $indent = [regex]::Match($originalLine, '^\s*').Value

    $newLines = @(
        "${indent}console.error(",
        "${indent}    `"[ALICEBLUE HISTORY] LIVE UNAVAILABLE - real reason:`",",
        "${indent}    {",
        "${indent}        httpStatus: error?.response?.status,",
        "${indent}        responseData: error?.response?.data,",
        "${indent}        code: error?.code,",
        "${indent}        message: error?.message",
        "${indent}    }",
        "${indent});",
        ""
    )

    $result = $lines[0..($idx-1)] + $newLines + $lines[$idx..($lines.Count-1)]
    Set-Content -Path .\server\aliceblue\history.js -Value $result
    Write-Host "Inserted logging before line $($matches[0].LineNumber)" -ForegroundColor Green
}

Select-String -Path .\server\aliceblue\history.js -Pattern "LIVE UNAVAILABLE - real reason" -Quiet