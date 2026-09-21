//======================================================
// server/indstocks/INDstocksFeed.js
//
// IndStocks Feed Adapter
//======================================================

import { getIndstocksHistory } from "./history.js";
import {
    getIndstocksContractBySymbol,
    getAllIndstocksSymbols,
    indstocksSymbolCount,
    getIndstocksSymbolStatus,
    loadContractMaster
} from "./symbols.js";

import {
    resolveOptionContract
} from "../feeds/OptionContractResolver.ts";

import {
    connectIndstocksWebSocket,
    disconnectIndstocksWebSocket,
    setIndstocksTickHandler,
    subscribeIndstocksInstrument,
    unsubscribeIndstocksInstrument,
    getIndstocksWsStatus
} from "./websocket.js";

function normalizeSymbol(symbol) {

    const value = String(symbol ?? "").trim().toUpperCase();

    if (!value) return null;

    const match = value.match(/^([A-Z]+)_(\d+)$/);

    if (match) {
        return {
            exchange: match[1],
            securityId: match[2],
            key: `${match[1]}_${match[2]}`
        };
    }

    return null;

}

// Canonical option form accepted from the UI / chart layer:
//   NIFTY 29SEP 23400 CE
//   NIFTY 29 SEP 23400 CE
//   NIFTY 29SEP 23400CE
const OPTION_PATTERN =
    /^([A-Z][A-Z0-9]*)\s+(\d{1,2})\s*([A-Z]{3})\s*(\d+(?:\.\d+)?)\s*(CE|PE)$/;

