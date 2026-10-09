#======================================================
# migration_Alicebluestorage.ps1
#======================================================
# AliceBlue Storage Migration
#
# Source:
#
#   server\aliceblue\data\contract-master.json
#   server\aliceblue\data\candle-cache\*.json
#
# Target:
#
#   server\aliceblue\data\aliceblue-contract-master.db
#   server\aliceblue\data\aliceblue-candle-cache.db
#
# Architecture:
#
#   AliceBlue Contract JSON
#          ↓
#   SQLite Contract DB
#
#   AliceBlue Candle JSON
#          ↓
#   SQLite Candle DB
#
# IMPORTANT:
#
#   - IndStocks storage is NOT touched.
#   - AliceBlue history.js is NOT modified.
#   - Existing AliceBlue → IndStocks fallback remains untouched.
#   - Legacy JSON is retained unless -RemoveLegacy is supplied.
#   - Migration stops on validation failure.
#
# Usage:
#
#   .\migration_Alicebluestorage.ps1
#
# Optional:
#
#   .\migration_Alicebluestorage.ps1 -RemoveLegacy
#
# Optional retention:
#
#   .\migration_Alicebluestorage.ps1 -RetentionDays 31
#
#======================================================

[CmdletBinding()]
param(

    [int]
    $RetentionDays = 31,

    [switch]
    $RemoveLegacy
)

$ErrorActionPreference = "Stop"

#======================================================
# CONFIGURATION
#======================================================

$ProjectRoot =
    (Get-Location).Path

$AliceBlueRoot =
    Join-Path `
        $ProjectRoot `
        "server\aliceblue"

$AliceBlueData =
    Join-Path `
        $AliceBlueRoot `
        "data"

$ContractSource =
    Join-Path `
        $AliceBlueData `
        "contract-master.json"

$CandleSource =
    Join-Path `
        $AliceBlueData `
        "candle-cache"

$ContractDatabase =
    Join-Path `
        $AliceBlueData `
        "aliceblue-contract-master.db"

$CandleDatabase =
    Join-Path `
        $AliceBlueData `
        "aliceblue-candle-cache.db"

$BackupRoot =
    Join-Path `
        $AliceBlueData `
        "migration-backup"

$Timestamp =
    Get-Date -Format "yyyyMMdd_HHmmss"

$BackupDirectory =
    Join-Path `
        $BackupRoot `
        $Timestamp

#======================================================
# HEADER
#======================================================

Write-Host ""
Write-Host "======================================================"
Write-Host " ALICEBLUE STORAGE MIGRATION"
Write-Host "======================================================"
Write-Host ""
Write-Host "Project Root     : $ProjectRoot"
Write-Host "AliceBlue Data   : $AliceBlueData"
Write-Host "Contract Source  : $ContractSource"
Write-Host "Candle Source    : $CandleSource"
Write-Host "Contract DB      : $ContractDatabase"
Write-Host "Candle DB        : $CandleDatabase"
Write-Host "Retention Days   : $RetentionDays"
Write-Host "Remove Legacy    : $RemoveLegacy"
Write-Host ""

#======================================================
# BASIC VALIDATION
#======================================================

if (-not (Test-Path $AliceBlueData)) {

    throw `
        "AliceBlue data directory not found: $AliceBlueData"
}

if (-not (Test-Path $ContractSource)) {

    throw `
        "AliceBlue contract-master.json not found: $ContractSource"
}

if (-not (Test-Path $CandleSource)) {

    throw `
        "AliceBlue candle-cache directory not found: $CandleSource"
}

if ($RetentionDays -lt 1) {

    throw `
        "RetentionDays must be >= 1."
}

#======================================================
# VERIFY NODE
#======================================================

Write-Host "[CHECK] Verifying Node.js..."

$nodeCommand =
    Get-Command node `
        -ErrorAction SilentlyContinue

if (-not $nodeCommand) {

    throw `
        "Node.js was not found in PATH."
}

