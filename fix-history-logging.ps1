Copy-Item .\server\aliceblue\history.js .\server\aliceblue\history.js.bak -Force

$lines = Get-Content .\server\aliceblue\history.js
$matches = $lines | Select-String -Pattern '^\s*live = null;\s*$'

if (-not $matches) {
    Write-Host "ERROR: could not find 'live = null;' line - no changes made." -ForegroundColor Red
} elseif ($matches.Count -gt 1) {
    Write-Host "ERROR: found $($matches.Count) matching lines, not safe to auto-edit. Line numbers:" -ForegroundColor Red
    $matches | ForEach-Object { Write-Host $_.LineNumber }
} else {
    $idx = $matches[0].LineNumber - 1

    $newLines = @(
        '        console.error(',
        '            "[ALICEBLUE HISTORY] fetchAndCacheLive failed (non-session-expired):",',
        '            error?.aliceBlueReason ?? "(no reason)",',
        '            error?.message ?? error',
        '        );',
        ''
    )

    $result = $lines[0..($idx-1)] + $newLines + $lines[$idx..($lines.Count-1)]
    Set-Content -Path .\server\aliceblue\history.js -Value $result
    Write-Host "Inserted error logging before line $($matches[0].LineNumber)" -ForegroundColor Green
}

Select-String -Path .\server\aliceblue\history.js -Pattern "fetchAndCacheLive failed" -Quiet