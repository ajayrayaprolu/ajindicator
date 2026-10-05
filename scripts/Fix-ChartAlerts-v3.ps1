#=====================================================================
# Fix-ChartAlerts-v3.ps1
#
# Replaces whatever alert-hover behaviour v1 or v2 left in ChartEngine.tsx
# (it detects which state your file is in), so it is safe to run no matter
# whether v2 applied.
#
# Result in ChartEngine.tsx:
#   - "+ Alert @ price" appears ONLY while the mouse is on the price bar
#     (right axis). Moving into the chart pane hides it. It never follows
#     the mouse across the chart.
#   - Hovering the price bar next to an existing alert shows
#     "x Delete alert @ price" instead - click it to delete that alert.
#   - Double-click an alert line also deletes it.
#   - A small trash button (next to the gear) deletes ALL alerts on that
#     symbol, with a confirm prompt. Only shown when alerts exist.
#
# Safe to re-run (marker checks, exact-one-match anchors, one-time backup).
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
    $bak = "$Path.bak-chartalerts-v3"
    if (-not (Test-Path $bak)) { Copy-Item $Path $bak }
    [IO.File]::WriteAllText($Path, ($Src.Lines -join $Src.Nl), $Src.Enc)
}

# Returns: "ok" | "marker" | "nostart" | "ambiguous" | "noend"
function Replace-Block {
    param(
        [string]$Path,
        [string]$Marker,
        [string]$StartAnchor,
        [string]$EndAnchor,
        [string]$NewText
    )

    $src = Read-Src $Path

    if ($src.Text.Contains($Marker)) { return "marker" }

    $starts = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq $StartAnchor) { $starts += $i }
    }

    if ($starts.Count -eq 0) { return "nostart" }
    if ($starts.Count -gt 1) { return "ambiguous" }

    $s = $starts[0]
    $e = -1
    for ($i = $s + 1; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq $EndAnchor) { $e = $i; break }
    }

    if ($e -lt 0) { return "noend" }

    $new = [string[]]($NewText.Trim("`r", "`n") -split "`r?`n")

    $src.Lines.RemoveRange($s, $e - $s + 1)
    $src.Lines.InsertRange($s, $new)

    Write-Src $Path $src
    return "ok"
}

function Report([string]$Label, [string]$Status) {
    switch ($Status) {
        "ok"        { Write-Host "OK    [$Label]" -ForegroundColor Green }
        "marker"    { Write-Host "SKIP  [$Label] (already applied)" -ForegroundColor DarkYellow }
        default     { Write-Warning "[$Label] not applied ($Status)" }
    }
}

$engine = Join-Path $ProjectRoot "src\charts\ChartEngine.tsx"

if (-not (Test-Path $engine)) { throw "Not found: $engine  (use -ProjectRoot)" }

Write-Host "`n--- ChartEngine.tsx ---"

#---------------------------------------------------------------------
# 1) alertCount state (drives the trash button visibility)
#---------------------------------------------------------------------

$src = Read-Src $engine

if ($src.Text.Contains('setAlertCount')) {
    Report "alertCount state" "marker"
}
else {
    $hits = @()
    for ($i = 0; $i -lt $src.Lines.Count; $i++) {
        if ($src.Lines[$i].Trim() -eq '(p: number) => p >= 100 ? p.toFixed(2) : p.toFixed(4);') { $hits += $i }
    }
    if ($hits.Count -ne 1) {
        Report "alertCount state" "anchor matched $($hits.Count) times - did Fix-ChartAlerts.ps1 run?"
    }
    else {
        $new = [string[]]@(
            '',
            '    const [alertCount, setAlertCount] =',
            '        useState(0);'
        )
        $src.Lines.InsertRange($hits[0] + 1, $new)
        Write-Src $engine $src
        Report "alertCount state" "ok"
    }
}

#---------------------------------------------------------------------
# 2) hover/delete effects (replaces v1 crosshair effect OR v2 click effect)
#---------------------------------------------------------------------

