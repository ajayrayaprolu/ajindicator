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