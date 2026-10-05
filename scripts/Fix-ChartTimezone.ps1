# Fix-ChartTimezone.ps1
#
# What this does
# ---------------
# Your chart's crosshair label was already correctly formatted in IST
# (localization.timeFormatter), but the time-axis tick marks along the
# bottom of the chart had no tickMarkFormatter at all, so lightweight-charts
# fell back to its default UTC-based formatting. That's exactly the ~5:30
# hour gap you saw (12:14 PM IST = 06:44 AM UTC =~ the 6:43 the axis showed).
#
# This script:
#   1. Fixes the axis by adding timeScale.tickMarkFormatter (Asia/Kolkata).
#   2. Adds a selectable "chartTimezone" prop threaded through
#      ChartWindow -> ChartEngine -> ChartSettingsPanel, defaulting to
#      Asia/Kolkata, so both the axis and the crosshair follow it.
#   3. Adds a "Time Zone" dropdown to the chart settings panel (the gear
#      icon), next to the existing Candles colors section.
#
# Files touched (relative to the project root):
#   src\charts\ChartEngine.tsx
#   src\components\ChartWindow.tsx
#   src\components\ChartSettingsPanel.tsx
#
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File Fix-ChartTimezone.ps1
#   pwsh -NoProfile -ExecutionPolicy Bypass -File Fix-ChartTimezone.ps1 -ProjectRoot "D:\Other\Path"
#
# Safe to re-run: any edit whose exact pattern is no longer found (because
# it was already applied) is skipped with a warning instead of failing.

param(
    [string]$ProjectRoot = "C:\AI-Institutional"
)

$ErrorActionPreference = "Stop"

function Apply-Edit {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }

    $raw = [System.IO.File]::ReadAllText($Path)
    $usesCRLF = $raw -match "`r`n"
    $content = $raw -replace "`r`n", "`n"

    $oldN = $Old -replace "`r`n", "`n"
    $newN = $New -replace "`r`n", "`n"

    $count = ([regex]::Matches($content, [regex]::Escape($oldN))).Count

    if ($count -eq 0) {
        Write-Warning "SKIP  [$Label] - pattern not found (already applied?) in $Path"
        return
    }
    if ($count -gt 1) {
        throw "ABORT [$Label] - pattern matched $count times in $Path (expected 1). Not touching the file - please check it by hand."
    }

    $content = $content.Replace($oldN, $newN)

    if ($usesCRLF) {
        $content = $content -replace "`n", "`r`n"
    }

    [System.IO.File]::WriteAllText($Path, $content)
    Write-Host "OK    [$Label]"
}

# ======================================================================
# ChartEngine.tsx
# ======================================================================
$target_ChartEngine_tsx = Join-Path $ProjectRoot "src\charts\ChartEngine.tsx"
Write-Host ""
Write-Host "--- ChartEngine.tsx ---"

Apply-Edit -Path $target_ChartEngine_tsx -Label "ChartEngineProps: add chartTimezone/onChartTimezoneChange" -Old @"
        wickDownColor: string;
    }) => void;
}

"@ -New @"
        wickDownColor: string;
    }) => void;

    chartTimezone?: string;

    onChartTimezoneChange?: (timezone: string) => void;
}

"@

Apply-Edit -Path $target_ChartEngine_tsx -Label "destructure chartTimezone/onChartTimezoneChange" -Old @"
    hostResult,
    candleColors,
    onCandleColorsChange

}: ChartEngineProps) {
"@ -New @"
    hostResult,
    candleColors,
    onCandleColorsChange,
    chartTimezone,
    onChartTimezoneChange

}: ChartEngineProps) {
"@

Apply-Edit -Path $target_ChartEngine_tsx -Label "add resolvedChartTimezone default" -Old @"
            wickDownColor: "#ef5350"
        };

    const [hoverTooltip, setHoverTooltip] =
"@ -New @"
            wickDownColor: "#ef5350"
        };

    const resolvedChartTimezone =
        chartTimezone ?? "Asia/Kolkata";

    const [hoverTooltip, setHoverTooltip] =
"@

