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