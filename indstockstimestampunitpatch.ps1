param(
    [string]$Path = ".\server\indstocks\history.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path  (pass the correct path with -Path)"
}

$full = (Resolve-Path -LiteralPath $Path).Path
$raw  = [System.IO.File]::ReadAllText($full)
$hadCrlf = $raw.Contains("`r`n")
$text = $raw -replace "`r`n", "`n"

if ($text.Contains("rawTs > 1e12")) {
    Write-Host "Already patched (unit-safe timestamp logic exists). Nothing to do."
    exit 0
}

$old = @'
    return rows
        .map(row => ({
            time: Math.floor(Number(row.ts) / 1000),
            open: Number(row.o),
            high: Number(row.h),
            low: Number(row.l),
            close: Number(row.c),
            volume: Number(row.v) || 0
        }))
'@
$old = $old -replace "`r`n", "`n"

$new = @'
    return rows
        .map(row => {

            const rawTs = Number(row.ts);

            // IndStocks' docs say ts is milliseconds, but some rows
            // come back already in seconds. A blind /1000 on a
            // seconds value produces a near-epoch-zero timestamp
            // (renders around Jan 1970), which corrupts the whole
            // chart time axis. Detect the unit by magnitude instead
            // of assuming it is always milliseconds.
            const time =
                Number.isFinite(rawTs)
                    ? (
                        rawTs > 1e12
                            ? Math.floor(rawTs / 1000)
                            : Math.floor(rawTs)
                    )
                    : NaN;

            return {
                time,
                open: Number(row.o),
                high: Number(row.h),
                low: Number(row.l),
                close: Number(row.c),
                volume: Number(row.v) || 0
            };

        })
'@
$new = $new -replace "`r`n", "`n"

$count = ([regex]::Matches($text, [regex]::Escape($old))).Count
if ($count -ne 1) {
    throw "Expected 1 match for the row-mapping block, found $count. File not modified."
}

$text = $text.Replace($old, $new)

Copy-Item -LiteralPath $full -Destination ($full + ".bak4") -Force

if ($hadCrlf) {
    $text = $text -replace "`n", "`r`n"
}

[System.IO.File]::WriteAllText($full, $text, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Patched OK: $full"
Write-Host "Backup: $full.bak4"
