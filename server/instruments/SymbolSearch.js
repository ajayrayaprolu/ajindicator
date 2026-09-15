//======================================================
// server/instruments/SymbolSearch.js
//======================================================
//
// SQLite instrument search.
//
// Responsibilities:
//
// 1. Numeric strike search
//      24500
//
// 2. Text + strike option search
//      NIFTY 24500
//      BANKNIFTY 52000
//
// 3. Option-type search
//      NIFTY CE
//      NIFTY PE
//      BANKNIFTY CE
//      BANKNIFTY PE
//
// 4. Normal instrument database search
//
// IMPORTANT:
//
// This file does NOT generate/invent option contracts.
// It only returns contracts that actually exist in SQLite.
//
// Yahoo symbol resolution remains in YahooSymbolCatalog.js.
//======================================================

import {
    getInstrumentDatabase
} from "./InstrumentDatabase.js";

//======================================================
// SEARCH
//======================================================

export function searchSymbols(
    query,
    limit = 50
) {

    const text =
        String(query ?? "")
            .trim()
            .toUpperCase();

    if (!text) {
        return [];
    }

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 50,
                1
            ),
            100
        );

    const db =
        getInstrumentDatabase();

    //==================================================
    // NUMERIC STRIKE SEARCH
    //
    // Example:
    //
    // 24500
    //
    // Returns actual option contracts from SQLite.
    //==================================================

    const numericOnly =
        /^\d+(?:\.\d+)?$/.test(text);

    if (numericOnly) {

        const strike =
            Number(text);

        return db.prepare(`
            SELECT
                id,
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
            FROM instruments
            WHERE active_status = 1
              AND strike = ?
              AND instrument_type IN ('CE', 'PE', 'OPTION')
            ORDER BY
                CASE
                    WHEN UPPER(underlying) = 'NIFTY' THEN 1
                    WHEN UPPER(underlying) = 'BANKNIFTY' THEN 2
                    ELSE 3
                END,
                expiry ASC,
                option_type ASC,
                trading_symbol ASC
            LIMIT ?
        `).all(
            strike,
            safeLimit
        );

    }

    //==================================================
    // TOKENIZE SEARCH
    //==================================================

    const parts =
        text
            .split(/\s+/)
            .filter(Boolean);

    //==================================================
    // OPTION TYPE
    //==================================================

    const optionType =
        parts.includes("CE")
            ? "CE"
            : parts.includes("PE")
                ? "PE"
                : null;

    //==================================================
    // STRIKE
    //==================================================

    const strikePart =
        parts.find(
            part =>
                /^\d+(?:\.\d+)?$/.test(part)
        );

    const strike =
        strikePart !== undefined
            ? Number(strikePart)
            : null;

    //==================================================
    // REMOVE OPTION TOKENS
    //==================================================

    const textParts =
        parts.filter(
            part =>
                part !== strikePart &&
                part !== "CE" &&
                part !== "PE"
        );

    //==================================================
    // UNDERLYING / TEXT SEARCH
    //==================================================

    const searchTerm =
        textParts.join(" ").trim();

    //==================================================
    // TEXT + STRIKE + OPTIONAL TYPE
    //
    // Examples:
    //
    // NIFTY 24500
    // NIFTY 24500 CE
    // BANKNIFTY 52000 PE
    //==================================================

    if (
        strike !== null &&
        searchTerm
    ) {

        const searchText =
            `%${searchTerm}%`;

        if (optionType) {

            return db.prepare(`
                SELECT
                    id,
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
                FROM instruments
                WHERE active_status = 1
                  AND strike = ?
                  AND option_type = ?
                  AND (
                        UPPER(symbol) LIKE ?
                     OR UPPER(trading_symbol) LIKE ?
                     OR UPPER(display_name) LIKE ?
                     OR UPPER(underlying) LIKE ?
                  )
                ORDER BY
                    expiry ASC,
                    trading_symbol ASC
                LIMIT ?
            `).all(
                strike,
                optionType,
                searchText,
                searchText,
                searchText,
                searchText,
                safeLimit
            );

        }

        return db.prepare(`
            SELECT
                id,
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
            FROM instruments
            WHERE active_status = 1
              AND strike = ?
              AND instrument_type IN ('CE', 'PE', 'OPTION')
              AND (
                    UPPER(symbol) LIKE ?
                 OR UPPER(trading_symbol) LIKE ?
                 OR UPPER(display_name) LIKE ?
                 OR UPPER(underlying) LIKE ?
              )
            ORDER BY
                expiry ASC,
                option_type ASC,
                trading_symbol ASC
            LIMIT ?
        `).all(
            strike,
            searchText,
            searchText,
            searchText,
            searchText,
            safeLimit
        );

    }

    //==================================================
    // OPTION TYPE + TEXT
    //
    // Examples:
    //
    // NIFTY CE
    // NIFTY PE
    // BANKNIFTY CE
    //==================================================

    if (
        optionType &&
        searchTerm
    ) {

        const searchText =
            `%${searchTerm}%`;

        return db.prepare(`
            SELECT
                id,
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
            FROM instruments
            WHERE active_status = 1
              AND option_type = ?
              AND instrument_type IN ('CE', 'PE', 'OPTION')
              AND (
                    UPPER(symbol) LIKE ?
                 OR UPPER(trading_symbol) LIKE ?
                 OR UPPER(display_name) LIKE ?
                 OR UPPER(underlying) LIKE ?
              )
            ORDER BY
                expiry ASC,
                strike ASC,
                trading_symbol ASC
            LIMIT ?
        `).all(
            optionType,
            searchText,
            searchText,
            searchText,
            searchText,
            safeLimit
        );

    }

    //==================================================
    // NORMAL TEXT SEARCH
    //
    // This searches the SQLite instrument catalog only.
    //
    // Yahoo normal-symbol search is handled separately
    // by YahooSymbolCatalog / server/index.js.
    //==================================================

    const searchText =
        `%${text}%`;

    return db.prepare(`
        SELECT
            id,
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
        FROM instruments
        WHERE active_status = 1
          AND (
                UPPER(symbol) LIKE ?
             OR UPPER(trading_symbol) LIKE ?
             OR UPPER(display_name) LIKE ?
             OR UPPER(underlying) LIKE ?
          )
        ORDER BY
            CASE
                WHEN UPPER(symbol) = ? THEN 1
                WHEN UPPER(trading_symbol) = ? THEN 2
                WHEN UPPER(underlying) = ? THEN 3
                ELSE 4
            END,
            expiry ASC,
            trading_symbol ASC
        LIMIT ?
    `).all(
        searchText,
        searchText,
        searchText,
        searchText,
        text,
        text,
        text,
        safeLimit
    );
}