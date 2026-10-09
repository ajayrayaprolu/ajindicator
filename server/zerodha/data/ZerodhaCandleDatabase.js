//======================================================
// server/zerodha/data/ZerodhaCandleDatabase.js
//======================================================

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

//======================================================
// DATABASE CONFIGURATION
//======================================================

const DATA_DIR = path.resolve(
    process.cwd(),
    "server",
    "zerodha",
    "data"
);

const DATABASE_FILE = path.join(
    DATA_DIR,
    "zerodha-candle-cache.db"
);

const RETENTION_DAYS =
    Math.max(
        1,
        Number(
            process.env.ZERODHA_CANDLE_RETENTION_DAYS ?? 31
        ) || 31
    );

const RETENTION_SECONDS =
    RETENTION_DAYS * 24 * 60 * 60;

let db = null;
let cleanupTimer = null;

//======================================================
// INTERNAL DATABASE INITIALIZATION
//======================================================

function initializeDatabase() {

    if (db) {
        return db;
    }

    fs.mkdirSync(
        DATA_DIR,
        {
            recursive: true
        }
    );

    db = new Database(
        DATABASE_FILE
    );

    db.pragma(
        "journal_mode = WAL"
    );

    db.pragma(
        "synchronous = NORMAL"
    );

    db.pragma(
        "busy_timeout = 5000"
    );

    migrateLegacySchema(db);

    createSchema(db);

    return db;
}

//======================================================
// SCHEMA
//======================================================

function createSchema(database) {

    database.exec(`
        CREATE TABLE IF NOT EXISTS candles (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            exchange TEXT NOT NULL,

            instrument_token TEXT NOT NULL,

            trading_symbol TEXT,

            interval TEXT NOT NULL,

            candle_time INTEGER NOT NULL,

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
            idx_zerodha_candles_token
        ON candles (
            instrument_token
        );

        CREATE INDEX IF NOT EXISTS
            idx_zerodha_candles_symbol
        ON candles (
            trading_symbol
        );

        CREATE INDEX IF NOT EXISTS
            idx_zerodha_candles_interval
        ON candles (
            interval
        );

        CREATE INDEX IF NOT EXISTS
            idx_zerodha_candles_time
        ON candles (
            candle_time
        );

        CREATE INDEX IF NOT EXISTS
            idx_zerodha_candles_lookup
        ON candles (
            instrument_token,
            interval,
            candle_time
        );
    `);
}

//======================================================
// LEGACY SCHEMA MIGRATION
//
// Previous implementation used:
//
// candle_time TEXT
//
// New implementation uses:
//
// candle_time INTEGER
//
// Unix timestamp in seconds.
//======================================================

function migrateLegacySchema(database) {

    const table =
        database
            .prepare(`
                SELECT sql
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = 'candles'
            `)
            .get();

    if (!table?.sql) {
        return;
    }

    const schema =
        String(table.sql).toLowerCase();

    if (
        !schema.includes(
            "candle_time integer"
        )
    ) {

//        console.log(
//            "[ZERODHA CANDLE DB] Migrating candle_time to INTEGER..."
//        );

        database.transaction(() => {

            database.exec(`
                ALTER TABLE candles
                RENAME TO candles_legacy;
            `);

            createSchema(database);

            const legacyRows =
                database
                    .prepare(`
                        SELECT
                            exchange,
                            instrument_token,
                            trading_symbol,
                            interval,
                            candle_time,
                            open,
                            high,
                            low,
                            close,
                            volume,
                            open_interest,
                            last_updated
                        FROM candles_legacy
                    `)
                    .all();

            const insert =
                database.prepare(`
                    INSERT OR IGNORE INTO candles (
                        exchange,
                        instrument_token,
                        trading_symbol,
                        interval,
                        candle_time,
                        open,
                        high,
                        low,
                        close,
                        volume,
                        open_interest,
                        last_updated
                    )
                    VALUES (
                        @exchange,
                        @instrument_token,
                        @trading_symbol,
                        @interval,
                        @candle_time,
                        @open,
                        @high,
                        @low,
                        @close,
                        @volume,
                        @open_interest,
                        @last_updated
                    )
                `);

            for (const row of legacyRows) {

                const timestamp =
                    normalizeTimestamp(
                        row.candle_time
                    );

                if (
                    !Number.isFinite(
                        timestamp
                    )
                ) {
                    continue;
                }

                insert.run({

                    exchange:
                        row.exchange,

                    instrument_token:
                        String(
                            row.instrument_token
                        ),

                    trading_symbol:
                        row.trading_symbol,

                    interval:
                        row.interval,

                    candle_time:
                        timestamp,

                    open:
                        Number(row.open),

                    high:
                        Number(row.high),

                    low:
                        Number(row.low),

                    close:
                        Number(row.close),

                    volume:
                        row.volume == null
                            ? null
                            : Number(row.volume),

                    open_interest:
                        row.open_interest == null
                            ? null
                            : Number(
                                row.open_interest
                            ),

                    last_updated:
                        row.last_updated
                });
            }

            database.exec(`
                DROP TABLE candles_legacy;
            `);

        })();

//        console.log(
//            "[ZERODHA CANDLE DB] candle_time migration completed."
//        );
    }
}