Apply-Edit -Path $target_ChartEngine_tsx -Label "timeScale: add tickMarkFormatter (the actual axis-label bug)" -Old @"
                        fixLeftEdge:false,
                        fixRightEdge:false,
                        lockVisibleTimeRangeOnResize:true
                    },

"@ -New @"
                        fixLeftEdge:false,
                        fixRightEdge:false,
                        lockVisibleTimeRangeOnResize:true,

                        tickMarkFormatter:(time:number)=>{

                            return new Intl.DateTimeFormat(

                                "en-IN",

                                {

                                    timeZone:resolvedChartTimezone,

                                    hour:"2-digit",

                                    minute:"2-digit",

                                    hour12:false

                                }

                            ).format(

                                new Date(time*1000)

                            );

                        }
                    },

"@

Apply-Edit -Path $target_ChartEngine_tsx -Label "localization.timeFormatter: use resolvedChartTimezone" -Old @"
                                {

                                    timeZone:"Asia/Kolkata",

                                    year:"numeric",
"@ -New @"
                                {

                                    timeZone:resolvedChartTimezone,

                                    year:"numeric",
"@

Apply-Edit -Path $target_ChartEngine_tsx -Label "insert SYNC TIMEZONE effect (live-applies timezone changes)" -Old @"

    }, []);
	
    //--------------------------------------------------
    // DRAW CANDLES
"@ -New @"

    }, []);

    //--------------------------------------------------
    // SYNC TIMEZONE
    //
    // The CREATE CHART effect above only runs once on
    // mount, so switching the timezone from the settings
    // panel afterwards needs its own effect that updates
    // the live chart instead of tearing it down.
    //--------------------------------------------------

    useEffect(() => {

        if (!chart.current) {
            return;
        }

        chart.current.applyOptions({

            timeScale: {

                tickMarkFormatter:(time:number)=>{

                    return new Intl.DateTimeFormat(

                        "en-IN",

                        {

                            timeZone:resolvedChartTimezone,

                            hour:"2-digit",

                            minute:"2-digit",

                            hour12:false

                        }

                    ).format(

                        new Date(time*1000)

                    );

                }

            },

            localization:{

                timeFormatter:(time:number)=>{

                    return new Intl.DateTimeFormat(

                        "en-IN",

                        {

                            timeZone:resolvedChartTimezone,

                            year:"numeric",

                            month:"2-digit",

                            day:"2-digit",

                            hour:"2-digit",

                            minute:"2-digit",

                            hour12:false

                        }

                    ).format(

                        new Date(time*1000)

                    );

                }

            }

        });

    }, [resolvedChartTimezone]);

    //--------------------------------------------------
    // DRAW CANDLES
"@

Apply-Edit -Path $target_ChartEngine_tsx -Label "pass timezone props into ChartSettingsPanel" -Old @"
                            onCandleColorsChange?.(newColors);
                        }}
                        onClose={() => setShowChartSettings(false)}
                    />
"@ -New @"
                            onCandleColorsChange?.(newColors);
                        }}
                        timezone={resolvedChartTimezone}
                        onTimezoneChange={(tz) => {
                            onChartTimezoneChange?.(tz);
                        }}
                        onClose={() => setShowChartSettings(false)}
                    />
"@

# ======================================================================
# ChartWindow.tsx
# ======================================================================
$target_ChartWindow_tsx = Join-Path $ProjectRoot "src\components\ChartWindow.tsx"
Write-Host ""
Write-Host "--- ChartWindow.tsx ---"

Apply-Edit -Path $target_ChartWindow_tsx -Label "ChartWindowProps: add chartTimezone/onChartTimezoneChange" -Old @"
        wickDownColor: string;
    }) => void;
}

"@ -New @"
        wickDownColor: string;
    }) => void;

    chartTimezone?: string;

    onChartTimezoneChange?: (timezone: string) => void;
}

"@

