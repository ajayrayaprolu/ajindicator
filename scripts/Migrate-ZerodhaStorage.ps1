#======================================================
# scripts/Migrate-ZerodhaStorage.ps1
#
# ZERODHA STORAGE MIGRATION
#
# FINAL STRUCTURE
#
# server/
# └── zerodha/
#     ├── instruments/
#     │   ├── instruments.js
#     │   ├── instruments.json
#     │   ├── InstrumentDatabase.js
#     │   ├── InstrumentSynchronizer.js
#     │   └── ZerodhaInstrumentCache.ts
#     │
#     ├── data/
#     │   ├── zerodha-contract-master.db
#     │   ├── zerodha-contract-master.db-wal
#     │   ├── zerodha-contract-master.db-shm
#     │   ├── zerodha-candle-cache.db
#     │   ├── ZerodhaContractDatabase.js
#     │   └── ZerodhaCandleDatabase.js
#     │
#     └── ...
#
# OPERATIONS
# ----------
# 1. Validate environment
# 2. Backup legacy storage
# 3. Move/copy instruments.json
# 4. SQLite-aware contract DB migration
# 5. Verify source/destination integrity
# 6. Verify row counts
# 7. Create candle cache DB
# 8. Verify all final files
# 9. Remove legacy files
# 10. Remove old backups according to RetentionDays
#
# IMPORTANT
# ---------
# STOP Node.js before running this script.
#
#======================================================

