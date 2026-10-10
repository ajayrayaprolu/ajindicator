
$ErrorActionPreference = "Stop"

$root = "C:\AI-Institutional"
$relativePath = "src\pages\AlgoHome.tsx"
$path = Join-Path $root $relativePath

if (-not (Test-Path $path)) {
    throw "Cannot find source file: $path"
}

$source = [System.IO.File]::ReadAllText($path)

# Prevent accidental duplicate application.
if ($source.Contains("aj-lifecycle-track")) {
    throw "The layout patch appears to be installed already. No changes made."
}

# Exact source blocks that must exist before we modify anything.
$oldLifecycle = @'
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: 7,
                  marginTop: 13,
                }}
              >

                {[
                  ["Signal", "DETECTED", true],
                  ["Entry", "WAITING", false],
                  ["Position", "PENDING", false],
                  ["Targets", "PENDING", false],
                  ["Exit", "PENDING", false],
                ].map(
                  ([label, state, active]) => (
                    <div
                      key={String(label)}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        padding:
                          "8px 10px",
                        borderRadius: 8,
                        background:
                          "rgba(15,23,42,.45)",
                        fontSize: 10,
                      }}
                    >
                      <span
                        style={{
                          color: "#71809a",
                        }}
                      >
                        {label}
                      </span>

                      <span
                        style={{
                          color: active
                            ? "#4ade80"
                            : "#64748b",
                          fontWeight: 850,
                        }}
                      >
                        {state}
                      </span>
                    </div>
                  ),
                )}

              </div>
'@

$newLifecycle = @'
              <div className="aj-lifecycle-track">
                {[
                  ["Signal", "DETECTED", true],
                  ["Entry", "WAITING", false],
                  ["Position", "PENDING", false],
                  ["Targets", "PENDING", false],
                  ["Exit", "PENDING", false],
                ].map(([label, state, active]) => (
                  <div className="aj-lifecycle-stage" key={String(label)}>
                    <span className={`aj-lifecycle-marker ${active ? "is-active" : ""}`}>
                      {active ? "\u2713" : "\u25CB"}
                    </span>
                    <span className="aj-lifecycle-label">{label}</span>
                    <strong className={active ? "is-active" : ""}>
                      {state}
                    </strong>
                  </div>
                ))}
              </div>
'@

# Validate every exact replacement before touching the file.
if (-not $source.Contains($oldLifecycle)) {
    throw "The expected lifecycle JSX was not found exactly. No changes made."
}

$pauseOld = @'
                className="aj-secondary"
                onClick={() => setStrategyPaused((value) => !value)}
'@

$pauseNew = @'
                className="aj-secondary aj-pause-button"
                onClick={() => setStrategyPaused((value) => !value)}
'@

if (-not $source.Contains($pauseOld)) {
    throw "The expected Pause button was not found. No changes made."
}

$exitOld = @'
                className="aj-secondary"
                onClick={() => setAutoTrade(false)}
'@

$exitNew = @'
                className="aj-secondary aj-exit-button"
                onClick={() => setAutoTrade(false)}
'@

if (-not $source.Contains($exitOld)) {
    throw "The expected Exit / Close button was not found. No changes made."
}

$pipelineOld = '["04", "Position", "Pending", "#fbbf24"],'
$pipelineNew = '["04", "Filled", autoTrade ? "Preview only" : "Pending", autoTrade ? "#60a5fa" : "#94a3b8"],'

if (-not $source.Contains($pipelineOld)) {
    throw "The expected fourth pipeline stage was not found. No changes made."
}

$cssMarker = '@media (max-width: 900px) {'

if (-not $source.Contains($cssMarker)) {
    throw "The expected responsive CSS marker was not found. No changes made."
}

# Prepare all edits in memory first.
$updated = $source.Replace($oldLifecycle, $newLifecycle)
$updated = $updated.Replace($pauseOld, $pauseNew)
$updated = $updated.Replace($exitOld, $exitNew)
$updated = $updated.Replace($pipelineOld, $pipelineNew)

$newCss = @'
/* AJ layout refinements: lifecycle, pipeline and risk controls */
.aj-lifecycle-track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-top: 13px;
}

.aj-lifecycle-stage {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  text-align: center;
  padding: 8px 3px;
  border: 1px solid rgba(148, 163, 184, .14);
  border-radius: 9px;
  background: rgba(15, 23, 42, .45);
}

