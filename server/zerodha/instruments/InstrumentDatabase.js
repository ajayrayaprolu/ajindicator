//======================================================
// server/zerodha/instruments/InstrumentDatabase.js
// SQLite Instrument Master
//
// PURPOSE
// -------
// Provides the SQLite database used as the Zerodha
// Contract / Instrument Master.
//
// DATABASE LOCATION
// -----------------
// server/zerodha/data/zerodha-contract-master.db
//
// NOTE
// ----
// This file remains the database access layer for the
// instrument master. The physical database has been
// moved out of the instruments directory into the
// dedicated Zerodha data directory.
//======================================================

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

//======================================================
// DATABASE PATH
//======================================================
//
// Contract-master database is intentionally stored under:
//
// server/zerodha/data/
//
// This keeps:
//   - instruments/  -> instrument JSON/cache/synchronizer
//   - data/         -> SQLite persistence
//
//======================================================

const DATABASE_DIR =
    path.join(
        process.cwd(),
        "server",
        "zerodha",
        "data"
    );

const DATABASE_FILE =
    path.join(
        DATABASE_DIR,
        "zerodha-contract-master.db"
    );

//======================================================
// DATABASE
//======================================================

let db = null;

//======================================================
// INITIALIZE
//======================================================
//
// Creates the Zerodha Contract Master database if it does
// not already exist.
//
// SQLite WAL mode is enabled because the instrument master
// can be read by multiple application components while the
// synchronizer periodically updates the data.
//
//======================================================

export function initializeInstrumentDatabase() {

    // Prevent opening the same SQLite database more than once
    // within the current Node.js process.

    if (db) {
        return db;
    }

    // Ensure the dedicated Zerodha data directory exists.

    fs.mkdirSync(
        DATABASE_DIR,
        {
            recursive: true
        }
    );

    // Open the Zerodha Contract Master database.

    db =
        new Database(
            DATABASE_FILE
        );

    //==================================================
    // SQLITE PRAGMAS
    //==================================================

    // WAL allows readers to continue reading while
    // synchronization writes are being performed.

    db.pragma(
        "journal_mode = WAL"
    );

    // NORMAL provides a good balance between durability
    // and write performance for this cache/master database.

    db.pragma(
        "synchronous = NORMAL"
    );

    //==================================================
    // INSTRUMENT MASTER TABLE
    //==================================================

    db.exec(`
        CREATE TABLE IF NOT EXISTS instruments (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            exchange TEXT NOT NULL,

            segment TEXT NOT NULL,

            symbol TEXT NOT NULL,

            trading_symbol TEXT NOT NULL,

            display_name TEXT,

            instrument_type TEXT,

            expiry TEXT,

            strike REAL,

            option_type TEXT,

            underlying TEXT,

            token_identifier TEXT,

            feed_source TEXT NOT NULL,

            active_status INTEGER NOT NULL DEFAULT 1,

            last_updated TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                exchange,
                segment,
                trading_symbol,
                feed_source
            )
        );

        --================================================
        -- SYMBOL LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_symbol
        ON instruments (
            symbol
        );

        --================================================
        -- TRADING SYMBOL LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_trading_symbol
        ON instruments (
            trading_symbol
        );

        --================================================
        -- EXCHANGE LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_exchange
        ON instruments (
            exchange
        );

        --================================================
        -- UNDERLYING LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_underlying
        ON instruments (
            underlying
        );

        --================================================
        -- INSTRUMENT TOKEN LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_token
        ON instruments (
            token_identifier
        );

        --================================================
        -- FEED SOURCE LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_feed_source
        ON instruments (
            feed_source
        );

        --================================================
        -- STRIKE LOOKUP INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_strike
        ON instruments (
            strike
        );

        --================================================
        -- OPTION SEARCH INDEX
        --================================================
        --
        -- Optimizes option-chain searches using:
        -- underlying + strike + option type + status
        --

        CREATE INDEX IF NOT EXISTS
            idx_instruments_option_search
        ON instruments (
            underlying,
            strike,
            option_type,
            active_status
        );

        --================================================
        -- ACTIVE SYMBOL INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_active_symbol
        ON instruments (
            active_status,
            symbol
        );

        --================================================
        -- ACTIVE TRADING SYMBOL INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_active_trading_symbol
        ON instruments (
            active_status,
            trading_symbol
        );

        --================================================
        -- ACTIVE UNDERLYING INDEX
        --================================================

        CREATE INDEX IF NOT EXISTS
            idx_instruments_active_underlying
        ON instruments (
            active_status,
            underlying
        );
    `);

    //==================================================
    // INITIALIZATION LOG
    //==================================================

console.log(
    "[ZERODHA MASTER] SQLite initialized"
);

    return db;
}

//======================================================
// GET DATABASE
//======================================================
//
// Returns the existing database connection.
//
// If the database has not yet been initialized,
// initializeInstrumentDatabase() is called automatically.
//
//======================================================

export function getInstrumentDatabase() {

    if (!db) {
        initializeInstrumentDatabase();
    }

    return db;
}

//======================================================
// CLOSE
//======================================================
//
// Closes the SQLite connection cleanly.
//
// This is useful during application shutdown or restart.
//
//======================================================

export function closeInstrumentDatabase() {

    if (!db) {
        return;
    }

    db.close();

    db = null;
}

//======================================================
// STATUS
//======================================================
//
// Returns the absolute path of the Zerodha Contract
// Master database.
//
//======================================================

export function instrumentDatabasePath() {

    return DATABASE_FILE;
}