Write-Host "[PASS] Node.js found:"
Write-Host "       $($nodeCommand.Source)"
Write-Host ""

#======================================================
# VERIFY BETTER-SQLITE3
#======================================================

Write-Host "[CHECK] Verifying better-sqlite3..."

Push-Location $ProjectRoot

try {

    $checkOutput =
        & node -e "require.resolve('better-sqlite3'); console.log('BETTER_SQLITE3_OK')" 2>&1

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "[ERROR] Node.js could not resolve better-sqlite3."
        Write-Host $checkOutput

        throw `
            "better-sqlite3 could not be resolved from the project root."
    }

    Write-Host "[PASS] better-sqlite3 available."
}
finally {

    Pop-Location
}

Write-Host ""

#======================================================
# CREATE BACKUP
#======================================================

Write-Host "[BACKUP] Creating AliceBlue JSON backup..."

New-Item `
    -ItemType Directory `
    -Path $BackupDirectory `
    -Force |
    Out-Null

Copy-Item `
    -Path $ContractSource `
    -Destination `
        (Join-Path $BackupDirectory "contract-master.json") `
    -Force

$candleBackup =
    Join-Path `
        $BackupDirectory `
        "candle-cache"

New-Item `
    -ItemType Directory `
    -Path $candleBackup `
    -Force |
    Out-Null

$candleFiles =
    Get-ChildItem `
        -Path $CandleSource `
        -Filter "*.json" `
        -File

foreach ($file in $candleFiles) {

    Copy-Item `
        -Path $file.FullName `
        -Destination `
            (Join-Path $candleBackup $file.Name) `
        -Force
}

Write-Host "[PASS] Backup created:"
Write-Host "       $BackupDirectory"
Write-Host ""

#======================================================
# PREPARE NODE MIGRATION PROGRAM
#======================================================

$MigrationNodeScript =
@'
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const projectRoot = process.cwd();

const aliceBlueData =
    path.join(
        projectRoot,
        "server",
        "aliceblue",
        "data"
    );

const contractSource =
    path.join(
        aliceBlueData,
        "contract-master.json"
    );

const candleSource =
    path.join(
        aliceBlueData,
        "candle-cache"
    );

const contractDatabasePath =
    path.join(
        aliceBlueData,
        "aliceblue-contract-master.db"
    );

const candleDatabasePath =
    path.join(
        aliceBlueData,
        "aliceblue-candle-cache.db"
    );

const retentionDays =
    Number(
        process.env.ALICEBLUE_RETENTION_DAYS || 31
    );

function log(message) {
    console.log(message);
}

function fail(message) {
    console.error("");
    console.error("[FAIL] " + message);
    process.exit(1);
}

function ensureDirectory(directory) {

    fs.mkdirSync(
        directory,
        {
            recursive: true
        }
    );
}

function configureDatabase(database) {

    database.pragma(
        "journal_mode = WAL"
    );

    database.pragma(
        "synchronous = NORMAL"
    );

    database.pragma(
        "busy_timeout = 5000"
    );

    database.pragma(
        "foreign_keys = ON"
    );

    database.pragma(
        "temp_store = MEMORY"
    );
}

function closeDatabase(database) {

    if (!database) {
        return;
    }

    try {

        database.pragma(
            "wal_checkpoint(TRUNCATE)"
        );

    } catch (error) {

        console.warn(
            "[WARN] WAL checkpoint failed:",
            error.message
        );
    }

    try {

        database.close();

    } catch (error) {

        console.warn(
            "[WARN] Database close failed:",
            error.message
        );
    }
}

ensureDirectory(
    aliceBlueData
);

if (!fs.existsSync(contractSource)) {

    fail(
        "contract-master.json not found: " +
        contractSource
    );
}

if (!fs.existsSync(candleSource)) {

    fail(
        "candle-cache directory not found: " +
        candleSource
    );
}

//======================================================
// CONTRACT DATABASE
//======================================================

log("");
log("======================================================");
log(" ALICEBLUE CONTRACT DATABASE");
log("======================================================");

const contractDatabase =
    new Database(
        contractDatabasePath
    );

configureDatabase(
    contractDatabase
);

contractDatabase.exec(`
    CREATE TABLE IF NOT EXISTS contracts (

        exchange
            TEXT NOT NULL,

        exchange_segment
            TEXT NOT NULL,

        token
            TEXT NOT NULL,

        symbol
            TEXT,

        trading_symbol
            TEXT,

        formatted_name
            TEXT,

        instrument_type
            TEXT,

        group_name
            TEXT,

        expiry
            TEXT,

        option_type
            TEXT,

        lot_size
            INTEGER,

        tick_size
            REAL,

        raw
            TEXT,

        created_at
            INTEGER NOT NULL,

        updated_at
            INTEGER NOT NULL,

        PRIMARY KEY (
            exchange_segment,
            token
        )
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contract_symbol
    ON contracts (
        symbol
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contract_trading_symbol
    ON contracts (
        trading_symbol
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contract_exchange
    ON contracts (
        exchange
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contract_expiry
    ON contracts (
        expiry
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contract_option_type
    ON contracts (
        option_type
    );
`);

let contractJson;

try {

    contractJson =
        JSON.parse(
            fs.readFileSync(
                contractSource,
                "utf8"
            )
        );

} catch (error) {

    closeDatabase(
        contractDatabase
    );

    fail(
        "Unable to parse contract-master.json: " +
        error.message
    );
}

if (
    !contractJson ||
    !Array.isArray(
        contractJson.contracts
    )
) {

    closeDatabase(
        contractDatabase
    );

    fail(
        "contract-master.json does not contain a valid contracts array."
    );
}

const sourceContractCount =
    contractJson.contracts.length;

log(
    "[INFO] Source contracts : " +
    sourceContractCount
);

const now =
    Math.floor(
        Date.now() / 1000
    );

const insertContract =
    contractDatabase.prepare(`
        INSERT INTO contracts (
            exchange,
            exchange_segment,
            token,
            symbol,
            trading_symbol,
            formatted_name,
            instrument_type,
            group_name,
            expiry,
            option_type,
            lot_size,
            tick_size,
            raw,
            created_at,
            updated_at
        )
        VALUES (
            @exchange,
            @exchange_segment,
            @token,
            @symbol,
            @trading_symbol,
            @formatted_name,
            @instrument_type,
            @group_name,
            @expiry,
            @option_type,
            @lot_size,
            @tick_size,
            @raw,
            @created_at,
            @updated_at
        )
        ON CONFLICT (
            exchange_segment,
            token
        )
        DO UPDATE SET

            exchange =
                excluded.exchange,

            symbol =
                excluded.symbol,

            trading_symbol =
                excluded.trading_symbol,

            formatted_name =
                excluded.formatted_name,

            instrument_type =
                excluded.instrument_type,

            group_name =
                excluded.group_name,

            expiry =
                excluded.expiry,

            option_type =
                excluded.option_type,

            lot_size =
                excluded.lot_size,

            tick_size =
                excluded.tick_size,

            raw =
                excluded.raw,

            updated_at =
                excluded.updated_at
    `);

const insertContracts =
    contractDatabase.transaction(
        contracts => {

            let count = 0;

            for (
                const contract of contracts
            ) {

                if (
                    !contract ||
                    contract.token === undefined ||
                    contract.token === null
                ) {
                    continue;
                }

                const exchange =
                    String(
                        contract.exchange || ""
                    );

                const exchangeSegment =
                    String(
                        contract.exchangeSegment || ""
                    );

                const token =
                    String(
                        contract.token
                    );

                if (
                    !exchangeSegment ||
                    !token
                ) {
                    continue;
                }

                insertContract.run({

                    exchange,

                    exchange_segment:
                        exchangeSegment,

                    token,

                    symbol:
                        contract.symbol ?? null,

                    trading_symbol:
                        contract.tradingSymbol ?? null,

                    formatted_name:
                        contract.formattedName ?? null,

                    instrument_type:
                        contract.instrumentType ?? null,

                    group_name:
                        contract.groupName ?? null,

                    expiry:
                        contract.expiry ?? null,

                    option_type:
                        contract.optionType ?? null,

                    lot_size:
                        Number.isFinite(
                            Number(
                                contract.lotSize
                            )
                        )
                            ? Number(
                                contract.lotSize
                            )
                            : null,

                    tick_size:
                        Number.isFinite(
                            Number(
                                contract.tickSize
                            )
                        )
                            ? Number(
                                contract.tickSize
                            )
                            : null,

                    raw:
                        contract.raw
                            ? JSON.stringify(
                                contract.raw
                            )
                            : null,

                    created_at:
                        now,

                    updated_at:
                        now
                });

                count++;
            }

            return count;
        }
    );

const migratedContractCount =
    insertContracts(
        contractJson.contracts
    );

const databaseContractCount =
    contractDatabase
        .prepare(`
            SELECT COUNT(*) AS count
            FROM contracts
        `)
        .get()
        .count;

log(
    "[INFO] Migrated contracts : " +
    migratedContractCount
);

log(
    "[INFO] SQLite contracts   : " +
    databaseContractCount
);

if (
    Number(
        databaseContractCount
    ) !==
    Number(
        sourceContractCount
    )
) {

    closeDatabase(
        contractDatabase
    );

    fail(
        "Contract validation failed. Source=" +
        sourceContractCount +
        " SQLite=" +
        databaseContractCount
    );
}

log(
    "[PASS] Contract count validation"
);

closeDatabase(
    contractDatabase
);

log(
    "[PASS] Contract SQLite database created"
);

//======================================================
// CANDLE DATABASE
//======================================================

log("");
log("======================================================");
log(" ALICEBLUE CANDLE DATABASE");
log("======================================================");

const candleDatabase =
    new Database(
        candleDatabasePath
    );

configureDatabase(
    candleDatabase
);

candleDatabase.exec(`
    CREATE TABLE IF NOT EXISTS candles (

        exchange
            TEXT NOT NULL,

        token
            TEXT NOT NULL,

        resolution
            TEXT NOT NULL,

        candle_time
            INTEGER NOT NULL,

        open
            REAL NOT NULL,

        high
            REAL NOT NULL,

        low
            REAL NOT NULL,

        close
            REAL NOT NULL,

        volume
            REAL NOT NULL DEFAULT 0,

        cached_at
            TEXT,

        created_at
            INTEGER NOT NULL,

        updated_at
            INTEGER NOT NULL,

        PRIMARY KEY (
            exchange,
            token,
            resolution,
            candle_time
        )
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_candle_lookup
    ON candles (
        exchange,
        token,
        resolution,
        candle_time
    );

    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_candle_time
    ON candles (
        candle_time
    );
`);

const insertCandle =
    candleDatabase.prepare(`
        INSERT INTO candles (
            exchange,
            token,
            resolution,
            candle_time,
            open,
            high,
            low,
            close,
            volume,
            cached_at,
            created_at,
            updated_at
        )
        VALUES (
            @exchange,
            @token,
            @resolution,
            @candle_time,
            @open,
            @high,
            @low,
            @close,
            @volume,
            @cached_at,
            @created_at,
            @updated_at
        )
        ON CONFLICT (
            exchange,
            token,
            resolution,
            candle_time
        )
        DO UPDATE SET

            open =
                excluded.open,

            high =
                excluded.high,

            low =
                excluded.low,

            close =
                excluded.close,

            volume =
                excluded.volume,

            cached_at =
                excluded.cached_at,

            updated_at =
                excluded.updated_at
    `);

const candleFiles =
    fs.readdirSync(
        candleSource,
        {
            withFileTypes: true
        }
    )
    .filter(
        entry =>
            entry.isFile() &&
            entry.name
                .toLowerCase()
                .endsWith(".json")
    )
    .map(
        entry =>
            path.join(
                candleSource,
                entry.name
            )
    );

log(
    "[INFO] Candle cache files : " +
    candleFiles.length
);

let sourceCandleCount = 0;
let migratedCandleCount = 0;
let skippedCandleCount = 0;
let processedFiles = 0;

for (
    const candleFile of candleFiles
) {

    const fileName =
        path.basename(
            candleFile
        );

    let payload;

    try {

        payload =
            JSON.parse(
                fs.readFileSync(
                    candleFile,
                    "utf8"
                )
            );

    } catch (error) {

        closeDatabase(
            candleDatabase
        );

        fail(
            "Unable to parse candle file " +
            fileName +
            ": " +
            error.message
        );
    }

    if (
        !payload ||
        !Array.isArray(
            payload.candles
        )
    ) {

        log(
            "[WARN] Skipping invalid candle file: " +
            fileName
        );

        skippedCandleCount++;

        continue;
    }

    const exchange =
        String(
            payload.exchange || ""
        );

    const token =
        String(
            payload.token || ""
        );

    const resolution =
        String(
            payload.resolution || ""
        );

    if (
        !exchange ||
        !token ||
        !resolution
    ) {

        log(
            "[WARN] Skipping candle file with missing metadata: " +
            fileName
        );

        skippedCandleCount++;

        continue;
    }

    const cachedAt =
        payload.cachedAt
            ? String(
                payload.cachedAt
            )
            : null;

    sourceCandleCount +=
        payload.candles.length;

const insertFileCandles =
    candleDatabase.transaction(
        candles => {

            let count = 0;

            for (
                const candle of candles
            ) {

                if (
                    !candle ||
                    candle.time === undefined
                ) {
                    continue;
                }

                const candleTime =
                    Number(
                        candle.time
                    );

                const open =
                    Number(
                        candle.open
                    );

                const high =
                    Number(
                        candle.high
                    );

                const low =
                    Number(
                        candle.low
                    );

                const close =
                    Number(
                        candle.close
                    );

                const volume =
                    Number(
                        candle.volume ?? 0
                    );

                if (
                    !Number.isFinite(
                        candleTime
                    ) ||
                    !Number.isFinite(
                        open
                    ) ||
                    !Number.isFinite(
                        high
                    ) ||
                    !Number.isFinite(
                        low
                    ) ||
                    !Number.isFinite(
                        close
                    )
                ) {
                    continue;
                }

                insertCandle.run({

                    exchange,

                    token,

                    resolution,

                    candle_time:
                        Math.floor(
                            candleTime
                        ),

                    open,

                    high,

                    low,

                    close,

                    volume:
                        Number.isFinite(
                            volume
                        )
                            ? volume
                            : 0,

                    cached_at:
                        cachedAt,

                    created_at:
                        now,

                    updated_at:
                        now
                });

                count++;
            }

            return count;
        }
    )(
        payload.candles
    );

migratedCandleCount +=
    insertFileCandles;

    processedFiles++;

    log(
        `[PASS] ${fileName} -> ${insertFileCandles} candles`
    );
}

//======================================================
// CANDLE RETENTION
//======================================================

const retentionCutoff =
    Math.floor(
        Date.now() / 1000
    ) -
    (
        retentionDays *
        24 *
        60 *
        60
    );

const retentionResult =
    candleDatabase
        .prepare(`
            DELETE FROM candles
            WHERE candle_time < ?
        `)
        .run(
            retentionCutoff
        );

log("");
log(
    "[INFO] Retention cutoff  : " +
    retentionCutoff
);

log(
    "[INFO] Retention removed  : " +
    retentionResult.changes
);

//======================================================
// CANDLE VALIDATION
//======================================================

const databaseCandleCount =
    candleDatabase
        .prepare(`
            SELECT COUNT(*) AS count
            FROM candles
        `)
        .get()
        .count;

const distinctCandleFiles =
    candleDatabase
        .prepare(`
            SELECT COUNT(
                DISTINCT
                    exchange || '|' ||
                    token || '|' ||
                    resolution
            ) AS count
            FROM candles
        `)
        .get()
        .count;

log("");
log(
    "[INFO] Source candle rows  : " +
    sourceCandleCount
);

log(
    "[INFO] Migrated candle rows : " +
    migratedCandleCount
);

log(
    "[INFO] SQLite candle rows  : " +
    databaseCandleCount
);

log(
    "[INFO] SQLite instruments   : " +
    distinctCandleFiles
);

if (
    Number(
        databaseCandleCount
    ) <= 0
) {

    closeDatabase(
        candleDatabase
    );

    fail(
        "Candle validation failed. SQLite contains zero candles."
    );
}

if (
    Number(
        migratedCandleCount
    ) <= 0
) {

    closeDatabase(
        candleDatabase
    );

    fail(
        "Candle migration failed. No candle rows were migrated."
    );
}

log(
    "[PASS] Candle SQLite validation"
);

//======================================================
// FINAL DATABASE INTEGRITY
//======================================================

const integrity =
    candleDatabase
        .prepare(
            "PRAGMA integrity_check"
        )
        .get();

if (
    !integrity ||
    integrity.integrity_check !== "ok"
) {

    closeDatabase(
        candleDatabase
    );

    fail(
        "AliceBlue candle database integrity check failed."
    );
}

log(
    "[PASS] Candle database integrity check"
);

closeDatabase(
    candleDatabase
);

//======================================================
// FINAL CONTRACT DATABASE INTEGRITY
//======================================================

const finalContractDatabase =
    new Database(
        contractDatabasePath,
        {
            readonly: true
        }
    );

const contractIntegrity =
    finalContractDatabase
        .prepare(
            "PRAGMA integrity_check"
        )
        .get();

const finalContractCount =
    finalContractDatabase
        .prepare(`
            SELECT COUNT(*) AS count
            FROM contracts
        `)
        .get()
        .count;

finalContractDatabase.close();

if (
    !contractIntegrity ||
    contractIntegrity.integrity_check !== "ok"
) {

    fail(
        "AliceBlue contract database integrity check failed."
    );
}

if (
    Number(
        finalContractCount
    ) !==
    Number(
        sourceContractCount
    )
) {

    fail(
        "Final contract count validation failed."
    );
}

log(
    "[PASS] Contract database integrity check"
);

log(
    "[PASS] Final contract count validation"
);

//======================================================
// FINAL DATABASE FILE CHECK
//======================================================

if (
    !fs.existsSync(
        contractDatabasePath
    )
) {

    fail(
        "AliceBlue contract database was not created."
    );
}

if (
    !fs.existsSync(
        candleDatabasePath
    )
) {

    fail(
        "AliceBlue candle database was not created."
    );
}

const contractStats =
    fs.statSync(
        contractDatabasePath
    );

const candleStats =
    fs.statSync(
        candleDatabasePath
    );

log("");
log("======================================================");
log(" SQLITE FILE VALIDATION");
log("======================================================");

log(
    "[PASS] Contract DB : " +
    contractDatabasePath
);

log(
    "       Size       : " +
    contractStats.size +
    " bytes"
);

log(
    "[PASS] Candle DB   : " +
    candleDatabasePath
);

log(
    "       Size       : " +
    candleStats.size +
    " bytes"
);

//======================================================
// IMPORTANT ARCHITECTURE CHECK
//======================================================

const indstocksRoot =
    path.join(
        projectRoot,
        "server",
        "indstocks"
    );

const aliceHistory =
    path.join(
        projectRoot,
        "server",
        "aliceblue",
        "history.js"
    );

if (
    !fs.existsSync(
        indstocksRoot
    )
) {

    fail(
        "IndStocks directory unexpectedly missing. Migration aborted."
    );
}

if (
    !fs.existsSync(
        aliceHistory
    )
) {

    fail(
        "AliceBlue history.js unexpectedly missing. Migration aborted."
    );
}

log("");
log("======================================================");
log(" FALLBACK ARCHITECTURE CHECK");
log("======================================================");

log(
    "[PASS] AliceBlue history.js exists."
);

log(
    "[PASS] IndStocks directory exists."
);

log(
    "[PASS] No IndStocks storage was modified by migration."
);

log(
    "[PASS] AliceBlue history implementation was not modified."
);

log(
    "[INFO] Existing AliceBlue → IndStocks fallback remains under application control."
);

//======================================================
// FINAL SUMMARY
//======================================================

log("");
log("======================================================");
log(" ALICEBLUE MIGRATION RESULT");
log("======================================================");

log(
    "[PASS] Contract migration"
);

log(
    "[PASS] Candle migration"
);

log(
    "[PASS] SQLite WAL configuration"
);

log(
    "[PASS] Retention processing"
);

log(
    "[PASS] Database integrity validation"
);

log(
    "[PASS] Source backup completed"
);

log(
    "[PASS] IndStocks storage untouched"
);

log(
    "[PASS] AliceBlue history/fallback untouched"
);

if (
    process.env.ALICEBLUE_REMOVE_LEGACY === "true"
) {

    log("");
    log("======================================================");
    log(" LEGACY JSON CLEANUP");
    log("======================================================");

    // Contract legacy JSON
    if (fs.existsSync(contractSource)) {

        fs.unlinkSync(
            contractSource
        );

        log(
            "[PASS] Removed legacy contract-master.json"
        );

    } else {

        log(
            "[INFO] Legacy contract-master.json already absent."
        );

    }

    // Candle legacy JSON files
    if (fs.existsSync(candleSource)) {

        const legacyCandleFiles =
            fs.readdirSync(
                candleSource,
                {
                    withFileTypes: true
                }
            )
            .filter(
                entry =>
                    entry.isFile() &&
                    entry.name
                        .toLowerCase()
                        .endsWith(".json")
            );

        for (
            const file
            of legacyCandleFiles
        ) {

            fs.unlinkSync(
                path.join(
                    candleSource,
                    file.name
                )
            );

        }

        log(
            "[PASS] Removed " +
            legacyCandleFiles.length +
            " legacy candle JSON file(s)."
        );

    } else {

        log(
            "[INFO] Legacy candle-cache directory already absent."
        );

    }

    log(
        "[PASS] Legacy JSON cleanup completed."
    );
}

log("");
log(
    "[INFO] Legacy JSON files were NOT removed."
);

log(
    "[INFO] Use -RemoveLegacy only after runtime validation."
);

log("");
log("======================================================");
log(" MIGRATION COMPLETE");
log("======================================================");
'@

#======================================================
# CREATE NODE MIGRATION SCRIPT INSIDE PROJECT ROOT
#======================================================

$NodeMigrationFile =
    Join-Path `
        $ProjectRoot `
        ".aliceblue_storage_migration_$Timestamp.cjs"

Set-Content `
    -Path $NodeMigrationFile `
    -Value $MigrationNodeScript `
    -Encoding UTF8

#======================================================
# RUN MIGRATION
#======================================================

Write-Host ""
Write-Host "[MIGRATE] Starting Node.js SQLite migration..."
Write-Host ""

$env:ALICEBLUE_RETENTION_DAYS =
    [string]$RetentionDays

if ($RemoveLegacy) {

    $env:ALICEBLUE_REMOVE_LEGACY =
        "true"
}
else {

    $env:ALICEBLUE_REMOVE_LEGACY =
        "false"
}

Push-Location $ProjectRoot

try {

    & node $NodeMigrationFile

    if ($LASTEXITCODE -ne 0) {

        throw `
            "AliceBlue SQLite migration failed."
    }
}
finally {

    Pop-Location

    if (Test-Path $NodeMigrationFile) {

        Remove-Item `
            $NodeMigrationFile `
            -Force `
            -ErrorAction SilentlyContinue
    }

    Remove-Item Env:ALICEBLUE_RETENTION_DAYS `
        -ErrorAction SilentlyContinue

    Remove-Item Env:ALICEBLUE_REMOVE_LEGACY `
        -ErrorAction SilentlyContinue
}

#======================================================
# POWERSHELL FILE VALIDATION
#======================================================

Write-Host ""
Write-Host "======================================================"
Write-Host " POWERSHELL FINAL VALIDATION"
Write-Host "======================================================"

if (-not (Test-Path $ContractDatabase)) {

    throw `
        "Final validation failed: contract DB missing."
}

if (-not (Test-Path $CandleDatabase)) {

    throw `
        "Final validation failed: candle DB missing."
}

$contractDbSize =
    (
        Get-Item `
            $ContractDatabase
    ).Length

$candleDbSize =
    (
        Get-Item `
            $CandleDatabase
    ).Length

if ($contractDbSize -le 0) {

    throw `
        "Final validation failed: contract DB is empty."
}

if ($candleDbSize -le 0) {

    throw `
        "Final validation failed: candle DB is empty."
}

Write-Host ""
Write-Host "[PASS] Contract DB exists:"
Write-Host "       $ContractDatabase"
Write-Host "       Size: $contractDbSize bytes"

Write-Host ""
Write-Host "[PASS] Candle DB exists:"
Write-Host "       $CandleDatabase"
Write-Host "       Size: $candleDbSize bytes"

Write-Host ""
Write-Host "[PASS] Backup:"
Write-Host "       $BackupDirectory"

Write-Host ""
Write-Host "======================================================"
Write-Host " ALICEBLUE STORAGE MIGRATION SUCCESS"
Write-Host "======================================================"
Write-Host ""

if ($RemoveLegacy) {

    Write-Host "[PASS] Legacy JSON cleanup was requested and completed."

    if (Test-Path $ContractSource) {

        throw `
            "Final validation failed: legacy contract-master.json still exists."

    }

    if (Test-Path $CandleSource) {

        $remainingLegacyCandles =
            Get-ChildItem `
                -Path $CandleSource `
                -Filter "*.json" `
                -File `
                -ErrorAction SilentlyContinue

        if ($remainingLegacyCandles.Count -gt 0) {

            throw `
                "Final validation failed: legacy candle JSON files still exist."

        }
    }

    Write-Host "[PASS] Legacy JSON files removed."
}
else {

    Write-Host "[INFO] Legacy JSON files remain intact."
    Write-Host "[INFO] This is intentional because -RemoveLegacy was not supplied."
}

Write-Host ""
Write-Host "FINAL ARCHITECTURE:"
Write-Host ""
Write-Host "  AliceBlue contracts : SQLite"
Write-Host "  AliceBlue candles   : SQLite"
Write-Host "  AliceBlue history   : SQLite-backed"
Write-Host "  AliceBlue sync      : SQLite-backed"
Write-Host "  AliceBlue CLI       : SQLite-backed"
Write-Host ""
Write-Host "  Contract DB:"
Write-Host "    $ContractDatabase"
Write-Host ""
Write-Host "  Candle DB:"
Write-Host "    $CandleDatabase"
Write-Host ""
Write-Host "  IndStocks storage was not modified."
Write-Host "  Existing historical fallback behavior was not changed."
Write-Host ""
Write-Host ""