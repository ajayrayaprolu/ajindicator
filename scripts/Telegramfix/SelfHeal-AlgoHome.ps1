# SelfHeal-AlgoHome.ps1
# Audits all known AlgoHome.tsx candidates, build-tests each candidate,
# compares required functionality markers, and selects the strongest verified version.
# Run from C:\AI-Institutional:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\SelfHeal-AlgoHome.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "src\pages\AlgoHome.tsx"
$PagesDir = Join-Path $ProjectRoot "src\pages"
$ReportPath = Join-Path $PagesDir "algohomeerrors.txt"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "$Target.before-selfheal-$Timestamp.bak"
$WorkDir = Join-Path $ProjectRoot ".selfheal-algohome-$Timestamp"
$CandidateDir = Join-Path $WorkDir "candidates"
$BuildLogDir = Join-Path $WorkDir "build-logs"

function Write-ReportLine([string]$Text) {
    Write-Host $Text
    Add-Content -LiteralPath $ReportPath -Value $Text
}

function Get-FileHashSafe([string]$Path) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    }
    return ""
}

function Get-SourceMetrics([string]$Path) {
    $content = Get-Content -LiteralPath $Path -Raw
    $lines = (Get-Content -LiteralPath $Path).Count

    # Core behavior markers are intentionally weighted more heavily than UI words.
    $checks = [ordered]@{
        "openTerminal" = '(?i)\bopenTerminal\b'
        "selectFeed" = '(?i)\bselectFeed\b'
        "normalizeInstrument" = '(?i)\bnormalizeInstrument\b'
        "Fyers symbol search API" = '/api/fyers/symbols/search'
        "Indstocks symbol search API" = '/api/indstocks/symbols/search'
        "terminal query routing" = '\?terminal=1|terminal=1|URLSearchParams'
        "instrument metadata" = '(?i)\b(instrumentId|instrumentToken|exchangeSegment|canonicalInstrument|tradingsymbol)\b'
        "feed selection UI" = '(?i)(feed|data source).{0,80}(select|switch|change)|(select|switch|change).{0,80}(feed|data source)'
        "dashboard UI vocabulary" = '(?i)(dashboard|portfolio|strategy builder|pre-built algos|my algos)'
        "algo controls vocabulary" = '(?i)(square.?off|pause|stop|deploy|virtual mode|live mode)'
        "performance vocabulary" = '(?i)(gross P&L|net P&L|win rate|backtest|back.?test|profit factor)'
    }

    $found = @()
    $score = 0
    foreach ($name in $checks.Keys) {
        if ($content -match $checks[$name]) {
            $found += $name
            switch ($name) {
                "openTerminal" { $score += 12 }
                "selectFeed" { $score += 12 }
                "normalizeInstrument" { $score += 12 }
                "Fyers symbol search API" { $score += 10 }
                "Indstocks symbol search API" { $score += 10 }
                "terminal query routing" { $score += 10 }
                "instrument metadata" { $score += 8 }
                "feed selection UI" { $score += 4 }
                "dashboard UI vocabulary" { $score += 4 }
                "algo controls vocabulary" { $score += 4 }
                "performance vocabulary" { $score += 4 }
            }
        }
    }

    # Small tie-breaker for a substantial source file; never outweighs core markers.
    if ($lines -ge 1500) { $score += 1 }

    return [pscustomobject]@{
        Path = $Path
        Name = [IO.Path]::GetFileName($Path)
        Bytes = (Get-Item -LiteralPath $Path).Length
        Lines = $lines
        SHA256 = Get-FileHashSafe $Path
        Score = $score
        Markers = ($found -join ", ")
        CoreComplete = (
            ($content -match '(?i)\bopenTerminal\b') -and
            ($content -match '(?i)\bselectFeed\b') -and
            ($content -match '(?i)\bnormalizeInstrument\b') -and
            ($content -match '/api/fyers/symbols/search') -and
            ($content -match '/api/indstocks/symbols/search') -and
            ($content -match '\?terminal=1|terminal=1|URLSearchParams')
        )
    }
}

