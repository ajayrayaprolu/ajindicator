<#
.SYNOPSIS
    Deterministic AJInstitutional -> OpenAlgo indicator migration.

.DESCRIPTION
    This REPLACES the previous "reorganize into core/contracts/engines while
    porting" orchestrator. That approach renamed/merged folders as it copied,
    which meant every relative import had to be individually re-mapped to a
    new location -- one wrong mapping and the build broke in a new way each
    run, and repeated self-heal passes left debris behind (duplicate-case
    folders, phantom directories) that poisoned later runs.

    This script does the opposite, on purpose:
      1. DELETE the existing destination indicator folder completely.
      2. COPY the original source tree into the destination VERBATIM --
         nothing is renamed, merged, or reorganized. Directory structure
         relative to the indicator root is identical to the original.
      3. REWRITE every import in every copied file to the absolute alias
         form (@/indicators/<IndicatorName>/...). Because nothing moved
         relative to anything else, this rewrite is 100% mechanical: resolve
         each relative specifier against the (unchanged) folder structure,
         then express that same target as an absolute alias path. There is
         no folder-rename table to get wrong.
      4. Sweep the REST of the OpenAlgo frontend (outside the copied folder)
         for old alias references to the previous indicator name and update
         those too.
      5. Run npm run build ONCE and report the raw result. No further blind
         auto-editing loop -- if it still fails, the remaining errors are
         printed as-is for a human decision, because guessing further is
         exactly what caused the previous breakage.

    What this script does NOT do (by design, not oversight):
      - It does not fabricate an OpenAlgo adapter layer, a Candle normalizer,
        or an indicator-registry entry. Those are integration code that
        depends on OpenAlgo's actual data shapes and cannot be safely
        invented by pattern-matching. This is called out explicitly at the
        end of the run as a manual checklist.

.PARAMETER SourceRoot
    Original AJ indicator source tree to migrate FROM.
    If omitted or invalid, you will be prompted.

