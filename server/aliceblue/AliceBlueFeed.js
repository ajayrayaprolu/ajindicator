//======================================================
// server/aliceblue/AliceBlueFeed.js.new2808
//
// Alice Blue Feed Adapter
//
// UI symbol:
//     RELIANCE
//
// Internal Alice Blue instrument:
//     NSE|TOKEN
//
// Responsibilities:
//     - Start / stop Alice Blue websocket
//     - Subscribe / unsubscribe
//     - Resolve normal UI symbols to NSE tokens
//     - Load historical candles
//     - Expose feed status
//======================================================

import {
    connectAliceBlue,
    disconnect as disconnectAliceBlue,
    subscribe as subscribeAliceBlue,
    unsubscribe as unsubscribeAliceBlue,
    setTickHandler,
    getStatus as getAliceBlueStatus
} from "./websocket.js";

import {
	getAliceBlueHistory,
	getCacheFreshness
} from "./history.js";

import {
    getSessionId,
    getUserId
} from "./token.js";

import {
    resolveAliceBlueToken,
    getAliceBlueInstrumentInfo
} from "./symbols.js";

//======================================================
// SYMBOL NORMALIZER
//======================================================

function normalizeSymbol(symbol) {

    if (
        symbol === undefined ||
        symbol === null
    ) {
        return null;
    }

    const value =
        String(symbol)
            .trim()
            .toUpperCase();

    if (!value) {
        return null;
    }

    //--------------------------------------------------
    // Already an Alice Blue instrument:
    //
    // NSE|2885
    //--------------------------------------------------

    if (value.includes("|")) {

        const parts =
            value.split("|");

        const exchange =
            String(
                parts[0] ?? ""
            )
                .trim()
                .toUpperCase();

        const token =
            String(
                parts[1] ?? ""
            )
                .trim();

        if (
            !exchange ||
            !token
        ) {
            return null;
        }

        return {
            exchange,
            token,
            key:
                `${exchange}|${token}`
        };
    }

    //--------------------------------------------------
    // Normal UI symbol such as:
    //
    // RELIANCE
    // NIFTY
    // BANKNIFTY
    //
    // Do NOT treat it as an already resolved
    // Alice Blue instrument.
    //--------------------------------------------------

    return null;
}

//======================================================
// FACTORY
//======================================================