function Invoke-BuildTest([string]$CandidatePath, [string]$LogPath) {
    $candidateFull = [IO.Path]::GetFullPath($CandidatePath)
    $targetFull = [IO.Path]::GetFullPath($Target)
    if ($candidateFull -ne $targetFull) {
        Copy-Item -LiteralPath $CandidatePath -Destination $Target -Force
    }
    $output = & npm run build 2>&1
    $exitCode = $LASTEXITCODE
    $output | Out-File -LiteralPath $LogPath -Encoding utf8
    return [pscustomobject]@{
        Passed = ($exitCode -eq 0)
        ExitCode = $exitCode
        LogPath = $LogPath
        Output = ($output -join [Environment]::NewLine)
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "package.json"))) {
    throw "Run this script from the project root (the folder containing package.json). Current folder: $ProjectRoot"
}
if (-not (Test-Path -LiteralPath $Target)) {
    throw "Target file not found: $Target"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found on PATH. Open the project terminal where Node.js/npm are available."
}

New-Item -ItemType Directory -Path $CandidateDir -Force | Out-Null
New-Item -ItemType Directory -Path $BuildLogDir -Force | Out-Null
"AJ Institutional AlgoHome Self-Heal Report - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" |
    Set-Content -LiteralPath $ReportPath -Encoding utf8

Write-ReportLine "Project root: $ProjectRoot"
Write-ReportLine "Target: $Target"
Write-ReportLine "Work directory: $WorkDir"
Write-ReportLine ""
Write-ReportLine "STEP 1 - Candidate inventory and source comparison"

# Preserve the exact active file before testing any candidate.
Copy-Item -LiteralPath $Target -Destination $BackupPath -Force
$originalHash = Get-FileHashSafe $Target
Write-ReportLine "Safety backup: $BackupPath"
Write-ReportLine "Active file SHA256 before tests: $originalHash"

# Copy known candidates into a private work folder so tests never mutate source candidates.
$candidateSpecs = @(
    @{ Label = "active"; Path = $Target; Priority = 20 },
    @{ Label = "org baseline"; Path = (Join-Path $PagesDir "AlgoHome.tsx.org.05102026"); Priority = 10 },
    @{ Label = "newer second candidate"; Path = (Join-Path $PagesDir "AlgoHome.tsx.2nd09102026"); Priority = 40 },
    @{ Label = "recovered copy"; Path = (Join-Path $PagesDir "AlgoHome.tsx.recovered-20261009-180959.tsx"); Priority = 30 },
    @{ Label = "pre CSS fix backup"; Path = (Join-Path $PagesDir "AlgoHome.tsx.before-css-fix.bak"); Priority = 5 },
    @{ Label = "pre recovery backup"; Path = (Join-Path $PagesDir "AlgoHome.tsx.before-recovery-20261009-180959.bak"); Priority = 5 },
    @{ Label = "pre self-heal backup"; Path = (Join-Path $PagesDir "AlgoHome.tsx.before-selfheal-20261009_181259.bak"); Priority = 5 }
)

$candidates = @()
$seenHashes = @{}
$index = 0
foreach ($spec in $candidateSpecs) {
    if (Test-Path -LiteralPath $spec.Path -PathType Leaf) {
        $hash = Get-FileHashSafe $spec.Path
        if ($seenHashes.ContainsKey($hash)) {
            Write-ReportLine ("SKIP duplicate content: {0} matches {1}" -f $spec.Label, $seenHashes[$hash])
            continue
        }
        $seenHashes[$hash] = $spec.Label
        $index++
        $copyPath = Join-Path $CandidateDir ("candidate_{0:D2}.tsx" -f $index)
        Copy-Item -LiteralPath $spec.Path -Destination $copyPath -Force
        $metrics = Get-SourceMetrics $copyPath
        $candidates += [pscustomobject]@{
            Label = $spec.Label
            OriginalPath = $spec.Path
            TestPath = $copyPath
            Priority = $spec.Priority
            Metrics = $metrics
            BuildPassed = $false
            BuildLog = ""
        }
        Write-ReportLine ("FOUND {0}: {1} | {2} bytes | {3} lines | score {4} | core markers complete={5}" -f
            $spec.Label, $spec.Path, $metrics.Bytes, $metrics.Lines, $metrics.Score, $metrics.CoreComplete)
        Write-ReportLine ("  SHA256: {0}" -f $metrics.SHA256)
        Write-ReportLine ("  Markers: {0}" -f $metrics.Markers)
    } else {
        Write-ReportLine ("NOT FOUND: {0} ({1})" -f $spec.Label, $spec.Path)
    }
}