//======================================================
// TIMESTAMP NORMALIZATION
//======================================================

function normalizeTimestamp(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return NaN;
    }

    if (
        typeof value === "number"
    ) {

        if (
            !Number.isFinite(value)
        ) {
            return NaN;
        }

        /*
         * Support milliseconds if encountered.
         */
        if (value > 100000000000) {
            return Math.floor(
                value / 1000
            );
        }

        return Math.floor(value);
    }

    const text =
        String(value).trim();

    if (!text) {
        return NaN;
    }

    const numeric =
        Number(text);

    if (
        Number.isFinite(numeric)
    ) {

        if (
            numeric > 100000000000
        ) {
            return Math.floor(
                numeric / 1000
            );
        }

        return Math.floor(numeric);
    }

    const parsed =
        new Date(text).getTime();

    if (
        !Number.isFinite(parsed)
    ) {
        return NaN;
    }

    return Math.floor(
        parsed / 1000
    );
}

//======================================================
// PUBLIC INITIALIZATION
//======================================================

export function initializeZerodhaCandleDatabase() {

    const database =
        initializeDatabase();

    cleanupOldCandles();

    if (!cleanupTimer) {

        cleanupTimer =
            setInterval(
                () => {

                    try {

                        cleanupOldCandles();

                    }
                    catch (error) {

                        console.error(
                            "[ZERODHA CANDLE DB] Retention cleanup failed:",
                            error?.message ?? error
                        );
                    }

                },
                60 * 60 * 1000
            );

        if (
            cleanupTimer.unref
        ) {
            cleanupTimer.unref();
        }
    }

    console.log(
        "[ZERODHA CANDLE DB] SQLite initialized:",
//        DATABASE_FILE,
        "retentionDays:",
        RETENTION_DAYS
    );

    return database;
}

//======================================================
// GET DATABASE
//======================================================

export function getZerodhaCandleDatabase() {

    return initializeDatabase();
}

//======================================================
// UPSERT SINGLE CANDLE
//======================================================

export function upsertCandle(candle) {

    if (!candle) {
        return 0;
    }

    const database =
        initializeDatabase();

    const instrumentToken =
        String(
            candle.instrument_token ?? ""
        ).trim();

    const interval =
        String(
            candle.interval ?? ""
        ).trim();

    const candleTime =
        normalizeTimestamp(
            candle.candle_time ??
            candle.time
        );

    if (
        !instrumentToken ||
        !interval ||
        !Number.isFinite(candleTime)
    ) {
        return 0;
    }

    const open =
        Number(candle.open);

    const high =
        Number(candle.high);

    const low =
        Number(candle.low);

    const close =
        Number(candle.close);

    if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
    ) {
        return 0;
    }

    return database
        .prepare(`
            INSERT INTO candles (
                exchange,
                instrument_token,
                trading_symbol,
                interval,
                candle_time,
                open,
                high,
                low,
                close,
                volume,
                open_interest,
                last_updated
            )
            VALUES (
                @exchange,
                @instrument_token,
                @trading_symbol,
                @interval,
                @candle_time,
                @open,
                @high,
                @low,
                @close,
                @volume,
                @open_interest,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (
                instrument_token,
                interval,
                candle_time
            )
            DO UPDATE SET

                exchange =
                    excluded.exchange,

                trading_symbol =
                    excluded.trading_symbol,

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

                open_interest =
                    excluded.open_interest,

                last_updated =
                    CURRENT_TIMESTAMP
        `)
        .run({

            exchange:
                String(
                    candle.exchange ??
                    "NSE"
                )
                    .trim()
                    .toUpperCase(),

            instrument_token:
                instrumentToken,

            trading_symbol:
                candle.trading_symbol == null
                    ? null
                    : String(
                        candle.trading_symbol
                    ).trim(),

            interval,

            candle_time:
                candleTime,

            open,

            high,

            low,

            close,

            volume:
                candle.volume == null
                    ? null
                    : Number(
                        candle.volume
                    ),

            open_interest:
                candle.open_interest == null
                    ? candle.oi == null
                        ? null
                        : Number(candle.oi)
                    : Number(
                        candle.open_interest
                    )
        });
}

//======================================================
// UPSERT BATCH
//======================================================