param(
    [ValidateRange(1, 3650)]
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

#======================================================
# PROJECT PATHS
#======================================================

$ProjectRoot =
    Split-Path -Parent $PSScriptRoot

$ZerodhaRoot =
    Join-Path `
        $ProjectRoot `
        "server\zerodha"

$InstrumentsDir =
    Join-Path `
        $ZerodhaRoot `
        "instruments"

$DataDir =
    Join-Path `
        $ZerodhaRoot `
        "data"

$BackupRoot =
    Join-Path `
        $ProjectRoot `
        "backups\zerodha-storage"

#======================================================
# LEGACY CONTRACT DATABASE
#======================================================

$SourceDb =
    Join-Path `
        $InstrumentsDir `
        "instruments.db"

$SourceWal =
    "$SourceDb-wal"

$SourceShm =
    "$SourceDb-shm"

#======================================================
# FINAL CONTRACT DATABASE
#======================================================

$ContractDb =
    Join-Path `
        $DataDir `
        "zerodha-contract-master.db"

$ContractWal =
    "$ContractDb-wal"

$ContractShm =
    "$ContractDb-shm"

#======================================================
# FINAL CANDLE DATABASE
#======================================================

$CandleDb =
    Join-Path `
        $DataDir `
        "zerodha-candle-cache.db"

$CandleWal =
    "$CandleDb-wal"

$CandleShm =
    "$CandleDb-shm"

#======================================================
# JSON FILES
#======================================================

$RootJson =
    Join-Path `
        $ZerodhaRoot `
        "instruments.json"

$InstrumentJson =
    Join-Path `
        $InstrumentsDir `
        "instruments.json"

#======================================================
# DISPLAY
#======================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "ZERODHA STORAGE MIGRATION" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Project:"
Write-Host "  $ProjectRoot"
Write-Host ""

Write-Host "Legacy Contract DB:"
Write-Host "  $SourceDb"
Write-Host ""

Write-Host "Final Contract DB:"
Write-Host "  $ContractDb"
Write-Host ""

Write-Host "Final Candle DB:"
Write-Host "  $CandleDb"
Write-Host ""

Write-Host "Current JSON:"
Write-Host "  $RootJson"
Write-Host ""

Write-Host "Final JSON:"
Write-Host "  $InstrumentJson"
Write-Host ""

Write-Host "Backup retention:"
Write-Host "  $RetentionDays days"
Write-Host ""

#======================================================
# VALIDATE NODE
#======================================================

$NodeCommand =
    Get-Command node `
        -ErrorAction SilentlyContinue

if (-not $NodeCommand) {
    throw "Node.js was not found in PATH."
}

Write-Host "Node:"
Write-Host "  $($NodeCommand.Source)" -ForegroundColor Green
Write-Host ""

#======================================================
# VALIDATE BETTER-SQLITE3
#======================================================

$BetterSqlitePath =
    Join-Path `
        $ProjectRoot `
        "node_modules\better-sqlite3"

if (-not (Test-Path $BetterSqlitePath)) {

    throw @"
better-sqlite3 was not found:

$BetterSqlitePath

Run:

cd $ProjectRoot
npm install
"@
}

Write-Host "better-sqlite3:"
Write-Host "  $BetterSqlitePath" -ForegroundColor Green
Write-Host ""

#======================================================
# VALIDATE SOURCE DATABASE
#======================================================

if (-not (Test-Path $SourceDb)) {

    throw @"
Legacy contract database was not found:

$SourceDb
"@
}

#======================================================
# VALIDATE JSON SOURCE
#======================================================

if (
    -not (Test-Path $RootJson) -and
    -not (Test-Path $InstrumentJson)
) {

    throw @"
No Zerodha instruments.json was found.

Checked:

$RootJson
$InstrumentJson
"@
}

#======================================================
# CONFIRM
#======================================================

Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "The Node.js application MUST be stopped."
Write-Host ""
Write-Host "The legacy database will be removed only AFTER"
Write-Host "successful migration and verification."
Write-Host ""

$Confirmation =
    Read-Host `
        "Type YES to perform the complete migration and cleanup"

if ($Confirmation -ne "YES") {

    Write-Host ""
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

#======================================================
# CREATE DIRECTORIES
#======================================================

New-Item `
    -ItemType Directory `
    -Path $InstrumentsDir `
    -Force |
    Out-Null

New-Item `
    -ItemType Directory `
    -Path $DataDir `
    -Force |
    Out-Null

New-Item `
    -ItemType Directory `
    -Path $BackupRoot `
    -Force |
    Out-Null

#======================================================
# CREATE BACKUP
#======================================================

$BackupStamp =
    Get-Date -Format "yyyyMMdd-HHmmss"

$BackupDir =
    Join-Path `
        $BackupRoot `
        $BackupStamp

New-Item `
    -ItemType Directory `
    -Path $BackupDir `
    -Force |
    Out-Null

Write-Host ""
Write-Host "Backup directory:" -ForegroundColor Cyan
Write-Host "  $BackupDir"
Write-Host ""

#======================================================
# BACKUP LEGACY DATABASE FILES
#======================================================

Write-Host "Backing up legacy database..." -ForegroundColor Cyan

foreach ($LegacyFile in @(
    $SourceDb,
    $SourceWal,
    $SourceShm
)) {

    if (Test-Path $LegacyFile) {

        Copy-Item `
            -Path $LegacyFile `
            -Destination (
                Join-Path `
                    $BackupDir `
                    (Split-Path $LegacyFile -Leaf)
            ) `
            -Force

        Write-Host "  Backed up: $(Split-Path $LegacyFile -Leaf)"
    }
}

#======================================================
# BACKUP ROOT JSON
#======================================================

if (Test-Path $RootJson) {

    Copy-Item `
        -Path $RootJson `
        -Destination (
            Join-Path `
                $BackupDir `
                "instruments-root.json"
        ) `
        -Force

    Write-Host "  Backed up: instruments-root.json"
}

#======================================================
# BACKUP EXISTING DESTINATION JSON
#======================================================

if (
    (Test-Path $InstrumentJson) -and
    ((Resolve-Path $InstrumentJson).Path -ne
     (Resolve-Path $RootJson -ErrorAction SilentlyContinue).Path)
) {

    Copy-Item `
        -Path $InstrumentJson `
        -Destination (
            Join-Path `
                $BackupDir `
                "instruments-existing.json"
        ) `
        -Force
}

#======================================================
# MOVE/COPY JSON
#======================================================

if (Test-Path $RootJson) {

    Write-Host ""
    Write-Host "Preparing instruments.json..." -ForegroundColor Cyan

    Copy-Item `
        -Path $RootJson `
        -Destination $InstrumentJson `
        -Force

    Write-Host "JSON copied:" -ForegroundColor Green
    Write-Host "  $InstrumentJson"
}

#======================================================
# VALIDATE JSON
#======================================================

$JsonValidationScript =
    Join-Path `
        $ProjectRoot `
        "scripts\_Validate-ZerodhaJson.cjs"

@'
const fs = require("fs");

const file = process.argv[2];

if (!file) {
    throw new Error("JSON file path was not provided.");
}

const content =
    fs.readFileSync(
        file,
        "utf8"
    );

const data =
    JSON.parse(content);

if (!Array.isArray(data)) {
    throw new Error(
        "instruments.json is not a JSON array."
    );
}

console.log(
    `JSON instrument count: ${data.length}`
);

console.log(
    "JSON validation: OK"
);
'@ |
    Set-Content `
        -Path $JsonValidationScript `
        -Encoding UTF8

try {

    Write-Host ""
    Write-Host "Validating instruments.json..." -ForegroundColor Cyan

    node `
        $JsonValidationScript `
        $InstrumentJson

    if ($LASTEXITCODE -ne 0) {
        throw "instruments.json validation failed."
    }

}
finally {

    if (Test-Path $JsonValidationScript) {

        Remove-Item `
            $JsonValidationScript `
            -Force `
            -ErrorAction SilentlyContinue
    }
}

#======================================================
# SQLITE MIGRATION SCRIPT
#======================================================

$MigrationScript =
    Join-Path `
        $ProjectRoot `
        "scripts\_Migrate-ZerodhaSQLite.mjs"

@'
import Database from "better-sqlite3";
import fs from "fs";

const source = process.argv[2];
const destination = process.argv[3];

if (!source || !destination) {
    throw new Error(
        "Source and destination database paths are required."
    );
}

let sourceCount = null;

console.log("");
console.log("Opening source database...");

const sourceDb =
    new Database(
        source,
        {
            readonly: true
        }
    );

try {

    //==================================================
    // SOURCE INTEGRITY
    //==================================================

    console.log(
        "Running source integrity check..."
    );

    const sourceIntegrity =
        sourceDb.pragma(
            "integrity_check",
            {
                simple: true
            }
        );

    console.log(
        `Source integrity: ${sourceIntegrity}`
    );

    if (sourceIntegrity !== "ok") {

        throw new Error(
            `Source integrity check failed: ${sourceIntegrity}`
        );
    }

    //==================================================
    // SOURCE TABLE
    //==================================================

    const sourceTable =
        sourceDb
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = 'instruments'
            `)
            .get();

    if (!sourceTable) {

        throw new Error(
            "Source database does not contain the instruments table."
        );
    }

    //==================================================
    // SOURCE ROW COUNT
    //==================================================

    sourceCount =
        sourceDb
            .prepare(`
                SELECT COUNT(*) AS count
                FROM instruments
            `)
            .get()
            .count;

    console.log(
        `Source instrument rows: ${sourceCount}`
    );

    //==================================================
    // REMOVE OLD DESTINATION
    //==================================================

    if (fs.existsSync(destination)) {

        console.log("");
        console.log(
            "Existing destination database found."
        );

        console.log(
            "Removing existing destination..."
        );

        for (const file of [
            destination,
            `${destination}-wal`,
            `${destination}-shm`
        ]) {

            if (fs.existsSync(file)) {

                fs.rmSync(
                    file,
                    {
                        force: true
                    }
                );
            }
        }
    }

    //==================================================
    // SQLITE BACKUP
    //==================================================

    console.log("");
    console.log(
        "Creating SQLite backup..."
    );

    await sourceDb.backup(
        destination
    );

    console.log(
        "SQLite backup completed."
    );

}
finally {

    sourceDb.close();

}

//======================================================
// DESTINATION VERIFICATION
//======================================================

console.log("");
console.log(
    "Opening destination database..."
);

const destinationDb =
    new Database(
        destination
    );

try {

    //==================================================
    // DESTINATION INTEGRITY
    //==================================================

    console.log(
        "Running destination integrity check..."
    );

    const destinationIntegrity =
        destinationDb.pragma(
            "integrity_check",
            {
                simple: true
            }
        );

    console.log(
        `Destination integrity: ${destinationIntegrity}`
    );

    if (destinationIntegrity !== "ok") {

        throw new Error(
            `Destination integrity check failed: ${destinationIntegrity}`
        );
    }

    //==================================================
    // DESTINATION TABLE
    //==================================================

    const destinationTable =
        destinationDb
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = 'instruments'
            `)
            .get();

    if (!destinationTable) {

        throw new Error(
            "Destination database does not contain the instruments table."
        );
    }

    //==================================================
    // DESTINATION ROW COUNT
    //==================================================

    const destinationCount =
        destinationDb
            .prepare(`
                SELECT COUNT(*) AS count
                FROM instruments
            `)
            .get()
            .count;

    console.log(
        `Destination instrument rows: ${destinationCount}`
    );

    //==================================================
    // ROW COUNT COMPARISON
    //==================================================

    if (
        Number(sourceCount) !==
        Number(destinationCount)
    ) {

        throw new Error(
            `Row count mismatch. Source=${sourceCount}, Destination=${destinationCount}`
        );
    }

    //==================================================
    // FEED SOURCE DISTRIBUTION
    //==================================================

    console.log("");
    console.log(
        "Feed source distribution:"
    );

    const feedRows =
        destinationDb
            .prepare(`
                SELECT
                    feed_source,
                    COUNT(*) AS count
                FROM instruments
                GROUP BY feed_source
                ORDER BY feed_source
            `)
            .all();

    for (const row of feedRows) {

        console.log(
            `  ${row.feed_source}: ${row.count}`
        );
    }

    //==================================================
    // INDEXES
    //==================================================

    console.log("");
    console.log("Indexes:");

    const indexes =
        destinationDb
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'index'
                  AND sql IS NOT NULL
                ORDER BY name
            `)
            .all();

    for (const index of indexes) {

        console.log(
            `  ${index.name}`
        );
    }

    console.log("");
    console.log(
        "Destination database verified successfully."
    );

}
finally {

    destinationDb.close();

}

console.log("");
console.log(
    "SQLite migration verification completed."
);
'@ |
    Set-Content `
        -Path $MigrationScript `
        -Encoding UTF8

#======================================================
# RUN SQLITE MIGRATION
#======================================================

Push-Location $ProjectRoot

try {

    Write-Host ""
    Write-Host "Executing SQLite contract-master migration..." -ForegroundColor Cyan
    Write-Host ""

    node `
        $MigrationScript `
        $SourceDb `
        $ContractDb

    if ($LASTEXITCODE -ne 0) {

        throw `
            "SQLite contract-master migration failed."
    }

}
finally {

    Pop-Location

    if (Test-Path $MigrationScript) {

        Remove-Item `
            $MigrationScript `
            -Force `
            -ErrorAction SilentlyContinue
    }
}

#======================================================
# CREATE CANDLE DATABASE
#======================================================

$CandleScript =
    Join-Path `
        $ProjectRoot `
        "scripts\_Initialize-ZerodhaCandleDb.mjs"

@'
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const databaseFile = process.argv[2];

if (!databaseFile) {
    throw new Error(
        "Candle database path is required."
    );
}

fs.mkdirSync(
    path.dirname(databaseFile),
    {
        recursive: true
    }
);

const db =
    new Database(
        databaseFile
    );

try {

    db.pragma(
        "journal_mode = WAL"
    );

    db.pragma(
        "synchronous = NORMAL"
    );

    db.exec(`
        CREATE TABLE IF NOT EXISTS candles (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            exchange TEXT NOT NULL,

            instrument_token TEXT NOT NULL,

            trading_symbol TEXT,

            interval TEXT NOT NULL,

            candle_time TEXT NOT NULL,

            open REAL NOT NULL,

            high REAL NOT NULL,

            low REAL NOT NULL,

            close REAL NOT NULL,

            volume REAL,

            open_interest REAL,

            last_updated TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                instrument_token,
                interval,
                candle_time
            )
        );

        CREATE INDEX IF NOT EXISTS
            idx_candles_token
        ON candles (
            instrument_token
        );

        CREATE INDEX IF NOT EXISTS
            idx_candles_symbol
        ON candles (
            trading_symbol
        );

        CREATE INDEX IF NOT EXISTS
            idx_candles_interval
        ON candles (
            interval
        );

        CREATE INDEX IF NOT EXISTS
            idx_candles_time
        ON candles (
            candle_time
        );

        CREATE INDEX IF NOT EXISTS
            idx_candles_lookup
        ON candles (
            instrument_token,
            interval,
            candle_time
        );
    `);

    const integrity =
        db.pragma(
            "integrity_check",
            {
                simple: true
            }
        );

    if (integrity !== "ok") {

        throw new Error(
            `Candle database integrity failed: ${integrity}`
        );
    }

    const table =
        db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = 'candles'
            `)
            .get();

    if (!table) {

        throw new Error(
            "candles table was not created."
        );
    }

    console.log(
        "[ZERODHA CANDLE DB] SQLite initialized:",
        databaseFile
    );

    console.log(
        "[ZERODHA CANDLE DB] Integrity: OK"
    );

}
finally {

    db.close();

}
'@ |
    Set-Content `
        -Path $CandleScript `
        -Encoding UTF8