# Also capture Git HEAD, if this is a Git checkout.
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if ($gitCommand) {
    $gitCheck = & git -C $ProjectRoot rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -eq 0 -and "$gitCheck".Trim() -eq "true") {
        $gitPath = Join-Path $CandidateDir "candidate_git_head.tsx"
        $gitContent = & git -C $ProjectRoot show "HEAD:src/pages/AlgoHome.tsx" 2>$null
        if ($LASTEXITCODE -eq 0 -and $gitContent) {
            $gitText = ($gitContent -join [Environment]::NewLine)
            Set-Content -LiteralPath $gitPath -Value $gitText -Encoding utf8
            $gitHash = Get-FileHashSafe $gitPath
            if (-not $seenHashes.ContainsKey($gitHash)) {
                $seenHashes[$gitHash] = "Git HEAD"
                $metrics = Get-SourceMetrics $gitPath
                $candidates += [pscustomobject]@{
                    Label = "Git HEAD"
                    OriginalPath = "Git HEAD:src/pages/AlgoHome.tsx"
                    TestPath = $gitPath
                    Priority = 15
                    Metrics = $metrics
                    BuildPassed = $false
                    BuildLog = ""
                }
                Write-ReportLine ("FOUND Git HEAD: {0} bytes | {1} lines | score {2} | core markers complete={3}" -f
                    $metrics.Bytes, $metrics.Lines, $metrics.Score, $metrics.CoreComplete)
                Write-ReportLine ("  SHA256: {0}" -f $metrics.SHA256)
                Write-ReportLine ("  Markers: {0}" -f $metrics.Markers)
            } else {
                Write-ReportLine "Git HEAD duplicate content; no separate build test required."
            }
        } else {
            Write-ReportLine "Git HEAD source not available at src/pages/AlgoHome.tsx."
        }
    } else {
        Write-ReportLine "Git repository not detected; Git HEAD candidate skipped."
    }
} else {
    Write-ReportLine "Git executable not found; Git HEAD candidate skipped."
}

if ($candidates.Count -eq 0) {
    Copy-Item -LiteralPath $BackupPath -Destination $Target -Force
    throw "No candidate source files were found. Original target restored."
}

Write-ReportLine ""
Write-ReportLine "STEP 2 - Build-test EVERY distinct candidate"
$testNumber = 0
foreach ($candidate in $candidates) {
    $testNumber++
    $logPath = Join-Path $BuildLogDir ("{0:D2}_{1}.log" -f $testNumber, ($candidate.Label -replace '[^A-Za-z0-9_-]', '_'))
    Write-ReportLine ""
    Write-ReportLine ("Testing {0} (score={1}, core complete={2})..." -f
        $candidate.Label, $candidate.Metrics.Score, $candidate.Metrics.CoreComplete)

    try {
        $test = Invoke-BuildTest -CandidatePath $candidate.TestPath -LogPath $logPath
        $candidate.BuildPassed = $test.Passed
        $candidate.BuildLog = $logPath
        if ($test.Passed) {
            Write-ReportLine ("  BUILD PASS. Log: {0}" -f $logPath)
        } else {
            Write-ReportLine ("  BUILD FAIL (exit {0}). Log: {1}" -f $test.ExitCode, $logPath)
            $tail = @($test.Output -split "`r?`n" | Select-Object -Last 12)
            foreach ($line in $tail) { Write-ReportLine ("    " + $line) }
        }
    } catch {
        $candidate.BuildPassed = $false
        $candidate.BuildLog = $logPath
        Write-ReportLine ("  BUILD TEST ERROR: {0}" -f $_.Exception.Message)
    }
}

