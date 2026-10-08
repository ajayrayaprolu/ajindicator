# =====================================================================
# Migrate-FyersStorage.ps1
#
# FYERS storage migration:
#   - Creates timestamped backup under server\fyers\_migration-backup\
#   - Creates fyers-contract-master.db
#   - Creates fyers-candle-cache.db
#   - Imports current FYERS JSON masters after validating against CSVs
#   - Preserves existing equity/option object shapes through raw_json
#   - Switches equityMaster.js and symbolMaster.js to SQLite storage
#   - Adds SQLite write-through history caching + retention
#   - Does NOT modify FyersFeed.js (it does not persist candles)
#   - Stops/rolls back on validation failure
#
# IMPORTANT:
#   Stop the running backend before executing this script.
#
# RUN FROM:
#   C:\AI-Institutional
#
# EXAMPLE:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Migrate-FyersStorage.ps1
# =====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional",
    [ValidateSet(14,31)]
    [int]$RetentionDays = 31
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ---------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------

$FyersRoot = Join-Path $ProjectRoot "server\fyers"
$DataDir = Join-Path $FyersRoot "data"

$EquitySource = Join-Path $FyersRoot "equityMaster.js"
$SymbolSource = Join-Path $FyersRoot "symbolMaster.js"
$HistorySource = Join-Path $FyersRoot "history.js"

$EquityJson = Join-Path $DataDir "fyers-equity-master.json"
$OptionJson = Join-Path $DataDir "fyers-option-master.json"
$NseCmCsv = Join-Path $DataDir "NSE_CM.csv"
$NseFoCsv = Join-Path $DataDir "NSE_FO.csv"
$BseFoCsv = Join-Path $DataDir "BSE_FO.csv"

$ContractDb = Join-Path $DataDir "fyers-contract-master.db"
$CandleDb = Join-Path $DataDir "fyers-candle-cache.db"

$ContractModule = Join-Path $DataDir "FyersContractDatabase.js"
$CandleModule = Join-Path $DataDir "FyersCandleDatabase.js"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $FyersRoot "_migration-backup\$Stamp"
$BackupData = Join-Path $BackupRoot "data"

$ExistingData = @(
    $EquityJson,
    $OptionJson,
    $NseCmCsv,
    $NseFoCsv,
    $BseFoCsv
)

$ModifiedSources = @(
    $EquitySource,
    $SymbolSource,
    $HistorySource
)

$DbModules = @(
    $ContractModule,
    $CandleModule
)

# ---------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------

function Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Require-File([string]$PathValue, [string]$Description) {
    if (-not (Test-Path -LiteralPath $PathValue -PathType Leaf)) {
        throw "Required $Description not found: $PathValue"
    }
}

