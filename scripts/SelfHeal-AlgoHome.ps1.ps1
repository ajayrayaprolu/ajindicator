
$ErrorActionPreference = "Stop"

# ============================================================
# AJ Institutional - AlgoHome.tsx Recovery & Build Verification
# Run from: C:\AI-Institutional
# path :C:\AI-Institutional\scripts\SelfHeal-AlgoHome.ps1
# ============================================================

$root = (Get-Location).Path
$relativePath = "src/pages/AlgoHome.tsx"
$target = Join-Path $root $relativePath
$errorLog = Join-Path $root "src/pages/algohomeerrors.txt"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not (Test-Path (Join-Path $root "package.json"))) {
    throw "package.json not found. Run this script from C:\AI-Institutional."
}
if (-not (Test-Path $target)) {
    throw "AlgoHome.tsx not found: $target"
}
if (-not (Test-Path (Join-Path $root "node_modules"))) {
    throw "node_modules not found. Run npm install first."
}

# Preserve the current file and the existing diagnostics.
$currentBackup = "$target.before-selfheal-$stamp.bak"
Copy-Item $target $currentBackup -Force

if (Test-Path $errorLog) {
    Copy-Item $errorLog "$errorLog.before-selfheal-$stamp.bak" -Force
    $oldErrors = Get-Content $errorLog -Raw
} else {
    $oldErrors = "(No previous error log existed.)"
}

# Replace the existing error log with this run's report.
@"
AJ INSTITUTIONAL - ALGOHOME SELF-HEAL REPORT
Started: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Project: $root
Target:  $relativePath

Original current file backup:
$currentBackup

Previous error log backup:
$(if (Test-Path "$errorLog.before-selfheal-$stamp.bak") { "$errorLog.before-selfheal-$stamp.bak" } else { "Not applicable" })

The previous diagnostic log is preserved in the backup above.
This run tests real source candidates and validates each with npm run build.
"@ | Set-Content -Path $errorLog -Encoding UTF8

Add-Content $errorLog "`r`n===== PREVIOUS ERROR LOG (PRESERVED CONTENT) =====`r`n"
Add-Content $errorLog $oldErrors
Add-Content $errorLog "`r`n===== AUTOMATED RECOVERY ATTEMPTS =====`r`n"

# Gather candidate source versions. Do not edit unrelated project files.
$candidates = @()

try {
    $gitRoot = (& git rev-parse --show-toplevel 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        $gitRoot = $gitRoot.Trim()
        if ($gitRoot -eq $root -or $gitRoot -eq (Resolve-Path $root).Path) {
            $gitText = (& git show "HEAD:$relativePath" 2>&1 | Out-String)
            $gitExit = $LASTEXITCODE
            if ($gitExit -eq 0 -and $gitText.Trim().Length -gt 0) {
                $candidates += [PSCustomObject]@{
                    Name = "Git HEAD (tracked baseline)"
                    Text = $gitText
                }
            } else {
                Add-Content $errorLog "Git HEAD candidate unavailable: $gitText"
            }
        }
    }
} catch {
    Add-Content $errorLog "Git candidate lookup issue: $($_.Exception.Message)"
}

$datedCandidates = @(
    "src/pages/AlgoHome.tsx.org.05102026",
    "src/pages/AlgoHome.tsx.2nd09102026"
)

foreach ($relativeCandidate in $datedCandidates) {
    $candidatePath = Join-Path $root $relativeCandidate
    if (Test-Path $candidatePath) {
        $candidateText = Get-Content $candidatePath -Raw
        if ($candidateText.Trim().Length -gt 0) {
            $candidates += [PSCustomObject]@{
                Name = $relativeCandidate
                Text = $candidateText
            }
        }
    }
}

if ($candidates.Count -eq 0) {
    Add-Content $errorLog "FATAL: No usable Git or dated source candidates were found."
    throw "No recovery candidates available. Current file remains backed up at $currentBackup"
}

$success = $false
$attempt = 0

foreach ($candidate in $candidates) {
    $attempt++
    $attemptHeader = @"

------------------------------------------------------------
ATTEMPT $attempt : $($candidate.Name)
Started: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
------------------------------------------------------------
"@
    Add-Content $errorLog $attemptHeader
    Write-Host ""
    Write-Host "[$attempt/$($candidates.Count)] Testing: $($candidate.Name)" -ForegroundColor Cyan

    # Install this candidate temporarily, then run the real project build.
    Set-Content -Path $target -Value $candidate.Text -Encoding UTF8

    Push-Location $root
    try {
        $buildOutput = @(& npm.cmd run build 2>&1 | ForEach-Object { "$_" })
        $buildExit = $LASTEXITCODE
    } catch {
        $buildOutput = @("Build invocation failed: $($_.Exception.Message)")
        $buildExit = 1
    } finally {
        Pop-Location
    }

    if ($buildOutput.Count -gt 0) {
        Add-Content $errorLog ($buildOutput -join "`r`n")
    }
    Add-Content $errorLog "`r`nBuild exit code: $buildExit"

    if ($buildExit -eq 0) {
        $success = $true
        Add-Content $errorLog @"

RESULT: SUCCESS
Selected source: $($candidate.Name)
Build verified: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
The successful candidate has been retained at $target.
"@
        Write-Host ""
        Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "Selected source: $($candidate.Name)" -ForegroundColor Green
        break
    }

    Add-Content $errorLog "RESULT: BUILD FAILED for this candidate."
    Write-Host "Build failed for this candidate. Details recorded in algohomeerrors.txt." -ForegroundColor Yellow
}

if (-not $success) {
    # Never leave an unverified candidate as the user's working file.
    Copy-Item $currentBackup $target -Force
    Add-Content $errorLog @"

============================================================
FINAL RESULT: NO CANDIDATE BUILT SUCCESSFULLY
============================================================
The original current AlgoHome.tsx has been restored.
Original backup: $currentBackup
Review the build output above in this log:
$errorLog

No successful build is claimed. Further source-level repair is required.
"@
    Write-Host ""
    Write-Host "No candidate passed npm run build." -ForegroundColor Red
    Write-Host "Your original current file has been restored." -ForegroundColor Yellow
    Write-Host "Review: $errorLog" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Recovery completed and build verified." -ForegroundColor Green
Write-Host "Updated file: $target"
Write-Host "Build report: $errorLog"
Write-Host "Original source backup: $currentBackup"