export function createAliceBlueFeed() {

    let running = false;

    //==================================================
    // START
    //==================================================

    async function start(
        tickHandler
    ) {

        if (
            typeof tickHandler ===
            "function"
        ) {

            setTickHandler(
                tickHandler
            );
        }

        const sessionId =
            getSessionId();

        const userId =
            getUserId();

        if (
            !sessionId ||
            !userId
        ) {

            throw new Error(
                "[ALICEBLUE] Login required."
            );
        }

        //------------------------------------------------
        // Start websocket.
        //
        // websocket.js handles the actual asynchronous
        // connection and authentication.
        //------------------------------------------------

        connectAliceBlue();

        running = true;

        console.log(
            "[ALICEBLUE FEED] Started."
        );

        return true;
    }

    //==================================================
    // STOP
    //==================================================

    async function stop() {

        try {

            disconnectAliceBlue();

        }
        finally {

            running = false;

        }

        console.log(
            "[ALICEBLUE FEED] Stopped."
        );
    }

    //==================================================
    // RESOLVE UI SYMBOL
    //==================================================

    function resolveInstrument(
        symbol
    ) {

        //------------------------------------------------
        // Case 1:
        //
        // Already resolved:
        //
        // NSE|2885
        //------------------------------------------------

        const existing =
            normalizeSymbol(
                symbol
            );

        if (existing) {

            return existing;
        }


        //------------------------------------------------
        // Case 2:
        //
        // Normal UI symbol:
        //
        // RELIANCE
        //------------------------------------------------

        const rawSymbol =
            String(
                symbol ?? ""
            )
                .trim()
                .toUpperCase();

        if (!rawSymbol) {

            throw new Error(
                "[ALICEBLUE] Symbol is required."
            );
        }

        //--------------------------------------------------
        // NO HARDCODED SYMBOL LIST.
        //
        // Cash/index cascade: NSE, then BSE (covers NIFTY/
        // BANKNIFTY/FINNIFTY/MIDCPNIFTY on NSE and SENSEX/
        // BANKEX on BSE) — resolved entirely from the
        // contract master via resolveAliceBlueToken(), which
        // already recognizes index contracts generically.
        //--------------------------------------------------

        const cashExchanges = ["NSE", "BSE"];

        let exchange = null;
        let token = null;

        for (const candidateExchange of cashExchanges) {

            const candidateToken =
                resolveAliceBlueToken(
                    candidateExchange,
                    rawSymbol
                );

            if (candidateToken) {
                exchange = candidateExchange;
                token = candidateToken;
                break;
            }
        }

        //--------------------------------------------------
        // OPTION / DERIVATIVE FALLBACK — NFO, then BFO.
        //--------------------------------------------------

        if (!token) {

            const derivativeExchanges = ["NFO", "BFO"];

            for (const derivativeExchange of derivativeExchanges) {

                const candidateToken =
                    resolveAliceBlueToken(
                        derivativeExchange,
                        rawSymbol
                    );

                if (candidateToken) {
                    exchange = derivativeExchange;
                    token = candidateToken;
                    break;
                }
            }
        }

        if (!token) {

            throw new Error(
                "[ALICEBLUE] Unable to resolve " +
                rawSymbol +
                " to an Alice Blue instrument token."
            );
        }

        const instrument = {
            exchange,
            token,
            key:`${exchange}|${token}`
        };

        console.log(
            "[ALICEBLUE] Symbol resolved:",
            {
                requested:rawSymbol,
                exchange,
                token,
                resolved:instrument.key
            }
        );

        return instrument;
    }

    //==================================================
    // SUBSCRIBE
    //==================================================

    async function subscribe(
        symbol
    ) {

		const instrument =
			resolveInstrument(
				symbol
			);

//        console.log(
//            "[ALICEBLUE FEED] Subscribe:",
//            {
//                requested:symbol,
//                exchange:instrument.exchange,
//                token:instrument.token,
//                key:instrument.key
//            }
//        );

        return subscribeAliceBlue(
            instrument.key
        );
    }

    //==================================================
    // UNSUBSCRIBE
    //==================================================

    async function unsubscribe(
        symbol
    ) {

        const instrument =
            normalizeSymbol(
                symbol
            );

        if (!instrument) {

            throw new Error(
                `[ALICEBLUE FEED] Invalid unsubscribe symbol "${symbol}". Expected EXCHANGE|TOKEN.`
            );
        }

//        console.log(
//            "[ALICEBLUE FEED] Unsubscribe:",
//            {
//                exchange:instrument.exchange,
//                token:instrument.token,
//                key:instrument.key
//            }
//        );

        return unsubscribeAliceBlue(
            instrument.key
        );
    }

    //==================================================
    // HISTORY
    //
    // Returns { candles, freshness, isIndex } — NOT a
    // bare array anymore. freshness comes straight from
    // the store (see history.js: getCacheFreshness) so
    // the frontend can render a "last synced" badge
    // instead of a hard error whenever there's anything
    // usable on disk, even if this particular call was a
    // pure store read with zero network activity.
    //==================================================

    async function getHistory(
        symbol,
        timeframe = "1m"
    ) {
        //------------------------------------------------
        // Resolve:
        // RELIANCE
        // into:
        // NSE|TOKEN
        //------------------------------------------------

		const instrument =
			resolveInstrument(
				symbol
			);

		//==================================================
		// INSTRUMENT METADATA
		//==================================================

		const instrumentInfo =
			getAliceBlueInstrumentInfo(
				instrument.key,
				instrument.exchange
			) || {};

		const historyIsIndex =
			instrumentInfo?.isIndex === true ||
			instrument.token === "26000" ||
			instrument.token === "26009" ||
			instrument.token === "26037" ||
			instrument.token === "26074";

		//------------------------------------------------
		// Initial chart history
		//
		// Only matters for the cold-start live call inside
		// getAliceBlueHistory() — once a key is tracked,
		// every subsequent read is a store hit and this
		// window is irrelevant. Kept conservative for the
		// same reason as before: no 7-day minute-data
		// blast on a symbol nobody's ever charted.
		//------------------------------------------------

		const to = Date.now();

		const historyDays =
			timeframe === "1D" ||
			timeframe === "1d" ||
			timeframe === "D" ||
			timeframe === "day"
				? 365
				: 1;

		const from =
			to -
			(
				historyDays *
				24 *
				60 *
				60 *
				1000
			);

//        console.log(
//            "[ALICEBLUE FEED] Loading chart history:",
//            {
//                requestedSymbol:symbol,
//                resolvedSymbol:instrument.key,
//                exchange:instrument.exchange,
//                token:instrument.token,
//                timeframe,
//                from,
//                to
//            }
//        );

		const candles =
			await getAliceBlueHistory({
				exchange:instrument.exchange,
				token:instrument.token,
				timeframe,
				from,
				to,
				isIndex:historyIsIndex,
				exchangeSegment:instrumentInfo?.exchangeSegment ?? "",
				instrumentType:	instrumentInfo?.instrumentType ?? ""

			});

		const freshness =
			getCacheFreshness({
				exchange:instrument.exchange,
				token:instrument.token,
				timeframe
			});

//        console.log(
//            "[ALICEBLUE FEED] Chart history received:",
//            {
//                symbol:instrument.key,
//                count:
//                    Array.isArray(candles)
//                        ? candles.length
//                        : 0,
//                freshness
//            }
//        );

        return {
            candles,
            freshness,
            isIndex: historyIsIndex
        };
    }

    //==================================================
    // STATUS
    //==================================================

    function getStatus() {

        const wsStatus =
            getAliceBlueStatus();


        return {

            provider: "aliceblue",
            running,
            connected:wsStatus.connected,
            connecting:wsStatus.connecting,
            authenticated:wsStatus.authenticated,
            subscriptions:wsStatus.subscriptions,
            subscribedSymbols: wsStatus.subscribedSymbols
        };
    }

    //==================================================
    // ADAPTER
    //==================================================

    return {

        name:"aliceblue",
        provider:"aliceblue",
        start,
        stop,
        connect:start,
        disconnect:stop,
        subscribe,
        unsubscribe,
        getHistory,
        getStatus,
        resolveInstrument
    };
}

//======================================================
// SINGLETON
//======================================================

const aliceBlueFeed =
    createAliceBlueFeed();

//======================================================
// EXPORT
//======================================================

export default aliceBlueFeed;