Apply-Edit -Path $target_ChartWindow_tsx -Label "destructure chartTimezone/onChartTimezoneChange" -Old @"
    candleColors,
    onCandleColorsChange,
}: Props) {
	
"@ -New @"
    candleColors,
    onCandleColorsChange,
    chartTimezone,
    onChartTimezoneChange,
}: Props) {
	
"@

Apply-Edit -Path $target_ChartWindow_tsx -Label "pass chartTimezone/onChartTimezoneChange into <ChartEngine>" -Old @"
								candleColors={candleColors}
								onCandleColorsChange={onCandleColorsChange}
							/>
						</ChartErrorBoundary>
"@ -New @"
								candleColors={candleColors}
								onCandleColorsChange={onCandleColorsChange}
								chartTimezone={chartTimezone}
								onChartTimezoneChange={onChartTimezoneChange}
							/>
						</ChartErrorBoundary>
"@

# ======================================================================
# ChartSettingsPanel.tsx
# ======================================================================
$target_ChartSettingsPanel_tsx = Join-Path $ProjectRoot "src\components\ChartSettingsPanel.tsx"
Write-Host ""
Write-Host "--- ChartSettingsPanel.tsx ---"

Apply-Edit -Path $target_ChartSettingsPanel_tsx -Label "add SUPPORTED_TIMEZONES list + Props fields" -Old @"
export { DEFAULT_CANDLE_COLORS };

interface Props {
  colors?: CandleColors;
"@ -New @"
export { DEFAULT_CANDLE_COLORS };

const DEFAULT_CHART_TIMEZONE = "Asia/Kolkata";

const SUPPORTED_TIMEZONES: { value: string; label: string }[] = [
  { value: "Asia/Kolkata", label: "(UTC+05:30) Kolkata / IST" },
  { value: "Etc/UTC", label: "(UTC+00:00) UTC" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Dubai" },
  { value: "Asia/Singapore", label: "(UTC+08:00) Singapore" },
  { value: "Asia/Hong_Kong", label: "(UTC+08:00) Hong Kong" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo" },
  { value: "Europe/London", label: "(UTC+00:00/+01:00) London" },
  { value: "America/New_York", label: "(UTC-05:00/-04:00) New York" }
];

interface Props {
  colors?: CandleColors;
"@

Apply-Edit -Path $target_ChartSettingsPanel_tsx -Label "destructure timezone/onTimezoneChange + currentTimezone" -Old @"
  colors?: CandleColors;
  onChange: (colors: CandleColors) => void;
  onClose: () => void;
}
"@ -New @"
  colors?: CandleColors;
  onChange: (colors: CandleColors) => void;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  onClose: () => void;
}
"@

Apply-Edit -Path $target_ChartSettingsPanel_tsx -Label "(context line - part of previous hunk, see below)" -Old @"
  colors,
  onChange,
  onClose
}: Props) {
"@ -New @"
  colors,
  onChange,
  timezone,
  onTimezoneChange,
  onClose
}: Props) {
"@

Apply-Edit -Path $target_ChartSettingsPanel_tsx -Label "(context line - part of previous hunk, see below)" -Old @"

  const current: CandleColors = colors ?? DEFAULT_CANDLE_COLORS;

  function update(partial: Partial<CandleColors>) {
"@ -New @"

  const current: CandleColors = colors ?? DEFAULT_CANDLE_COLORS;
  const currentTimezone: string = timezone ?? DEFAULT_CHART_TIMEZONE;

  function update(partial: Partial<CandleColors>) {
"@

Apply-Edit -Path $target_ChartSettingsPanel_tsx -Label "insert Time Zone dropdown section into the panel UI" -Old @"
        />

        <div style={{ padding: "10px 0" }}>
          <button
"@ -New @"
        />

        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "10px 0 2px"
          }}
        >
          Time Zone
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--border-secondary)"
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)"
            }}
          >
            Chart time zone
          </span>

          <select
            value={currentTimezone}
            onChange={(e) => onTimezoneChange?.(e.target.value)}
            style={{
              flex: "0 0 auto",
              maxWidth: 170,
              background: "var(--bg-panel-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-primary)",
              borderRadius: 4,
              padding: "4px 6px",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: "10px 0" }}>
          <button
"@

Write-Host ""
Write-Host "Done. Restart your dev server (npm run dev / npm start) to pick up the changes."