Push-Location $ProjectRoot

try {

    Write-Host ""
    Write-Host "Creating Zerodha candle cache database..." -ForegroundColor Cyan
    Write-Host ""

    node `
        $CandleScript `
        $CandleDb

    if ($LASTEXITCODE -ne 0) {

        throw `
            "Candle database initialization failed."
    }

}
finally {

    Pop-Location

    if (Test-Path $CandleScript) {

        Remove-Item `
            $CandleScript `
            -Force `
            -ErrorAction SilentlyContinue
    }
}

#======================================================
# FINAL PRE-CLEANUP VERIFICATION
#======================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "FINAL PRE-CLEANUP VERIFICATION" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$RequiredFiles = @(
    $InstrumentJson,
    $ContractDb,
    $CandleDb,
    (Join-Path $InstrumentsDir "instruments.js"),
    (Join-Path $InstrumentsDir "InstrumentDatabase.js"),
    (Join-Path $InstrumentsDir "InstrumentSynchronizer.js"),
    (Join-Path $DataDir "ZerodhaContractDatabase.js"),
    (Join-Path $DataDir "ZerodhaCandleDatabase.js")
)

$VerificationFailed = $false

foreach ($RequiredFile in $RequiredFiles) {

    if (Test-Path $RequiredFile) {

        Write-Host `
            "OK   $RequiredFile" `
            -ForegroundColor Green

    }
    else {

        Write-Host `
            "FAIL $RequiredFile" `
            -ForegroundColor Red

        $VerificationFailed = $true
    }
}