$hoverEffect = @'
    // ALERTS: hover price axis to add / delete
    //
    // "+ Alert @ price" shows ONLY while the mouse is on the price
    // bar (right axis). Moving into the chart pane hides it, so it
    // never follows the mouse across the chart. Next to an existing
    // alert the button becomes "Delete alert". Double-clicking an
    // alert line also deletes it.
    //--------------------------------------------------

    useEffect(() => {

        const el = chartRef.current;

        if (!el) {
            return;
        }

        const hideButton = () => {

            window.clearTimeout(alertHideTimerRef.current);

            if (alertBtnRef.current) {
                alertBtnRef.current.style.display = "none";
            }

        };

        const scheduleHide = () => {

            window.clearTimeout(alertHideTimerRef.current);

            alertHideTimerRef.current =
                window.setTimeout(() => {

                    if (!alertBtnHoveredRef.current) {
                        hideButton();
                    }

                }, 350);

        };

        const toChartPoint = (e: MouseEvent) => {

            const rect = el.getBoundingClientRect();

            return {
                x: e.clientX - rect.left - el.clientLeft,
                y: e.clientY - rect.top - el.clientTop
            };

        };

        const axisWidth = (): number => {

            try {

                const w =
                    chart.current?.priceScale("right").width();

                return w && w > 0 ? w : 70;

            } catch {

                return 70;

            }

        };

        const showButton = (
            mode: "add" | "delete",
            y: number,
            label: string,
            price: number | null,
            alertId: string
        ) => {

            const btn = alertBtnRef.current;

            if (!btn) {
                return;
            }

            window.clearTimeout(alertHideTimerRef.current);

            btn.dataset.mode = mode;
            btn.dataset.alertId = alertId;
            alertHoverPriceRef.current = price;

            btn.textContent = label;
            btn.style.right = (axisWidth() + 6) + "px";
            btn.style.top = Math.max(0, y - 11) + "px";
            btn.style.display = "block";

        };

        const alertNear = (y: number) => {

            const series = candleSeries.current;

            if (!series) {
                return undefined;
            }

            return AlertStore.getActive(symbol).find((a) => {

                const ay = series.priceToCoordinate(a.price);

                return ay != null && Math.abs(Number(ay) - y) <= 9;

            });

        };

        const onMouseMove = (e: MouseEvent) => {

            const series = candleSeries.current;
            const btn = alertBtnRef.current;

            if (!series || !btn) {
                return;
            }

            // mouse is on the button itself: keep it where it is
            if (btn.contains(e.target as Node)) {
                return;
            }

            const pt = toChartPoint(e);

            const onAxis =
                pt.x >= el.clientWidth - axisWidth() &&
                pt.x <= el.clientWidth;

            if (!onAxis) {
                scheduleHide();
                return;
            }

            const near = alertNear(pt.y);

            if (near) {

                showButton(
                    "delete",
                    Number(series.priceToCoordinate(near.price)),
                    "\u2715 Delete alert @ " + fmtAlertPrice(near.price),
                    null,
                    near.id
                );

                return;
            }

            const price = series.coordinateToPrice(pt.y);

            if (price == null) {
                scheduleHide();
                return;
            }

            showButton(
                "add",
                pt.y,
                "+ Alert @ " + fmtAlertPrice(Number(price)),
                Number(price),
                ""
            );

        };

        const onDoubleClick = (e: MouseEvent) => {

            const pt = toChartPoint(e);

            const hit = alertNear(pt.y);

            if (!hit) {
                return;
            }

            // keep the chart's own double-click (resize + fit) from firing
            e.stopPropagation();

            AlertStore.remove(hit.id);

            hideButton();

        };

        el.addEventListener("mousemove", onMouseMove);
        el.addEventListener("mouseleave", scheduleHide);
        el.addEventListener("dblclick", onDoubleClick);

        return () => {

            window.clearTimeout(alertHideTimerRef.current);

            el.removeEventListener("mousemove", onMouseMove);
            el.removeEventListener("mouseleave", scheduleHide);
            el.removeEventListener("dblclick", onDoubleClick);

        };

    }, [symbol]);

    //--------------------------------------------------
    // ALERTS: count for the clear-all button
    //--------------------------------------------------

    useEffect(() => {

        const update = () => {
            setAlertCount(AlertStore.getActive(symbol).length);
        };

        update();

        return AlertStore.subscribe(update);

    }, [symbol]);