.PARAMETER FrontendRoot
    Root of the target OpenAlgo frontend app (the folder containing this
    app's package.json and src\ folder) to migrate TO.
    If omitted or invalid, you will be prompted. This makes the script
    reusable against any OpenAlgo instance, not just one hardcoded path.

.PARAMETER IndicatorName
    Folder / alias name for the migrated indicator under src\indicators\.
    Default: AJInstitutional

.PARAMETER Execute
    Actually perform the delete/copy/rewrite/build. Without this switch the
    script only prints the plan (dry run) and makes no changes.

.PARAMETER Force
    Skip the interactive y/n confirmation before the destructive delete step.

.PARAMETER NoBackup
    Skip backing up the existing destination folder before deleting it.
    By default, if the destination already exists, it is copied to a
    timestamped sibling folder first.

.PARAMETER SkipBuild
    Do everything except run npm run build at the end.

.PARAMETER ExcludeDirs
    Optional list of top-level source subfolder names to exclude from the
    copy (e.g. -ExcludeDirs auth,brokers,pages if you don't want the
    original standalone app's own auth/page scaffolding brought over).
    Default: none -- a full verbatim copy, exactly as requested.

.EXAMPLE
    .\DeployAJInstitutionaltoOpenAlgoIndicator.ps1 -Execute

.EXAMPLE
    .\DeployAJInstitutionaltoOpenAlgoIndicator.ps1 `
        -SourceRoot "C:\AI-Institutional\src" `
        -FrontendRoot "C:\AJMultiAlgo\fyersopenalgo\frontend" `
        -IndicatorName "AJInstitutional" `
        -Execute -Force
#>

[CmdletBinding()]
param(
    [string]$SourceRoot,
    [string]$FrontendRoot,
    [string]$IndicatorName = "AJInstitutional",
    [switch]$Execute,
    [switch]$Force,
    [switch]$NoBackup,
    [switch]$SkipBuild,
    [string[]]$ExcludeDirs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "HH:mm:ss"
    $tag = "[$ts] [$Level]"
    switch ($Level) {
        "ERROR" { Write-Host "$tag $Message" -ForegroundColor Red }
        "WARN"  { Write-Host "$tag $Message" -ForegroundColor Yellow }
        "STAGE" { Write-Host "$tag $Message" -ForegroundColor Cyan }
        default { Write-Host "$tag $Message" }
    }
}

# ============================================================
# 1. RESOLVE / VALIDATE SOURCE AND DESTINATION
# ============================================================

function Get-ValidatedDirectory {
    param(
        [string]$InitialValue,
        [string]$PromptText,
        [scriptblock]$Validator,
        [string]$ValidationFailMessage
    )

    $value = $InitialValue

    while ([string]::IsNullOrWhiteSpace($value) -or -not (& $Validator $value)) {

        if (-not [string]::IsNullOrWhiteSpace($value)) {
            Write-Log $ValidationFailMessage "WARN"
        }

        $value = Read-Host $PromptText
    }

    return (Resolve-Path -LiteralPath $value).ProviderPath
}

$SourceRoot = Get-ValidatedDirectory `
    -InitialValue $SourceRoot `
    -PromptText "Path to the original AJ indicator source (e.g. C:\AI-Institutional\src)" `
    -Validator { param($p) Test-Path -LiteralPath $p -PathType Container } `
    -ValidationFailMessage "That path does not exist or is not a folder."

$FrontendRoot = Get-ValidatedDirectory `
    -InitialValue $FrontendRoot `
    -PromptText "Path to the target OpenAlgo frontend root (folder containing package.json and src\)" `
    -Validator {
        param($p)
        (Test-Path -LiteralPath $p -PathType Container) -and
        (Test-Path -LiteralPath (Join-Path $p "package.json") -PathType Leaf) -and
        (Test-Path -LiteralPath (Join-Path $p "src") -PathType Container)
    } `
    -ValidationFailMessage "That path must exist and contain both package.json and a src\ folder."

$FrontendSrc = Join-Path $FrontendRoot "src"
$DestRoot    = Join-Path $FrontendSrc ("indicators\" + $IndicatorName)
$AliasRoot   = "@/indicators/$IndicatorName"

Write-Log "============================================================" "STAGE"
Write-Log "AJ INDICATOR DETERMINISTIC MIGRATION" "STAGE"
Write-Log "============================================================" "STAGE"
Write-Log "Source          : $SourceRoot"
Write-Log "Frontend root   : $FrontendRoot"
Write-Log "Destination     : $DestRoot"
Write-Log "Alias root      : $AliasRoot"
Write-Log "Mode            : $(if ($Execute) { 'EXECUTE' } else { 'DRY RUN (pass -Execute to apply)' })"

if (-not $Execute) {
    Write-Log "Dry run only -- no files were changed. Re-run with -Execute to apply this plan." "WARN"
    exit 0
}

# ============================================================
# 2. CONFIRM DESTRUCTIVE STEP
# ============================================================

if (-not $Force -and (Test-Path -LiteralPath $DestRoot -PathType Container)) {
    Write-Log "This will DELETE everything under: $DestRoot" "WARN"
    $answer = Read-Host "Type YES to continue"
    if ($answer -ne "YES") {
        Write-Log "Aborted by user." "ERROR"
        exit 1
    }
}

# ============================================================
# 3. BACKUP + DELETE DESTINATION
# ============================================================

# Backups MUST live outside src\ -- tsconfig's "src" include pattern will
# otherwise pick up the backup copy and compile it as a second, half-stale
# tree alongside the real one (this is exactly what happened previously:
# hundreds of phantom errors from a backup folder that isn't even part of
# the app). Also sweep up and relocate any stray backup left inside src\
# by a previous run of this script, since it will keep poisoning builds
# until it's moved out.
$BackupRoot = Join-Path $FrontendRoot "_ajmig-backups"

$strayBackups = @(
    Get-ChildItem -LiteralPath $FrontendSrc -Directory -Filter "_backup_*" -ErrorAction SilentlyContinue
)
if ($strayBackups.Count -gt 0) {
    if (-not (Test-Path -LiteralPath $BackupRoot -PathType Container)) {
        New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
    }
    foreach ($stray in $strayBackups) {
        $target = Join-Path $BackupRoot $stray.Name
        Write-Log "Relocating stray in-src backup out of the build tree: $($stray.FullName) -> $target" "WARN"
        Move-Item -LiteralPath $stray.FullName -Destination $target -Force
    }
}

# ============================================================
# 2.5. DEPLOY GLUE FILES FROM A DURABLE STORE
# ============================================================
#
# register.ts (openalgo-charts registerIndicator glue) is hand-authored
# against the final $AliasRoot -- it is not part of $SourceRoot and must
# never be touched by Stage 6's rewrite (that rule remaps any '@/...' import
# it finds, assuming it's the OLD source's own self-alias; applied to an
# already-correct $AliasRoot path it just re-prefixes it, and re-prefixes it
# again every subsequent run since Stage 6 previously ran on this same file).
#
# Fix: keep the canonical content in $GlueRoot, OUTSIDE $DestRoot, so it
# survives Stage 4's delete regardless of whether $DestRoot existed before
# this run. Re-seed it with known-good content every run (self-healing even
# if it was corrupted by an older version of this script), then exclude
# $PreserveRelativePaths from Stage 6's file list entirely -- never captured
# from a possibly-already-corrupted destination copy again.

$PreserveRelativePaths = @("register.ts")
$GlueRoot = Join-Path $FrontendRoot "_ajmig-glue"
if (-not (Test-Path -LiteralPath $GlueRoot -PathType Container)) {
    New-Item -ItemType Directory -Path $GlueRoot -Force | Out-Null
}

$registerTsContent = @"
// src/indicators/AJInstitutional/register.ts
//
// Registers AJInstitutional with the real openalgo-charts runtime as an
// ordinary bundled TS module (not the gitignored /custom-indicators/ tier).
// Imported once from terminal.ts:loadIndicators(), alongside the built-in
// and custom tiers.

import { registerIndicator, type Bar, type IndicatorDescriptor } from 'openalgo-charts'

import { RuntimeEngine } from '$AliasRoot/runtime/RuntimeEngine'
import type { RuntimeContext } from '$AliasRoot/runtime/RuntimeContext'
import type { Candle } from '$AliasRoot/types/Candle'
import type { AJIndicatorResult } from '$AliasRoot/indicators/AJIndicator/AJTypes'

const engine = new RuntimeEngine()

// Bar and Candle are field-identical (time, open, high, low, close, volume?) -- no mapping needed.
function toCandle(bar: Bar): Candle {
  return { time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume }
}

// Fields RuntimeContext requires that the chart has no source for (live
// position, broker/order state, session/options info). All neutral/off
// defaults -- this indicator runs read-only on historical + live bars.
function buildRuntimeContext(candles: Candle[], i: number, chartId: string): RuntimeContext {
  const current = candles[i]
  const previous = candles[i - 1] ?? current
  return {
    chartId,
    symbol: '',
    timeframe: '',
    datasource: 'openalgo',

    candles: candles.slice(0, i + 1),
    current,
    previous,

    barIndex: i,
    timestamp: current.time,

    open: current.open,
    high: current.high,
    low: current.low,
    close: current.close,
    volume: current.volume ?? 0,

    tradeDirection: 0,
    entryPrice: 0,
    stopLoss: 0,
    slPrice: 0,
    takeProfit1: 0,
    takeProfit2: 0,
    takeProfit3: 0,
    tp1: 0,
    tp2: 0,
    tp3: 0,
    currentPrice: current.close,
    positionSize: 0,
    positionOpen: false,
    inPosition: false,

    atr: 0,
    riskATR: 0,
    slBuffer: 0,
    tp1RR: 0,
    tp2RR: 0,
    tp3RR: 0,

    isOptionsMode: false,
    isOptionChart: false,
    isMirrorOptionChart: false,
    underlying: '',
    strike: 0,
    strikeStep: 0,
    currentOptionType: '',
    greekExecOk: false,
    greekOptionMode: false,

    enableAITradeSafety: false,
    enableAISMCMode: false,
    tradeLifecycleLocked: false,
    useVWAP: true,
    useCVD: false,

    sessionName: '',
    sessionOpen: true,
    sessionHigh: 0,
    sessionLow: 0,
    dayHigh: 0,
    dayLow: 0,
    marketOpen: true,
    marketClose: false,

    exchange: '',
    broker: 'openalgo',
    accountId: '',
    currency: 'INR',
    tickSize: 0.05,
    lotSize: 1,
    pointValue: 1,
    pricePrecision: 2,
    quantityPrecision: 0,

    orderId: '',
    orderActive: false,
    orderFilled: false,
    orderCancelled: false,

    positionSide: 0,
    unrealizedPnL: 0,
    realizedPnL: 0,

    state: 'SCAN' as RuntimeContext['state'],
    engineState: 'SCAN' as RuntimeContext['engineState'],
  }
}

// PLOTS -- PLACEHOLDER. Need the real 14-plot list to fill this in for
// real. Wired for now: entryPrice, stopLoss, tp1.
const descriptor: IndicatorDescriptor = {
  id: 'aj-institutional',
  name: 'AJ Institutional',
  category: 'Custom',
  placement: 'onchart',
  inputs: [],
  plots: [
    { key: 'entryPrice', type: 'line', title: 'Entry' },
    { key: 'stopLoss', type: 'line', title: 'SL' },
    { key: 'tp1', type: 'line', title: 'TP1' },
  ],
  calc(bars) {
    const candles = bars.map(toCandle)
    const entryPrice: (number | null)[] = []
    const stopLoss: (number | null)[] = []
    const tp1: (number | null)[] = []

    for (let i = 0; i < candles.length; i++) {
      const runtime = buildRuntimeContext(candles, i, 'openalgo-chart')
      const result: AJIndicatorResult = engine.evaluateIndicator(runtime)
      entryPrice.push(result.entryPrice ?? null)
      stopLoss.push(result.stopLoss ?? null)
      tp1.push(result.tp1 ?? null)
    }

    return { entryPrice, stopLoss, tp1 }
  },
}

registerIndicator(descriptor)
"@

$registerTsGluePath = Join-Path $GlueRoot "register.ts"
[System.IO.File]::WriteAllText($registerTsGluePath, $registerTsContent, [System.Text.UTF8Encoding]::new($false))
Write-Log "2.5. Re-seeded known-good register.ts in durable glue store -> $registerTsGluePath" "INFO"

if (Test-Path -LiteralPath $DestRoot -PathType Container) {

    if (-not $NoBackup) {
        if (-not (Test-Path -LiteralPath $BackupRoot -PathType Container)) {
            New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
        }
        $backupPath = Join-Path $BackupRoot "${IndicatorName}_$Stamp"
        Write-Log "3. Backing up existing destination -> $backupPath" "STAGE"
        Copy-Item -LiteralPath $DestRoot -Destination $backupPath -Recurse -Force
    }
    else {
        Write-Log "3. Skipping backup (-NoBackup)." "WARN"
    }

    Write-Log "4. Deleting existing destination: $DestRoot" "STAGE"
    Remove-Item -LiteralPath $DestRoot -Recurse -Force
}
else {
    Write-Log "3-4. No existing destination to back up or delete." "INFO"
}

New-Item -ItemType Directory -Path $DestRoot -Force | Out-Null

# ============================================================
# 5. VERBATIM COPY (robocopy mirror, no reorganization)
# ============================================================

Write-Log "5. Copying source tree verbatim (no renaming/reorganizing)..." "STAGE"

$defaultExcludes = @("node_modules", ".git", "dist", "build", ".vscode")
$allExcludes = @($defaultExcludes + $ExcludeDirs | Select-Object -Unique)

$robocopyOutput = & robocopy $SourceRoot $DestRoot /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD @allExcludes
$robocopyExit = $LASTEXITCODE

# robocopy exit codes 0-7 are success variants; 8+ indicates failure.
if ($robocopyExit -ge 8) {
    Write-Log "robocopy failed with exit code $robocopyExit" "ERROR"
    $robocopyOutput | ForEach-Object { Write-Log $_ "ERROR" }
    exit 1
}

$copiedFileCount = @(Get-ChildItem -LiteralPath $DestRoot -Recurse -File -ErrorAction SilentlyContinue).Count
Write-Log "Copy complete. Files copied: $copiedFileCount" "INFO"

# ============================================================
# 5.5. DEPLOY GLUE FILES FROM THE DURABLE STORE
# ============================================================
#
# Copied from $GlueRoot (re-seeded with known-good content in Stage 2.5),
# never from a prior copy inside $DestRoot -- $DestRoot is disposable and
# may have held a corrupted copy from an older version of this script.

foreach ($rel in $PreserveRelativePaths) {
    $gluePath = Join-Path $GlueRoot $rel
    if (-not (Test-Path -LiteralPath $gluePath -PathType Leaf)) { continue }
    $restorePath = Join-Path $DestRoot $rel
    $restoreDir = Split-Path $restorePath -Parent
    if (-not (Test-Path -LiteralPath $restoreDir -PathType Container)) {
        New-Item -ItemType Directory -Path $restoreDir -Force | Out-Null
    }
    Copy-Item -LiteralPath $gluePath -Destination $restorePath -Force
    Write-Log "5.5. Deployed $rel from the durable glue store" "INFO"
}

# ============================================================
# 6. MECHANICAL IMPORT REWRITE (relative -> absolute alias)
# ============================================================

Write-Log "6. Rewriting imports to '$AliasRoot/...' (mechanical, structure-preserving)..." "STAGE"

function Convert-ImportsToAlias {
    param(
        [string]$Root,
        [string]$AliasRoot,
        [string[]]$ExcludeRelativePaths = @()
    )

    $pattern = [System.Text.RegularExpressions.Regex]::new(
        "(from\s+|require\(\s*|import\(\s*)(['" + '"' + "])([^'" + '"' + "]+)(['" + '"' + "])"
    )

    $excludeFull = @($ExcludeRelativePaths | ForEach-Object { (Join-Path $Root $_) })

    $files = @(
        Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -in ".ts", ".tsx", ".js", ".jsx" } |
        Where-Object { $_.FullName -notin $excludeFull }
    )

    $filesChanged = 0
    $specsChanged = 0
    $escaped = New-Object System.Collections.Generic.List[string]

    foreach ($f in $files) {

        $text = [System.IO.File]::ReadAllText($f.FullName)
        $matches = @($pattern.Matches($text))

        if ($matches.Count -eq 0) { continue }

        $newText = $text
        $fileChanged = $false

        for ($i = $matches.Count - 1; $i -ge 0; $i--) {

            $m = $matches[$i]
            $spec = $m.Groups[3].Value
            $newSpec = $null

            if ($spec.StartsWith('.')) {

                $importerDir = Split-Path $f.FullName -Parent
                $resolved = $null
                try {
                    $resolved = [System.IO.Path]::GetFullPath((Join-Path $importerDir ($spec -replace '/', '\')))
                }
                catch {
                    $resolved = $null
                }

                if ($null -ne $resolved -and $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $rel = $resolved.Substring($Root.Length).TrimStart('\', '/') -replace '\\', '/'
                    $newSpec = "$AliasRoot/$rel"
                }
                else {
                    $escaped.Add("$($f.FullName) : $spec")
                }
            }
            elseif ($spec.StartsWith('@/')) {
                # Original project's own self-referencing alias -> remap into
                # the new root (same structure, new prefix).
                $inner = $spec.Substring(2)
                $newSpec = "$AliasRoot/$inner"
            }
            # Bare package specifiers (react, zustand, etc.) are left untouched.

            if ($null -ne $newSpec -and $newSpec -ne $spec) {
                $specStart = $m.Groups[3].Index
                $specLen   = $m.Groups[3].Length
                $newText = $newText.Substring(0, $specStart) + $newSpec + $newText.Substring($specStart + $specLen)
                $fileChanged = $true
                $specsChanged++
            }
        }

        if ($fileChanged) {
            [System.IO.File]::WriteAllText($f.FullName, $newText, [System.Text.UTF8Encoding]::new($false))
            $filesChanged++
        }
    }

    return [pscustomobject]@{
        FilesChanged      = $filesChanged
        SpecifiersChanged = $specsChanged
        Escaped           = $escaped
    }
}

$rewriteResult = Convert-ImportsToAlias -Root $DestRoot -AliasRoot $AliasRoot -ExcludeRelativePaths $PreserveRelativePaths

Write-Log "Files changed       : $($rewriteResult.FilesChanged)" "INFO"
Write-Log "Specifiers rewritten: $($rewriteResult.SpecifiersChanged)" "INFO"

if ($rewriteResult.Escaped.Count -gt 0) {
    Write-Log "Relative imports that pointed OUTSIDE the copied tree (left untouched, review manually):" "WARN"
    foreach ($e in $rewriteResult.Escaped) {
        Write-Log "  $e" "WARN"
    }
}

# ============================================================
# 7. SWEEP REST OF FRONTEND FOR OLD ALIAS REFERENCES
# ============================================================

Write-Log "7. Sweeping rest of frontend for stale references to old indicator alias..." "STAGE"

function Repair-LegacyAliasReferences {
    param(
        [string]$FrontendSrcRoot,
        [string]$ExcludeRoot,
        [string]$AliasRoot,
        [string[]]$LegacyPrefixes
    )

    $files = @(
        Get-ChildItem -LiteralPath $FrontendSrcRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Extension -in ".ts", ".tsx", ".js", ".jsx" -and
            -not $_.FullName.StartsWith($ExcludeRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
            $_.FullName -notmatch '\\_backup_' -and
            $_.FullName -notmatch '\\_ajmig-backups\\'
        }
    )

    $changed = 0

    foreach ($f in $files) {
        $text = [System.IO.File]::ReadAllText($f.FullName)
        $orig = $text

        foreach ($legacy in $LegacyPrefixes) {
            $text = $text.Replace($legacy, "$AliasRoot/")
        }

        if ($text -ne $orig) {
            [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.UTF8Encoding]::new($false))
            $changed++
            Write-Log "  updated stale alias reference in: $($f.FullName)" "INFO"
        }
    }

    return $changed
}

$legacyPrefixes = @(
    "@/indicators/AJIndicator/",
    "@/indicators/AJInstitutional_old/"
)
if ($IndicatorName -ne "AJInstitutional") {
    $legacyPrefixes += "@/indicators/AJInstitutional/"
}

$legacyFixCount = Repair-LegacyAliasReferences `
    -FrontendSrcRoot $FrontendSrc `
    -ExcludeRoot $DestRoot `
    -AliasRoot $AliasRoot `
    -LegacyPrefixes $legacyPrefixes

Write-Log "Stale external references updated: $legacyFixCount" "INFO"

# ============================================================
# 8. DETECT (NOT EDIT) THE INDICATOR REGISTRY
# ============================================================

# ============================================================
# 8. AUTOMATICALLY WIRE register.ts INTO terminal.ts:loadIndicators()
# ============================================================
#
# customIndicators.ts is a generic runtime loader with no per-indicator
# lines -- it will never say "AJInstitutional" no matter what, so checking
# it here was always going to warn. The real hookup is one line inside
# terminal.ts's loadIndicators(), right after the built-in tier loads.
# That anchor is stable and known, so this is now done automatically
# instead of left as a manual step.

Write-Log "8. Wiring $AliasRoot/register into terminal.ts:loadIndicators()..." "STAGE"

# Still located for the Stage 10 context dump below -- not used for
# registration status anymore.
$registryCandidates = @(
    Get-ChildItem -LiteralPath $FrontendSrc -Recurse -File -Filter "customIndicators.ts" -ErrorAction SilentlyContinue
)

$terminalPath = Join-Path $FrontendSrc "lib\trading\terminal.ts"
$registerImportLine = "await import('$AliasRoot/register')"

if (-not (Test-Path -LiteralPath $terminalPath -PathType Leaf)) {
    Write-Log "terminal.ts not found at $terminalPath -- wire $registerImportLine into loadIndicators() manually." "WARN"
}
else {
    $terminalText = [System.IO.File]::ReadAllText($terminalPath)

    if ($terminalText.Contains($registerImportLine)) {
        Write-Log "terminal.ts already wires $AliasRoot/register -- nothing to do." "INFO"
    }
    else {
        # Anchor on the built-in tier's own import line inside loadIndicators().
        # Matches the exact statement, any indentation, and inserts the new
        # import on its own line with the same indentation immediately after.
        $anchorRx = [System.Text.RegularExpressions.Regex]::new(
            "([ \t]*)await import\('openalgo-charts/indicators'\)\r?\n"
        )
        $anchorMatch = $anchorRx.Match($terminalText)

        if (-not $anchorMatch.Success) {
            Write-Log "Could not find the 'await import(''openalgo-charts/indicators'')' anchor in terminal.ts -- wire $registerImportLine into loadIndicators() manually." "WARN"
        }
        else {
            $indent = $anchorMatch.Groups[1].Value
            $insertion = $anchorMatch.Value + "$indent$registerImportLine`r`n"
            $newTerminalText = $terminalText.Substring(0, $anchorMatch.Index) + $insertion + $terminalText.Substring($anchorMatch.Index + $anchorMatch.Length)
            [System.IO.File]::WriteAllText($terminalPath, $newTerminalText, [System.Text.UTF8Encoding]::new($false))
            Write-Log "Inserted '$registerImportLine' into terminal.ts:loadIndicators(), right after the built-in tier." "INFO"
        }
    }
}

# ============================================================
# 9. BUILD, WITH A BOUNDED ALIAS-DISCOVERY LOOP
# ============================================================
#
# Unlike the old orchestrator's loop, this one is narrow by construction:
# the copy is verbatim and the mechanical rewrite already handles every
# '.'-relative import and the project's own '@/' alias. The only thing
# that can still be unresolved after that is an alias PREFIX the original
# app defined in ITS OWN vite/tsconfig that isn't '@/' (e.g. '@signals/').
# Each pass here does exactly one thing: find such prefixes in the actual
# compiler errors, resolve them against the real (unchanged) folder
# structure, and rewrite them -- never guesses, never reorganizes, never
# invents a file. If a pass finds no new prefix to fix, the loop stops
# immediately rather than spinning.

$buildLogPath = Join-Path $FrontendRoot "AJInstitutional-migration-build_$Stamp.log"
$MaxBuildAttempts = 5
$knownAliasPrefixes = New-Object System.Collections.Generic.HashSet[string]

function Invoke-AJBuild {
    param([string]$FrontendPath)

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npmCommand) { $npmCommand = Get-Command npm -ErrorAction SilentlyContinue }

    if ($null -eq $npmCommand) {
        Write-Log "npm was not found in PATH -- cannot run the build." "ERROR"
        return [pscustomobject]@{ ExitCode = 1; Combined = "" }
    }

    Push-Location $FrontendPath
    try {
        $stdoutFile = Join-Path $env:TEMP ("ajmig-" + [guid]::NewGuid().ToString("N") + ".out.log")
        $stderrFile = Join-Path $env:TEMP ("ajmig-" + [guid]::NewGuid().ToString("N") + ".err.log")

        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            & $npmCommand.Source run build 1> $stdoutFile 2> $stderrFile
            $exitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $prevEap
        }

        $stdout = if (Test-Path -LiteralPath $stdoutFile) { [System.IO.File]::ReadAllText($stdoutFile) } else { "" }
        $stderr = if (Test-Path -LiteralPath $stderrFile) { [System.IO.File]::ReadAllText($stderrFile) } else { "" }
        $combined = @($stdout, $stderr) -join [Environment]::NewLine

        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue

        return [pscustomobject]@{ ExitCode = $exitCode; Combined = $combined }
    }
    finally {
        Pop-Location
    }
}

function Repair-UnknownAliasPrefixes {
    param(
        [string]$Combined,
        [string]$Root,
        [string]$AliasRoot,
        [System.Collections.Generic.HashSet[string]]$AlreadyKnown
    )

    # Matches "Cannot find module '@word/rest'" where @word/ is NOT our own
    # canonical alias root (that case means a genuinely missing file, not
    # an unrecognized alias, and is left for the human-readable report).
    $rx = [System.Text.RegularExpressions.Regex]::new("Cannot find module '(@[A-Za-z0-9_-]+)/([^']+)'")
    $found = @($rx.Matches($Combined) | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)

    $fixedAny = $false

    foreach ($prefix in $found) {

        if ($prefix -eq "@" -or $AliasRoot.StartsWith($prefix + "/")) { continue }
        if ($AlreadyKnown.Contains($prefix)) { continue }

        $dirName = $prefix.Substring(1)  # strip leading '@'
        $dirMatches = @(
            Get-ChildItem -LiteralPath $Root -Recurse -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ieq $dirName }
        )

        if ($dirMatches.Count -ne 1) {
            Write-Log "Alias '$prefix/' -> could not uniquely resolve a '$dirName' folder under the copied tree ($($dirMatches.Count) matches) -- leaving as-is for manual review." "WARN"
            $AlreadyKnown.Add($prefix) | Out-Null
            continue
        }

        $rel = $dirMatches[0].FullName.Substring($Root.Length).TrimStart('\', '/') -replace '\\', '/'
        $replacement = "$AliasRoot/$rel/"

        $files = @(
            Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension -in ".ts", ".tsx", ".js", ".jsx" }
        )

        $changedHere = 0
        foreach ($f in $files) {
            $text = [System.IO.File]::ReadAllText($f.FullName)
            $newText = $text.Replace("$prefix/", $replacement)
            if ($newText -ne $text) {
                [System.IO.File]::WriteAllText($f.FullName, $newText, [System.Text.UTF8Encoding]::new($false))
                $changedHere++
            }
        }

        Write-Log "Resolved unknown alias '$prefix/' -> '$replacement' ($changedHere file(s) updated)" "INFO"
        $AlreadyKnown.Add($prefix) | Out-Null
        $fixedAny = $true
    }

    return $fixedAny
}

if ($SkipBuild) {
    Write-Log "9. Skipping build (-SkipBuild)." "WARN"
}
else {
    $attempt = 0
    $lastResult = $null

    do {
        $attempt++
        Write-Log "9. Running npm run build (attempt $attempt of $MaxBuildAttempts)..." "STAGE"

        $lastResult = Invoke-AJBuild -FrontendPath $FrontendRoot

        if ($lastResult.ExitCode -eq 0) {
            Write-Log "BUILD PASSED (attempt $attempt)." "STAGE"
            break
        }

        Write-Log "BUILD FAILED (exit code $($lastResult.ExitCode))." "ERROR"

        $fixed = Repair-UnknownAliasPrefixes `
            -Combined $lastResult.Combined `
            -Root $DestRoot `
            -AliasRoot $AliasRoot `
            -AlreadyKnown $knownAliasPrefixes

        if (-not $fixed) {
            Write-Log "No further alias prefixes to resolve automatically -- stopping." "WARN"
            break
        }

    } while ($attempt -lt $MaxBuildAttempts)

    [System.IO.File]::WriteAllText($buildLogPath, $lastResult.Combined, [System.Text.UTF8Encoding]::new($false))

    if ($lastResult.ExitCode -ne 0) {
        Write-Log "Full log: $buildLogPath" "ERROR"
        $errorLines = @($lastResult.Combined -split "`r?`n" | Where-Object { $_ -match "error TS\d" })
        Write-Log "Remaining TypeScript errors: $($errorLines.Count)" "ERROR"
        foreach ($line in $errorLines) {
            Write-Log "  $line" "ERROR"
        }
    }
}

# ============================================================
# 10. INTEGRATION CONTEXT DUMP (auto-locate + dump key files)
# ============================================================
#
# This does NOT write or guess any integration code. It only finds the
# files a human (or an LLM helping you) needs to see in order to write
# the adapter/registry code for real, and concatenates their exact
# content into one file. This replaces "manually open and paste N files"
# with "open and paste one generated file".

Write-Log "10. Generating integration context dump..." "STAGE"

$contextPath = Join-Path $FrontendRoot "AJInstitutional-integration-context_$Stamp.txt"
$contextSections = New-Object System.Collections.Generic.List[string]

function Add-ContextSection {
    param([string]$Title, [string]$Path)

    $contextSections.Add("`n" + ("=" * 70))
    $contextSections.Add("FILE: $Path")
    $contextSections.Add(("=" * 70))

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        $contextSections.Add("[NOT FOUND]")
        Write-Log "  $Title -> NOT FOUND ($Path)" "WARN"
        return
    }

    $contextSections.Add([System.IO.File]::ReadAllText($Path))
    Write-Log "  $Title -> found ($Path)" "INFO"
}

function Find-OneFile {
    param([string]$Root, [string[]]$NamePatterns)

    foreach ($pat in $NamePatterns) {
        $hit = Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $pat -ErrorAction SilentlyContinue |
               Select-Object -First 1
        if ($null -ne $hit) { return $hit.FullName }
    }
    return $null
}

# 1. The registry itself (already located in Stage 8)
if ($registryCandidates.Count -gt 0) {
    Add-ContextSection -Title "customIndicators.ts (registry)" -Path $registryCandidates[0].FullName
}
else {
    Write-Log "  customIndicators.ts -> NOT FOUND under $FrontendSrc" "WARN"
}

# 2. The indicator's own entry point + its index.ts
$entryPath = Find-OneFile -Root $DestRoot -NamePatterns @("AJIndicator.ts")
if ($null -ne $entryPath) {
    Add-ContextSection -Title "AJIndicator.ts (entry point)" -Path $entryPath
    $entryIndex = Join-Path (Split-Path $entryPath -Parent) "index.ts"
    if (Test-Path -LiteralPath $entryIndex -PathType Leaf) {
        Add-ContextSection -Title "index.ts (same folder as entry point)" -Path $entryIndex
    }
}
else {
    Write-Log "  AJIndicator.ts -> NOT FOUND under $DestRoot" "WARN"
}

# 3. Candle type, RuntimeContext, and the two platform-agnostic hosts
Add-ContextSection -Title "Candle.ts" -Path (Find-OneFile -Root $DestRoot -NamePatterns @("Candle.ts"))
Add-ContextSection -Title "RuntimeContext.ts" -Path (Find-OneFile -Root $DestRoot -NamePatterns @("RuntimeContext.ts"))
Add-ContextSection -Title "IndicatorHost.ts" -Path (Find-OneFile -Root $DestRoot -NamePatterns @("IndicatorHost.ts"))
Add-ContextSection -Title "StrategyHost.ts" -Path (Find-OneFile -Root $DestRoot -NamePatterns @("StrategyHost.ts"))

[System.IO.File]::WriteAllText($contextPath, ($contextSections -join [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
Write-Log "Integration context dump written -> $contextPath" "STAGE"
Write-Log "Open that file and paste its contents into the chat to get the real adapter/registry code drafted." "INFO"

# ============================================================
# 11. SUMMARY + MANUAL INTEGRATION CHECKLIST
# ============================================================

Write-Log "============================================================" "STAGE"
Write-Log "MIGRATION SUMMARY" "STAGE"
Write-Log "============================================================" "STAGE"
Write-Log "Destination           : $DestRoot"
Write-Log "Files copied          : $copiedFileCount"
Write-Log "Files import-rewritten: $($rewriteResult.FilesChanged)"
Write-Log "Specifiers rewritten  : $($rewriteResult.SpecifiersChanged)"
Write-Log "External refs updated : $legacyFixCount"
if (-not $SkipBuild) {
    Write-Log "Build log             : $buildLogPath"
}
Write-Log "" "INFO"
Write-Log "REMAINING WORK (not auto-generated -- needs your judgment):" "WARN"
Write-Log "  1. register.ts's plots[]/inputs[] are still placeholders (entryPrice/stopLoss/tp1" "WARN"
Write-Log "     only) -- fill in the real 14-plot / 36-input list from AJRuntimeParameters" "WARN"
Write-Log "     and AJIndicatorResult once you've decided what to expose." "WARN"
Write-Log "  2. register.ts's buildRuntimeContext() fills position/session/broker/order" "WARN"
Write-Log "     fields with neutral defaults (no live position, no broker state) since the" "WARN"
Write-Log "     chart has no source for them -- confirm that's acceptable for this indicator." "WARN"
Write-Log "  3. calc() re-evaluates the full engine pipeline once per historical bar on" "WARN"
Write-Log "     every load -- fine for now, but worth profiling once real settings/plots" "WARN"
Write-Log "     are in and you can see it against a real chart." "WARN"