if ($VerificationFailed) {

    throw `
        "Final verification failed. Legacy files will NOT be deleted."
}

#======================================================
# VERIFY FINAL CONTRACT DATABASE AGAIN
#======================================================

$FinalVerificationScript =
    Join-Path `
        $ProjectRoot `
        "scripts\_Verify-ZerodhaContractDb.mjs"

@'
import Database from "better-sqlite3";

const databaseFile = process.argv[2];

const db =
    new Database(
        databaseFile,
        {
            readonly: true
        }
    );

try {

    const integrity =
        db.pragma(
            "integrity_check",
            {
                simple: true
            }
        );

    if (integrity !== "ok") {

        throw new Error(
            `Final contract DB integrity failed: ${integrity}`
        );
    }

    const table =
        db
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = 'instruments'
            `)
            .get();

    if (!table) {

        throw new Error(
            "Final contract DB has no instruments table."
        );
    }

    const count =
        db
            .prepare(`
                SELECT COUNT(*) AS count
                FROM instruments
            `)
            .get()
            .count;

    console.log(
        `Final contract DB rows: ${count}`
    );

    console.log(
        `Final contract DB integrity: ${integrity}`
    );

    if (Number(count) <= 0) {

        throw new Error(
            "Final contract database contains zero instruments."
        );
    }

}
finally {

    db.close();

}
'@ |
    Set-Content `
        -Path $FinalVerificationScript `
        -Encoding UTF8