'@

$r = Replace-Block -Path $engine -Marker 'ALERTS: hover price axis' `
    -StartAnchor '// ALERTS: click price axis to add, double-click line to delete' `
    -EndAnchor '}, [symbol]);' -NewText $hoverEffect

if ($r -eq "nostart") {
    # v2 was not applied - replace the original v1 crosshair effect instead
    $r = Replace-Block -Path $engine -Marker 'ALERTS: hover price axis' `
        -StartAnchor '// ALERTS: crosshair "+ Alert" button' `
        -EndAnchor '}, []);' -NewText $hoverEffect
}

Report "alert hover/delete effects" $r

#---------------------------------------------------------------------
# 3) JSX: add/delete button + clear-all button
#---------------------------------------------------------------------

$buttonJsx = @'
                    ADD / DELETE ALERT BUTTON (price axis only)
                ==================================================*/}

                <button
                    ref={alertBtnRef}
                    onMouseEnter={() => {
                        alertBtnHoveredRef.current = true;
                    }}
                    onMouseLeave={() => {
                        alertBtnHoveredRef.current = false;
                        if (alertBtnRef.current) {
                            alertBtnRef.current.style.display = "none";
                        }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {

                        e.stopPropagation();

                        const btn = e.currentTarget;

                        alertBtnHoveredRef.current = false;

                        if (btn.dataset.mode === "delete") {

                            if (btn.dataset.alertId) {
                                AlertStore.remove(btn.dataset.alertId);
                            }

                            btn.style.display = "none";

                            return;
                        }

                        const price = alertHoverPriceRef.current;

                        if (price == null || !Number.isFinite(price)) {
                            return;
                        }

                        AlertStore.add({
                            symbol,
                            chartId,
                            timeframe,
                            price,
                            direction:
                                latestClose != null && price < latestClose
                                    ? "below"
                                    : "above"
                        });

                        btn.style.display = "none";

                    }}
                    style={{
                        position: "absolute",
                        right: 70,
                        top: 0,
                        display: "none",
                        zIndex: 999,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "var(--bg-panel)",
                        color: "var(--warning-text)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: 4,
                        cursor: "pointer",
                        boxShadow: "var(--shadow)",
                        whiteSpace: "nowrap"
                    }}
                />

                {alertCount > 0 && (
                    <button
                        onClick={(e) => {

                            e.stopPropagation();

                            if (
                                window.confirm(
                                    "Delete all " + alertCount + " alert(s) on " + symbol + "?"
                                )
                            ) {
                                AlertStore.getActive(symbol).forEach((a) => {
                                    AlertStore.remove(a.id);
                                });
                            }

                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Delete all alerts on this symbol"
                        style={{
                            position: "absolute",
                            bottom: 8,
                            right: 40,
                            height: 26,
                            padding: "0 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background: "var(--bg-panel)",
                            color: "var(--warning-text)",
                            border: "1px solid var(--border-primary)",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            zIndex: 999,
                            boxShadow: "var(--shadow)"
                        }}
                    >
                        {"\uD83D\uDDD1"} {alertCount}
                    </button>
                )}
'@

$r = Replace-Block -Path $engine -Marker 'ADD / DELETE ALERT BUTTON' `
    -StartAnchor 'ADD ALERT BUTTON (follows crosshair price)' `
    -EndAnchor '/>' -NewText $buttonJsx

Report "add/delete + clear-all buttons (JSX)" $r

#---------------------------------------------------------------------
# verify
#---------------------------------------------------------------------

$final = (Read-Src $engine).Text
$ok = $final.Contains('ALERTS: hover price axis') -and
      $final.Contains('ADD / DELETE ALERT BUTTON') -and
      $final.Contains('setAlertCount')

Write-Host ""
if ($ok) {
    Write-Host "VERIFIED: all three pieces are present in ChartEngine.tsx" -ForegroundColor Green
}
else {
    Write-Warning "One or more pieces are missing - send me the output above."
}

Write-Host "`nNext: npm run build, restart the dev server, hard-refresh the browser (Ctrl+F5)." -ForegroundColor Cyan