export function upsertCandles(
    instrumentToken,
    interval,
    candles,
    metadata = {}
) {

    if (
        instrumentToken === undefined ||
        instrumentToken === null ||
        !interval ||
        !Array.isArray(candles) ||
        candles.length === 0
    ) {
        return 0;
    }

    const database =
        initializeDatabase();

    const token =
        String(
            instrumentToken
        ).trim();

    const normalizedInterval =
        String(
            interval
        ).trim();

    if (
        !token ||
        !normalizedInterval
    ) {
        return 0;
    }

    const insert =
        database.prepare(`
            INSERT INTO candles (
                exchange,
                instrument_token,
                trading_symbol,
                interval,
                candle_time,
                open,
                high,
                low,
                close,
                volume,
                open_interest,
                last_updated
            )
            VALUES (
                @exchange,
                @instrument_token,
                @trading_symbol,
                @interval,
                @candle_time,
                @open,
                @high,
                @low,
                @close,
                @volume,
                @open_interest,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (
                instrument_token,
                interval,
                candle_time
            )
            DO UPDATE SET

                exchange =
                    excluded.exchange,

                trading_symbol =
                    excluded.trading_symbol,

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

                open_interest =
                    excluded.open_interest,

                last_updated =
                    CURRENT_TIMESTAMP
        `);

    const transaction =
        database.transaction(rows => {

            let processed = 0;

            for (const candle of rows) {

                if (!candle) {
                    continue;
                }

                const timestamp =
                    normalizeTimestamp(
                        candle.candle_time ??
                        candle.time
                    );

                if (
                    !Number.isFinite(
                        timestamp
                    )
                ) {
                    continue;
                }

                const open =
                    Number(candle.open);

                const high =
                    Number(candle.high);

                const low =
                    Number(candle.low);

                const close =
                    Number(candle.close);

                if (
                    !Number.isFinite(open) ||
                    !Number.isFinite(high) ||
                    !Number.isFinite(low) ||
                    !Number.isFinite(close)
                ) {
                    continue;
                }

                insert.run({

                    exchange:
                        String(
                            candle.exchange ??
                            metadata.exchange ??
                            "NSE"
                        )
                            .trim()
                            .toUpperCase(),

                    instrument_token:
                        token,

                    trading_symbol:
                        candle.trading_symbol ??
                        metadata.trading_symbol ??
                        null,

                    interval:
                        normalizedInterval,

                    candle_time:
                        timestamp,

                    open,

                    high,

                    low,

                    close,

                    volume:
                        candle.volume == null
                            ? null
                            : Number(
                                candle.volume
                            ),

                    open_interest:
                        candle.open_interest == null
                            ? candle.oi == null
                                ? null
                                : Number(candle.oi)
                            : Number(
                                candle.open_interest
                            )
                });

                processed++;
            }

            return processed;
        });

    const saved =
        transaction(candles);

    const persisted =
        database
            .prepare(`
                SELECT COUNT(*) AS count
                FROM candles
                WHERE instrument_token = ?
                  AND interval = ?
            `)
            .get(
                token,
                normalizedInterval
            );

    if (
        saved > 0 &&
        Number(
            persisted?.count || 0
        ) === 0
    ) {

        throw new Error(
            `[ZERODHA CANDLE DB] Transaction reported ${saved} rows saved, but SQLite contains 0 rows for token=${token}, interval=${normalizedInterval}.`
        );
    }

    return saved;
}

//======================================================
// GET CANDLES
//======================================================

export function getCandles(
    instrumentToken,
    interval,
    rangeFrom,
    rangeTo
) {

    const database =
        initializeDatabase();

    const from =
        normalizeTimestamp(
            rangeFrom
        );

    const to =
        normalizeTimestamp(
            rangeTo
        );

    if (
        !Number.isFinite(from) ||
        !Number.isFinite(to)
    ) {
        return [];
    }

    return database
        .prepare(`
            SELECT
                exchange,
                instrument_token,
                trading_symbol,
                interval,
                candle_time,
                open,
                high,
                low,
                close,
                volume,
                open_interest
            FROM candles
            WHERE instrument_token = ?
              AND interval = ?
              AND candle_time BETWEEN ? AND ?
            ORDER BY candle_time ASC
        `)
        .all(
            String(
                instrumentToken
            ).trim(),

            String(
                interval
            ).trim(),

            from,

            to
        )
        .map(row => ({

            time:
                Number(
                    row.candle_time
                ),

            open:
                Number(row.open),

            high:
                Number(row.high),

            low:
                Number(row.low),

            close:
                Number(row.close),

            volume:
                Number(
                    row.volume ?? 0
                ),

            oi:
                row.open_interest == null
                    ? undefined
                    : Number(
                        row.open_interest
                    )
        }));
}

//======================================================
// CACHE COVERAGE
//======================================================

