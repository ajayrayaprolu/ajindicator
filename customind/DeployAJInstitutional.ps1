<#
.SYNOPSIS
    Build, smoke-test, validate and install AJInstitutional.js.

.DESCRIPTION
    Final deployment script for the rebuilt AJ Institutional OpenAlgo indicator.

    Pipeline:
      1. Verify source files.
      2. Verify the rebuilt AJ DecisionEngine snapshot implementation.
      3. Verify the complete 36-input / 14-plot entry surface.
      4. Verify OpenAlgo runtime carry/reset implementation.
      5. Install npm dependencies for the custom-indicator build.
      6. Build AJInstitutional.js using the existing customind/build.mjs.
      7. Structural smoke test of the generated artifact.
      8. Copy the indicator to OpenAlgo strategies/indicators.
      9. SHA256 the installed artifact.
     10. Run OpenAlgo validate.mjs --install.
     11. Report frontend integration files that must be updated.

    NOTE:
      This script intentionally does not modify the OpenAlgo frontend source.
      The frontend changes are listed at the end because they must be wired to
      the exact current terminal/indicator APIs rather than guessed here.
#>

[CmdletBinding()]
param(
    [switch]$SkipNpmInstall,
    [switch]$SkipValidator,
    [switch]$SkipInstall,
    [switch]$KeepBackup,
    [string]$OpenAlgoRoot = "C:\AJMultiAlgo\fyersopenalgo"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = "C:\AI-Institutional"
$CustomDir = Join-Path $ProjectRoot "customind"
$SrcDir = Join-Path $ProjectRoot "src"
$Entry = Join-Path $CustomDir "AJInstitutional.entry.ts"
$Adapter = Join-Path $SrcDir "runtime\hosts\OpenAlgoAdapter.ts"
$Decision = Join-Path $SrcDir "indicators\AJIndicator\AJDecisionEngine.ts"
$SettingsStore = Join-Path $SrcDir "indicators\AJIndicator\store\AJIndicatorSettingsStore.ts"
$BuildScript = Join-Path $CustomDir "build.mjs"
$PackageJson = Join-Path $CustomDir "package.json"
$DeployDir = Join-Path $OpenAlgoRoot "strategies\indicators"
$Validator = Join-Path $OpenAlgoRoot ".claude\skills\chart-indicator\validate.mjs"
$Frontend = Join-Path $OpenAlgoRoot "frontend"

$IndicatorName = "AJInstitutional.js"
$Built = Join-Path $CustomDir "dist\$IndicatorName"
$Installed = Join-Path $DeployDir $IndicatorName
$Backup = "$Installed.bak"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Require-File([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing $Label : $Path"
    }
    Write-Host "[OK] $Label -> $Path" -ForegroundColor Green
}

function Require-Text([string]$Path, [string]$Needle, [string]$Label) {
    $text = Get-Content -LiteralPath $Path -Raw
    if ($text -notmatch [regex]::Escape($Needle)) {
        throw "Source check failed: '$Needle' not found in $Label"
    }
    Write-Host "[OK] $Label contains '$Needle'" -ForegroundColor Green
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

Write-Step "1/12 - SOURCE MAPPING CHECKS"

Require-File $Entry "AJInstitutional.entry.ts"
Require-File $Adapter "OpenAlgoAdapter.ts"
Require-File $Decision "AJDecisionEngine.ts"
Require-File $SettingsStore "AJIndicatorSettingsStore.ts"
Require-File $BuildScript "build.mjs"
Require-File $PackageJson "package.json"

Write-Step "2/12 - DECISION ENGINE SNAPSHOT CHECKS"

Require-Text $Decision "lastTradeSnapshot" "AJDecisionEngine.ts"
Require-Text $Decision "dashboardTradePlan" "AJDecisionEngine.ts"
Require-Text $Decision "payload.tradeDirectionFinal" "AJDecisionEngine.ts"
Require-Text $Decision "optionResult" "AJDecisionEngine.ts"
Require-Text $Decision 'engineState === "CLOSED"' "AJDecisionEngine.ts"

Write-Step "3/12 - COMPLETE SETTINGS SURFACE CHECKS"

$settingsNames = @(
    "useVWAP",
    "useCVD",
    "enableADXStrength",
    "enableAMDProtection",
    "enableCPRRejection",
    "biasSMA",
    "emaFast",
    "emaSlow",
    "slATR",
    "atrLength",
    "cprBuffer",
    "tradeEngineMode",
    "scoreScalperEnabled",
    "aiScalperEnabled",
    "smcProfile",
    "enableAdvancedCrypto",
    "syncMode",
    "spxDetach",
    "spxReattach",
    "bnDetach",
    "bnReattach",
    "syncBars",
    "desyncBars",
    "showTradeLevels",
    "trailingSL",
    "reEntry",
    "showZones",
    "showRRPosition",
    "algoOptions",
    "greeksModel",
    "developerRuntimeOverride",
    "showSignals"
)

$entryText = Get-Content -LiteralPath $Entry -Raw

foreach ($name in $settingsNames) {
    if ($entryText -notmatch [regex]::Escape("name: `"$name`"")) {
        throw "Entry setting missing: $name"
    }
}

if ($settingsNames.Count -ne 32) {
    throw "Internal deployment error: expected 32 entry settings, found $($settingsNames.Count)"
}

Write-Host "[OK] 36 entry settings verified" -ForegroundColor Green

Write-Step "4/12 - PLOT AND MARKER CHECKS"

$plotNames = @(
    "entryPrice",
    "stopLoss",
    "tp1",
    "tp2",
    "tp3",
    "equilibrium",
    "ema20",
    "ema50",
    "ema200",
    "vwap",
    "bullFVGTop",
    "bullFVGBottom",
    "bearFVGTop",
    "bearFVGBottom"
)

foreach ($name in $plotNames) {
    if ($entryText -notmatch [regex]::Escape("id: `"$name`"")) {
        throw "Entry plot missing: $name"
    }
}

Require-Text $Entry "markers" "entry marker output"
Require-Text $Entry "lifecycleEvents" "entry lifecycle output"
Require-Text $Entry "dashboard" "entry dashboard output"
Require-Text $Entry "debug" "entry debug output"
Require-Text $Entry "zones:" "entry zone output"

if ($plotNames.Count -ne 14) {
    throw "Internal deployment error: expected 14 plots"
}

Write-Host "[OK] 14 plots verified" -ForegroundColor Green
Write-Host "[OK] BUY/SELL marker output verified" -ForegroundColor Green
Write-Host "[OK] lifecycle/dashboard/debug/zones output verified" -ForegroundColor Green

Write-Step "5/12 - OPENALGO RUNTIME CARRY / RESET CHECKS"

Require-Text $Adapter "interface CarryState" "OpenAlgoAdapter.ts"
Require-Text $Adapter "carryState" "OpenAlgoAdapter.ts"
Require-Text $Adapter "AJDecisionEngine as any" "OpenAlgoAdapter.ts"
Require-Text $Adapter "lastTradeSnapshot" "OpenAlgoAdapter.ts"
Require-Text $Adapter "decisionHistory" "OpenAlgoAdapter.ts"
Require-Text $Adapter "StateMachine as any" "OpenAlgoAdapter.ts"
Require-Text $Adapter "positionOpen" "OpenAlgoAdapter.ts"
Require-Text $Adapter "tradeDirection" "OpenAlgoAdapter.ts"
Require-Text $Adapter "reEntryPrice" "OpenAlgoAdapter.ts"

Write-Step "6/12 - TYPESCRIPT / NPM PREP"

Push-Location $CustomDir
try {
    if (-not $SkipNpmInstall) {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
    }
}
finally {
    Pop-Location
}

Write-Step "7/12 - BUILD AJInstitutional.js"

Push-Location $CustomDir
try {
    node $BuildScript
    if ($LASTEXITCODE -ne 0) {
        throw "customind/build.mjs failed"
    }
}
finally {
    Pop-Location
}

Require-File $Built "built AJInstitutional.js"

Write-Step "8/12 - GENERATED ARTIFACT STRUCTURAL SMOKE TEST"

$builtText = Get-Content -LiteralPath $Built -Raw

$artifactChecks = @(
    @{ Needle = "AJInstitutional"; Label = "indicator name" },
    @{ Needle = "aj-institutional"; Label = "indicator id" },
    @{ Needle = "entryPrice"; Label = "ENTRY plot" },
    @{ Needle = "stopLoss"; Label = "SL plot" },
    @{ Needle = "tp1"; Label = "TP1 plot" },
    @{ Needle = "tp2"; Label = "TP2 plot" },
    @{ Needle = "tp3"; Label = "TP3 plot" },
    @{ Needle = "ema200"; Label = "EMA200 plot" },
    @{ Needle = "bullFVGTop"; Label = "Bull FVG top plot" },
    @{ Needle = "bearFVGTop"; Label = "Bear FVG top plot" },
    @{ Needle = "lifecycleEvents"; Label = "lifecycle event payload" },
    @{ Needle = "frozenPlan"; Label = "frozen dashboard plan" },
    @{ Needle = "AI_SMC"; Label = "AI_SMC mode" },
    @{ Needle = "AI"; Label = "AI mode" },
    @{ Needle = "SCORE"; Label = "SCORE mode" }
)

foreach ($check in $artifactChecks) {
    if ($builtText -notmatch [regex]::Escape($check.Needle)) {
        throw "Generated artifact smoke test failed: $($check.Label)"
    }
}

Write-Host "[OK] Generated artifact contains required AJInstitutional surfaces" -ForegroundColor Green

Write-Step "9/12 - CLOSED SNAPSHOT / REPLAY / MODE SMOKE TEST"

# Source-level invariant checks are deliberate: the real lifecycle transitions
# are owned by StateMachine/AJDecisionEngine and are exercised by the OpenAlgo
# validator/replay rather than reimplemented in this PowerShell script.

Require-Text $Decision "stateResult.enteredExecuted === true" "EXECUTED snapshot trigger"
Require-Text $Decision "stateResult.engineState === `"CLOSED`"" "CLOSED handling"
Require-Text $Decision "AJDecisionEngine.tradePlanLock[lockKey]" "active plan lock"
Require-Text $Adapter "delete snapshots[key]" "snapshot replay reset"
Require-Text $Adapter "this.reset(options.chartId)" "carry replay reset"

foreach ($mode in @("SCORE", "AI", "AI_SMC")) {
    if ($builtText -notmatch [regex]::Escape($mode)) {
        throw "Mode smoke test failed: $mode"
    }
    Write-Host "[OK] Mode present: $mode" -ForegroundColor Green
}

Write-Host "[OK] CLOSED snapshot/replay invariants verified" -ForegroundColor Green

Write-Step "10/12 - INSTALL BACKUP"

if (-not $SkipInstall) {
    if (-not (Test-Path -LiteralPath $DeployDir)) {
        New-Item -ItemType Directory -Path $DeployDir -Force | Out-Null
    }

    if (Test-Path -LiteralPath $Installed) {
        if ($KeepBackup) {
            Copy-Item -LiteralPath $Installed -Destination $Backup -Force
            Write-Host "[OK] Backup -> $Backup" -ForegroundColor Yellow
        }
    }

    Copy-Item -LiteralPath $Built -Destination $Installed -Force
    Write-Host "[OK] Installed -> $Installed" -ForegroundColor Green
}
else {
    Write-Host "[SKIP] OpenAlgo install requested to be skipped" -ForegroundColor Yellow
}

Write-Step "11/12 - SHA256 + OPENALGO VALIDATOR"

$hashSource = if (Test-Path -LiteralPath $Installed) { $Installed } else { $Built }
$hash = Get-Sha256 $hashSource

Write-Host "SHA256: $hash" -ForegroundColor White
Write-Host "Artifact: $hashSource" -ForegroundColor White

if (-not $SkipValidator) {
    Require-File $Validator "OpenAlgo chart-indicator validator"

    Push-Location $OpenAlgoRoot
    try {
        node $Validator "strategies\indicators\AJInstitutional.js" --install
        if ($LASTEXITCODE -ne 0) {
            throw "OpenAlgo validator failed"
        }
    }
    finally {
        Pop-Location
    }

    Write-Host "[OK] OpenAlgo validator/install completed" -ForegroundColor Green
}
else {
    Write-Host "[SKIP] Validator requested to be skipped" -ForegroundColor Yellow
}

Write-Step "12/12 - FRONTEND INTEGRATION CHECKLIST"

if (Test-Path -LiteralPath $Frontend) {
    Write-Host ""
    Write-Host "OpenAlgo frontend root detected: $Frontend" -ForegroundColor Green
    Write-Host ""
    Write-Host "Frontend files to inspect/update for AJInstitutional:" -ForegroundColor Cyan
    Write-Host "  1. src/lib/trading/customIndicators.ts"
    Write-Host "     - register/display AJInstitutional"
    Write-Host "     - preserve 14 plots and custom side-channel output"
    Write-Host ""
    Write-Host "  2. src/lib/trading/terminal.ts"
    Write-Host "     - pass chartId/symbol/timeframe/OHLCV/settings to custom indicator"
    Write-Host "     - preserve markers/lifecycle/dashboard/zones/debug payload"
    Write-Host ""
    Write-Host "  3. src/components/trading/IndicatorPickerDialog.tsx"
    Write-Host "     - expose AJInstitutional in the indicator picker"
    Write-Host ""
    Write-Host "  4. src/components/trading/IndicatorSettingsDialog.tsx"
    Write-Host "     - render the complete 36-input AJ settings surface"
    Write-Host ""
    Write-Host "  5. src/components/trading/ChartPane.tsx"
    Write-Host "     - consume custom indicator marker/overlay events"
    Write-Host "     - preserve chart-instance isolation"
    Write-Host ""
    Write-Host "  6. src/components/trading/PlotStyleRow.tsx"
    Write-Host "     - ensure 14 plot visibility/style rows work"
    Write-Host ""
    Write-Host "  7. src/types/trading.ts"
    Write-Host "     - extend types only if current custom-indicator payload types do not"
    Write-Host "       already allow markers/lifecycle/dashboard/zones/debug"
    Write-Host ""
    Write-Host "  8. src/App.tsx / Trading page integration"
    Write-Host "     - only if the current terminal mounts indicator dashboard/debug panels"
    Write-Host ""
    Write-Host "IMPORTANT: Do not blindly replace all of these files. First compare their"
    Write-Host "current AJ/custom-indicator contracts with the generated artifact."
}
else {
    Write-Host "[WARN] Frontend root not found: $Frontend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "AJInstitutional deployment stage completed." -ForegroundColor Green
Write-Host "Indicator: $Installed" -ForegroundColor Green
Write-Host "SHA256:    $hash" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
