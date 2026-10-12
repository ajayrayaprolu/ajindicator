$ErrorActionPreference = 'Stop'
$root = 'C:\AI-Institutional'
Set-Location -LiteralPath $root

$homePath = '.\src\pages\AlgoHome.tsx'
$appPath = '.\src\App.tsx'
$terminalPath = '.\src\pages\Terminal.tsx'
$outPath = '.\aj-home-navigation-inspection.txt'

foreach ($path in @($homePath, $appPath, $terminalPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required file not found: $path. Confirm the filename/path before continuing."
    }
}

$report = [System.Collections.Generic.List[string]]::new()
function Add-ReportLine([string]$Line) { $script:report.Add($Line) }
function Add-FileLines([string]$Path, [int]$Start, [int]$End, [string]$Heading) {
    $fileLines = Get-Content -LiteralPath $Path
    $startIndex = [Math]::Max(0, $Start - 1)
    $endIndex = [Math]::Min($fileLines.Count - 1, $End - 1)
    Add-ReportLine ''
    Add-ReportLine ('===== ' + $Heading + ' (' + $Path + ': lines ' + ($startIndex + 1) + '-' + ($endIndex + 1) + ') =====')
    for ($i = $startIndex; $i -le $endIndex; $i++) {
        Add-ReportLine ('{0,5}: {1}' -f ($i + 1), $fileLines[$i])
    }
}
function Add-MatchContexts([string]$Path, [string]$Pattern, [int]$Before, [int]$After, [int]$MaxMatches, [string]$Heading) {
    $fileLines = Get-Content -LiteralPath $Path
    $matches = Select-String -LiteralPath $Path -Pattern $Pattern
    if (-not $matches) {
        Add-ReportLine ''
        Add-ReportLine ('===== ' + $Heading + ' =====')
        Add-ReportLine ('No matches for pattern: ' + $Pattern)
        return
    }
    $ranges = @()
    foreach ($match in ($matches | Select-Object -First $MaxMatches)) {
        $s = [Math]::Max(1, $match.LineNumber - $Before)
        $e = [Math]::Min($fileLines.Count, $match.LineNumber + $After)
        if ($ranges.Count -gt 0 -and $s -le ($ranges[-1].End + 1)) {
            if ($e -gt $ranges[-1].End) { $ranges[-1].End = $e }
        } else {
            $ranges += [pscustomobject]@{ Start = $s; End = $e }
        }
    }
    foreach ($range in $ranges) {
        Add-FileLines -Path $Path -Start $range.Start -End $range.End -Heading $Heading
    }
}

Add-ReportLine 'AJ INSTITUTIONAL — READ-ONLY NAVIGATION / HERO INSPECTION'
Add-ReportLine ('Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-ReportLine 'No source files are modified by this inspection.'

Add-FileLines -Path $appPath -Start 1 -End ([Math]::Min(240, (Get-Content -LiteralPath $appPath).Count)) -Heading 'APP ROUTING (FULL FILE)'

Add-MatchContexts -Path $homePath -Pattern 'Get Charts|Auto Trade: ARMED|Current Signal|openTerminal|AUTOMATED EXECUTION|Main navigation|<span>▦</span>Charts|Live Charts & Signals' -Before 10 -After 18 -MaxMatches 18 -Heading 'ALGOHOME HERO BUTTONS / SIGNAL / SIDEBAR JSX'
Add-MatchContexts -Path $homePath -Pattern '\.aj-hero|aj-hero-main|aj-hero-side|aj-hero-signal|Current Signal|\.aj-panel' -Before 3 -After 16 -MaxMatches 18 -Heading 'ALGOHOME HERO / PANEL CSS'
Add-MatchContexts -Path $terminalPath -Pattern 'URLSearchParams|terminal|feedSource|feed=|searchParams|location\.search|const feed|feed\s*=' -Before 3 -After 6 -MaxMatches 24 -Heading 'TERMINAL ROUTE / FEED HANDLING'

$report | Set-Content -LiteralPath $outPath -Encoding UTF8
Write-Host "Inspection complete. No source files were changed." -ForegroundColor Green
Write-Host "Report saved to: $((Resolve-Path -LiteralPath $outPath).Path)" -ForegroundColor Cyan
Write-Host "`n===== REPORT PREVIEW (first 260 lines) =====" -ForegroundColor Yellow
Get-Content -LiteralPath $outPath | Select-Object -First 260
Write-Host "`nIf the preview is truncated, attach this file: $outPath" -ForegroundColor Cyan
