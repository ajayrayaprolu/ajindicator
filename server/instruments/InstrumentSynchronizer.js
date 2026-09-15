//======================================================
// server/instruments/InstrumentSynchronizer.js
// Phase 3 — Zerodha -> SQLite synchronization
//======================================================

import {
    getInstrumentDatabase
}
from "./InstrumentDatabase.js";

import {
    initializeInstrumentCache,
    refreshInstrumentCache,
    getAllInstruments
}
from "../zerodha/instruments.js";

//======================================================
// CONSTANTS
//======================================================

const REFRESH_INTERVAL_MS =
    30 * 60 * 1000;

//======================================================
// STATE
//======================================================

let refreshTimer = null;
let syncRunning = false;

//======================================================
// NORMALIZE EXPIRY
//======================================================

function normalizeExpiry(
    expiry
) {

    if (!expiry) {
        return null;
    }

    const value =
        String(expiry).trim();

    if (!value) {
        return null;
    }

    return value;
}

//======================================================
// ACTIVE STATUS
//======================================================

function isActiveInstrument(
    instrument
) {

    const expiry =
        normalizeExpiry(
            instrument.expiry
        );

    // Equities / indices without expiry
    if (!expiry) {
        return true;
    }

    const expiryDate =
        new Date(expiry);

    if (
        Number.isNaN(
            expiryDate.getTime()
        )
    ) {
        return true;
    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    expiryDate.setHours(
        0,
        0,
        0,
        0
    );

    return expiryDate >= today;
}

//======================================================
// OPTION TYPE
//======================================================

function getOptionType(
    instrument
) {

    const type =
        String(
            instrument.instrument_type ?? ""
        ).toUpperCase();

    if (type === "CE" || type === "PE") {
        return type;
    }

    const tradingSymbol =
        String(
            instrument.tradingsymbol ?? ""
        ).toUpperCase();

    if (
        tradingSymbol.endsWith("CE")
    ) {
        return "CE";
    }

    if (
        tradingSymbol.endsWith("PE")
    ) {
        return "PE";
    }

    return null;
}

//======================================================
// SYMBOL
//======================================================

function getSymbol(
    instrument
) {

    return (
        instrument.tradingsymbol
        ||
        instrument.name
        ||
        ""
    );
}

//======================================================
// UPSERT
//======================================================

function upsertInstruments(
    instruments
) {

    const db =
        getInstrumentDatabase();

    //--------------------------------------------------
    // Existing Zerodha records become inactive first.
    // Current successful master download reactivates
    // valid records below.
    //--------------------------------------------------

    db.prepare(`
        UPDATE instruments
        SET
            active_status = 0,
            last_updated = CURRENT_TIMESTAMP
        WHERE feed_source = 'zerodha'
    `).run();

    //--------------------------------------------------
    // UPSERT
    //--------------------------------------------------

    const statement =
        db.prepare(`
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
                @active_status,
                CURRENT_TIMESTAMP

            )

            ON CONFLICT (
                exchange,
                segment,
                trading_symbol,
                feed_source
            )

            DO UPDATE SET

                symbol =
                    excluded.symbol,

                display_name =
                    excluded.display_name,

                instrument_type =
                    excluded.instrument_type,

                expiry =
                    excluded.expiry,

                strike =
                    excluded.strike,

                option_type =
                    excluded.option_type,

                underlying =
                    excluded.underlying,

                token_identifier =
                    excluded.token_identifier,

                active_status =
                    excluded.active_status,

                last_updated =
                    CURRENT_TIMESTAMP
        `);

    const transaction =
        db.transaction(
            items => {

                for (
                    const instrument
                    of items
                ) {

                    statement.run({

                        exchange:
                            instrument.exchange
                            ?? "",

                        segment:
                            instrument.segment
                            ?? "",

                        symbol:
                            getSymbol(
                                instrument
                            ),

                        trading_symbol:
                            instrument.tradingsymbol
                            ?? "",

                        display_name:
                            instrument.name
                            ?? null,

                        instrument_type:
                            instrument.instrument_type
                            ?? null,

                        expiry:
                            normalizeExpiry(
                                instrument.expiry
                            ),

                        strike:
                            instrument.strike == null
                                ? null
                                : Number(
                                    instrument.strike
                                ),

                        option_type:
                            getOptionType(
                                instrument
                            ),

                        underlying:
                            instrument.name
                            ?? null,

                        token_identifier:
                            instrument.instrument_token == null
                                ? null
                                : String(
                                    instrument.instrument_token
                                ),

                        active_status:
                            isActiveInstrument(
                                instrument
                            )
                                ? 1
                                : 0

                    });

                }

            }
        );

    transaction(
        instruments
    );

    return instruments.length;
}

//======================================================
// SYNCHRONIZE EXISTING CACHE
//======================================================

export function synchronizeInstrumentMaster() {

    const instruments =
        getAllInstruments();

    if (
        !Array.isArray(
            instruments
        ) ||
        instruments.length === 0
    ) {

        console.warn(
            "[INSTRUMENT SYNC]",
            "No Zerodha instruments available."
        );

        return 0;
    }

    const count =
        upsertInstruments(
            instruments
        );

    console.log(
        "[INSTRUMENT SYNC]",
        "SQLite synchronized:",
        count
    );

    return count;
}

//======================================================
// INITIAL LOAD
//======================================================

export async function initializeInstrumentSynchronizer() {

    if (syncRunning) {
        return;
    }

    syncRunning = true;

    try {

        await initializeInstrumentCache();

        synchronizeInstrumentMaster();

    }

    catch (error) {

        console.error(
            "[INSTRUMENT SYNC] Initialization failed:",
            error?.message
        );

    }

    finally {

        syncRunning = false;

    }
}

//======================================================
// REFRESH
//======================================================

export async function refreshInstrumentMaster() {

    if (syncRunning) {
        return;
    }

    syncRunning = true;

    try {

        console.log(
            "[INSTRUMENT SYNC]",
            "Refreshing Zerodha instrument master..."
        );

        await refreshInstrumentCache();

        synchronizeInstrumentMaster();

    }

    catch (error) {

        console.error(
            "[INSTRUMENT SYNC] Refresh failed:",
            error?.message
        );

    }

    finally {

        syncRunning = false;

    }
}

//======================================================
// START AUTOMATIC REFRESH
//======================================================

export function startInstrumentSynchronization() {

    if (refreshTimer) {
        return;
    }

    refreshTimer =
        setInterval(
            refreshInstrumentMaster,
            REFRESH_INTERVAL_MS
        );

    console.log(
        "[INSTRUMENT SYNC]",
        "Automatic refresh enabled:",
        "30 minutes"
    );
}

//======================================================
// STOP
//======================================================

export function stopInstrumentSynchronization() {

    if (!refreshTimer) {
        return;
    }

    clearInterval(
        refreshTimer
    );

    refreshTimer = null;
}