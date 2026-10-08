# =====================================================================
# Migrate-IndstocksStorage.ps1
# Regenerated FINAL: duplicate-safe contract DB and marker-based JS storage migration using the exact current IndStocks source structure.
#
# IndStocks storage migration:
#   contract-master.json  -> indstocks-contract-master.db
#   candle-cache/*.json   -> indstocks-candle-cache.db
#
# Current runtime contract is preserved:
#   symbolMaster.js exports the same functions and returns the same
#   normalized contract objects.
#   history.js returns the same candle objects:
#       { time, open, high, low, close, volume }
#
# Only persistent storage changes. Frontend/API route files are not
# changed because their imports already point to symbolMaster.js.
#
# Backup:
#   server\indstocks\_migration-backup\YYYYMMDD-HHMMSS\
#
# Example:
#   pwsh -NoProfile -ExecutionPolicy Bypass `
#     -File .\scripts\Migrate-IndstocksStorage.ps1 `
#     -RetentionDays 14
# =====================================================================

[CmdletBinding()]
param(
    [string]$ProjectRoot = "C:\AI-Institutional",
    [ValidateSet(14,31)]
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$IndRoot = Join-Path $ProjectRoot "server\indstocks"
$DataDir = Join-Path $IndRoot "data"
$CandleDir = Join-Path $DataDir "candle-cache"

$SymbolsJs = Join-Path $IndRoot "symbolMaster.js"
$HistoryJs = Join-Path $IndRoot "history.js"
$ContractJson = Join-Path $DataDir "contract-master.json"

$ContractDbModule = Join-Path $DataDir "IndstocksContractDatabase.js"
$CandleDbModule = Join-Path $DataDir "IndstocksCandleDatabase.js"

$ContractDb = Join-Path $DataDir "indstocks-contract-master.db"
$CandleDb = Join-Path $DataDir "indstocks-candle-cache.db"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $IndRoot "_migration-backup\$Stamp"
$BackupData = Join-Path $BackupRoot "data"
$BackupCandle = Join-Path $BackupData "candle-cache"

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Step([string]$Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Assert-File([string]$PathValue, [string]$Label) {
    if (-not (Test-Path -LiteralPath $PathValue -PathType Leaf)) {
        throw "$Label not found: $PathValue"
    }
}

function Write-Utf8([string]$PathValue, [string]$Text) {
    [IO.File]::WriteAllText($PathValue, $Text, $Utf8NoBom)
}

function Backup-File([string]$Source, [string]$Destination) {
    if (Test-Path -LiteralPath $Source -PathType Leaf) {
        New-Item -ItemType Directory -Path (Split-Path $Destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $Source -Destination $Destination -Force
    }
}

function Run-Node([string]$PathValue) {
    & node $PathValue
    if ($LASTEXITCODE -ne 0) {
        throw "Node execution failed: $PathValue"
    }
}

function Run-NodeCheck([string]$PathValue) {
    & node --check $PathValue
    if ($LASTEXITCODE -ne 0) {
        throw "Node syntax check failed: $PathValue"
    }
}

function Replace-One([string]$PathValue, [string]$Pattern, [string]$Replacement, [string]$Label) {
    $text = [IO.File]::ReadAllText($PathValue)

    $matches = [regex]::Matches(
        $text,
        $Pattern,
        [Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($matches.Count -ne 1) {
        throw "Patch '$Label' expected exactly 1 match in $PathValue; found $($matches.Count)."
    }

    $updated = [regex]::Replace(
        $text,
        $Pattern,
        $Replacement,
        [Text.RegularExpressions.RegexOptions]::Singleline
    )

    [IO.File]::WriteAllText($PathValue, $updated, $Utf8NoBom)
}

function Replace-Section(
    [string]$PathValue,
    [string]$StartPattern,
    [string]$EndPattern,
    [string]$Replacement,
    [string]$Label
) {
    $text = [IO.File]::ReadAllText($PathValue)

    $options = [Text.RegularExpressions.RegexOptions]::Singleline

    $start = [regex]::Match($text, $StartPattern, $options)
    if (-not $start.Success) {
        throw "Patch '$Label' could not find START marker in $PathValue."
    }

    $searchStart = $start.Index + $start.Length
    $end = [regex]::Match($text.Substring($searchStart), $EndPattern, $options)
    if (-not $end.Success) {
        throw "Patch '$Label' could not find END marker in $PathValue."
    }

    $endIndex = $searchStart + $end.Index

    $updated =
        $text.Substring(0, $start.Index) +
        $Replacement +
        $text.Substring($endIndex)

    [IO.File]::WriteAllText($PathValue, $updated, $Utf8NoBom)
}

function Restore-File([string]$Backup, [string]$Destination) {
    if (Test-Path -LiteralPath $Backup -PathType Leaf) {
        Copy-Item -LiteralPath $Backup -Destination $Destination -Force
    }
}

function Patch-JsImports([string]$PathValue, [string]$DatabaseFunction, [string]$DatabaseModule, [string]$Label) {
    $text = [IO.File]::ReadAllText($PathValue)

    # Remove filesystem cache imports individually. This is intentionally
    # formatting/order independent and is safe to re-run.
    $text = [regex]::Replace(
        $text,
        '(?m)^import\s+fs\s+from\s+"fs";\s*\r?\n?',
        ''
    )

    $text = [regex]::Replace(
        $text,
        '(?m)^import\s+path\s+from\s+"path";\s*\r?\n?',
        ''
    )

    # The desired database import is idempotent.
    if ($text -notmatch [regex]::Escape($DatabaseFunction)) {
        $importBlock = "`r`nimport {`r`n    $DatabaseFunction`r`n} from `"$DatabaseModule`";`r`n"

        $tokenPattern = '(?m)^import\s+\{[^}]*\}\s+from\s+"\./token\.js";\s*\r?\n?'
        $tokenMatch = [regex]::Match($text, $tokenPattern)

        if (-not $tokenMatch.Success) {
            throw "Patch '$Label' could not locate ./token.js import in $PathValue."
        }

        $replacement = $tokenMatch.Value.TrimEnd() + $importBlock
        $text = $text.Remove($tokenMatch.Index, $tokenMatch.Length)
        $text = $text.Insert($tokenMatch.Index, $replacement)
    }

    [IO.File]::WriteAllText($PathValue, $text, $Utf8NoBom)
}

$ImportScript = $null
$ValidationScript = $null

Push-Location $ProjectRoot

try {

    # -----------------------------------------------------------------
    # 1. PRE-FLIGHT
    # -----------------------------------------------------------------

    Step "1. PRE-FLIGHT"

    Assert-File $SymbolsJs "symbolMaster.js"
    Assert-File $HistoryJs "history.js"
    Assert-File $ContractJson "contract-master.json"

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "node was not found on PATH."
    }

    & node --input-type=module -e "import Database from 'better-sqlite3'; const db=new Database(':memory:'); db.exec('CREATE TABLE t(x INTEGER)'); db.close(); console.log('better-sqlite3: OK');"
    if ($LASTEXITCODE -ne 0) {
        throw "better-sqlite3 runtime probe failed."
    }

    $candleFiles = @()
    if (Test-Path -LiteralPath $CandleDir) {
        $candleFiles = @(Get-ChildItem -LiteralPath $CandleDir -File -Filter *.json)
    }

    Write-Host "ProjectRoot      : $ProjectRoot"
    Write-Host "RetentionDays    : $RetentionDays"
    Write-Host "Contract master  : $ContractJson"
    Write-Host "Candle JSON files: $($candleFiles.Count)"

    # -----------------------------------------------------------------
    # 2. BACKUP
    # -----------------------------------------------------------------

    Step "2. CREATE TIMESTAMPED BACKUP"

    New-Item -ItemType Directory -Path $BackupData -Force | Out-Null
    New-Item -ItemType Directory -Path $BackupCandle -Force | Out-Null

    Backup-File $SymbolsJs (Join-Path $BackupRoot "symbolMaster.js")
    Backup-File $HistoryJs (Join-Path $BackupRoot "history.js")
    Backup-File $ContractJson (Join-Path $BackupData "contract-master.json")

    foreach ($file in $candleFiles) {
        Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $BackupCandle $file.Name) -Force
    }

    if (Test-Path -LiteralPath $ContractDb -PathType Leaf) {
        Backup-File $ContractDb (Join-Path $BackupData "indstocks-contract-master.db")
    }
    if (Test-Path -LiteralPath $CandleDb -PathType Leaf) {
        Backup-File $CandleDb (Join-Path $BackupData "indstocks-candle-cache.db")
    }

    # Preserve any existing DB sidecars too.
    foreach ($sidecar in @(
        "$ContractDb-wal",
        "$ContractDb-shm",
        "$CandleDb-wal",
        "$CandleDb-shm"
    )) {
        if (Test-Path -LiteralPath $sidecar -PathType Leaf) {
            Backup-File $sidecar (Join-Path $BackupData (Split-Path $sidecar -Leaf))
        }
    }

    Write-Host "Backup: $BackupRoot" -ForegroundColor Green

    # The migration always rebuilds the target SQLite databases from the
    # backed-up legacy sources. This also guarantees that a partially-created
    # database from a failed prior migration cannot preserve an obsolete
    # schema (for example the old UNIQUE(exchange, security_id) constraint).
    foreach ($dbPath in @($ContractDb, $CandleDb)) {
        Remove-Item -LiteralPath $dbPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "$dbPath-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "$dbPath-shm" -Force -ErrorAction SilentlyContinue
    }

    # Make the desired retention available to child Node processes.
    $env:INDSTOCKS_CANDLE_RETENTION_DAYS = [string]$RetentionDays

    # -----------------------------------------------------------------
    # 3. CREATE CONTRACT DB MODULE
    # -----------------------------------------------------------------

    Step "3. CREATE SQLITE CONTRACT DATABASE MODULE"

    $contractModule = @'
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.resolve(
    process.cwd(),
    "server",
    "indstocks",
    "data"
);

const DATABASE_FILE = path.join(
    DATA_DIR,
    "indstocks-contract-master.db"
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

    db.exec(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exchange TEXT NOT NULL,
            security_id TEXT NOT NULL,
            segment TEXT,
            trading_symbol TEXT,
            custom_symbol TEXT,
            symbol_name TEXT,
            instrument_name TEXT,
            expiry_date TEXT,
            expiry_code TEXT,
            strike REAL,
            option_type TEXT,
            lot_size REAL,
            tick_size REAL,
            instrument_type TEXT,
            series TEXT,
            raw_json TEXT NOT NULL,
            active_status INTEGER NOT NULL DEFAULT 1,
            last_updated TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_indstocks_contract_exchange_security_id
        ON contracts(exchange, security_id);

        CREATE INDEX IF NOT EXISTS idx_indstocks_contract_trading_symbol
        ON contracts(trading_symbol);

        CREATE INDEX IF NOT EXISTS idx_indstocks_contract_security_id
        ON contracts(security_id);

        CREATE INDEX IF NOT EXISTS idx_indstocks_contract_instrument_type
        ON contracts(instrument_type);

        CREATE INDEX IF NOT EXISTS idx_indstocks_contract_option_search
        ON contracts(
            exchange,
            trading_symbol,
            expiry_date,
            strike,
            option_type,
            active_status
        );

        CREATE INDEX IF NOT EXISTS idx_indstocks_contract_expiry
        ON contracts(expiry_date);

        CREATE TABLE IF NOT EXISTS master_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            downloaded_at TEXT,
            count INTEGER NOT NULL DEFAULT 0
        );
    `);

    console.log(
        "[INDSTOCKS CONTRACT DB] SQLite initialized:",
        DATABASE_FILE
    );

    return db;
}

export function getIndstocksContractDatabase() {
    return initialize();
}

export function replaceContracts(records, downloadedAt = new Date().toISOString()) {

    if (!Array.isArray(records) || records.length === 0) {
        throw new Error("[INDSTOCKS CONTRACT DB] No contracts supplied.");
    }

    const database = initialize();

    const insert = database.prepare(`
        INSERT INTO contracts (
            exchange,
            security_id,
            segment,
            trading_symbol,
            custom_symbol,
            symbol_name,
            instrument_name,
            expiry_date,
            expiry_code,
            strike,
            option_type,
            lot_size,
            tick_size,
            instrument_type,
            series,
            raw_json,
            active_status,
            last_updated
        ) VALUES (
            @exchange,
            @security_id,
            @segment,
            @trading_symbol,
            @custom_symbol,
            @symbol_name,
            @instrument_name,
            @expiry_date,
            @expiry_code,
            @strike,
            @option_type,
            @lot_size,
            @tick_size,
            @instrument_type,
            @series,
            @raw_json,
            1,
            @last_updated
        )
    `);

    const transaction = database.transaction(items => {

        database.prepare("DELETE FROM contracts").run();

        for (const c of items) {

            if (!c?.exchange || !c?.securityId) {
                continue;
            }

            insert.run({
                exchange: String(c.exchange),
                security_id: String(c.securityId),
                segment: c.segment ?? null,
                trading_symbol: c.tradingSymbol ?? null,
                custom_symbol: c.customSymbol ?? null,
                symbol_name: c.symbolName ?? null,
                instrument_name: c.instrumentName ?? null,
                expiry_date: c.expiryDate ?? null,
                expiry_code: c.expiryCode ?? null,
                strike: c.strike === undefined ? null : c.strike,
                option_type: c.optionType ?? null,
                lot_size: c.lotSize === undefined ? null : c.lotSize,
                tick_size: c.tickSize === undefined ? null : c.tickSize,
                instrument_type: c.instrumentType ?? null,
                series: c.series ?? null,
                raw_json: JSON.stringify(c),
                last_updated: downloadedAt
            });
        }

        database.prepare(`
            INSERT INTO master_meta (id, downloaded_at, count)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                downloaded_at = excluded.downloaded_at,
                count = excluded.count
        `).run(downloadedAt, items.length);
    });

    transaction(records);

    return records.length;
}

export function getAllContracts() {

    const rows = initialize()
        .prepare(`
            SELECT raw_json
            FROM contracts
            WHERE active_status = 1
            ORDER BY id
        `)
        .all();

    return rows.map(row => JSON.parse(row.raw_json));
}

export function getContractCount() {

    return Number(
        initialize()
            .prepare(`
                SELECT COUNT(*) AS count
                FROM contracts
                WHERE active_status = 1
            `)
            .get()
            .count
    );
}

export function getIndstocksContractDatabaseStatus() {

    const database = initialize();

    const meta = database
        .prepare(`
            SELECT downloaded_at, count
            FROM master_meta
            WHERE id = 1
        `)
        .get();

    return {
        databaseFile: DATABASE_FILE,
        count: getContractCount(),
        lastRefresh: meta?.downloaded_at ?? null
    };
}

export function indstocksContractDatabasePath() {
    return DATABASE_FILE;
}

export function closeIndstocksContractDatabase() {

    if (!db) {
        return;
    }

    db.close();
    db = null;
}
'@

    Write-Utf8 $ContractDbModule $contractModule

    # -----------------------------------------------------------------
    # 4. CREATE CANDLE DB MODULE
    # -----------------------------------------------------------------

    Step "4. CREATE SQLITE CANDLE DATABASE MODULE"

    $candleModule = @'
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.resolve(
    process.cwd(),
    "server",
    "indstocks",
    "data"
);

const DATABASE_FILE = path.join(
    DATA_DIR,
    "indstocks-candle-cache.db"
);

const RETENTION_DAYS = Math.max(
    1,
    Number(process.env.INDSTOCKS_CANDLE_RETENTION_DAYS ?? 14) || 14
);

const RETENTION_SECONDS =
    RETENTION_DAYS * 24 * 60 * 60;

let db = null;
let cleanupTimer = null;

function createDatabase() {

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
            exchange TEXT NOT NULL,
            security_id TEXT NOT NULL,
            resolution TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (
                exchange,
                security_id,
                resolution,
                timestamp
            )
        );

        CREATE INDEX IF NOT EXISTS idx_indstocks_candle_lookup
        ON candles(exchange, security_id, resolution, timestamp);

        CREATE INDEX IF NOT EXISTS idx_indstocks_candle_timestamp
        ON candles(timestamp);
    `);

    cleanupOldCandles();

    cleanupTimer = setInterval(() => {
        try {
            cleanupOldCandles();
        } catch (error) {
            console.error(
                "[INDSTOCKS CANDLE DB] Retention cleanup failed:",
                error?.message ?? error
            );
        }
    }, 60 * 60 * 1000);

    if (cleanupTimer.unref) {
        cleanupTimer.unref();
    }

    console.log(
        "[INDSTOCKS CANDLE DB] SQLite initialized:",
        DATABASE_FILE,
        "retentionDays:",
        RETENTION_DAYS
    );

    return db;
}

export function getIndstocksCandleDatabase() {
    return createDatabase();
}

export function upsertCandles(exchange, securityId, resolution, candles) {

    if (
        !exchange ||
        !securityId ||
        !resolution ||
        !Array.isArray(candles) ||
        candles.length === 0
    ) {
        return 0;
    }

    const database = createDatabase();
    const now = Math.floor(Date.now() / 1000);

    const insert = database.prepare(`
        INSERT INTO candles (
            exchange,
            security_id,
            resolution,
            timestamp,
            open,
            high,
            low,
            close,
            volume,
            created_at
        ) VALUES (
            @exchange,
            @security_id,
            @resolution,
            @timestamp,
            @open,
            @high,
            @low,
            @close,
            @volume,
            @created_at
        )
        ON CONFLICT(
            exchange,
            security_id,
            resolution,
            timestamp
        ) DO UPDATE SET
            open = excluded.open,
            high = excluded.high,
            low = excluded.low,
            close = excluded.close,
            volume = excluded.volume,
            created_at = excluded.created_at
    `);

    const transaction = database.transaction(rows => {

        for (const candle of rows) {

            const timestamp = Number(candle?.time);

            if (!Number.isFinite(timestamp)) {
                continue;
            }

            insert.run({
                exchange: String(exchange).trim().toUpperCase(),
                security_id: String(securityId).trim(),
                resolution: String(resolution).trim(),
                timestamp,
                open: Number(candle.open),
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
                volume: Number(candle.volume ?? 0),
                created_at: now
            });
        }
    });

    transaction(candles);

    return candles.length;
}

export function getCoverage(exchange, securityId, resolution, fromSeconds, toSeconds) {

    const row = createDatabase()
        .prepare(`
            SELECT
                MIN(timestamp) AS min_time,
                MAX(timestamp) AS max_time,
                COUNT(*) AS count
            FROM candles
            WHERE exchange = ?
              AND security_id = ?
              AND resolution = ?
              AND timestamp BETWEEN ? AND ?
        `)
        .get(
            String(exchange).trim().toUpperCase(),
            String(securityId).trim(),
            String(resolution).trim(),
            Number(fromSeconds),
            Number(toSeconds)
        );

    return {
        minTime: row?.min_time ?? null,
        maxTime: row?.max_time ?? null,
        count: Number(row?.count ?? 0)
    };
}

export function getCandles(exchange, securityId, resolution, fromSeconds, toSeconds) {

    const rows = createDatabase()
        .prepare(`
            SELECT
                timestamp,
                open,
                high,
                low,
                close,
                volume
            FROM candles
            WHERE exchange = ?
              AND security_id = ?
              AND resolution = ?
              AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp ASC
        `)
        .all(
            String(exchange).trim().toUpperCase(),
            String(securityId).trim(),
            String(resolution).trim(),
            Number(fromSeconds),
            Number(toSeconds)
        );

    return rows.map(row => ({
        time: Number(row.timestamp),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume ?? 0)
    }));
}

export function cleanupOldCandles() {

    const database = createDatabaseWithoutCleanupLoop();

    const cutoff =
        Math.floor(Date.now() / 1000) - RETENTION_SECONDS;

    const result = database
        .prepare(`DELETE FROM candles WHERE timestamp < ?`)
        .run(cutoff);

    try {
        database.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
        // Non-fatal maintenance.
    }

    if (result.changes > 0) {
        console.log(
            "[INDSTOCKS CANDLE DB] Retention cleanup:",
            result.changes,
            "rows removed; retentionDays:",
            RETENTION_DAYS
        );
    }

    return result.changes;
}

function createDatabaseWithoutCleanupLoop() {

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
            exchange TEXT NOT NULL,
            security_id TEXT NOT NULL,
            resolution TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (
                exchange,
                security_id,
                resolution,
                timestamp
            )
        );

        CREATE INDEX IF NOT EXISTS idx_indstocks_candle_lookup
        ON candles(exchange, security_id, resolution, timestamp);

        CREATE INDEX IF NOT EXISTS idx_indstocks_candle_timestamp
        ON candles(timestamp);
    `);

    return db;
}

export function getIndstocksCandleDatabaseStatus() {

    const row = createDatabase()
        .prepare(`
            SELECT
                COUNT(*) AS count,
                MIN(timestamp) AS min_time,
                MAX(timestamp) AS max_time
            FROM candles
        `)
        .get();

    return {
        databaseFile: DATABASE_FILE,
        count: Number(row?.count ?? 0),
        minTime: row?.min_time ?? null,
        maxTime: row?.max_time ?? null,
        retentionDays: RETENTION_DAYS
    };
}

export function indstocksCandleDatabasePath() {
    return DATABASE_FILE;
}

export function indstocksCandleRetentionDays() {
    return RETENTION_DAYS;
}

export function closeIndstocksCandleDatabase() {

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

    Write-Utf8 $CandleDbModule $candleModule

    # -----------------------------------------------------------------
    # 5. IMPORT EXISTING MASTER + CANDLES
    # -----------------------------------------------------------------

    Step "5. IMPORT EXISTING JSON DATA INTO SQLITE"

    # Ensure the Node child process uses the requested retention during
    # the import as well as at runtime.
    $env:INDSTOCKS_CANDLE_RETENTION_DAYS = [string]$RetentionDays

    $ImportScript = Join-Path $ProjectRoot "_Migrate-IndstocksStorageImport.mjs"

    $importJs = @'
import fs from "fs";
import path from "path";

import {
    replaceContracts,
    getContractCount,
    getAllContracts,
    getIndstocksContractDatabaseStatus
} from "./server/indstocks/data/IndstocksContractDatabase.js";

import {
    upsertCandles,
    getIndstocksCandleDatabaseStatus
} from "./server/indstocks/data/IndstocksCandleDatabase.js";

const root = process.cwd();
const dataDir = path.join(root, "server", "indstocks", "data");
const masterFile = path.join(dataDir, "contract-master.json");
const candleDir = path.join(dataDir, "candle-cache");

const master = JSON.parse(fs.readFileSync(masterFile, "utf8"));
const sourceContracts = Array.isArray(master?.contracts) ? master.contracts : [];

if (sourceContracts.length === 0) {
    throw new Error("contract-master.json contains no contracts.");
}

const downloadedAt = master?.downloadedAt || new Date().toISOString();

replaceContracts(sourceContracts, downloadedAt);

const sqlCount = getContractCount();

if (sqlCount !== sourceContracts.length) {
    throw new Error(
        `Contract count mismatch: source=${sourceContracts.length}, sqlite=${sqlCount}`
    );
}

const storedContracts = getAllContracts();

for (let i = 0; i < Math.min(25, sourceContracts.length); i++) {
    const expected = JSON.stringify(sourceContracts[i]);
    const actual = JSON.stringify(storedContracts[i]);

    if (expected !== actual) {
        const sample = sourceContracts[i];
        throw new Error(
            `raw_json compatibility mismatch at source index ${i}: ${sample?.exchange}_${sample?.securityId}`
        );
    }
}

let candleFiles = [];

if (fs.existsSync(candleDir)) {
    candleFiles = fs.readdirSync(candleDir)
        .filter(name => name.toLowerCase().endsWith(".json"));
}

let candleRows = 0;
let candleUniqueRows = 0;
let candleRowsImported = 0;
let filesImported = 0;

const allCandleKeys = new Set();

for (const fileName of candleFiles) {

    const match =
        /^([A-Za-z]+)_(\d+)_(.+)\.json$/i.exec(fileName);

    if (!match) {
        throw new Error(`Unexpected candle filename: ${fileName}`);
    }

    const exchange = match[1].toUpperCase();
    const securityId = match[2];
    const resolution = match[3];

    const filePath = path.join(candleDir, fileName);
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const candles = Array.isArray(parsed?.candles) ? parsed.candles : [];

    candleRows += candles.length;

    const perFileKeys = new Set();

    for (const candle of candles) {
        const ts = Number(candle?.time);

        if (!Number.isFinite(ts)) {
            continue;
        }

        const key = [exchange, securityId, resolution, ts].join("|");
        perFileKeys.add(key);
        allCandleKeys.add(key);
    }

    candleUniqueRows += perFileKeys.size;

    candleRowsImported +=
        upsertCandles(
            exchange,
            securityId,
            resolution,
            candles
        );

    filesImported++;
}

const candleStatus =
    getIndstocksCandleDatabaseStatus();

if (candleStatus.count > allCandleKeys.size) {
    throw new Error(
        `SQLite candle count unexpectedly exceeds unique source rows: sqlite=${candleStatus.count}, sourceUnique=${allCandleKeys.size}`
    );
}

console.log(JSON.stringify({
    validation: "PASS",
    contractSourceCount: sourceContracts.length,
    contractSqliteCount: sqlCount,
    candleFiles: candleFiles.length,
    candleFilesImported: filesImported,
    candleSourceRows: candleRows,
    candleSourceUniqueRows: candleUniqueRows,
    candleRowsWritten: candleRowsImported,
    candleSqliteRows: candleStatus.count,
    contractDatabase: getIndstocksContractDatabaseStatus(),
    candleDatabase: candleStatus
}, null, 2));
'@

    Write-Utf8 $ImportScript $importJs
    Run-Node $ImportScript

    # -----------------------------------------------------------------
    # 6. PATCH symbolMaster.js
    # -----------------------------------------------------------------

    Step "6. PATCH symbolMaster.js -> SQLite"

    Replace-One `
        $SymbolsJs `
        '(?m)^import\s+fs\s+from\s+"fs";\s*\r?\n?' `
        '' `
        "symbolMaster fs import"

    Replace-One `
        $SymbolsJs `
        '(?m)^import\s+path\s+from\s+"path";\s*\r?\n?' `
        '' `
        "symbolMaster path import"

    Replace-One `
        $SymbolsJs `
        'import\s+\{\s*getAccessToken\s*\}\s+from\s+"\./token\.js";' `
        @'
import { getAccessToken } from "./token.js";
import {
    replaceContracts,
    getAllContracts,
    getIndstocksContractDatabaseStatus,
    indstocksContractDatabasePath
} from "./data/IndstocksContractDatabase.js";
'@ `
        "symbolMaster database imports"

    # Remove the JSON storage constants only.  Do not touch any of the
    # contract normalization/search logic.
    Replace-One `
        $SymbolsJs `
        'const DATA_DIR =\s*path\.resolve\(process\.cwd\(\), "server", "indstocks", "data"\);\s*\r?\n\r?\nconst MASTER_FILE =\s*path\.join\(DATA_DIR, "contract-master\.json"\);\s*' `
        '' `
        "symbolMaster JSON storage constants"

    # Remove the filesystem directory helper.  The SQLite module creates
    # the data directory itself.
    Replace-One `
        $SymbolsJs `
        'function ensureDataDir\(\)\s*\{[\s\S]*?\}\s*\r?\n\r?\n' `
        '' `
        "symbolMaster ensureDataDir"

    # Replace the entire download function with the exact current
    # function shape, preserving all download/normalization behavior.
    Replace-Section `
        $SymbolsJs `
        'export async function downloadContractMaster\(\)\s*\{' `
        '//======================================================\s*// LOCAL CACHE' `
        @'
export async function downloadContractMaster() {

    const token = await getAccessToken();

    console.log("[INDSTOCKS SYMBOLS] Downloading instrument masters...");

    const allContracts = [];

    //--------------------------------------------------
    // FNO
    //--------------------------------------------------

    try {

        const res = await axios.get(
            `${INDSTOCKS_BASE}/market/instruments?source=fno`,
            { headers: { Authorization: token }, responseType: "text", timeout: 60000 }
        );

        const rows = parseCsv(res.data);

        for (const row of rows) {
            const c = normalizeFullRow(row, "NSE");
            if (c) allContracts.push(c);
        }

        console.log(`[INDSTOCKS SYMBOLS] fno: ${rows.length} rows`);

    } catch (error) {

        console.warn("[INDSTOCKS SYMBOLS] fno download failed:", error?.message ?? error);

    }

    //--------------------------------------------------
    // EQUITY
    //--------------------------------------------------

    try {

        const res = await axios.get(
            `${INDSTOCKS_BASE}/market/instruments?source=equity`,
            { headers: { Authorization: token }, responseType: "text", timeout: 60000 }
        );

        const rows = parseCsv(res.data);

        for (const row of rows) {
            const c = normalizeFullRow(row, "NSE");
            if (c) allContracts.push(c);
        }

        console.log(`[INDSTOCKS SYMBOLS] equity: ${rows.length} rows`);

    } catch (error) {

        console.warn("[INDSTOCKS SYMBOLS] equity download failed:", error?.message ?? error);

    }

    //--------------------------------------------------
    // INDEX
    //--------------------------------------------------

    try {

        const res = await axios.get(
            `${INDSTOCKS_BASE}/market/instruments?source=index`,
            { headers: { Authorization: token }, responseType: "text", timeout: 60000 }
        );

        const rows = parseCsv(res.data);

        for (const row of rows) {
            const c = normalizeIndexRow(row);
            if (c) allContracts.push(c);
        }

        console.log(`[INDSTOCKS SYMBOLS] index: ${rows.length} rows`);

    } catch (error) {

        console.warn("[INDSTOCKS SYMBOLS] index download failed:", error?.message ?? error);

    }

    if (allContracts.length === 0) {
        throw new Error("[INDSTOCKS SYMBOLS] No contracts downloaded from any source.");
    }

    const downloadedAt = new Date().toISOString();

    replaceContracts(allContracts, downloadedAt);

    contracts = getAllContracts();

    buildIndexes();

    loaded = true;
    lastRefresh = Date.now();

    console.log(`[INDSTOCKS SYMBOLS] Total contracts loaded: ${contracts.length}`);

    return { success: true, count: contracts.length };

}

'@ `
        "symbolMaster downloadContractMaster"

    Replace-Section `
        $SymbolsJs `
        'export function loadContractMaster\(\)\s*\{' `
        '//======================================================\s*// INITIALIZE' `
        @'
export function loadContractMaster() {

    try {

        const cached = getAllContracts();

        if (!Array.isArray(cached) || cached.length === 0) {
            return false;
        }

        contracts = cached;
        buildIndexes();
        loaded = true;

        const status =
            getIndstocksContractDatabaseStatus();

        lastRefresh =
            status?.lastRefresh
                ? Date.parse(status.lastRefresh) || 0
                : 0;

        console.log(
            `[INDSTOCKS SYMBOLS] Loaded ${contracts.length} contracts from SQLite.`
        );

        return true;

    } catch (error) {

        console.error(
            "[INDSTOCKS SYMBOLS] SQLite cache load failed:",
            error?.message ?? error
        );

        return false;

    }

}

'@ `
        "symbolMaster loadContractMaster"

    # Status shape is preserved; only the storage field changes from
    # cacheFile -> databaseFile.
    Replace-One `
        $SymbolsJs `
        'cacheFile:\s*MASTER_FILE,' `
        'databaseFile: indstocksContractDatabasePath(),' `
        "symbolMaster status storage path"

    # -----------------------------------------------------------------
    # 7. PATCH history.js
    # -----------------------------------------------------------------

    Step "7. PATCH history.js -> SQLite candle storage"

    Replace-One `
        $HistoryJs `
        '(?m)^import\s+fs\s+from\s+"fs";\s*\r?\n?' `
        '' `
        "history fs import"

    Replace-One `
        $HistoryJs `
        '(?m)^import\s+path\s+from\s+"path";\s*\r?\n?' `
        '' `
        "history path import"

    Replace-One `
        $HistoryJs `
        'import\s+\{\s*getAccessToken\s*,\s*refreshToken\s*\}\s+from\s+"\./token\.js";' `
        @'
import { getAccessToken, refreshToken } from "./token.js";
import {
    getCandles,
    upsertCandles
} from "./data/IndstocksCandleDatabase.js";
'@ `
        "history database imports"

    Replace-One `
        $HistoryJs `
        'const CACHE_DIR\s*=\s*path\.resolve\([\s\S]*?\);\s*' `
        '' `
        "history legacy CACHE_DIR"

    Replace-One `
        $HistoryJs `
        'function ensureCacheDir\(\)\s*\{[\s\S]*?\}\s*\r?\n\r?\n' `
        '' `
        "history legacy ensureCacheDir"

    # Replace the complete legacy JSON cache implementation, including
    # cacheKey/CACHE_DIR/readCache/writeCache.
    Replace-Section `
        $HistoryJs `
        'function cacheKey\(exchange, securityId, resolution\)\s*\{' `
        '//======================================================\s*// RESOLUTION' `
        @'
function readCache(exchange, securityId, resolution) {

    try {

        const candles =
            getCandles(
                exchange,
                securityId,
                resolution,
                0,
                Number.MAX_SAFE_INTEGER
            );

        return Array.isArray(candles) && candles.length > 0
            ? candles
            : null;

    } catch {

        return null;

    }

}

function writeCache(exchange, securityId, resolution, candles) {

    try {

        upsertCandles(
            exchange,
            securityId,
            resolution,
            candles
        );

    } catch (error) {

        console.warn(
            "[INDSTOCKS HISTORY CACHE] SQLite write failed:",
            exchange,
            securityId,
            resolution,
            error?.message ?? error
        );

    }

}

'@ `
        "history SQLite cache implementation"

    Replace-One `
        $HistoryJs `
        '\s*const key = cacheKey\(exch, secId, resolution\);' `
        '' `
        "history remove cache key"

    Replace-One `
        $HistoryJs `
        'writeCache\(key, candles\);' `
        'writeCache(exch, secId, resolution, candles);' `
        "history SQLite cache write"

    Replace-One `
        $HistoryJs `
        'const cached = readCache\(key\);' `
        'const cached = readCache(exch, secId, resolution);' `
        "history SQLite cache fallback"

    # Explicit post-patch invariants.  This catches accidental references
    # to the legacy files before the source files are syntax-checked.
    $symbolText = [IO.File]::ReadAllText($SymbolsJs)
    if ($symbolText -match 'contract-master\.json|MASTER_FILE|ensureDataDir|from\s+"fs"|from\s+"path"') {
        throw "symbolMaster.js still contains legacy JSON/filesystem storage references after patch."
    }

    $historyText = [IO.File]::ReadAllText($HistoryJs)
    $legacyHistoryPatterns = @(
        '(^|\r?\n)import\s+.*from\s+"fs"',
        '(^|\r?\n)import\s+.*from\s+"path"',
        '(?m)^function\s+ensureCacheDir\s*\(',
        '(?m)^function\s+cacheKey\s*\(',
        '(?m)^function\s+cacheFile\s*\(',
        'CACHE_DIR',
        'fs\.readFileSync',
        'fs\.writeFileSync',
        'cacheFile\(',
        'cacheKey\('
    )
    foreach ($legacyPattern in $legacyHistoryPatterns) {
        if ($historyText -match $legacyPattern) {
            throw "history.js still contains legacy JSON/filesystem storage reference after patch: $legacyPattern"
        }
    }

    # -----------------------------------------------------------------
    # 8. RETENTION SETTING
    # -----------------------------------------------------------------

    Step "8. CONFIGURE CANDLE RETENTION"

    $envFile = Join-Path $ProjectRoot ".env"
    if (Test-Path -LiteralPath $envFile -PathType Leaf) {

        Backup-File $envFile (Join-Path $BackupRoot ".env")
        $envText = [IO.File]::ReadAllText($envFile)

    }
    else {

        $envText = ""

    }

    if ($envText -match '(?m)^\s*INDSTOCKS_CANDLE_RETENTION_DAYS\s*=') {
        $envText = [regex]::Replace(
            $envText,
            '(?m)^\s*INDSTOCKS_CANDLE_RETENTION_DAYS\s*=.*$',
            "INDSTOCKS_CANDLE_RETENTION_DAYS=$RetentionDays"
        )
    }
    else {
        $envText =
            $envText.TrimEnd() +
            "`r`nINDSTOCKS_CANDLE_RETENTION_DAYS=$RetentionDays`r`n"
    }

    Write-Utf8 $envFile $envText

    # -----------------------------------------------------------------
    # 9. SYNTAX CHECK
    # -----------------------------------------------------------------

    Step "9. NODE SYNTAX CHECK"

    foreach ($file in @(
        $ContractDbModule,
        $CandleDbModule,
        $SymbolsJs,
        $HistoryJs
    )) {
        Run-NodeCheck $file
        Write-Host "PASS  $file" -ForegroundColor Green
    }

    # -----------------------------------------------------------------
    # 10. RUNTIME VALIDATION
    # -----------------------------------------------------------------

    Step "10. RUNTIME VALIDATION"

    $ValidationScript = Join-Path $ProjectRoot "_Validate-IndstocksStorage.mjs"

    $validationJs = @'
import {
    loadContractMaster,
    searchIndstocksSymbolsForUI,
    searchIndstocksOptions,
    getIndstocksSymbolStatus
} from "./server/indstocks/symbolMaster.js";

import {
    getIndstocksCandleDatabaseStatus,
    indstocksCandleRetentionDays
} from "./server/indstocks/data/IndstocksCandleDatabase.js";

const loaded = loadContractMaster();

if (!loaded) {
    throw new Error("IndStocks SQLite contract load failed.");
}

const uiResults =
    searchIndstocksSymbolsForUI("NIFTY", 5);

const optionResults =
    searchIndstocksOptions({
        underlying: "NIFTY",
        limit: 5
    });

const symbolStatus =
    getIndstocksSymbolStatus();

const candleStatus =
    getIndstocksCandleDatabaseStatus();

if (!Number.isInteger(symbolStatus.count) || symbolStatus.count <= 0) {
    throw new Error(`Invalid IndStocks contract count: ${symbolStatus.count}`);
}

if (!Array.isArray(uiResults)) {
    throw new Error("UI symbol search did not return an array.");
}

if (!Array.isArray(optionResults)) {
    throw new Error("Option search did not return an array.");
}

const expectedUiKeys = [
    "displayName",
    "exchange",
    "exchangeSegment",
    "expiry",
    "feedSource",
    "instrumentId",
    "lotSize",
    "optionType",
    "strike",
    "symbol",
    "tickSize",
    "token",
    "tokenIdentifier",
    "tradingSymbol",
    "type",
    "underlying"
].sort();

if (
    uiResults.length > 0 &&
    JSON.stringify(Object.keys(uiResults[0]).sort()) !==
    JSON.stringify(expectedUiKeys)
) {
    throw new Error("IndStocks UI result shape changed.");
}

console.log(JSON.stringify({
    validation: "PASS",
    symbolStatus,
    uiSearchCount: uiResults.length,
    optionSearchCount: optionResults.length,
    candleStatus,
    retentionDays: indstocksCandleRetentionDays()
}, null, 2));
'@

    Write-Utf8 $ValidationScript $validationJs
    Run-Node $ValidationScript

    # -----------------------------------------------------------------
    # 11. ARCHIVE LEGACY FILES
    # -----------------------------------------------------------------

    Step "11. ARCHIVE LEGACY JSON CACHE"

    if (Test-Path -LiteralPath $ContractJson -PathType Leaf) {
        Move-Item -LiteralPath $ContractJson -Destination (Join-Path $BackupData "contract-master.json") -Force
        Write-Host "ARCHIVED $ContractJson" -ForegroundColor Green
    }

    if (Test-Path -LiteralPath $CandleDir) {

        $filesToArchive = @(Get-ChildItem -LiteralPath $CandleDir -File -Filter *.json)

        foreach ($file in $filesToArchive) {
            Move-Item -LiteralPath $file.FullName -Destination (Join-Path $BackupCandle $file.Name) -Force
            Write-Host "ARCHIVED $($file.Name)" -ForegroundColor Green
        }

        if (@(Get-ChildItem -LiteralPath $CandleDir -Force).Count -eq 0) {
            Remove-Item -LiteralPath $CandleDir -Force
        }
    }

    # -----------------------------------------------------------------
    # 12. FINAL VALIDATION
    # -----------------------------------------------------------------

    Step "12. FINAL VALIDATION"

    Assert-File $ContractDb "IndStocks contract database"
    Assert-File $CandleDb "IndStocks candle database"

    $finalSymbolText = [IO.File]::ReadAllText($SymbolsJs)
    $finalHistoryText = [IO.File]::ReadAllText($HistoryJs)

    if ($finalSymbolText -match 'contract-master\.json|MASTER_FILE|ensureDataDir|from\s+"fs"|from\s+"path"') {
        throw "Final validation failed: symbolMaster.js still references legacy JSON/filesystem storage."
    }

    $finalLegacyHistoryPatterns = @(
        '(^|\r?\n)import\s+.*from\s+"fs"',
        '(^|\r?\n)import\s+.*from\s+"path"',
        '(?m)^function\s+ensureCacheDir\s*\(',
        '(?m)^function\s+cacheKey\s*\(',
        '(?m)^function\s+cacheFile\s*\(',
        'CACHE_DIR',
        'fs\.readFileSync',
        'fs\.writeFileSync',
        'cacheFile\(',
        'cacheKey\('
    )
    foreach ($legacyPattern in $finalLegacyHistoryPatterns) {
        if ($finalHistoryText -match $legacyPattern) {
            throw "Final validation failed: history.js still contains legacy storage reference: $legacyPattern"
        }
    }

    if (Test-Path -LiteralPath $ContractJson) {
        throw "Legacy contract-master.json still exists in active data directory."
    }

    if (Test-Path -LiteralPath $CandleDir) {
        $leftover = @(Get-ChildItem -LiteralPath $CandleDir -File -Filter *.json)
        if ($leftover.Count -gt 0) {
            throw "Legacy candle JSON files remain: $($leftover.Count)"
        }
    }

    & node --input-type=module -e "import Database from 'better-sqlite3'; const c=new Database('./server/indstocks/data/indstocks-contract-master.db',{readonly:true}); const h=new Database('./server/indstocks/data/indstocks-candle-cache.db',{readonly:true}); const cc=c.prepare('SELECT COUNT(*) count FROM contracts WHERE active_status=1').get().count; const kc=h.prepare('SELECT COUNT(*) count FROM candles').get().count; const dup=h.prepare('SELECT exchange,security_id,resolution,timestamp,COUNT(*) count FROM candles GROUP BY exchange,security_id,resolution,timestamp HAVING COUNT(*)>1 LIMIT 1').all(); if(cc<=0) throw new Error('Contract DB empty'); if(dup.length) throw new Error('Duplicate candles found'); console.log(JSON.stringify({final:'PASS',contractCount:Number(cc),candleCount:Number(kc),contractDatabase:'server/indstocks/data/indstocks-contract-master.db',candleDatabase:'server/indstocks/data/indstocks-candle-cache.db',retentionDays:process.env.INDSTOCKS_CANDLE_RETENTION_DAYS},null,2)); c.close(); h.close();"
    if ($LASTEXITCODE -ne 0) {
        throw "Final SQLite validation failed."
    }

    Remove-Item -LiteralPath $ImportScript -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $ValidationScript -Force -ErrorAction SilentlyContinue

    Step "13. INDSTOCKS STORAGE MIGRATION COMPLETE"

    Write-Host "Contract DB : $ContractDb" -ForegroundColor Green
    Write-Host "Candle DB   : $CandleDb" -ForegroundColor Green
    Write-Host "Retention   : $RetentionDays days" -ForegroundColor Green
    Write-Host "Backup      : $BackupRoot" -ForegroundColor Green
    Write-Host "symbolMaster.js : SQLite-backed" -ForegroundColor Green
    Write-Host "history.js      : SQLite-backed" -ForegroundColor Green
    Write-Host "API/front-end response shapes: preserved" -ForegroundColor Green

}
catch {

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "ROLLBACK" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red

    Restore-File (Join-Path $BackupRoot "symbolMaster.js") $SymbolsJs
    Restore-File (Join-Path $BackupRoot "history.js") $HistoryJs
    Restore-File (Join-Path $BackupRoot ".env") (Join-Path $ProjectRoot ".env")

    $backupMaster = Join-Path $BackupData "contract-master.json"
    if (Test-Path -LiteralPath $backupMaster -PathType Leaf) {
        Copy-Item -LiteralPath $backupMaster -Destination $ContractJson -Force
    }

    if (Test-Path -LiteralPath $BackupCandle) {
        New-Item -ItemType Directory -Path $CandleDir -Force | Out-Null

        foreach ($file in Get-ChildItem -LiteralPath $BackupCandle -File -Filter *.json) {
            Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $CandleDir $file.Name) -Force
        }
    }

    # Remove newly created DBs if this was the first migration.
    $oldContractDb = Join-Path $BackupData "indstocks-contract-master.db"
    $oldCandleDb = Join-Path $BackupData "indstocks-candle-cache.db"

    if (-not (Test-Path -LiteralPath $oldContractDb -PathType Leaf)) {
        Remove-Item -LiteralPath $ContractDb -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "$ContractDb-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "$ContractDb-shm" -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path -LiteralPath $oldCandleDb -PathType Leaf)) {
        Remove-Item -LiteralPath $CandleDb -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "$CandleDb-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "$CandleDb-shm" -Force -ErrorAction SilentlyContinue
    }

    # Remove generated DB modules if they did not exist before.
    $oldContractModule = Join-Path $BackupData "IndstocksContractDatabase.js"
    $oldCandleModule = Join-Path $BackupData "IndstocksCandleDatabase.js"

    if (-not (Test-Path -LiteralPath $oldContractModule -PathType Leaf)) {
        Remove-Item -LiteralPath $ContractDbModule -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path -LiteralPath $oldCandleModule -PathType Leaf)) {
        Remove-Item -LiteralPath $CandleDbModule -Force -ErrorAction SilentlyContinue
    }

    if ($ImportScript) {
        Remove-Item -LiteralPath $ImportScript -Force -ErrorAction SilentlyContinue
    }
    if ($ValidationScript) {
        Remove-Item -LiteralPath $ValidationScript -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Rollback finished." -ForegroundColor Yellow
    Write-Host "Backup retained at: $BackupRoot" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red

    exit 1
}
finally {

    if ($ImportScript) {
        Remove-Item -LiteralPath $ImportScript -Force -ErrorAction SilentlyContinue
    }
    if ($ValidationScript) {
        Remove-Item -LiteralPath $ValidationScript -Force -ErrorAction SilentlyContinue
    }

    Pop-Location
}
