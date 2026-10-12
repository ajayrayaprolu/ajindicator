# AJ Institutional — Hero and Live Charts sidebar patch
# This patch edits only src/pages/AlgoHome.tsx.
# It keeps App.tsx and Terminal.tsx unchanged and verifies their route markers first.

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$homePath = Join-Path $projectRoot "src\pages\AlgoHome.tsx"
$appPath = Join-Path $projectRoot "src\App.tsx"
$terminalPath = Join-Path $projectRoot "src\pages\Terminal.tsx"

foreach ($requiredPath in @($homePath, $appPath, $terminalPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required file not found: $requiredPath. Save this script inside the project's scripts folder."
    }
}

$appText = [System.IO.File]::ReadAllText($appPath)
if (-not $appText.Contains('if (params.get("terminal") === "1")')) {
    throw "App.tsx does not contain the expected existing ?terminal=1 route. No files changed."
}

$terminalText = [System.IO.File]::ReadAllText($terminalPath)
if (-not $terminalText.Contains('return <Workspace8 />;')) {
    throw "Terminal.tsx does not contain the expected existing Workspace8 route. No files changed."
}

function Replace-ExactlyOnce {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Old,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$New,
        [Parameter(Mandatory = $true)][string]$Description
    )

    $count = 0
    $offset = 0
    while (($index = $Text.IndexOf($Old, $offset, [System.StringComparison]::Ordinal)) -ge 0) {
        $count++
        $offset = $index + $Old.Length
    }

    if ($count -ne 1) {
        throw "Expected exactly one match for '$Description', found $count. No files changed."
    }

    return $Text.Replace($Old, $New)
}

$originalText = [System.IO.File]::ReadAllText($homePath)
$hadUtf8Bom = $false
$rawBytes = [System.IO.File]::ReadAllBytes($homePath)
if ($rawBytes.Length -ge 3 -and $rawBytes[0] -eq 0xEF -and $rawBytes[1] -eq 0xBB -and $rawBytes[2] -eq 0xBF) {
    $hadUtf8Bom = $true
}
$lineEnding = if ($originalText.Contains("`r`n")) { "`r`n" } else { "`n" }
$text = $originalText.Replace("`r`n", "`n").Replace("`r", "`n")

$oldSidebar = @'
          <div className="aj-side-nav-item"><span>▦</span>Charts</div>
'@
$newSidebar = @'
          <a
            className="aj-side-nav-item aj-side-nav-link"
            href={`${window.location.pathname}?terminal=1&feed=${feed}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the existing terminal with the selected feed"
          >
            <span>▦</span>Live Charts &amp; Signals
          </a>
'@
$text = Replace-ExactlyOnce -Text $text -Old $oldSidebar -New $newSidebar -Description "Charts sidebar item"

$oldOpenTerminal = @'
function openTerminal() {
  const url = `${window.location.origin}${window.location.pathname}?terminal=1`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );
}

'@
$text = Replace-ExactlyOnce -Text $text -Old $oldOpenTerminal -New "" -Description "old Get Charts helper"

$oldHeroButtons = @'
            <div
              style={{
                display: "flex",
                gap: 9,
                marginTop: 22,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="aj-primary aj-light-theme-action"
                onClick={openTerminal}
              >
                Get Charts
              </button>

              <button
                type="button"
                className="aj-secondary aj-light-theme-action"
                onClick={() =>
                  setAutoTrade(
                    (value) => !value,
                  )
                }
              >
                {autoTrade ? (
                  <Zap size={15} />
                ) : (
                  <Square size={15} />
                )}

                Auto Trade:{" "}
                {autoTrade
                  ? "ARMED"
                  : "OFF"}
              </button>
            </div>
'@
$text = Replace-ExactlyOnce -Text $text -Old $oldHeroButtons -New "" -Description "Get Charts and hero Auto Trade buttons"

$oldHeroCss = @'
        .aj-hero {
          display: grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 18px;
          padding: 30px 0 18px;
        }

'@
$newHeroCss = @'
        .aj-hero {
          display: grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 18px;
          padding: 30px 0 18px;
          /* Keep Automated Execution and Current Signal equal-height. */
          align-items: stretch;
        }

'@
$text = Replace-ExactlyOnce -Text $text -Old $oldHeroCss -New $newHeroCss -Description "hero grid equal-height styling"

$oldNavCssMarker = @'
        .aj-side-nav-item > span {
          display: inline-flex;
          flex: 0 0 17px;
'@
$newNavCssMarker = @'
        .aj-side-nav-link {
          text-decoration: none;
          cursor: pointer;
        }

        .aj-side-nav-item > span {
          display: inline-flex;
          flex: 0 0 17px;
'@
$text = Replace-ExactlyOnce -Text $text -Old $oldNavCssMarker -New $newNavCssMarker -Description "sidebar link styling"

$oldZapImport = "  Zap,`n"
$text = Replace-ExactlyOnce -Text $text -Old $oldZapImport -New "" -Description "unused Zap import"

if ($text.Contains("Get Charts")) {
    throw "Pre-write validation failed: Get Charts still exists in AlgoHome.tsx. No files changed."
}
if ($text.Contains('Auto Trade:{" "}')) {
    throw "Pre-write validation failed: the hero Auto Trade toggle still exists. No files changed."
}
if ($text.Contains("function openTerminal()")) {
    throw "Pre-write validation failed: the old openTerminal helper still exists. No files changed."
}
if (-not $text.Contains('href={`${window.location.pathname}?terminal=1&feed=${feed}`}')) {
    throw "Pre-write validation failed: the feed-preserving terminal link is missing. No files changed."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$homePath.bak-$timestamp"
Copy-Item -LiteralPath $homePath -Destination $backupPath

$finalText = $text.Replace("`n", $lineEnding)
$utf8 = [System.Text.UTF8Encoding]::new($hadUtf8Bom)
[System.IO.File]::WriteAllText($homePath, $finalText, $utf8)

Write-Host ""
Write-Host "Patch applied to: $homePath" -ForegroundColor Green
Write-Host "Backup created:   $backupPath" -ForegroundColor Cyan
Write-Host "App.tsx and Terminal.tsx were inspected but not modified." -ForegroundColor Cyan
Write-Host "The sidebar terminal link includes the selected feed as a query parameter." -ForegroundColor Cyan
Write-Host ""
Write-Host "Running npm run build..." -ForegroundColor Yellow

Push-Location $projectRoot
try {
    & npm.cmd run build
    $buildExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($buildExitCode -ne 0) {
    Write-Error "Build failed (exit code $buildExitCode). The patch and backup remain available. Review the build output; restore from '$backupPath' if you need to roll back."
    exit $buildExitCode
}

Write-Host ""
Write-Host "Build succeeded. The sidebar opens the existing terminal in a new tab with the selected feed query parameter." -ForegroundColor Green
