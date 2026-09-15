//======================================================
// server/feeds/normalizeTick.js
//======================================================

export function normalizeTick(
    tick,
    feedSource
) {

    if (!tick) {
        return null;
    }

    return {

        symbol:
            tick.symbol ??
            tick.tradingSymbol ??
            tick.instrument ??
            "",

        exchange:
            tick.exchange ??
            "",

        feedSource:
            tick.feedSource ??
            feedSource ??
            "",

        time:
            tick.time ??
            tick.timestamp ??
            Date.now(),

        open:
            tick.open ??
            null,

        high:
            tick.high ??
            null,

        low:
            tick.low ??
            null,

        close:
            tick.close ??
            tick.lastPrice ??
            tick.ltp ??
            null,

        volume:
            tick.volume ??
            tick.volumeTraded ??
            0,

        ltp:
            tick.ltp ??
            tick.lastPrice ??
            tick.close ??
            null,

        raw:
            tick

    };

}