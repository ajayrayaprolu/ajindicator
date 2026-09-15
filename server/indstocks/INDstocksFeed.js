//======================================================
// server/indstocks/INDstocksFeed.js
//
// IndStocks Feed Adapter
//======================================================

import { getIndstocksHistory } from "./history.js";
import { getIndstocksContractBySymbol } from "./symbols.js";
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
            timeframe === "1D" || timeframe === "1d" || timeframe === "D" || timeframe === "day"
                ? 365
                : 1;

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