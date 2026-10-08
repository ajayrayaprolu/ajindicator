//=================================================
// server\zerodha\data\ZerodhaContractDatabase.js
//================================================
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(
    process.cwd(),
    "server",
    "zerodha",
    "data"
);

const DATABASE_FILE = path.join(
    DATA_DIR,
    "zerodha-contract-master.db"
);

let db = null;

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
            recursive: true
        });
    }
}

function createSchema(database) {

    database.exec(`
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

            last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                exchange,
                segment,
                trading_symbol,
                feed_source
            )
        );

        CREATE INDEX IF NOT EXISTS idx_instruments_symbol
            ON instruments(symbol);

        CREATE INDEX IF NOT EXISTS idx_instruments_trading_symbol
            ON instruments(trading_symbol);

        CREATE INDEX IF NOT EXISTS idx_instruments_exchange
            ON instruments(exchange);

        CREATE INDEX IF NOT EXISTS idx_instruments_underlying
            ON instruments(underlying);

        CREATE INDEX IF NOT EXISTS idx_instruments_token_identifier
            ON instruments(token_identifier);

        CREATE INDEX IF NOT EXISTS idx_instruments_feed_source
            ON instruments(feed_source);

        CREATE INDEX IF NOT EXISTS idx_instruments_strike
            ON instruments(strike);

        CREATE INDEX IF NOT EXISTS idx_instruments_underlying_strike_option
            ON instruments(
                underlying,
                strike,
                option_type,
                active_status
            );

        CREATE INDEX IF NOT EXISTS idx_instruments_active_symbol
            ON instruments(
                active_status,
                symbol
            );

        CREATE INDEX IF NOT EXISTS idx_instruments_active_trading_symbol
            ON instruments(
                active_status,
                trading_symbol
            );
    `);
}

export function initializeZerodhaContractDatabase() {

    if (db) {
        return db;
    }

    ensureDataDirectory();

    db = new Database(DATABASE_FILE);

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");

    createSchema(db);

	console.log(
		"[ZERODHA CONTRACT DB] SQLite initialized"
	);

    return db;
}

export function getZerodhaContractDatabase() {

    if (!db) {
        initializeZerodhaContractDatabase();
    }

    return db;
}

export function closeZerodhaContractDatabase() {

    if (db) {
        db.close();
        db = null;
    }
}

export function zerodhaContractDatabasePath() {
    return DATABASE_FILE;
}

export function getInstrumentCount() {

    const database = getZerodhaContractDatabase();

    return database
        .prepare(`
            SELECT COUNT(*) AS count
            FROM instruments
        `)
        .get()
        .count;
}

export function deactivateAllZerodhaInstruments() {

    const database = getZerodhaContractDatabase();

    return database
        .prepare(`
            UPDATE instruments
            SET active_status = 0,
                last_updated = CURRENT_TIMESTAMP
            WHERE feed_source = 'zerodha'
        `)
        .run();
}

export function upsertZerodhaInstrument(instrument) {

    const database = getZerodhaContractDatabase();

    const statement = database.prepare(`
        INSERT INTO instruments (
            exchange,
            segment,
            symbol,
            trading_symbol,
            display_name,
            instrument_type,
            expiry,
            strike,
            option_type,
            underlying,
            token_identifier,
            feed_source,
            active_status,
            last_updated
        )
        VALUES (
            @exchange,
            @segment,
            @symbol,
            @trading_symbol,
            @display_name,
            @instrument_type,
            @expiry,
            @strike,
            @option_type,
            @underlying,
            @token_identifier,
            'zerodha',
            1,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (
            exchange,
            segment,
            trading_symbol,
            feed_source
        )
        DO UPDATE SET

            symbol = excluded.symbol,

            display_name = excluded.display_name,

            instrument_type = excluded.instrument_type,

            expiry = excluded.expiry,

            strike = excluded.strike,

            option_type = excluded.option_type,

            underlying = excluded.underlying,

            token_identifier = excluded.token_identifier,

            active_status = 1,

            last_updated = CURRENT_TIMESTAMP
    `);

    return statement.run({
        exchange: instrument.exchange,
        segment: instrument.segment,
        symbol: instrument.symbol,
        trading_symbol: instrument.trading_symbol,
        display_name: instrument.display_name ?? null,
        instrument_type: instrument.instrument_type ?? null,
        expiry: instrument.expiry ?? null,
        strike: instrument.strike ?? null,
        option_type: instrument.option_type ?? null,
        underlying: instrument.underlying ?? null,
        token_identifier:
            instrument.token_identifier ??
            instrument.instrument_token ??
            null
    });
}

export function upsertZerodhaInstruments(instruments) {

    const database = getZerodhaContractDatabase();

    const insert = database.transaction((items) => {

        for (const instrument of items) {
            upsertZerodhaInstrument(instrument);
        }

    });

    insert(instruments);

    return instruments.length;
}

export function getAllZerodhaInstruments() {

    const database = getZerodhaContractDatabase();

    return database
        .prepare(`
            SELECT *
            FROM instruments
            WHERE feed_source = 'zerodha'
              AND active_status = 1
            ORDER BY exchange, trading_symbol
        `)
        .all();
}

export function getZerodhaInstrumentByTradingSymbol(
    tradingSymbol
) {

    const database = getZerodhaContractDatabase();

    return database
        .prepare(`
            SELECT *
            FROM instruments
            WHERE feed_source = 'zerodha'
              AND active_status = 1
              AND trading_symbol = ?
            LIMIT 1
        `)
        .get(tradingSymbol);
}

export function getZerodhaInstrumentByToken(
    tokenIdentifier
) {

    const database = getZerodhaContractDatabase();

    return database
        .prepare(`
            SELECT *
            FROM instruments
            WHERE feed_source = 'zerodha'
              AND active_status = 1
              AND token_identifier = ?
            LIMIT 1
        `)
        .get(String(tokenIdentifier));
}

export default {
    initializeZerodhaContractDatabase,
    getZerodhaContractDatabase,
    closeZerodhaContractDatabase,
    zerodhaContractDatabasePath,
    getInstrumentCount,
    deactivateAllZerodhaInstruments,
    upsertZerodhaInstrument,
    upsertZerodhaInstruments,
    getAllZerodhaInstruments,
    getZerodhaInstrumentByTradingSymbol,
    getZerodhaInstrumentByToken
};