Push-Location $ProjectRoot

try {

    Write-Host ""
    Write-Host "Final contract database verification..." -ForegroundColor Cyan
    Write-Host ""

    node `
        $FinalVerificationScript `
        $ContractDb

    if ($LASTEXITCODE -ne 0) {

        throw `
            "Final contract database verification failed."
    }

}
finally {

    Pop-Location

    if (Test-Path $FinalVerificationScript) {

        Remove-Item `
            $FinalVerificationScript `
            -Force `
            -ErrorAction SilentlyContinue
    }
}

#======================================================
# REMOVE LEGACY DATABASE
#======================================================

Write-Host ""
Write-Host "Removing legacy SQLite files..." -ForegroundColor Cyan

foreach ($LegacyFile in @(
    $SourceDb,
    $SourceWal,
    $SourceShm
)) {

    if (Test-Path $LegacyFile) {

        Remove-Item `
            -Path $LegacyFile `
            -Force

        Write-Host `
            "Removed: $LegacyFile" `
            -ForegroundColor Green
    }
}

#======================================================
# REMOVE DUPLICATE ROOT JSON
#======================================================

if (
    (Test-Path $RootJson) -and
    (Test-Path $InstrumentJson)
) {

    $RootFullPath =
        [System.IO.Path]::GetFullPath(
            $RootJson
        )

    $FinalFullPath =
        [System.IO.Path]::GetFullPath(
            $InstrumentJson
        )

    if ($RootFullPath -ne $FinalFullPath) {

        Remove-Item `
            -Path $RootJson `
            -Force

        Write-Host ""
        Write-Host `
            "Removed duplicate root instruments.json:" `
            -ForegroundColor Green

        Write-Host `
            "  $RootJson"
    }
}

#======================================================
# CLEAN OLD BACKUPS
#======================================================

Write-Host ""
Write-Host `
    "Cleaning backups older than $RetentionDays days..." `
    -ForegroundColor Cyan

$CutoffDate =
    (Get-Date).AddDays(
        -$RetentionDays
    )

Get-ChildItem `
    -Path $BackupRoot `
    -Directory `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.LastWriteTime -lt $CutoffDate
    } |
    ForEach-Object {

        Write-Host `
            "Removing old backup: $($_.FullName)"

        Remove-Item `
            $_.FullName `
            -Recurse `
            -Force
    }

#======================================================
# FINAL DIRECTORY LISTING
#======================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "FINAL ZERODHA DATA DIRECTORY" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

Get-ChildItem `
    $DataDir `
    -File |
    Select-Object `
        Name,
        Length,
        LastWriteTime |
    Format-Table `
        -AutoSize

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "FINAL ZERODHA INSTRUMENTS DIRECTORY" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

Get-ChildItem `
    $InstrumentsDir `
    -File |
    Select-Object `
        Name,
        Length,
        LastWriteTime |
    Format-Table `
        -AutoSize

#======================================================
# LEGACY FILE CHECK
#======================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "LEGACY FILE CHECK" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

$LegacyRemaining = $false

foreach ($LegacyFile in @(
    $SourceDb,
    $SourceWal,
    $SourceShm,
    $RootJson
)) {

    if ($LegacyFile -and (Test-Path $LegacyFile)) {

        Write-Host `
            "WARNING - still exists: $LegacyFile" `
            -ForegroundColor Yellow

        $LegacyRemaining = $true

    }
    else {

        Write-Host `
            "OK - removed: $LegacyFile" `
            -ForegroundColor Green
    }
}

#======================================================
# COMPLETE
#======================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "ZERODHA STORAGE MIGRATION COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Contract database:"
Write-Host "  $ContractDb"

Write-Host ""
Write-Host "Candle database:"
Write-Host "  $CandleDb"

Write-Host ""
Write-Host "Instrument JSON:"
Write-Host "  $InstrumentJson"

Write-Host ""
Write-Host "Backup:"
Write-Host "  $BackupDir"

Write-Host ""
Write-Host "Retention:"
Write-Host "  $RetentionDays days"

if ($LegacyRemaining) {

    Write-Host ""
    Write-Host "WARNING: Some legacy files remain." -ForegroundColor Yellow
}

Write-Host ""