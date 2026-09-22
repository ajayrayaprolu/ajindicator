Copy-Item .\server\aliceblue\history.js .\server\aliceblue\history.js.bak4 -Force

$lines = Get-Content .\server\aliceblue\history.js
$startMarker = 'const UNSUPPORTED_CHART_EXCHANGES = new Set(["BSE", "BCD", "BFO"]);'
$startMatches = $lines | Select-String -Pattern $startMarker -SimpleMatch

if (-not $startMatches) {
    Write-Host "ERROR: could not find UNSUPPORTED_CHART_EXCHANGES line" -ForegroundColor Red
} elseif ($startMatches.Count -gt 1) {
    Write-Host "ERROR: multiple matches, not safe to auto-edit" -ForegroundColor Red
} else {
    $startIdx = $startMatches[0].LineNumber - 1
    $throwLineIdx = -1
    for ($i = $startIdx; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'throw unsupportedError;') { $throwLineIdx = $i; break }
    }
    if ($throwLineIdx -eq -1) {
        Write-Host "ERROR: could not find throw unsupportedError; line" -ForegroundColor Red
    } else {
        $closeIdx = -1
        for ($i = $throwLineIdx; $i -lt $lines.Count; $i++) {
            if ($lines[$i].Trim() -eq '}') { $closeIdx = $i; break }
        }
        if ($closeIdx -eq -1) {
            Write-Host "ERROR: could not find closing brace" -ForegroundColor Red
        } else {
            $before = $lines[0..($startIdx-1)]
            $blockToComment = $lines[$startIdx..$closeIdx]
            $after = $lines[($closeIdx+1)..($lines.Count-1)]

            $commented = @('    // --- TEMPORARILY DISABLED FOR TESTING (see chat) ---') +
                         ($blockToComment | ForEach-Object { "    // $_" }) +
                         '    console.warn("[ALICEBLUE HISTORY] BSE/BCD/BFO pre-check disabled for testing - attempting live call for", exch);'

            $result = $before + $commented + $after
            Set-Content -Path .\server\aliceblue\history.js -Value $result
            Write-Host "Disabled BSE/BCD/BFO pre-check (lines $($startIdx+1)-$($closeIdx+1))" -ForegroundColor Green
        }
    }
}

Select-String -Path .\server\aliceblue\history.js -Pattern "TEMPORARILY DISABLED FOR TESTING" -Quiet