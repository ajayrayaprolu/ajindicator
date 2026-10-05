#=====================================================================
# Fix-AlertsButton.ps1
#
# src\layouts\Workspace8.tsx only:
#   - IconButton gets an optional red count badge
#   - new bell button AFTER the star (watchlist) button in the top-right row
#   - bell opens <AlertsPanel /> in the right-hand panel (same slot as
#     Scanner / Watchlist); badge = unread triggered alerts
#
# Needs src\components\AlertsPanel.tsx and src\store\AlertStore.ts
# (created by Fix-ChartAlerts.ps1).
#
# Safe to re-run: marker checks, exact-one-match anchors, one-time backup.
#=====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional"
)

$ErrorActionPreference = "Stop"

function Read-Src([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $enc = New-Object System.Text.UTF8Encoding($bom)
    $text = $enc.GetString($bytes)
    if ($bom -and $text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
    $nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([string[]]($text -split "`r?`n"))
    return [pscustomobject]@{ Text = $text; Lines = $lines; Nl = $nl; Enc = $enc }
}

function Write-Src([string]$Path, $Src) {
    $bak = "$Path.bak-alertsbtn"
    if (-not (Test-Path $bak)) { Copy-Item $Path $bak }
    [IO.File]::WriteAllText($Path, ($Src.Lines -join $Src.Nl), $Src.Enc)
}

function Edit-Lines {
    param(
        [string]$Path,
        [string]$Label,
        [string]$Marker,
        [string]$Anchor,
        [ValidateSet("After", "Before", "Replace")][string]$Mode,
        [string]$NewText
    )

    $src = Read-Src $Path

    if ($src.Text.Contains($Marker)) {
        Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow
        return
    }

    $hits = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq $Anchor) { $hits += $i }
    }

    if ($hits.Count -ne 1) {
        Write-Warning "[$Label] anchor matched $($hits.Count) times (need exactly 1) - skipped"
        return
    }

    $idx = $hits[0]
    $new = [string[]]($NewText.Trim("`r", "`n") -split "`r?`n")

    switch ($Mode) {
        "After"   { $src.Lines.InsertRange($idx + 1, $new) }
        "Before"  { $src.Lines.InsertRange($idx, $new) }
        "Replace" { $src.Lines.RemoveAt($idx); $src.Lines.InsertRange($idx, $new) }
    }

    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

# Replaces from the (single) line equal to StartAnchor through the first
# following line equal to EndAnchor, inclusive.
function Replace-Block {
    param(
        [string]$Path,
        [string]$Label,
        [string]$Marker,
        [string]$StartAnchor,
        [string]$EndAnchor,
        [string]$NewText
    )

    $src = Read-Src $Path

    if ($src.Text.Contains($Marker)) {
        Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow
        return
    }

    $starts = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq $StartAnchor) { $starts += $i }
    }

    if ($starts.Count -ne 1) {
        Write-Warning "[$Label] start anchor matched $($starts.Count) times (need exactly 1) - skipped"
        return
    }

    $s = $starts[0]
    $e = -1
    for ($i = $s + 1; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq $EndAnchor) { $e = $i; break }
    }

    if ($e -lt 0) {
        Write-Warning "[$Label] end anchor not found - skipped"
        return
    }

    $new = [string[]]($NewText.Trim("`r", "`n") -split "`r?`n")

    $src.Lines.RemoveRange($s, $e - $s + 1)
    $src.Lines.InsertRange($s, $new)

    Write-Src $Path $src
    Write-Host "OK    [$Label]" -ForegroundColor Green
}

$ws = Join-Path $ProjectRoot "src\layouts\Workspace8.tsx"

if (-not (Test-Path $ws)) { throw "Not found: $ws  (use -ProjectRoot)" }

foreach ($dep in @("src\components\AlertsPanel.tsx", "src\store\AlertStore.ts")) {
    if (-not (Test-Path (Join-Path $ProjectRoot $dep))) {
        throw "Missing $dep - run Fix-ChartAlerts.ps1 first."
    }
}

Write-Host "`n--- Workspace8.tsx ---"