export function createIndstocksFeed() {

    let running = false;

    function resolveInstrument(symbol) {

        const existing = normalizeSymbol(symbol);

        if (existing) {
            return existing;
        }

        const rawSymbol = String(symbol ?? "").trim().toUpperCase();

        if (!rawSymbol) {
            throw new Error("[INDSTOCKS] Symbol is required.");
        }

        // Lazy-load safety net for cases where this module was imported
        // without going through the server's normal startup sequence
        // (e.g. a one-off script). getIndstocksSymbolStatus() is a cheap
        // in-memory check; loadContractMaster() reads+parses a ~98MB
        // file, so only call it when the master genuinely isn't loaded —
        // never unconditionally on every resolution.
		
        if (!getIndstocksSymbolStatus().loaded) {
            loadContractMaster();
        }

        const optionMatch = rawSymbol.match(OPTION_PATTERN);

        if (optionMatch) {

            const [
                ,
                underlying,
                expiryDay,
                expiryMonth,
                strike,
                optionType
            ] = optionMatch;

            const expiry = `${expiryDay}${expiryMonth}`;

            const canonical = {
                underlying,
                expiry,
                strike: Number(strike),
                optionType
            };

            // Single source of truth. If IndStocks option resolution
            // ever needs to change (format, fallback strategy, etc),
            // it changes in OptionContractResolver.ts ONLY — not here,
            // not by re-guessing a regex in this file.
			
            const resolved = resolveOptionContract("INDSTOCKS", canonical);

            if (resolved) {

                const exchange =
                    String(resolved.exchange ?? "").trim().toUpperCase();

                const securityId =
                    String(resolved.securityId ?? resolved.token ?? "").trim();

                if (exchange && securityId) {
                    return {
                        exchange,
                        securityId,
                        key: `${exchange}_${securityId}`
                    };
                }
            }

            // ---- Resolution failed. Diagnose, don't guess. ----
            //
            // This tells you, in one shot, whether:
            //  (a) the instrument master never loaded (token/session
            //      issue upstream — no code fix here will help), or
            //  (b) the master IS loaded but the underlying has zero
            //      option contracts under this expiry/strike, or
            //  (c) the master IS loaded and has matches, but their
            //      expiry/strike field format differs from what the
            //      regex built (shown directly in the sample below).

            const status = getIndstocksSymbolStatus?.();
            const totalLoaded = indstocksSymbolCount?.();

            let sampleForUnderlying = [];

            try {
                const all = getAllIndstocksSymbols?.() ?? [];
                sampleForUnderlying = all
                    .filter(c =>
                        c.instrumentType === "OPTION" &&
                        String(
                            c.underlying ??
                            c.symbolName ??
                            c.tradingSymbol ??
                            ""
                        )
                            .toUpperCase()
                            .includes(underlying)
                    )
                    .slice(0, 5)
                    .map(c => ({
                        expiry: c.expiry,
                        strike: c.strike,
                        optionType: c.optionType,
                        symbolName: c.symbolName,
                        tradingSymbol: c.tradingSymbol
                    }));
            } catch (_diagErr) {
                // Diagnostics must never crash resolution.
            }

            console.warn("[INDSTOCKS] Option resolution failed.", {
                searched: canonical,
                masterStatus: status,
                totalContractsLoaded: totalLoaded,
                sampleContractsForUnderlying: sampleForUnderlying
            });

            throw new Error(
                totalLoaded === 0
                    ? `[INDSTOCKS] Unable to resolve ${rawSymbol} — instrument master has 0 contracts loaded. This is a data-load problem (check token/session), not a symbol-format problem.`
                    : `[INDSTOCKS] Unable to resolve ${rawSymbol} to an IndStocks instrument. Check console for sampleContractsForUnderlying and compare its expiry/strike format to what was searched: ${JSON.stringify(canonical)}.`
            );
        }

        // Non-option: equity / index / raw broker symbol.
        const contract =
            getIndstocksContractBySymbol(rawSymbol, "") ??
            getIndstocksContractBySymbol(rawSymbol, "NSE") ??
            getIndstocksContractBySymbol(rawSymbol, "BSE");

        if (!contract) {
            throw new Error(
                `[INDSTOCKS] Unable to resolve ${rawSymbol} to an IndStocks instrument.`
            );
        }

        return {
            exchange: contract.exchange,
            securityId: contract.securityId,
            key: `${contract.exchange}_${contract.securityId}`
        };
    }

    async function start(tickHandler) {

        if (typeof tickHandler === "function") {
            setIndstocksTickHandler(tickHandler);
        }

        await connectIndstocksWebSocket();

        running = true;
        console.log("[INDSTOCKS FEED] Started.");
        return true;
    }

    async function stop() {
        disconnectIndstocksWebSocket();
        running = false;
        console.log("[INDSTOCKS FEED] Stopped.");
    }

    async function subscribe(symbol) {

        const instrument = resolveInstrument(symbol);

        const contract =
            getIndstocksContractBySymbol(instrument.key, "") ??
            getIndstocksContractBySymbol(instrument.key, instrument.exchange);

        const wsInstrument = subscribeIndstocksInstrument({
            exchange: instrument.exchange,
            securityId: instrument.securityId,
            instrumentType: contract?.instrumentType ?? "",
            optionType: contract?.optionType ?? ""
        });

        console.log("[INDSTOCKS FEED] Subscribe:", instrument, "->", wsInstrument);

        return instrument;

    }

    async function unsubscribe(symbol) {

        const instrument = normalizeSymbol(symbol);

        if (!instrument) {
            throw new Error(`[INDSTOCKS FEED] Invalid unsubscribe symbol "${symbol}".`);
        }

        const contract =
            getIndstocksContractBySymbol(instrument.key, "") ??
            getIndstocksContractBySymbol(instrument.key, instrument.exchange);

        unsubscribeIndstocksInstrument({
            exchange: instrument.exchange,
            securityId: instrument.securityId,
            instrumentType: contract?.instrumentType ?? "",
            optionType: contract?.optionType ?? ""
        });

        console.log("[INDSTOCKS FEED] Unsubscribe:", instrument);

    }

    async function getHistory(symbol, timeframe = "1m") {

		const instrument = resolveInstrument(symbol);
		const to = Date.now();
		const historyDays =
			timeframe === "1D" ||
			timeframe === "1d" ||
			timeframe === "D" ||
			timeframe === "day"
				? 365
				: 7;
		
		const from = to - historyDays * 24 * 60 * 60 * 1000;

        console.log("[INDSTOCKS FEED] Loading history:", { symbol, instrument, timeframe, from, to });

        const candles = await getIndstocksHistory({
            exchange: instrument.exchange,
            securityId: instrument.securityId,
            timeframe,
            from,
            to
        });

        console.log("[INDSTOCKS FEED] History received:", { symbol: instrument.key, count: candles.length });

        return candles;

    }

    function getStatus() {

        const wsStatus = getIndstocksWsStatus();

        return {
            provider: "indstocks",
            running,
            connected: wsStatus.connected,
            connecting: wsStatus.connecting,
            authenticated: running,
            subscriptions: wsStatus.subscriptions,
            subscribedSymbols: wsStatus.subscribedInstruments
        };
    }

    return {
        name: "indstocks",
        provider: "indstocks",
        start,
        stop,
        connect: start,
        disconnect: stop,
        subscribe,
        unsubscribe,
        getHistory,
        getStatus,
        resolveInstrument
    };

}

const indstocksFeed = createIndstocksFeed();

export default indstocksFeed;