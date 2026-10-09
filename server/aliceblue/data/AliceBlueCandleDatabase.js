//======================================================
// server/aliceblue/data/AliceBlueCandleDatabase.js
//
// Alice Blue Candle Cache SQLite Database
//
// Responsibilities:
//
//  1. Open the existing aliceblue-candle-cache.db
//  2. Read candles for history requests
//  3. Persist successful AliceBlue live candles
//  4. Track cache freshness
//  5. Provide tracked symbol/resolution keys
//
// IMPORTANT:
//
// This module intentionally reuses the existing migrated
// SQLite candle database.
//
// It does NOT migrate, delete, or recreate legacy JSON
// candle-cache files.
//
// AJ Institutional Terminal
//======================================================

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

//======================================================
// CONFIGURATION
//======================================================

const DATA_DIR =
    path.resolve(
        process.cwd(),
        "server",
        "aliceblue",
        "data"
    );

const DATABASE_FILE =
    path.join(
        DATA_DIR,
        "aliceblue-candle-cache.db"
    );

//======================================================
// DIRECTORY
//======================================================

function ensureDataDirectory() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }

}

//======================================================
// DATABASE
//======================================================

ensureDataDirectory();

const database =
    new Database(
        DATABASE_FILE
    );

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

//======================================================
// SCHEMA
//======================================================
//
// Existing database already contains this table.
//
// CREATE IF NOT EXISTS is intentionally defensive.
// It will NOT modify the existing table.
//
//======================================================

database.exec(`
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
    )
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_candle_lookup
    ON candles (
        exchange,
        token,
        resolution,
        candle_time
    )
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_candle_time
    ON candles (
        candle_time
    )
`);

//======================================================
// PREPARED STATEMENTS
//======================================================

const selectCandles =
    database.prepare(`
        SELECT
            candle_time,
            open,
            high,
            low,
            close,
            volume
        FROM candles
        WHERE
            exchange = @exchange
            AND token = @token
            AND resolution = @resolution
        ORDER BY candle_time ASC
    `);

const selectCandleCount =
    database.prepare(`
        SELECT
            COUNT(*) AS count
        FROM candles
        WHERE
            exchange = @exchange
            AND token = @token
            AND resolution = @resolution
    `);

const selectFreshness =
    database.prepare(`
        SELECT
            COUNT(*) AS count,
            MAX(cached_at) AS cached_at
        FROM candles
        WHERE
            exchange = @exchange
            AND token = @token
            AND resolution = @resolution
    `);

const selectTrackedKeys =
    database.prepare(`
        SELECT
            exchange,
            token,
            resolution
        FROM candles
        GROUP BY
            exchange,
            token,
            resolution
        ORDER BY
            exchange,
            token,
            resolution
    `);

