//======================================================
// server/aliceblue/data/AliceBlueContractDatabase.js
//
// Alice Blue Contract Master SQLite Database
//
// Responsibilities:
//
//  1. Open aliceblue-contract-master.db
//  2. Persist normalized Alice Blue contracts
//  3. Load contracts for symbolMaster runtime use
//  4. Preserve broker-specific raw payload
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
        "aliceblue-contract-master.db"
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
// Do NOT recreate the database.
//
// The existing migrated database already contains
// 116,637 Alice Blue contracts.
//
// strike was added/backfilled from raw payload before
// this runtime module is introduced.
//======================================================

database.exec(`
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

        strike
            REAL,

        PRIMARY KEY (
            exchange_segment,
            token
        )
    )
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contracts_symbol
    ON contracts(symbol)
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contracts_trading_symbol
    ON contracts(trading_symbol)
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contracts_exchange
    ON contracts(exchange)
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contracts_expiry
    ON contracts(expiry)
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contracts_option_type
    ON contracts(option_type)
`);

database.exec(`
    CREATE INDEX IF NOT EXISTS
        idx_aliceblue_contracts_strike
    ON contracts(strike)
`);

//======================================================
// PREPARED STATEMENTS
//======================================================

const selectAll =
    database.prepare(`
        SELECT
            exchange,
            exchange_segment,
            token,
            symbol,
            trading_symbol,
            formatted_name,
            instrument_type,
            group_name,
            expiry,
            strike,
            option_type,
            lot_size,
            tick_size,
            raw
        FROM contracts
        ORDER BY rowid
    `);

const selectCount =
    database.prepare(`
        SELECT COUNT(*) AS count
        FROM contracts
    `);

const insertOrReplace =
    database.prepare(`
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
            strike,
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
            @strike,
            @option_type,
            @lot_size,
            @tick_size,
            @raw,
            @created_at,
            @updated_at
        )
        ON CONFLICT(exchange_segment, token)
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

            strike =
                excluded.strike,

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

//======================================================
// SAVE CONTRACTS
//======================================================

const saveTransaction =
    database.transaction(
        contracts => {

            const now =
                Date.now();

            for (
                const contract
                of contracts
            ) {

                if (
                    !contract ||
                    !contract.exchangeSegment ||
                    !contract.token
                ) {

                    continue;

                }

                insertOrReplace.run({

                    exchange:
                        contract.exchange ??
                        "",

                    exchange_segment:
                        contract.exchangeSegment,

                    token:
                        String(
                            contract.token
                        ),

                    symbol:
                        contract.symbol ??
                        null,

                    trading_symbol:
                        contract.tradingSymbol ??
                        null,

                    formatted_name:
                        contract.formattedName ??
                        null,

                    instrument_type:
                        contract.instrumentType ??
                        null,

                    group_name:
                        contract.groupName ??
                        null,

                    expiry:
                        contract.expiry ??
                        null,

                    strike:
                        contract.strike ??
                        null,

                    option_type:
                        contract.optionType ??
                        null,

                    lot_size:
                        contract.lotSize ??
                        null,

                    tick_size:
                        contract.tickSize ??
                        null,

                    raw:
                        typeof contract.raw === "string"
                            ? contract.raw
                            : JSON.stringify(
                                contract.raw ??
                                {}
                            ),

                    created_at:
                        now,

                    updated_at:
                        now

                });

            }

        }
    );

//======================================================
// PUBLIC API
//======================================================

export function loadContracts() {

    return selectAll.all();

}

//======================================================

export function saveContracts(
    contracts
) {

    if (
        !Array.isArray(
            contracts
        ) ||
        contracts.length === 0
    ) {

        return 0;

    }

    saveTransaction(
        contracts
    );

    return contracts.length;

}

//======================================================

export function getContractCount() {

    return Number(
        selectCount.get()?.count ??
        0
    );

}

//======================================================

export function getDatabasePath() {

    return DATABASE_FILE;

}

//======================================================

export function closeDatabase() {

    if (
        database.open
    ) {

        database.close();

    }

}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {

    loadContracts,

    saveContracts,

    getContractCount,

    getDatabasePath,

    closeDatabase

};