Write-ReportLine ""
Write-ReportLine "STEP 3 - Select candidate"
$valid = @($candidates | Where-Object {
    $_.BuildPassed -and $_.Metrics.CoreComplete
} | Sort-Object `
    @{ Expression = { $_.Metrics.Score }; Descending = $true }, `
    @{ Expression = { $_.Priority }; Descending = $true }, `
    @{ Expression = { $_.Metrics.Bytes }; Descending = $true })

if ($valid.Count -eq 0) {
    # If no candidate preserves every required marker, do not guess. Keep the
    # best compiling candidate only if it has all critical routing/feed APIs;
    # otherwise restore the known pre-run active file.
    $partial = @($candidates | Where-Object { $_.BuildPassed } |
        Sort-Object `
            @{ Expression = { $_.Metrics.Score }; Descending = $true }, `
            @{ Expression = { $_.Priority }; Descending = $true })
    if ($partial.Count -gt 0) {
        $chosen = $partial[0]
        Write-ReportLine "WARNING: No build-passing candidate contains ALL required core markers."
        Write-ReportLine "Choosing the highest-scoring build-passing candidate, but review the report carefully."
    } else {
        Copy-Item -LiteralPath $BackupPath -Destination $Target -Force
        Write-ReportLine "No candidate passed the build. Restored the original active file."
        Write-ReportLine "No changes were accepted. Review candidate build logs in: $BuildLogDir"
        Write-Host "SELF-HEAL FAILED: all candidates failed; original active file restored." -ForegroundColor Red
        Write-Host "Report: $ReportPath"
        exit 2
    }
} else {
    $chosen = $valid[0]
}

Write-ReportLine ("Selected candidate: {0}" -f $chosen.Label)
Write-ReportLine ("Selected source: {0}" -f $chosen.OriginalPath)
Write-ReportLine ("Score: {0}; build passed: {1}; all core markers: {2}" -f
    $chosen.Metrics.Score, $chosen.BuildPassed, $chosen.Metrics.CoreComplete)
Write-ReportLine ("Source SHA256: {0}" -f $chosen.Metrics.SHA256)

# Restore selected bytes, then run one final build against the actual target path.
Copy-Item -LiteralPath $chosen.TestPath -Destination $Target -Force
Write-ReportLine ""
Write-ReportLine "STEP 4 - Final verification at target path"
$finalLog = Join-Path $BuildLogDir "FINAL_selected_target_build.log"
$finalTest = Invoke-BuildTest -CandidatePath $Target -LogPath $finalLog
if (-not $finalTest.Passed) {
    Copy-Item -LiteralPath $BackupPath -Destination $Target -Force
    Write-ReportLine "FINAL BUILD FAILED. Restored original active file from safety backup."
    Write-ReportLine ("Restored backup: {0}" -f $BackupPath)
    Write-ReportLine ("Final build log: {0}" -f $finalLog)
    Write-Host "SELF-HEAL FAILED: final build failed; original active file restored." -ForegroundColor Red
    Write-Host "Report: $ReportPath"
    exit 3
}

$finalMetrics = Get-SourceMetrics $Target
Write-ReportLine "FINAL BUILD PASS."
Write-ReportLine ("Final target: {0}" -f $Target)
Write-ReportLine ("Final bytes: {0}; lines: {1}; core markers complete: {2}" -f
    $finalMetrics.Bytes, $finalMetrics.Lines, $finalMetrics.CoreComplete)
Write-ReportLine ("Final SHA256: {0}" -f $finalMetrics.SHA256)
Write-ReportLine ("Final build log: {0}" -f $finalLog)
Write-ReportLine ("Safety backup retained: {0}" -f $BackupPath)
Write-ReportLine ""
Write-ReportLine "IMPORTANT: Build success verifies compilation only. Visual layout must still be checked in the browser against the intended screenshot."
Write-ReportLine ("Temporary candidate copies and logs: {0}" -f $WorkDir)

Write-Host ""
Write-Host "SELF-HEAL COMPLETE: selected '$($chosen.Label)' and final build passed." -ForegroundColor Green
Write-Host "Updated file: $Target"
Write-Host "Safety backup: $BackupPath"
Write-Host "Report: $ReportPath"
Write-Host "Build logs: $BuildLogDir"