function Write-Utf8NoBom([string]$PathValue, [string]$Content) {
    [System.IO.File]::WriteAllText(
        $PathValue,
        $Content,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Backup-One([string]$Source, [string]$DestinationDir) {
    if (Test-Path -LiteralPath $Source -PathType Leaf) {
        Copy-Item -LiteralPath $Source -Destination $DestinationDir -Force
    }
}

function Replace-Exactly(
    [string]$PathValue,
    [string]$OldText,
    [string]$NewText,
    [string]$Label
) {
    $content = Get-Content -LiteralPath $PathValue -Raw

    # Normalize newline style for matching. Windows source files may use
    # CRLF while this migration script itself may contain LF here-strings.
    $originalUsesCrLf = $content.Contains("`r`n")
    $normalizedContent = $content -replace "`r`n", "`n"
    $normalizedOld = $OldText -replace "`r`n", "`n"
    $normalizedNew = $NewText -replace "`r`n", "`n"

    $matches = [regex]::Matches(
        $normalizedContent,
        [regex]::Escape($normalizedOld),
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($matches.Count -ne 1) {
        throw "Patch '$Label' expected exactly 1 match in $PathValue; found $($matches.Count)."
    }

    $patched =
        $normalizedContent.Replace(
            $normalizedOld,
            $normalizedNew
        )

    if ($originalUsesCrLf) {
        $patched = $patched -replace "(?<!`r)`n", "`r`n"
    }

    Write-Utf8NoBom `
        $PathValue `
        $patched
}

function Run-Node([string]$PathValue) {
    & node $PathValue
    if ($LASTEXITCODE -ne 0) {
        throw "Node execution failed: $PathValue"
    }
}

# ---------------------------------------------------------------------
# PRE-FLIGHT
# ---------------------------------------------------------------------

Step "1. PRE-FLIGHT"

Require-File $EquitySource "equityMaster.js"
Require-File $SymbolSource "symbolMaster.js"
Require-File $HistorySource "history.js"

foreach ($f in $ExistingData) {
    Require-File $f "FYERS source/master file"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "node was not found on PATH."
}

Push-Location $ProjectRoot

try {
    # Validate the actual runtime dependency instead of parsing npm output.
    # npm ls can return warnings/formatting that make text matching brittle.
    $sqliteProbe = & node --input-type=module -e "import Database from 'better-sqlite3'; const db = new Database(':memory:'); db.close(); console.log('better-sqlite3 runtime: OK');" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host ($sqliteProbe | Out-String) -ForegroundColor Red
        throw "better-sqlite3 could not be loaded by Node from the project root."
    }

    Write-Host "ProjectRoot      : $ProjectRoot"
    Write-Host "RetentionDays    : $RetentionDays"
    Write-Host "better-sqlite3   : OK"
    Write-Host "Fyers candle dir : NOT PRESENT / no existing Fyers candle-cache writer detected"

    # -----------------------------------------------------------------
    # BACKUP
    # -----------------------------------------------------------------

    Step "2. CREATE TIMESTAMPED BACKUP"

    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $BackupData -Force | Out-Null

    foreach ($f in $ModifiedSources) {
        Backup-One $f $BackupRoot
    }

    foreach ($f in $ExistingData) {
        Backup-One $f $BackupData
    }

    foreach ($f in $DbModules) {
        Backup-One $f $BackupRoot
    }

    foreach ($f in @($ContractDb,$CandleDb,"$ContractDb-wal","$ContractDb-shm","$CandleDb-wal","$CandleDb-shm")) {
        Backup-One $f $BackupRoot
    }

    $EnvFile = Join-Path $ProjectRoot ".env"
    $EnvWasBackedUp = $false
    if (Test-Path -LiteralPath $EnvFile -PathType Leaf) {
        Backup-One $EnvFile $BackupRoot
        $EnvWasBackedUp = $true
    }

    Write-Host "Backup: $BackupRoot" -ForegroundColor Green

    # -----------------------------------------------------------------
    # CREATE CONTRACT DATABASE MODULE
    # -----------------------------------------------------------------

    Step "3. CREATE SQLITE DATABASE MODULES"

    $contractJs = @'
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.resolve(
    process.cwd(),
    "server",
    "fyers",
    "data"
);

const DATABASE_FILE = path.join(
    DATA_DIR,
    "fyers-contract-master.db"
);

let db = null;

function initialize() {

    if (db) {
        return db;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });

    db = new Database(DATABASE_FILE);

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            kind TEXT NOT NULL,
            segment TEXT,

            symbol TEXT,
            company_name TEXT,
            symbol_ticker TEXT NOT NULL,

            isin TEXT,
            exchange TEXT,
            underlying TEXT,

            expiry TEXT,
            strike REAL,
            option_type TEXT,

            lot_size REAL,
            tick_size REAL,

            fy_token TEXT,
            scrip_code TEXT,

            raw_json TEXT NOT NULL,
            source_file TEXT NOT NULL,

            active_status INTEGER NOT NULL DEFAULT 1,
            last_updated TEXT NOT NULL,

            UNIQUE(kind, symbol_ticker)
        );

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_symbol
        ON contracts(symbol);

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_ticker
        ON contracts(symbol_ticker);

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_exchange
        ON contracts(exchange);

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_underlying
        ON contracts(underlying);

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_expiry
        ON contracts(expiry);

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_option_search
        ON contracts(
            underlying,
            expiry,
            strike,
            option_type,
            active_status
        );

        CREATE INDEX IF NOT EXISTS idx_fyers_contract_kind
        ON contracts(kind, active_status);

        CREATE TABLE IF NOT EXISTS master_sources (
            source_file TEXT PRIMARY KEY,
            source_sha256 TEXT NOT NULL,
            source_bytes INTEGER NOT NULL,
            source_rows INTEGER NOT NULL,
            imported_at TEXT NOT NULL
        );
    `);

    console.log(
        "[FYERS CONTRACT DB] SQLite initialized:",
        DATABASE_FILE
    );

    return db;
}

export function getFyersContractDatabase() {
    return initialize();
}

function textOrNull(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim();

    return text === "" ? null : text;
}

function numberOrNull(value) {
    const n = Number(value);

    return Number.isFinite(n) ? n : null;
}

function replaceKind(kind, records, sourceFileResolver, updatedAt) {

    const database = initialize();

    const insert = database.prepare(`
        INSERT INTO contracts (
            kind,
            segment,
            symbol,
            company_name,
            symbol_ticker,
            isin,
            exchange,
            underlying,
            expiry,
            strike,
            option_type,
            lot_size,
            tick_size,
            fy_token,
            scrip_code,
            raw_json,
            source_file,
            active_status,
            last_updated
        )
        VALUES (
            @kind,
            @segment,
            @symbol,
            @company_name,
            @symbol_ticker,
            @isin,
            @exchange,
            @underlying,
            @expiry,
            @strike,
            @option_type,
            @lot_size,
            @tick_size,
            @fy_token,
            @scrip_code,
            @raw_json,
            @source_file,
            1,
            @last_updated
        )
    `);

    const transaction = database.transaction((items) => {

        database
            .prepare("DELETE FROM contracts WHERE kind = ?")
            .run(kind);

        for (const record of items) {

            const symbolTicker =
                textOrNull(record?.symbolTicker);

            if (!symbolTicker) {
                continue;
            }

            insert.run({
                kind,
                segment:
                    textOrNull(record?.segment),

                symbol:
                    textOrNull(record?.symbol),

                company_name:
                    textOrNull(record?.companyName),

                symbol_ticker:
                    symbolTicker,

                isin:
                    textOrNull(record?.isin),

                exchange:
                    textOrNull(record?.exchange),

                underlying:
                    textOrNull(record?.underlying),

                expiry:
                    textOrNull(record?.expiry),

                strike:
                    numberOrNull(record?.strike),

                option_type:
                    textOrNull(record?.optionType),

                lot_size:
                    numberOrNull(record?.lotSize),

                tick_size:
                    numberOrNull(record?.tickSize),

                fy_token:
                    textOrNull(record?.fyToken),

                scrip_code:
                    textOrNull(record?.scripCode),

                raw_json:
                    JSON.stringify(record),

                source_file:
                    sourceFileResolver(record),

                last_updated:
                    updatedAt
            });
        }
    });

    transaction(records);
}

export function replaceEquities(
    records,
    updatedAt = new Date().toISOString()
) {
    replaceKind(
        "EQUITY",
        records,
        () => "NSE_CM.csv",
        updatedAt
    );

    return getFyersEquityCount();
}

export function replaceOptions(
    records,
    updatedAt = new Date().toISOString()
) {
    replaceKind(
        "OPTION",
        records,
        record =>
            record?.segment === "BSE_FO"
                ? "BSE_FO.csv"
                : "NSE_FO.csv",
        updatedAt
    );

    return getFyersOptionCount();
}

export function recordMasterSource(
    sourceFile,
    sha256,
    bytes,
    rows,
    importedAt = new Date().toISOString()
) {

    initialize()
        .prepare(`
            INSERT INTO master_sources (
                source_file,
                source_sha256,
                source_bytes,
                source_rows,
                imported_at
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(source_file)
            DO UPDATE SET
                source_sha256 = excluded.source_sha256,
                source_bytes = excluded.source_bytes,
                source_rows = excluded.source_rows,
                imported_at = excluded.imported_at
        `)
        .run(
            sourceFile,
            sha256,
            bytes,
            rows,
            importedAt
        );
}

export function getEquities() {

    return initialize()
        .prepare(`
            SELECT raw_json
            FROM contracts
            WHERE kind = 'EQUITY'
              AND active_status = 1
            ORDER BY id
        `)
        .all()
        .map(row => JSON.parse(row.raw_json));
}

export function getOptions() {

    return initialize()
        .prepare(`
            SELECT raw_json
            FROM contracts
            WHERE kind = 'OPTION'
              AND active_status = 1
            ORDER BY id
        `)
        .all()
        .map(row => JSON.parse(row.raw_json));
}

export function getFyersEquityCount() {
    return Number(
        initialize()
            .prepare(`
                SELECT COUNT(*) AS count
                FROM contracts
                WHERE kind = 'EQUITY'
                  AND active_status = 1
            `)
            .get()
            .count
    );
}

export function getFyersOptionCount() {
    return Number(
        initialize()
            .prepare(`
                SELECT COUNT(*) AS count
                FROM contracts
                WHERE kind = 'OPTION'
                  AND active_status = 1
            `)
            .get()
            .count
    );
}

export function getFyersContractDatabaseStatus() {

    const database = initialize();

    return {
        databaseFile: DATABASE_FILE,

        equities:
            database
                .prepare(`
                    SELECT
                        COUNT(*) AS count,
                        MAX(last_updated) AS last_updated
                    FROM contracts
                    WHERE kind = 'EQUITY'
                      AND active_status = 1
                `)
                .get(),

        options:
            database
                .prepare(`
                    SELECT
                        COUNT(*) AS count,
                        MAX(last_updated) AS last_updated
                    FROM contracts
                    WHERE kind = 'OPTION'
                      AND active_status = 1
                `)
                .get()
    };
}

export function fyersContractDatabasePath() {
    return DATABASE_FILE;
}

export function closeFyersContractDatabase() {

    if (!db) {
        return;
    }

    db.close();
    db = null;
}
'@

    Write-Utf8NoBom $ContractModule $contractJs

    # -----------------------------------------------------------------
    # CREATE CANDLE DATABASE MODULE
    # -----------------------------------------------------------------

    $candleJs = @'
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.resolve(
    process.cwd(),
    "server",
    "fyers",
    "data"
);

const DATABASE_FILE = path.join(
    DATA_DIR,
    "fyers-candle-cache.db"
);

const RETENTION_DAYS =
    Math.max(
        1,
        Number(
            process.env.FYERS_CANDLE_RETENTION_DAYS ?? 31
        ) || 31
    );

const RETENTION_SECONDS =
    RETENTION_DAYS * 24 * 60 * 60;

let db = null;
let cleanupTimer = null;

function initialize() {

    if (db) {
        return db;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });

    db = new Database(DATABASE_FILE);

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");

    db.exec(`
        CREATE TABLE IF NOT EXISTS candles (
            symbol TEXT NOT NULL,
            resolution TEXT NOT NULL,
            timestamp INTEGER NOT NULL,

            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL DEFAULT 0,
            oi REAL,

            created_at INTEGER NOT NULL,

            PRIMARY KEY (
                symbol,
                resolution,
                timestamp
            )
        );

        CREATE INDEX IF NOT EXISTS idx_fyers_candles_lookup
        ON candles(symbol, resolution, timestamp);

        CREATE INDEX IF NOT EXISTS idx_fyers_candles_timestamp
        ON candles(timestamp);
    `);

    cleanupOldCandles();

    cleanupTimer = setInterval(() => {
        try {
            cleanupOldCandles();
        }
        catch (error) {
            console.error(
                "[FYERS CANDLE DB] Retention cleanup failed:",
                error?.message ?? error
            );
        }
    }, 60 * 60 * 1000);

    if (cleanupTimer.unref) {
        cleanupTimer.unref();
    }

    console.log(
        "[FYERS CANDLE DB] SQLite initialized:",
        DATABASE_FILE,
        "retentionDays:",
        RETENTION_DAYS
    );

    return db;
}

export function getFyersCandleDatabase() {
    return initialize();
}

export function upsertCandles(symbol, resolution, candles) {

    if (
        !symbol ||
        !resolution ||
        !Array.isArray(candles) ||
        candles.length === 0
    ) {
        return 0;
    }

    const database = initialize();
    const now = Math.floor(Date.now() / 1000);

    const insert = database.prepare(`
        INSERT INTO candles (
            symbol,
            resolution,
            timestamp,
            open,
            high,
            low,
            close,
            volume,
            oi,
            created_at
        )
        VALUES (
            @symbol,
            @resolution,
            @timestamp,
            @open,
            @high,
            @low,
            @close,
            @volume,
            @oi,
            @created_at
        )
        ON CONFLICT(symbol, resolution, timestamp)
        DO UPDATE SET
            open = excluded.open,
            high = excluded.high,
            low = excluded.low,
            close = excluded.close,
            volume = excluded.volume,
            oi = excluded.oi,
            created_at = excluded.created_at
    `);

    const transaction = database.transaction(rows => {

        for (const candle of rows) {

            const timestamp =
                Number(candle?.time);

            if (!Number.isFinite(timestamp)) {
                continue;
            }

            insert.run({
                symbol:
                    String(symbol).trim().toUpperCase(),
                resolution:
                    String(resolution).trim(),
                timestamp,
                open: Number(candle.open),
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
                volume: Number(candle.volume ?? 0),
                oi:
                    candle.oi === undefined || candle.oi === null
                        ? null
                        : Number(candle.oi),
                created_at: now
            });
        }
    });

    transaction(candles);
    return candles.length;
}

export function getCandles(
    symbol,
    resolution,
    rangeFrom,
    rangeTo
) {

    const rows =
        initialize()
            .prepare(`
                SELECT
                    timestamp,
                    open,
                    high,
                    low,
                    close,
                    volume,
                    oi
                FROM candles
                WHERE symbol = ?
                  AND resolution = ?
                  AND timestamp BETWEEN ? AND ?
                ORDER BY timestamp ASC
            `)
            .all(
                String(symbol).trim().toUpperCase(),
                String(resolution).trim(),
                Number(rangeFrom),
                Number(rangeTo)
            );

    return rows.map(row => ({
        time: Number(row.timestamp),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume ?? 0),
        oi:
            row.oi === null || row.oi === undefined
                ? undefined
                : Number(row.oi)
    }));
}

export function countCandles() {
    return Number(
        initialize()
            .prepare("SELECT COUNT(*) AS count FROM candles")
            .get()
            .count
    );
}

export function getRetentionStats() {

    const row =
        initialize()
            .prepare(`
                SELECT
                    COUNT(*) AS count,
                    MIN(timestamp) AS min_time,
                    MAX(timestamp) AS max_time
                FROM candles
            `)
            .get();

    return {
        count: Number(row?.count ?? 0),
        minTime: row?.min_time ?? null,
        maxTime: row?.max_time ?? null,
        retentionDays: RETENTION_DAYS,
        databaseFile: DATABASE_FILE
    };
}

export function cleanupOldCandles() {

    const database = initializeWithoutCleanupLoop();

    const cutoff =
        Math.floor(Date.now() / 1000) -
        RETENTION_SECONDS;

    const result =
        database
            .prepare("DELETE FROM candles WHERE timestamp < ?")
            .run(cutoff);

    if (result.changes > 0) {
        console.log(
            "[FYERS CANDLE DB] Removed old candles:",
            result.changes,
            "retentionDays:",
            RETENTION_DAYS
        );
    }

    try {
        database.pragma("wal_checkpoint(TRUNCATE)");
    }
    catch {
        // Non-fatal maintenance.
    }

    return result.changes;
}

function initializeWithoutCleanupLoop() {

    if (db) {
        return db;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });

    db = new Database(DATABASE_FILE);

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");

    db.exec(`
        CREATE TABLE IF NOT EXISTS candles (
            symbol TEXT NOT NULL,
            resolution TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL DEFAULT 0,
            oi REAL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY(symbol, resolution, timestamp)
        );

        CREATE INDEX IF NOT EXISTS idx_fyers_candles_lookup
        ON candles(symbol, resolution, timestamp);

        CREATE INDEX IF NOT EXISTS idx_fyers_candles_timestamp
        ON candles(timestamp);
    `);

    return db;
}

export function fyersCandleDatabasePath() {
    return DATABASE_FILE;
}

export function fyersCandleRetentionDays() {
    return RETENTION_DAYS;
}

export function closeFyersCandleDatabase() {

    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }

    if (!db) {
        return;
    }

    db.close();
    db = null;
}
'@

    Write-Utf8NoBom $CandleModule $candleJs

    # -----------------------------------------------------------------
    # INITIAL DATA MIGRATION + CSV/JSON VALIDATION
    # -----------------------------------------------------------------

    Step "4. IMPORT CURRENT JSON/CSV MASTERS INTO CONTRACT DATABASE"

    $ImportMjs = Join-Path $ProjectRoot "._FyersStorageImport.mjs"

    $importJs = @'
import fs from "node:fs";
import crypto from "node:crypto";
import {
    replaceEquities,
    replaceOptions,
    recordMasterSource,
    getEquities,
    getOptions,
    getFyersEquityCount,
    getFyersOptionCount,
    getFyersContractDatabaseStatus
} from "./server/fyers/data/FyersContractDatabase.js";

const DATA = "./server/fyers/data";

const file = name => `${DATA}/${name}`;

const readJson = name =>
    JSON.parse(
        fs.readFileSync(file(name), "utf8")
    );

const sha256 = name =>
    crypto
        .createHash("sha256")
        .update(fs.readFileSync(file(name)))
        .digest("hex");

const nonEmptyLines = text =>
    text.split(/\r?\n/).filter(Boolean);

function splitCsvLine(line) {
    return line.replace(/\r$/, "").split(",");
}

function parseEquityCsv(text) {

    const COL = {
        companyName: 1,
        isin: 5,
        symbolTicker: 9,
        symbol: 13,
        strike: 15,
        optionType: 16
    };

    const result = [];

    for (const line of nonEmptyLines(text)) {

        const fields = splitCsvLine(line);

        if (fields.length < 17) {
            continue;
        }

        const optionType =
            String(fields[COL.optionType] ?? "")
                .trim()
                .toUpperCase();

        if (optionType === "CE" || optionType === "PE") {
            continue;
        }

        const symbolTicker =
            String(fields[COL.symbolTicker] ?? "").trim();

        const symbol =
            String(fields[COL.symbol] ?? "")
                .trim()
                .toUpperCase();

        const companyName =
            String(fields[COL.companyName] ?? "").trim();

        if (!symbolTicker || !symbol) {
            continue;
        }

        result.push({
            symbol,
            companyName,
            symbolTicker,
            isin: String(fields[COL.isin] ?? "").trim()
        });
    }

    return result;
}

const MONTH = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04",
    MAY: "05", JUN: "06", JUL: "07", AUG: "08",
    SEP: "09", OCT: "10", NOV: "11", DEC: "12"
};

const DATE_RE = /^\S+\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})\b/;

function parseExpiry(text) {

    const m = DATE_RE.exec(String(text ?? "").trim());

    if (!m) {
        return null;
    }

    const month = MONTH[m[2].toUpperCase()];

    if (!month) {
        return null;
    }

    return `20${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

function parseOptionCsv(text, segment) {

    const COL = {
        fyToken: 0,
        symbolDetails: 1,
        lotSize: 3,
        tickSize: 4,
        symbolTicker: 9,
        scripCode: 12,
        underlying: 13,
        strike: 15,
        optionType: 16
    };

    const result = [];

    for (const line of nonEmptyLines(text)) {

        const fields = splitCsvLine(line);

        if (fields.length < 18) {
            continue;
        }

        const optionType =
            String(fields[COL.optionType] ?? "")
                .trim()
                .toUpperCase();

        if (optionType !== "CE" && optionType !== "PE") {
            continue;
        }

        const symbolTicker =
            String(fields[COL.symbolTicker] ?? "").trim();

        const underlying =
            String(fields[COL.underlying] ?? "")
                .trim()
                .toUpperCase();

        const expiry = parseExpiry(fields[COL.symbolDetails]);
        const strike = Number(fields[COL.strike]);

        if (
            !symbolTicker ||
            !underlying ||
            !expiry ||
            !Number.isFinite(strike)
        ) {
            continue;
        }

        result.push({
            symbolTicker,
            underlying,
            exchange:
                String(symbolTicker).split(":")[0]?.trim().toUpperCase() ?? "",
            segment,
            expiry,
            strike,
            optionType,
            lotSize: Number(fields[COL.lotSize]) || null,
            tickSize: Number(fields[COL.tickSize]) || null,
            fyToken: String(fields[COL.fyToken] ?? "").trim(),
            scripCode: String(fields[COL.scripCode] ?? "").trim()
        });
    }

    return result;
}

function tickerSet(rows) {
    return new Set(
        rows
            .map(x => String(x?.symbolTicker ?? "").toUpperCase())
            .filter(Boolean)
    );
}

function assertSameSet(label, a, b) {

    const sa = tickerSet(a);
    const sb = tickerSet(b);

    const missingInB = [...sa].filter(x => !sb.has(x));
    const missingInA = [...sb].filter(x => !sa.has(x));

    if (missingInB.length || missingInA.length) {
        throw new Error(
            `${label} CSV/JSON mismatch: missingInCSV=${missingInB.length}, missingInJSON=${missingInA.length}`
        );
    }
}

const equityLegacy = readJson("fyers-equity-master.json");
const optionLegacy = readJson("fyers-option-master.json");

const equities = Array.isArray(equityLegacy?.equities)
    ? equityLegacy.equities
    : [];

const options = Array.isArray(optionLegacy?.contracts)
    ? optionLegacy.contracts
    : [];

if (!equities.length) {
    throw new Error("Existing fyers-equity-master.json has no equities array.");
}

if (!options.length) {
    throw new Error("Existing fyers-option-master.json has no contracts array.");
}

const equityCsv = fs.readFileSync(
    file("NSE_CM.csv"),
    "utf8"
);

const nseFoCsv = fs.readFileSync(
    file("NSE_FO.csv"),
    "utf8"
);

const bseFoCsv = fs.readFileSync(
    file("BSE_FO.csv"),
    "utf8"
);

const equityCsvRecords = parseEquityCsv(equityCsv);
const nseOptionCsvRecords = parseOptionCsv(nseFoCsv, "NSE_FO");
const bseOptionCsvRecords = parseOptionCsv(bseFoCsv, "BSE_FO");
const optionCsvRecords = [
    ...nseOptionCsvRecords,
    ...bseOptionCsvRecords
];

if (!equityCsvRecords.length) {
    throw new Error("NSE_CM.csv parsed to zero equities.");
}

if (!optionCsvRecords.length) {
    throw new Error("NSE_FO.csv/BSE_FO.csv parsed to zero options.");
}

assertSameSet("Equity", equities, equityCsvRecords);
assertSameSet("Option", options, optionCsvRecords);

const now = new Date().toISOString();

replaceEquities(equities, now);
replaceOptions(options, now);

for (const name of [
    "fyers-equity-master.json",
    "fyers-option-master.json",
    "NSE_CM.csv",
    "NSE_FO.csv",
    "BSE_FO.csv"
]) {
    const stat = fs.statSync(file(name));
    const rows = nonEmptyLines(
        fs.readFileSync(file(name), "utf8")
    ).length;

    recordMasterSource(
        name,
        sha256(name),
        stat.size,
        rows,
        now
    );
}

const dbEquities = getEquities();
const dbOptions = getOptions();

if (getFyersEquityCount() !== equities.length) {
    throw new Error("Equity database count validation failed.");
}

if (getFyersOptionCount() !== options.length) {
    throw new Error("Option database count validation failed.");
}

function canonical(obj) {
    return JSON.stringify(obj);
}

for (const sample of [equities[0], equities[equities.length - 1]]) {
    const found = dbEquities.find(
        row => row.symbolTicker === sample.symbolTicker
    );

    if (!found || canonical(found) !== canonical(sample)) {
        throw new Error(
            `Equity raw_json compatibility validation failed for ${sample.symbolTicker}`
        );
    }
}

for (const sample of [options[0], options[options.length - 1]]) {
    const found = dbOptions.find(
        row => row.symbolTicker === sample.symbolTicker
    );

    if (!found || canonical(found) !== canonical(sample)) {
        throw new Error(
            `Option raw_json compatibility validation failed for ${sample.symbolTicker}`
        );
    }
}

const duplicateEquities =
    dbEquities.length - tickerSet(dbEquities).size;

const duplicateOptions =
    dbOptions.length - tickerSet(dbOptions).size;

if (duplicateEquities !== 0) {
    throw new Error(`Duplicate equity tickers found: ${duplicateEquities}`);
}

if (duplicateOptions !== 0) {
    throw new Error(`Duplicate option tickers found: ${duplicateOptions}`);
}

console.log(JSON.stringify({
    validation: "PASS",
    legacyEquities: equities.length,
    csvEquities: equityCsvRecords.length,
    sqliteEquities: getFyersEquityCount(),
    legacyOptions: options.length,
    csvOptions: optionCsvRecords.length,
    sqliteOptions: getFyersOptionCount(),
    databaseStatus: getFyersContractDatabaseStatus()
}, null, 2));
'@

    Write-Utf8NoBom $ImportMjs $importJs
    Run-Node $ImportMjs

    # -----------------------------------------------------------------
    # PATCH EQUITY MASTER
    # -----------------------------------------------------------------

    Step "5. PATCH equityMaster.js -> SQLite"

    Replace-Exactly $EquitySource @'
import fs from "fs";
import path from "path";
import axios from "axios";

import { INDEX_MAP } from "./symbolMaster.js";
'@ @'
import axios from "axios";

import { INDEX_MAP } from "./symbolMaster.js";

import * as contractDb from "./data/FyersContractDatabase.js";
'@ "equity imports"

    Replace-Exactly $EquitySource @'
//======================================================
// CONFIGURATION
//======================================================

const DATA_DIR =
    path.resolve(process.cwd(), "server", "fyers", "data");

const NSE_CM_URL =
    "https://public.fyers.in/sym_details/NSE_CM.csv";

const RAW_FILE =
    path.join(DATA_DIR, "NSE_CM.csv");

const CACHE_FILE =
    path.join(DATA_DIR, "fyers-equity-master.json");

const REFRESH_INTERVAL_MS =
    Number(process.env.FYERS_EQUITY_REFRESH_MS ?? 60 * 60 * 1000);
'@ @'
//======================================================
// CONFIGURATION
//======================================================

const NSE_CM_URL =
    "https://public.fyers.in/sym_details/NSE_CM.csv";

const REFRESH_INTERVAL_MS =
    Number(
        process.env.FYERS_EQUITY_REFRESH_MS ??
        60 * 60 * 1000
    );
'@ "equity configuration"

    Replace-Exactly $EquitySource @'
//======================================================
// DIRECTORY
//======================================================

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function splitCsvLine(line) {
    return line.replace(/\r$/, "").split(",");
}
'@ @'
//======================================================
// CSV
//======================================================

function splitCsvLine(line) {
    return line.replace(/\r$/, "").split(",");
}
'@ "equity directory"

    Replace-Exactly $EquitySource @'
//======================================================
// PARSE
//======================================================

function parseEquityFile() {

    const text = fs.readFileSync(RAW_FILE, "utf8");
    const lines = text.split("\n").filter(Boolean);

    const parsed = [];

    for (const line of lines) {

        const fields = splitCsvLine(line);

        if (fields.length < 17) {
            continue;
        }

        const strike = Number(fields[COLUMN.STRIKE_PRICE]);
        const optionType = String(fields[COLUMN.OPTION_TYPE] ?? "").trim().toUpperCase();

        // Equities only — skip anything that is actually a
        // derivative contract (shouldn't appear in NSE_CM, but
        // defensive in case FYERS ever mixes segments).
        if (optionType === "CE" || optionType === "PE") {
            continue;
        }

        const symbolTicker = String(fields[COLUMN.SYMBOL_TICKER] ?? "").trim();
        const symbol = String(fields[COLUMN.UNDERLYING_SYMBOL] ?? "").trim().toUpperCase();
        const companyName = String(fields[COLUMN.SYMBOL_DETAILS] ?? "").trim();

        if (!symbolTicker || !symbol) {
            continue;
        }

        parsed.push({
            symbol,
            companyName,
            symbolTicker,
            isin: String(fields[COLUMN.ISIN] ?? "").trim()
        });
    }

    return parsed;
}
'@ @'
//======================================================
// PARSE
//======================================================

function parseEquityText(text) {

    const lines = text.split("\n").filter(Boolean);
    const parsed = [];

    for (const line of lines) {

        const fields = splitCsvLine(line);

        if (fields.length < 17) {
            continue;
        }

        const optionType =
            String(fields[COLUMN.OPTION_TYPE] ?? "")
                .trim()
                .toUpperCase();

        if (optionType === "CE" || optionType === "PE") {
            continue;
        }

        const symbolTicker =
            String(fields[COLUMN.SYMBOL_TICKER] ?? "").trim();

        const symbol =
            String(fields[COLUMN.UNDERLYING_SYMBOL] ?? "")
                .trim()
                .toUpperCase();

        const companyName =
            String(fields[COLUMN.SYMBOL_DETAILS] ?? "").trim();

        if (!symbolTicker || !symbol) {
            continue;
        }

        parsed.push({
            symbol,
            companyName,
            symbolTicker,
            isin: String(fields[COLUMN.ISIN] ?? "").trim()
        });
    }

    return parsed;
}
'@ "equity parser"

    Replace-Exactly $EquitySource @'
//======================================================
// DOWNLOAD
//======================================================

export async function downloadFyersEquityMaster() {

    ensureDataDirectory();

    console.log("[FYERS EQUITY MASTER] Downloading NSE_CM...");

    const response = await axios.get(NSE_CM_URL, {
        timeout: 30000,
        responseType: "text"
    });

    const body = typeof response.data === "string" ? response.data : String(response.data);

    fs.writeFileSync(RAW_FILE, body, "utf8");

    console.log(`[FYERS EQUITY MASTER] Saved ${body.length} bytes`);

    const parsed = parseEquityFile();

    if (parsed.length === 0) {
        throw new Error(
            "[FYERS EQUITY MASTER] Zero equities parsed. NSE_CM.csv format may have changed."
        );
    }

    equities = parsed;
    loaded = true;
    lastRefresh = Date.now();

    fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify(
            {
                provider: "FYERS",
                downloadedAt: new Date(lastRefresh).toISOString(),
                count: equities.length,
                equities
            },
            null,
            2
        ),
        "utf8"
    );

    console.log(`[FYERS EQUITY MASTER] Ready: ${equities.length} equities`);

    return { success: true, count: equities.length };
}
'@ @'
//======================================================
// DOWNLOAD
//======================================================

export async function downloadFyersEquityMaster() {

    console.log("[FYERS EQUITY MASTER] Downloading NSE_CM...");

    const response =
        await axios.get(
            NSE_CM_URL,
            {
                timeout: 30000,
                responseType: "text"
            }
        );

    const body =
        typeof response.data === "string"
            ? response.data
            : String(response.data);

    const parsed =
        parseEquityText(body);

    if (parsed.length === 0) {
        throw new Error(
            "[FYERS EQUITY MASTER] Zero equities parsed. NSE_CM.csv format may have changed."
        );
    }

    const downloadedAt =
        new Date().toISOString();

    contractDb.replaceEquities(
        parsed,
        downloadedAt
    );

    equities =
        contractDb.getEquities();

    loaded = true;
    lastRefresh =
        Date.parse(downloadedAt);

    console.log(
        `[FYERS EQUITY MASTER] Ready: ${equities.length} equities`
    );

    return {
        success: true,
        count: equities.length
    };
}
'@ "equity download"

    Replace-Exactly $EquitySource @'
//======================================================
// LOAD LOCAL CACHE
//======================================================

export function loadFyersEquityMasterFromDisk() {

    ensureDataDirectory();

    if (!fs.existsSync(CACHE_FILE)) {
        return false;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

        if (!Array.isArray(parsed?.equities) || parsed.equities.length === 0) {
            return false;
        }

        equities = parsed.equities;
        loaded = true;
        lastRefresh = parsed.downloadedAt ? Date.parse(parsed.downloadedAt) || 0 : 0;

        console.log(`[FYERS EQUITY MASTER] Loaded ${equities.length} equities from local cache.`);
        return true;

    } catch (error) {
        console.error("[FYERS EQUITY MASTER] Local cache load failed:", error?.message ?? error);
        return false;
    }
}
'@ @'
//======================================================
// LOAD SQLITE MASTER
//======================================================

export function loadFyersEquityMasterFromDisk() {

    try {

        const rows =
            contractDb.getEquities();

        if (!Array.isArray(rows) || rows.length === 0) {
            return false;
        }

        equities = rows;
        loaded = true;

        const status =
            contractDb.getFyersContractDatabaseStatus();

        lastRefresh =
            status?.equities?.last_updated
                ? Date.parse(status.equities.last_updated) || 0
                : 0;

        console.log(
            `[FYERS EQUITY MASTER] Loaded ${equities.length} equities from SQLite.`
        );

        return true;

    }
    catch (error) {

        console.error(
            "[FYERS EQUITY MASTER] SQLite load failed:",
            error?.message ?? error
        );

        return false;
    }
}
'@ "equity SQLite load"

    Replace-Exactly $EquitySource @'
export function getFyersEquityMasterStatus() {
    return {
        loaded,
        count: equities.length,
        lastRefresh: lastRefresh ? new Date(lastRefresh).toISOString() : null,
        cacheFile: CACHE_FILE,
        refreshIntervalMs: REFRESH_INTERVAL_MS
    };
}
'@ @'
export function getFyersEquityMasterStatus() {

    return {
        loaded,
        count: equities.length,
        lastRefresh:
            lastRefresh
                ? new Date(lastRefresh).toISOString()
                : null,
        cacheFile:
            contractDb.fyersContractDatabasePath(),
        databaseFile:
            contractDb.fyersContractDatabasePath(),
        refreshIntervalMs:
            REFRESH_INTERVAL_MS
    };
}
'@ "equity status"

    # -----------------------------------------------------------------
    # PATCH SYMBOL MASTER
    # -----------------------------------------------------------------

    Step "6. PATCH symbolMaster.js -> SQLite"

    Replace-Exactly $SymbolSource @'
import fs from "fs";
import path from "path";
import axios from "axios";
'@ @'
import axios from "axios";

import * as contractDb from "./data/FyersContractDatabase.js";
'@ "symbol imports"

    Replace-Exactly $SymbolSource @'
//======================================================
// CONFIGURATION
//======================================================

const DATA_DIR =
    path.resolve(process.cwd(), "server", "fyers", "data");

const SEGMENTS = {
    NSE_FO: {
        url: "https://public.fyers.in/sym_details/NSE_FO.csv",
        rawFile: path.join(DATA_DIR, "NSE_FO.csv"),
        // No underlying restriction — every NSE F&O underlying
        // (indices AND individual stocks like RELIANCE) is
        // indexed. Options search is now what filters by name.
        underlyings: null
    },
    BSE_FO: {
        url: "https://public.fyers.in/sym_details/BSE_FO.csv",
        rawFile: path.join(DATA_DIR, "BSE_FO.csv"),
        underlyings: null
    }
};

const CACHE_FILE =
    path.join(DATA_DIR, "fyers-option-master.json");

const REFRESH_INTERVAL_MS =
    Number(process.env.FYERS_SYMBOL_REFRESH_MS ?? 30 * 60 * 1000);
'@ @'
//======================================================
// CONFIGURATION
//======================================================

const SEGMENTS = {
    NSE_FO: {
        url:
            "https://public.fyers.in/sym_details/NSE_FO.csv",
        underlyings: null
    },
    BSE_FO: {
        url:
            "https://public.fyers.in/sym_details/BSE_FO.csv",
        underlyings: null
    }
};

const REFRESH_INTERVAL_MS =
    Number(
        process.env.FYERS_SYMBOL_REFRESH_MS ??
        30 * 60 * 1000
    );

// Raw CSV is retained in memory for inspectRawSample() only.
const rawSamples = new Map();
'@ "symbol configuration"

    Replace-Exactly $SymbolSource @'
//======================================================
// DIRECTORY
//======================================================

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
'@ @'
//======================================================
// STORAGE
//======================================================
// Persistent master storage is SQLite.
// Raw CSV text exists only in memory for diagnostics.
'@ "symbol directory"

    Replace-Exactly $SymbolSource @'
export function inspectRawSample(segmentKey = "NSE_FO", sampleSize = 5) {

    const segment = SEGMENTS[segmentKey];

    if (!segment) {
        throw new Error(`[FYERS MASTER] Unknown segment: ${segmentKey}`);
    }

    if (!fs.existsSync(segment.rawFile)) {
        return { error: "Raw CSV not downloaded yet. Call downloadFyersSymbolMaster() first." };
    }

    const text = fs.readFileSync(segment.rawFile, "utf8");
    const lines = text.split("\n").filter(Boolean).slice(0, sampleSize);

    return {
        segment: segmentKey,
        totalLines: text.split("\n").filter(Boolean).length,
        sampleRows: lines.map(line => {
            const fields = splitCsvLine(line);
            return {
                columnCount: fields.length,
                fields,
                mapped: {
                    symbolDetails: fields[COLUMN.SYMBOL_DETAILS],
                    symbolTicker: fields[COLUMN.SYMBOL_TICKER],
                    underlyingSymbol: fields[COLUMN.UNDERLYING_SYMBOL],
                    strikePrice: fields[COLUMN.STRIKE_PRICE],
                    optionType: fields[COLUMN.OPTION_TYPE]
                }
            };
        })
    };
}
'@ @'
export function inspectRawSample(segmentKey = "NSE_FO", sampleSize = 5) {

    const segment = SEGMENTS[segmentKey];

    if (!segment) {
        throw new Error(
            `[FYERS MASTER] Unknown segment: ${segmentKey}`
        );
    }

    const text = rawSamples.get(segmentKey);

    if (!text) {
        return {
            error:
                "Raw CSV sample is not available in memory. Call downloadFyersSymbolMaster() first."
        };
    }

    const lines =
        text
            .split("\n")
            .filter(Boolean)
            .slice(0, sampleSize);

    return {
        segment: segmentKey,
        totalLines:
            text.split("\n").filter(Boolean).length,
        sampleRows:
            lines.map(line => {
                const fields = splitCsvLine(line);
                return {
                    columnCount: fields.length,
                    fields,
                    mapped: {
                        symbolDetails:
                            fields[COLUMN.SYMBOL_DETAILS],
                        symbolTicker:
                            fields[COLUMN.SYMBOL_TICKER],
                        underlyingSymbol:
                            fields[COLUMN.UNDERLYING_SYMBOL],
                        strikePrice:
                            fields[COLUMN.STRIKE_PRICE],
                        optionType:
                            fields[COLUMN.OPTION_TYPE]
                    }
                };
            })
    };
}
'@ "symbol inspect"

    Replace-Exactly $SymbolSource @'
function parseSegmentFile(segmentKey) {

    const segment = SEGMENTS[segmentKey];
    const text = fs.readFileSync(segment.rawFile, "utf8");
    const lines = text.split("\n").filter(Boolean);

    const parsed = [];

    for (const line of lines) {

        const fields = splitCsvLine(line);

        if (fields.length < 18) {
            continue; // malformed / unexpected row — skip defensively
        }

        const optionType = normalizeOptionType(fields[COLUMN.OPTION_TYPE]);

        // We only care about actual option contracts here.
        if (!optionType) {
            continue;
        }

        const underlying = normalizeUnderlying(
            fields[COLUMN.UNDERLYING_SYMBOL],
            segment.underlyings
        );

        if (!underlying) {
            continue; // not NIFTY (for NSE_FO) / SENSEX (for BSE_FO)
        }

        const symbolTicker = String(fields[COLUMN.SYMBOL_TICKER] ?? "").trim();
        const expiry = parseExpiryFromSymbolDetails(fields[COLUMN.SYMBOL_DETAILS]);
        const strike = Number(fields[COLUMN.STRIKE_PRICE]);

        if (!expiry || !Number.isFinite(strike)) {
            continue;
        }

        parsed.push({
            symbolTicker,                        // exact FYERS-native symbol, e.g. NSE:BANKNIFTY26AUG39900CE
            underlying,                          // NIFTY | SENSEX
            exchange: exchangeFromTicker(symbolTicker), // NSE | BSE
            segment: segmentKey,                 // NSE_FO | BSE_FO
            expiry,                               // YYYY-MM-DD
            strike,
            optionType,                           // CE | PE
            lotSize: Number(fields[COLUMN.MIN_LOT_SIZE]) || null,
            tickSize: Number(fields[COLUMN.TICK_SIZE]) || null,
            fyToken: String(fields[COLUMN.FYTOKEN] ?? "").trim(),
            scripCode: String(fields[COLUMN.SCRIP_CODE] ?? "").trim()
        });
    }

    return parsed;
}
'@ @'
function parseSegmentText(segmentKey, text) {

    const segment = SEGMENTS[segmentKey];
    const lines = text.split("\n").filter(Boolean);
    const parsed = [];

    for (const line of lines) {

        const fields = splitCsvLine(line);

        if (fields.length < 18) {
            continue;
        }

        const optionType =
            normalizeOptionType(
                fields[COLUMN.OPTION_TYPE]
            );

        if (!optionType) {
            continue;
        }

        const underlying =
            normalizeUnderlying(
                fields[COLUMN.UNDERLYING_SYMBOL],
                segment.underlyings
            );

        if (!underlying) {
            continue;
        }

        const symbolTicker =
            String(fields[COLUMN.SYMBOL_TICKER] ?? "").trim();

        const expiry =
            parseExpiryFromSymbolDetails(
                fields[COLUMN.SYMBOL_DETAILS]
            );

        const strike =
            Number(fields[COLUMN.STRIKE_PRICE]);

        if (!expiry || !Number.isFinite(strike)) {
            continue;
        }

        parsed.push({
            symbolTicker,
            underlying,
            exchange:
                exchangeFromTicker(symbolTicker),
            segment: segmentKey,
            expiry,
            strike,
            optionType,
            lotSize:
                Number(fields[COLUMN.MIN_LOT_SIZE]) || null,
            tickSize:
                Number(fields[COLUMN.TICK_SIZE]) || null,
            fyToken:
                String(fields[COLUMN.FYTOKEN] ?? "").trim(),
            scripCode:
                String(fields[COLUMN.SCRIP_CODE] ?? "").trim()
        });
    }

    return parsed;
}
'@ "symbol parser"

    Replace-Exactly $SymbolSource @'
export async function downloadFyersSymbolMaster() {

    ensureDataDirectory();

    console.log("[FYERS MASTER] Downloading symbol master (NSE_FO, BSE_FO)...");

    const allParsed = [];

    for (const [segmentKey, segment] of Object.entries(SEGMENTS)) {

        console.log(`[FYERS MASTER] Downloading ${segmentKey}...`);

        const response = await axios.get(segment.url, {
            timeout: 30000,
            responseType: "text"
        });

        const body = typeof response.data === "string" ? response.data : String(response.data);

        fs.writeFileSync(segment.rawFile, body, "utf8");

        console.log(`[FYERS MASTER] ${segmentKey}: saved ${body.length} bytes`);

        const parsed = parseSegmentFile(segmentKey);

        console.log(`[FYERS MASTER] ${segmentKey}: ${parsed.length} option contracts parsed`);

        allParsed.push(...parsed);
    }

    if (allParsed.length === 0) {
        throw new Error(
            "[FYERS MASTER] Zero option contracts parsed. Column mapping may have changed — " +
            "run inspectRawSample() and compare against the raw CSV before retrying."
        );
    }

    contracts = allParsed;
    buildIndexes();
    loaded = true;
    lastRefresh = Date.now();

    fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify(
            {
                provider: "FYERS",
                downloadedAt: new Date(lastRefresh).toISOString(),
                count: contracts.length,
                contracts
            },
            null,
            2
        ),
        "utf8"
    );

    console.log("[FYERS MASTER] Ready:", {
        count: contracts.length,
        niftyExpiries: [...(expiryIndex.get("NIFTY") ?? [])].sort(),
        sensexExpiries: [...(expiryIndex.get("SENSEX") ?? [])].sort()
    });

    return { success: true, count: contracts.length, downloadedAt: new Date(lastRefresh).toISOString() };
}
'@ @'
export async function downloadFyersSymbolMaster() {

    console.log(
        "[FYERS MASTER] Downloading symbol master (NSE_FO, BSE_FO)..."
    );

    const allParsed = [];

    for (const [segmentKey, segment] of Object.entries(SEGMENTS)) {

        console.log(
            `[FYERS MASTER] Downloading ${segmentKey}...`
        );

        const response =
            await axios.get(
                segment.url,
                {
                    timeout: 30000,
                    responseType: "text"
                }
            );

        const body =
            typeof response.data === "string"
                ? response.data
                : String(response.data);

        rawSamples.set(
            segmentKey,
            body
        );

        const parsed =
            parseSegmentText(
                segmentKey,
                body
            );

        console.log(
            `[FYERS MASTER] ${segmentKey}: ${parsed.length} option contracts parsed`
        );

        allParsed.push(...parsed);
    }

    if (allParsed.length === 0) {
        throw new Error(
            "[FYERS MASTER] Zero option contracts parsed. Column mapping may have changed — " +
            "run inspectRawSample() immediately after download."
        );
    }

    const downloadedAt =
        new Date().toISOString();

    contractDb.replaceOptions(
        allParsed,
        downloadedAt
    );

    contracts =
        contractDb.getOptions();

    buildIndexes();
    loaded = true;
    lastRefresh = Date.parse(downloadedAt);

    console.log("[FYERS MASTER] Ready:", {
        count: contracts.length,
        niftyExpiries:
            [...(expiryIndex.get("NIFTY") ?? [])].sort(),
        sensexExpiries:
            [...(expiryIndex.get("SENSEX") ?? [])].sort()
    });

    return {
        success: true,
        count: contracts.length,
        downloadedAt
    };
}
'@ "symbol download"

    Replace-Exactly $SymbolSource @'
//======================================================
// LOAD LOCAL CACHE
//======================================================

export function loadFyersSymbolMasterFromDisk() {

    ensureDataDirectory();

    if (!fs.existsSync(CACHE_FILE)) {
        return false;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

        if (!Array.isArray(parsed?.contracts) || parsed.contracts.length === 0) {
            return false;
        }

        contracts = parsed.contracts;
        buildIndexes();
        loaded = true;
        lastRefresh = parsed.downloadedAt ? Date.parse(parsed.downloadedAt) || 0 : 0;

        console.log(`[FYERS MASTER] Loaded ${contracts.length} contracts from local cache.`);
        return true;

    } catch (error) {
        console.error("[FYERS MASTER] Local cache load failed:", error?.message ?? error);
        return false;
    }
}
'@ @'
export function loadFyersSymbolMasterFromDisk() {

    try {

        const rows =
            contractDb.getOptions();

        if (!Array.isArray(rows) || rows.length === 0) {
            return false;
        }

        contracts = rows;
        buildIndexes();
        loaded = true;

        const status =
            contractDb.getFyersContractDatabaseStatus();

        lastRefresh =
            status?.options?.last_updated
                ? Date.parse(status.options.last_updated) || 0
                : 0;

        console.log(
            `[FYERS MASTER] Loaded ${contracts.length} contracts from SQLite.`
        );

        return true;

    }
    catch (error) {

        console.error(
            "[FYERS MASTER] SQLite load failed:",
            error?.message ?? error
        );

        return false;
    }
}
'@ "symbol SQLite load"

    Replace-Exactly $SymbolSource @'
        cacheFile: CACHE_FILE,
        refreshIntervalMs: REFRESH_INTERVAL_MS,
'@ @'
        cacheFile:
            contractDb.fyersContractDatabasePath(),
        databaseFile:
            contractDb.fyersContractDatabasePath(),
        refreshIntervalMs:
            REFRESH_INTERVAL_MS,
'@ "symbol status storage"

    # -----------------------------------------------------------------
    # PATCH HISTORY
    # -----------------------------------------------------------------

    Step "7. PATCH history.js -> SQLite candle storage"

    Replace-Exactly $HistorySource @'
import {
    getAppId,
    getAccessToken
}
from "./token.js";
'@ @'
import {
    getAppId,
    getAccessToken
}
from "./token.js";

import * as candleDb from "./data/FyersCandleDatabase.js";
'@ "history imports"

    $oldHistoryData = @'
    const data =
        response.data;

    if (
        !data ||
        data.s !== "ok"
    ) {
'@

    $newHistoryData = @'
    const data =
        response.data;

    if (
        !data ||
        data.s !== "ok"
    ) {
'@

    # This exact block is deliberately unchanged; history persistence is added
    # immediately after normalizeCandle(), not here.
    Replace-Exactly $HistorySource $oldHistoryData $newHistoryData "history anchor"

    Replace-Exactly $HistorySource @'
    return data.candles.map(
        normalizeCandle
    );
'@ @'
    const normalizedCandles =
        data.candles.map(
            normalizeCandle
        );

    try {

        candleDb.upsertCandles(
            params.symbol,
            params.resolution,
            normalizedCandles
        );

    }
    catch (cacheError) {

        console.error(
            "[FYERS HISTORY] SQLite candle cache write failed:",
            cacheError?.message ?? cacheError
        );

    }

    return normalizedCandles;
'@ "history write-through"

    # Add cache fallback before the catch block's final `throw error;`.
    # Use regex matching rather than exact whitespace so CRLF/indentation
    # changes in history.js cannot break the migration.
    $historyText = Get-Content -LiteralPath $HistorySource -Raw

    if ($historyText -match '\[FYERS HISTORY\] Returning SQLite cached candles after FYERS request failure') {

        Write-Host "SKIP  [history fallback already present]" -ForegroundColor DarkYellow

    }
    else {

        $nl = if ($historyText.Contains("`r`n")) { "`r`n" } else { "`n" }

        $pattern = '(?m)^(\s*)throw error;\s*$'
        $matches = [regex]::Matches($historyText, $pattern)

        if ($matches.Count -eq 0) {
            throw "Patch 'history fallback' could not find a final throw error in $HistorySource."
        }

        $m = $matches[$matches.Count - 1]
        $indent = $m.Groups[1].Value

        $fallbackBlock = @'
try {

    const cachedCandles =
        candleDb.getCandles(
            params.symbol,
            params.resolution,
            rangeFrom,
            rangeTo
        );

    if (cachedCandles.length > 0) {

        console.warn(
            "[FYERS HISTORY] Returning SQLite cached candles after FYERS request failure:",
            params.symbol,
            params.resolution,
            cachedCandles.length
        );

        return cachedCandles;
    }

}
catch (cacheReadError) {

    console.error(
        "[FYERS HISTORY] SQLite candle cache read failed:",
        cacheReadError?.message ?? cacheReadError
    );
}

'@

        $fallbackIndented =
            (($fallbackBlock -split "`r?`n") |
                ForEach-Object {
                    if ($_ -ne '') { $indent + $_ } else { '' }
                }) -join $nl

        $replacement =
            $fallbackIndented +
            $nl +
            $indent + 'throw error;'

        $historyText =
            $historyText.Remove($m.Index, $m.Length)

        $historyText =
            $historyText.Insert(
                $m.Index,
                $replacement
            )

        Write-Utf8NoBom $HistorySource $historyText
    }

    # -----------------------------------------------------------------
    # RETENTION CONFIG
    # -----------------------------------------------------------------

    Step "8. CONFIGURE CANDLE RETENTION"

    if (Test-Path -LiteralPath $EnvFile -PathType Leaf) {

        $envText =
            Get-Content -LiteralPath $EnvFile -Raw

        if ($envText -match '(?m)^\s*FYERS_CANDLE_RETENTION_DAYS\s*=') {
            $envText =
                [regex]::Replace(
                    $envText,
                    '(?m)^\s*FYERS_CANDLE_RETENTION_DAYS\s*=.*$',
                    "FYERS_CANDLE_RETENTION_DAYS=$RetentionDays"
                )
        }
        else {
            $envText =
                $envText.TrimEnd() +
                "`r`nFYERS_CANDLE_RETENTION_DAYS=$RetentionDays`r`n"
        }

        Write-Utf8NoBom $EnvFile $envText
    }
    else {
        Write-Host ".env not found; candle DB default remains $RetentionDays days." -ForegroundColor Yellow
    }

    # -----------------------------------------------------------------
    # NODE SYNTAX CHECK
    # -----------------------------------------------------------------

    Step "9. NODE SYNTAX CHECK"

    foreach ($file in @(
        $ContractModule,
        $CandleModule,
        $EquitySource,
        $SymbolSource,
        $HistorySource
    )) {
        & node --check $file
        if ($LASTEXITCODE -ne 0) {
            throw "node --check failed: $file"
        }
        Write-Host "PASS  $file" -ForegroundColor Green
    }

    # -----------------------------------------------------------------
    # RUNTIME VALIDATION
    # -----------------------------------------------------------------

    Step "10. RUNTIME VALIDATION"

    $ValidationMjs = Join-Path $ProjectRoot "._ValidateFyersStorage.mjs"

    $validationJs = @'
import * as equityMaster from "./server/fyers/equityMaster.js";
import * as symbolMaster from "./server/fyers/symbolMaster.js";
import * as contractDb from "./server/fyers/data/FyersContractDatabase.js";
import * as candleDb from "./server/fyers/data/FyersCandleDatabase.js";

if (!equityMaster.loadFyersEquityMasterFromDisk()) {
    throw new Error("Equity SQLite load failed.");
}

if (!symbolMaster.loadFyersSymbolMasterFromDisk()) {
    throw new Error("Option SQLite load failed.");
}

const equitySearch =
    equityMaster.searchFyersEquities("ADANI", 5);

const optionSearch =
    symbolMaster.searchFyersOptions({
        underlying: "NIFTY",
        limit: 5
    });

const equityStatus =
    equityMaster.getFyersEquityMasterStatus();

const optionStatus =
    symbolMaster.getFyersSymbolMasterStatus();

const dbStatus =
    contractDb.getFyersContractDatabaseStatus();

const candleStatus =
    candleDb.getRetentionStats();

if (Number(dbStatus.equities.count) <= 0) {
    throw new Error("Equity SQLite count is zero.");
}

if (Number(dbStatus.options.count) <= 0) {
    throw new Error("Option SQLite count is zero.");
}

const equityKeys =
    equitySearch[0]
        ? Object.keys(equitySearch[0]).sort()
        : [];

const optionKeys =
    optionSearch[0]
        ? Object.keys(optionSearch[0]).sort()
        : [];

const expectedEquityKeys = [
    "companyName",
    "isin",
    "kind",
    "symbol",
    "symbolTicker"
].sort();

const expectedOptionKeys = [
    "exchange",
    "expiry",
    "fyToken",
    "lotSize",
    "optionType",
    "scripCode",
    "segment",
    "strike",
    "symbolTicker",
    "tickSize",
    "underlying"
].sort();

if (
    equitySearch.length > 0 &&
    JSON.stringify(equityKeys) !== JSON.stringify(expectedEquityKeys)
) {
    throw new Error(
        `Equity search shape mismatch: ${JSON.stringify(equityKeys)}`
    );
}

if (
    optionSearch.length > 0 &&
    JSON.stringify(optionKeys) !== JSON.stringify(expectedOptionKeys)
) {
    throw new Error(
        `Option search shape mismatch: ${JSON.stringify(optionKeys)}`
    );
}

console.log(JSON.stringify({
    validation: "PASS",
    equitySearchCount: equitySearch.length,
    optionSearchCount: optionSearch.length,
    equityStatus,
    optionStatus,
    contractDatabase: dbStatus,
    candleDatabase: candleStatus
}, null, 2));
'@

    Write-Utf8NoBom $ValidationMjs $validationJs
    Run-Node $ValidationMjs

    # -----------------------------------------------------------------
    # ARCHIVE LEGACY JSON/CSV AFTER ALL VALIDATION PASSES
    # -----------------------------------------------------------------

    Step "11. ARCHIVE LEGACY JSON/CSV"

    foreach ($f in $ExistingData) {
        if (Test-Path -LiteralPath $f -PathType Leaf) {
            Move-Item -LiteralPath $f -Destination $BackupData -Force
            Write-Host "ARCHIVED $f" -ForegroundColor Green
        }
    }

    # -----------------------------------------------------------------
    # FINAL CHECK: NO ACTIVE LEGACY MASTER FILES
    # -----------------------------------------------------------------

    Step "12. FINAL VALIDATION"

    Require-File $ContractDb "fyers-contract-master.db"
    Require-File $CandleDb "fyers-candle-cache.db"

    foreach ($legacy in @(
        "fyers-equity-master.json",
        "fyers-option-master.json",
        "NSE_CM.csv",
        "NSE_FO.csv",
        "BSE_FO.csv"
    )) {
        $p = Join-Path $DataDir $legacy
        if (Test-Path -LiteralPath $p) {
            throw "Legacy active file still exists: $p"
        }
    }

    & node --input-type=module -e @'
import * as e from "./server/fyers/equityMaster.js";
import * as s from "./server/fyers/symbolMaster.js";
import * as c from "./server/fyers/data/FyersContractDatabase.js";
import * as k from "./server/fyers/data/FyersCandleDatabase.js";

if (!e.loadFyersEquityMasterFromDisk()) throw new Error("Final equity load failed");
if (!s.loadFyersSymbolMasterFromDisk()) throw new Error("Final option load failed");
if (c.getFyersEquityCount() <= 0) throw new Error("Final equity count is zero");
if (c.getFyersOptionCount() <= 0) throw new Error("Final option count is zero");

console.log(JSON.stringify({
    final: "PASS",
    equityCount: c.getFyersEquityCount(),
    optionCount: c.getFyersOptionCount(),
    retentionDays: k.fyersCandleRetentionDays(),
    contractDatabase: c.fyersContractDatabasePath(),
    candleDatabase: k.fyersCandleDatabasePath()
}, null, 2));
'@

    if ($LASTEXITCODE -ne 0) {
        throw "Final runtime validation failed."
    }

    Write-Host ""
    Write-Host "FYERS STORAGE MIGRATION COMPLETE" -ForegroundColor Green
    Write-Host "Contract DB : $ContractDb" -ForegroundColor Green
    Write-Host "Candle DB   : $CandleDb" -ForegroundColor Green
    Write-Host "Retention   : $RetentionDays days" -ForegroundColor Green
    Write-Host "Backup      : $BackupRoot" -ForegroundColor Green
    Write-Host "FyersFeed.js: unchanged" -ForegroundColor Green

}
catch {

    Step "ROLLBACK"

    Write-Host $_.Exception.Message -ForegroundColor Red

    # Restore modified source files.
    foreach ($name in @(
        "equityMaster.js",
        "symbolMaster.js",
        "history.js"
    )) {
        $backup = Join-Path $BackupRoot $name
        $destination = Join-Path $FyersRoot $name

        if (Test-Path -LiteralPath $backup -PathType Leaf) {
            Copy-Item -LiteralPath $backup -Destination $destination -Force
            Write-Host "RESTORED $destination" -ForegroundColor Yellow
        }
    }

    # Restore .env if it existed before migration.
    $envBackup = Join-Path $BackupRoot ".env"
    if (Test-Path -LiteralPath $envBackup -PathType Leaf) {
        Copy-Item -LiteralPath $envBackup -Destination $EnvFile -Force
        Write-Host "RESTORED $EnvFile" -ForegroundColor Yellow
    }

    # Restore legacy JSON/CSV files.
    foreach ($name in @(
        "fyers-equity-master.json",
        "fyers-option-master.json",
        "NSE_CM.csv",
        "NSE_FO.csv",
        "BSE_FO.csv"
    )) {
        $backup = Join-Path $BackupData $name
        $destination = Join-Path $DataDir $name

        if (Test-Path -LiteralPath $backup -PathType Leaf) {
            Copy-Item -LiteralPath $backup -Destination $destination -Force
            Write-Host "RESTORED $destination" -ForegroundColor Yellow
        }
    }

    # Restore pre-existing DBs, otherwise delete newly created DBs.
    foreach ($dbBase in @($ContractDb,$CandleDb)) {

        foreach ($suffix in @("", "-wal", "-shm")) {
            $backup = Join-Path $BackupRoot ((Split-Path $dbBase -Leaf) + $suffix)
            $destination = $dbBase + $suffix

            if (Test-Path -LiteralPath $backup -PathType Leaf) {
                Copy-Item -LiteralPath $backup -Destination $destination -Force
            }
            elseif (-not (Test-Path -LiteralPath (Join-Path $BackupRoot (Split-Path $dbBase -Leaf)))) {
                Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
            }
        }
    }

    # Restore/remove DB modules.
    foreach ($module in $DbModules) {
        $backup = Join-Path $BackupRoot (Split-Path $module -Leaf)

        if (Test-Path -LiteralPath $backup -PathType Leaf) {
            Copy-Item -LiteralPath $backup -Destination $module -Force
        }
        else {
            Remove-Item -LiteralPath $module -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host "ROLLBACK FINISHED." -ForegroundColor Yellow
    Write-Host "Backup retained at: $BackupRoot" -ForegroundColor Yellow
    exit 1
}
finally {
    Remove-Item -LiteralPath (Join-Path $ProjectRoot "._FyersStorageImport.mjs") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $ProjectRoot "._ValidateFyersStorage.mjs") -Force -ErrorAction SilentlyContinue
    Pop-Location
}