.aj-lifecycle-stage:not(:last-child)::after {
  content: "\2192";
  position: absolute;
  z-index: 2;
  top: 15px;
  right: -11px;
  color: #64748b;
  font-size: 14px;
  font-weight: 800;
}

.aj-lifecycle-marker {
  display: flex;
  width: 27px;
  height: 27px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, .35);
  border-radius: 50%;
  color: #94a3b8;
  background: rgba(15, 23, 42, .9);
  font-size: 13px;
  font-weight: 900;
}

.aj-lifecycle-marker.is-active {
  border-color: rgba(74, 222, 128, .65);
  color: #052e16;
  background: #4ade80;
}

.aj-lifecycle-label {
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 750;
}

.aj-lifecycle-stage strong {
  color: #94a3b8;
  font-size: 9px;
  overflow-wrap: anywhere;
}

.aj-lifecycle-stage strong.is-active {
  color: #4ade80;
}

.aj-pipeline-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 11px;
}

.aj-pipeline-step {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  padding: 10px 4px;
  text-align: center;
  border: 1px solid rgba(148, 163, 184, .14);
  border-radius: 9px;
  background: rgba(15, 23, 42, .56);
}

.aj-pipeline-step:not(:last-child)::after {
  content: "\2192";
  position: absolute;
  top: 15px;
  right: -13px;
  z-index: 2;
  color: #60a5fa;
  font-size: 15px;
  font-weight: 900;
}

.aj-pipeline-number {
  display: flex;
  width: 25px;
  height: 25px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(96, 165, 250, .5);
  border-radius: 50%;
  color: #93c5fd;
  background: rgba(30, 58, 138, .25);
  font-size: 13px;
  font-weight: 900;
}

.aj-pipeline-label {
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.aj-pipeline-step strong {
  font-size: 9px;
  overflow-wrap: anywhere;
}

.aj-pause-button {
  border-color: rgba(180, 130, 65, .55) !important;
  color: #f5deb3 !important;
  background: rgba(146, 98, 35, .25) !important;
}

.aj-pause-button:hover {
  background: rgba(146, 98, 35, .38) !important;
}

.aj-exit-button {
  border-color: rgba(248, 113, 113, .55) !important;
  color: #fecaca !important;
  background: rgba(153, 27, 27, .25) !important;
}

.aj-exit-button:hover {
  background: rgba(153, 27, 27, .4) !important;
}

@media (max-width: 600px) {
  .aj-lifecycle-track {
    gap: 4px;
  }

  .aj-lifecycle-stage {
    padding: 7px 2px;
  }

  .aj-lifecycle-stage:not(:last-child)::after {
    right: -7px;
    font-size: 11px;
  }

  .aj-lifecycle-label {
    font-size: 9px;
  }

  .aj-lifecycle-stage strong {
    font-size: 8px;
  }

  .aj-pipeline-steps {
    gap: 8px;
  }

  .aj-pipeline-step:not(:last-child)::after {
    right: -10px;
    font-size: 12px;
  }
}

'@

$updated = $updated.Replace($cssMarker, $newCss + $cssMarker)

# Verify the transformed source before writing it.
$checks = @(
    "aj-lifecycle-track",
    "aj-pause-button",
    "aj-exit-button",
    '["04", "Filled",',
    'onClick={() => setAutoTrade(false)}',
    ".aj-pipeline-steps"
)

foreach ($check in $checks) {
    if (-not $updated.Contains($check)) {
        throw "Post-patch validation failed for marker: $check"
    }
}

if ($updated -eq $source) {
    throw "No changes were produced. Original file left untouched."
}

# Make a timestamped backup before writing.
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$path.backup-layout-$stamp"
Copy-Item -LiteralPath $path -Destination $backup

try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $updated, $utf8NoBom)

    Write-Host "`nPatch applied. Running production build..." -ForegroundColor Cyan
    Push-Location $root
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Production build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    Write-Host "`nSUCCESS: layout patch applied and production build passed." -ForegroundColor Green
    Write-Host "Backup: $backup" -ForegroundColor Yellow
}
catch {
    Write-Host "`nPATCH OR BUILD FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Copy-Item -LiteralPath $backup -Destination $path -Force
    Write-Host "Original source restored from: $backup" -ForegroundColor Yellow
    throw
}