const insertCandle =
    database.prepare(`
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
        ON CONFLICT(
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

//======================================================
// SAVE TRANSACTION
//======================================================

const saveTransaction =
    database.transaction(
        ({
            exchange,
            token,
            resolution,
            candles,
            cachedAt
        }) => {

            const now =
                Date.now();

            for (
                const candle
                of candles
            ) {

                if (
                    !candle ||
                    !Number.isFinite(
                        Number(candle.time)
                    ) ||
                    !Number.isFinite(
                        Number(candle.open)
                    ) ||
                    !Number.isFinite(
                        Number(candle.high)
                    ) ||
                    !Number.isFinite(
                        Number(candle.low)
                    ) ||
                    !Number.isFinite(
                        Number(candle.close)
                    )
                ) {

                    continue;

                }

                insertCandle.run({

                    exchange:
                        String(
                            exchange
                        )
                        .trim()
                        .toUpperCase(),

                    token:
                        String(
                            token
                        )
                        .trim(),

                    resolution:
                        String(
                            resolution
                        )
                        .trim(),

                    candle_time:
                        Math.floor(
                            Number(
                                candle.time
                            )
                        ),

                    open:
                        Number(
                            candle.open
                        ),

                    high:
                        Number(
                            candle.high
                        ),

                    low:
                        Number(
                            candle.low
                        ),

                    close:
                        Number(
                            candle.close
                        ),

                    volume:
                        Number.isFinite(
                            Number(
                                candle.volume
                            )
                        )
                            ? Number(
                                candle.volume
                            )
                            : 0,

                    cached_at:
                        cachedAt ??
                        new Date().toISOString(),

                    created_at:
                        now,

                    updated_at:
                        now

                });

            }

        }
    );

//======================================================
// LOAD CANDLES
//======================================================

export function loadCandles({
    exchange,
    token,
    resolution
}) {

    const rows =
        selectCandles.all({

            exchange:
                String(
                    exchange ?? ""
                )
                .trim()
                .toUpperCase(),

            token:
                String(
                    token ?? ""
                )
                .trim(),

            resolution:
                String(
                    resolution ?? ""
                )
                .trim()

        });

    return rows.map(
        row => ({

            time:
                Number(
                    row.candle_time
                ),

            open:
                Number(
                    row.open
                ),

            high:
                Number(
                    row.high
                ),

            low:
                Number(
                    row.low
                ),

            close:
                Number(
                    row.close
                ),

            volume:
                Number(
                    row.volume ?? 0
                )

        })
    );
}

//======================================================
// SAVE CANDLES
//======================================================

export function saveCandles({
    exchange,
    token,
    resolution,
    candles,
    cachedAt
}) {

    if (
        !Array.isArray(candles) ||
        candles.length === 0
    ) {

        return 0;

    }

    saveTransaction({

        exchange,
        token,
        resolution,
        candles,
        cachedAt

    });

    return candles.length;
}

//======================================================
// FRESHNESS
//======================================================

export function getCandleFreshness({
    exchange,
    token,
    resolution
}) {

    const row =
        selectFreshness.get({

            exchange:
                String(
                    exchange ?? ""
                )
                .trim()
                .toUpperCase(),

            token:
                String(
                    token ?? ""
                )
                .trim(),

            resolution:
                String(
                    resolution ?? ""
                )
                .trim()

        });

    const count =
        Number(
            row?.count ?? 0
        );

    const cachedAt =
        row?.cached_at ??
        null;

    return {

        hasCache:
            count > 0,

        cachedAt,

        ageMs:
            cachedAt
                ? Date.now() -
                    new Date(
                        cachedAt
                    ).getTime()
                : null,

        count

    };

}

//======================================================
// TRACKED KEYS
//======================================================

export function loadTrackedKeys() {

    return selectTrackedKeys
        .all()
        .map(
            row => ({

                key:
                    `${row.exchange}_${row.token}_${row.resolution}`,

                exchange:
                    row.exchange,

                token:
                    row.token,

                resolution:
                    row.resolution

            })
        );

}

//======================================================
// COUNT
//======================================================

export function getCandleCount({
    exchange,
    token,
    resolution
}) {

    return Number(
        selectCandleCount.get({

            exchange:
                String(
                    exchange ?? ""
                )
                .trim()
                .toUpperCase(),

            token:
                String(
                    token ?? ""
                )
                .trim(),

            resolution:
                String(
                    resolution ?? ""
                )
                .trim()

        })?.count ??
        0
    );

}

//======================================================
// CLEAR CANDLES
//======================================================

export function clearCandles() {

    const result =
        database
            .prepare(`
                DELETE FROM candles
            `)
            .run();

    return Number(
        result?.changes ?? 0
    );

}

//======================================================
// DATABASE PATH
//======================================================

export function getDatabasePath() {

    return DATABASE_FILE;

}

//======================================================
// CLOSE
//======================================================

export function closeDatabase() {

    if (
        database.open
    ) {

        database.close();

    }

}

//======================================================
// DEFAULT
//======================================================

export default {

    loadCandles,

    saveCandles,

    getCandleFreshness,

    loadTrackedKeys,

    getCandleCount,

    clearCandles,

    getDatabasePath,

    closeDatabase

};