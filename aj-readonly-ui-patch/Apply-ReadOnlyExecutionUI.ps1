param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = "C:\AI-Institutional",

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "apply_readonly_execution_ui.py"
if (!(Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "STOP: Required patch engine is missing: $scriptPath. No project files were changed."
}
if (!(Test-Path -LiteralPath (Join-Path $ProjectRoot "src\pages\AlgoHome.tsx") -PathType Leaf)) {
    throw "STOP: AlgoHome.tsx was not found under '$ProjectRoot'. No project files were changed."
}
if (!(Test-Path -LiteralPath (Join-Path $ProjectRoot "package.json") -PathType Leaf)) {
    throw "STOP: package.json was not found under '$ProjectRoot'. No project files were changed."
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (!$pythonCommand) {
    $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
}
if (!$pythonCommand) {
    throw "STOP: Python was not found on PATH. No project files were changed."
}

$argsList = @($scriptPath, "--project-root", (Resolve-Path -LiteralPath $ProjectRoot).Path)
if ($DryRun) { $argsList += "--dry-run" }

Write-Host "AJ Institutional — Read-only execution UI wiring" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"
if ($pythonCommand.Name -eq "py.exe" -or $pythonCommand.Name -eq "py") {
    & $pythonCommand.Source -3 @argsList
} else {
    & $pythonCommand.Source @argsList
}
if ($LASTEXITCODE -ne 0) {
    throw "Read-only UI patch failed with exit code $LASTEXITCODE. Check output above; the installer preserves/restores source on build failure."
}
