//======================================================
// server/instruments/InstrumentDatabase.js
// Phase 2 — SQLite Instrument Master
//======================================================

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

//======================================================
// DATABASE PATH
//======================================================

const DATABASE_DIR =
    path.join(
        process.cwd(),
        "server",
        "data"
    );

const DATABASE_FILE =
    path.join(
        DATABASE_DIR,
        "instruments.db"
    );

//======================================================
// DATABASE
//======================================================

let db = null;

//======================================================
// INITIALIZE
//======================================================

export function initializeInstrumentDatabase() {

    if (db) {
        return db;
    }

    fs.mkdirSync(
        DATABASE_DIR,
        {
            recursive: true
        }
    );

    db =
        new Database(
            DATABASE_FILE
        );

    db.pragma(
        "journal_mode = WAL"
    );

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

        CREATE INDEX IF NOT EXISTS
            idx_instruments_symbol
        ON instruments (
            symbol
        );

        CREATE INDEX IF NOT EXISTS
            idx_instruments_trading_symbol
        ON instruments (
            trading_symbol
        );

        CREATE INDEX IF NOT EXISTS
            idx_instruments_exchange
        ON instruments (
            exchange
        );

        CREATE INDEX IF NOT EXISTS
            idx_instruments_underlying
        ON instruments (
            underlying
        );

        CREATE INDEX IF NOT EXISTS
            idx_instruments_token
        ON instruments (
            token_identifier
        );

        CREATE INDEX IF NOT EXISTS
            idx_instruments_feed_source
        ON instruments (
            feed_source
        );
		    CREATE INDEX IF NOT EXISTS
			idx_instruments_strike
		ON instruments (
			strike
		);
	
		CREATE INDEX IF NOT EXISTS
			idx_instruments_option_search
		ON instruments (
			underlying,
			strike,
			option_type,
			active_status
		);
	
		CREATE INDEX IF NOT EXISTS
			idx_instruments_active_symbol
		ON instruments (
			active_status,
			symbol
		);
	
		CREATE INDEX IF NOT EXISTS
			idx_instruments_active_trading_symbol
		ON instruments (
			active_status,
			trading_symbol
		);
	
		CREATE INDEX IF NOT EXISTS
			idx_instruments_active_underlying
		ON instruments (
			active_status,
			underlying
    );

    `);

    console.log(
        "[INSTRUMENT DB]",
        "SQLite initialized:",
        DATABASE_FILE
    );

    return db;
}

//======================================================
// GET DATABASE
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

export function instrumentDatabasePath() {

    return DATABASE_FILE;
}