export function getCandleCacheStats(
    instrumentToken,
    interval,
    rangeFrom,
    rangeTo
) {

    const database =
        initializeDatabase();

    const from =
        normalizeTimestamp(
            rangeFrom
        );

    const to =
        normalizeTimestamp(
            rangeTo
        );

    if (
        !Number.isFinite(from) ||
        !Number.isFinite(to)
    ) {
        return {

            count: 0,

            minTime: null,

            maxTime: null,

            complete: false
        };
    }

    const row =
        database
            .prepare(`
                SELECT
                    COUNT(*) AS count,
                    MIN(candle_time) AS min_time,
                    MAX(candle_time) AS max_time
                FROM candles
                WHERE instrument_token = ?
                  AND interval = ?
                  AND candle_time BETWEEN ? AND ?
            `)
            .get(
                String(
                    instrumentToken
                ).trim(),

                String(
                    interval
                ).trim(),

                from,

                to
            );

    const count =
        Number(
            row?.count ?? 0
        );

    const minTime =
        row?.min_time == null
            ? null
            : Number(
                row.min_time
            );

    const maxTime =
        row?.max_time == null
            ? null
            : Number(
                row.max_time
            );

    /*
     * We require the cache to span the complete
     * requested time range.
     *
     * The caller additionally controls freshness
     * for requests ending near "now".
     */
    const complete =
        count > 0 &&
        minTime !== null &&
        maxTime !== null &&
        minTime <= from &&
        maxTime >= to;

    return {

        count,

        minTime,

        maxTime,

        complete
    };
}

//======================================================
// TOTAL CANDLE COUNT
//======================================================

export function countCandles() {

    const row =
        initializeDatabase()
            .prepare(`
                SELECT COUNT(*) AS count
                FROM candles
            `)
            .get();

    return Number(
        row?.count ?? 0
    );
}

//======================================================
// RETENTION STATS
//======================================================

export function getRetentionStats() {

    const row =
        initializeDatabase()
            .prepare(`
                SELECT
                    COUNT(*) AS count,
                    MIN(candle_time) AS min_time,
                    MAX(candle_time) AS max_time
                FROM candles
            `)
            .get();

    return {

        count:
            Number(
                row?.count ?? 0
            ),

        minTime:
            row?.min_time == null
                ? null
                : Number(
                    row.min_time
                ),

        maxTime:
            row?.max_time == null
                ? null
                : Number(
                    row.max_time
                ),

        retentionDays:
            RETENTION_DAYS,

        databaseFile:
            DATABASE_FILE
    };
}

//======================================================
// RETENTION CLEANUP
//======================================================

function cleanupOldCandles() {

    const database =
        initializeDatabase();

    const cutoff =
        Math.floor(
            Date.now() / 1000
        ) -
        RETENTION_SECONDS;

    const result =
        database
            .prepare(`
                DELETE FROM candles
                WHERE candle_time < ?
            `)
            .run(
                cutoff
            );

    if (
        result.changes > 0
    ) {

        console.log(
            "[ZERODHA CANDLE DB] Removed old candles:",
            result.changes,
            "retentionDays:",
            RETENTION_DAYS
        );

        try {

            database.pragma(
                "wal_checkpoint(TRUNCATE)"
            );

        }
        catch {
            // Non-fatal maintenance.
        }
    }

    return result.changes;
}

//======================================================
// MANUAL RETENTION CLEANUP
//======================================================

export function deleteOldCandles(
    beforeDate
) {

    const database =
        initializeDatabase();

    const cutoff =
        normalizeTimestamp(
            beforeDate
        );

    if (
        !Number.isFinite(cutoff)
    ) {
        return 0;
    }

    const result =
        database
            .prepare(`
                DELETE FROM candles
                WHERE candle_time < ?
            `)
            .run(
                cutoff
            );

    if (
        result.changes > 0
    ) {

        try {

            database.pragma(
                "wal_checkpoint(TRUNCATE)"
            );

        }
        catch {
            // Non-fatal maintenance.
        }
    }

    return result.changes;
}

//======================================================
// DATABASE PATH
//======================================================

export function zerodhaCandleDatabasePath() {

    return DATABASE_FILE;
}

//======================================================
// RETENTION
//======================================================

export function zerodhaCandleRetentionDays() {

    return RETENTION_DAYS;
}

//======================================================
// CLOSE
//======================================================

export function closeZerodhaCandleDatabase() {

    if (cleanupTimer) {

        clearInterval(
            cleanupTimer
        );

        cleanupTimer = null;
    }

    if (!db) {
        return;
    }

    db.close();

    db = null;
}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {

    initializeZerodhaCandleDatabase,

    getZerodhaCandleDatabase,

    closeZerodhaCandleDatabase,

    zerodhaCandleDatabasePath,

    zerodhaCandleRetentionDays,

    upsertCandle,

    upsertCandles,

    getCandles,

    getCandleCacheStats,

    countCandles,

    getRetentionStats,

    deleteOldCandles
};