# 1) imports
Edit-Lines -Path $ws -Label "imports (AlertsPanel, AlertStore)" `
    -Marker 'import AlertsPanel from' `
    -Anchor 'import WatchlistPanel from "../components/WatchlistPanel";' -Mode After -NewText @'
import AlertsPanel from "../components/AlertsPanel";
import { AlertStore } from "../store/AlertStore";
'@

# 2) IconButton: optional badge
Edit-Lines -Path $ws -Label "IconButton: badge prop type" `
    -Marker 'badge?: number;' `
    -Anchor 'active?: boolean;' -Mode After -NewText @'
  badge?: number;
'@

Edit-Lines -Path $ws -Label "IconButton: badge prop default" `
    -Marker 'badge = 0,' `
    -Anchor 'active = false,' -Mode After -NewText @'
  badge = 0,
'@

Edit-Lines -Path $ws -Label "IconButton: positioned for badge" `
    -Marker 'AJ ALERTS: anchor for badge' `
    -Anchor 'width: 30,' -Mode After -NewText @'
        position: "relative", // AJ ALERTS: anchor for badge
'@

Edit-Lines -Path $ws -Label "IconButton: render badge" `
    -Marker 'badge > 99' `
    -Anchor '{icon}' -Mode Replace -NewText @'
      {icon}
      {badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 15,
            height: 15,
            padding: "0 3px",
            borderRadius: 8,
            background: "#e53935",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "15px",
            textAlign: "center",
            boxSizing: "border-box",
            pointerEvents: "none"
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
'@

# 3) state + unread counter
Edit-Lines -Path $ws -Label "alerts state + unread counter" `
    -Marker 'setAlertsEnabled' `
    -Anchor 'function activateChart(id: number) {' -Mode Before -NewText @'
  const [
    alertsEnabled,
    setAlertsEnabled
  ] = useState(false);

  const [
    alertUnread,
    setAlertUnread
  ] = useState(
    AlertStore.getUnreadCount()
  );

  useEffect(() => {
    const update = () => {
      setAlertUnread(
        AlertStore.getUnreadCount()
      );
    };

    update();

    return AlertStore.subscribe(update);
  }, []);

'@

# 4) bell button after the watchlist star
Replace-Block -Path $ws -Label "Alerts bell button after Watchlist" `
    -Marker 'Hide alerts' `
    -StartAnchor 'setWatchlistEnabled(' -EndAnchor '/>' -NewText @'
              setWatchlistEnabled(
                value =>
                  !value
              )
            }
          />

          {/*----------------------------------------------
              ALERTS
          ----------------------------------------------*/}

          <IconButton
            icon={"\uD83D\uDD14"}
            title={
              alertsEnabled
                ? "Hide alerts"
                : "Show alerts"
            }
            active={
              alertsEnabled
            }
            badge={
              alertUnread
            }
            onClick={() =>
              setAlertsEnabled(
                value =>
                  !value
              )
            }
          />
'@

# 5) right panel visible when alerts are on
Edit-Lines -Path $ws -Label "right panel opens for alerts" `
    -Marker 'alertsEnabled) && (' `
    -Anchor 'watchlistEnabled) && (' -Mode Replace -NewText @'
          watchlistEnabled ||
          alertsEnabled) && (
'@

# 6) render the panel
Edit-Lines -Path $ws -Label "render AlertsPanel" `
    -Marker '<AlertsPanel />' `
    -Anchor '{watchlistEnabled && (' -Mode Before -NewText @'
            {alertsEnabled && (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden"
                }}
              >
                <AlertsPanel />
              </div>
            )}

'@

$final = (Read-Src $ws).Text
$need = @('import AlertsPanel from', 'badge > 99', 'setAlertsEnabled', 'Hide alerts', 'alertsEnabled) && (', '<AlertsPanel />')
$missing = $need | Where-Object { -not $final.Contains($_) }

Write-Host ""
if (@($missing).Count -eq 0) {
    Write-Host "VERIFIED: all pieces are present in Workspace8.tsx" -ForegroundColor Green
}
else {
    Write-Warning ("Missing pieces: " + ($missing -join ", ") + " - send me the output above.")
}

Write-Host "`nNext: npm run build, then refresh the browser." -ForegroundColor Cyan
