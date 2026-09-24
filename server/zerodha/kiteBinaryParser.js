//======================================================
// server/zerodha/kiteBinaryParser.js
//
// Pure binary tick parser for Zerodha's Kite WebSocket
// streaming protocol (v3). No transport/socket code here
// on purpose — this is unit-testable in isolation before
// it's ever wired to a live connection.
//
// Verified against two independent sources (2026-09-23):
//   https://kite.trade/docs/connect/v3/websocket/
//   https://github.com/zerodha/kiteconnectjs/blob/master/lib/ticker.ts
//======================================================

const SEGMENT = {
    NSE_CM: 1,
    NSE_FO: 2,
    NSE_CD: 3,
    BSE_CM: 4,
    BSE_FO: 5,
    BSE_CD: 6,
    MCX_FO: 7,
    MCX_SX: 8,
    INDICES: 9
};

function segmentOf(instrumentToken) {
    return instrumentToken & 0xff;
}

function divisorFor(segment) {
    if (segment === SEGMENT.NSE_CD) return 10000000.0;
    if (segment === SEGMENT.BSE_CD) return 10000.0;
    return 100.0;
}

//======================================================
// SPLIT ONE FRAME INTO INDIVIDUAL TICK PACKETS
// [2 bytes: packet count][2 bytes: len][packet]...
//======================================================

function splitPackets(buf) {
    const count = buf.readUInt16BE(0);
    const packets = [];
    let offset = 2;

    for (let i = 0; i < count; i++) {
        const size = buf.readUInt16BE(offset);
        const start = offset + 2;
        const end = start + size;
        packets.push(buf.subarray(start, end));
        offset = end;
    }

    return packets;
}

//======================================================
// PARSE ONE PACKET
//======================================================

function parsePacket(bin) {

    const instrumentToken = bin.readUInt32BE(0);
    const segment = segmentOf(instrumentToken);
    const tradable = segment !== SEGMENT.INDICES;
    const divisor = divisorFor(segment);

    // LTP ONLY (8 bytes)
    if (bin.length === 8) {
        return {
            tradable,
            mode: "ltp",
            instrument_token: instrumentToken,
            last_price: bin.readUInt32BE(4) / divisor
        };
    }

    // INDEX QUOTE (28 bytes) / INDEX FULL (32 bytes)
    if (bin.length === 28 || bin.length === 32) {

        const mode = bin.length === 32 ? "full" : "quote";
        const lastPrice = bin.readUInt32BE(4) / divisor;

        const ohlc = {
            high: bin.readUInt32BE(8) / divisor,
            low: bin.readUInt32BE(12) / divisor,
            open: bin.readUInt32BE(16) / divisor,
            close: bin.readUInt32BE(20) / divisor
        };

        let change = bin.readUInt32BE(24);
        if (ohlc.close !== 0) {
            change = ((lastPrice - ohlc.close) * 100) / ohlc.close;
        }

        const tick = {
            tradable,
            mode,
            instrument_token: instrumentToken,
            last_price: lastPrice,
            ohlc,
            change
        };

        if (bin.length === 32) {
            const ts = bin.readUInt32BE(28);
            tick.exchange_timestamp = ts ? new Date(ts * 1000) : null;
        }

        return tick;
    }

    // QUOTE (44 bytes) / FULL (184 bytes)
    if (bin.length === 44 || bin.length === 184) {

        const mode = bin.length === 184 ? "full" : "quote";
        const lastPrice = bin.readUInt32BE(4) / divisor;

        const ohlc = {
            open: bin.readUInt32BE(28) / divisor,
            high: bin.readUInt32BE(32) / divisor,
            low: bin.readUInt32BE(36) / divisor,
            close: bin.readUInt32BE(40) / divisor
        };

        let change = 0;
        if (ohlc.close !== 0) {
            change = ((lastPrice - ohlc.close) * 100) / ohlc.close;
        }

        const tick = {
            tradable,
            mode,
            instrument_token: instrumentToken,
            last_price: lastPrice,
            last_traded_quantity: bin.readUInt32BE(8),
            average_traded_price: bin.readUInt32BE(12) / divisor,
            volume_traded: bin.readUInt32BE(16),
            total_buy_quantity: bin.readUInt32BE(20),
            total_sell_quantity: bin.readUInt32BE(24),
            ohlc,
            change
        };

        if (bin.length === 184) {

            const lastTradeTime = bin.readUInt32BE(44);
            tick.last_trade_time = lastTradeTime ? new Date(lastTradeTime * 1000) : null;

            const exchangeTimestamp = bin.readUInt32BE(60);
            tick.exchange_timestamp = exchangeTimestamp ? new Date(exchangeTimestamp * 1000) : null;

            tick.oi = bin.readUInt32BE(48);
            tick.oi_day_high = bin.readUInt32BE(52);
            tick.oi_day_low = bin.readUInt32BE(56);

            const depthBuf = bin.subarray(64, 184);
            const buy = [];
            const sell = [];

            for (let i = 0; i < 10; i++) {
                const s = i * 12;
                const entry = {
                    quantity: depthBuf.readUInt32BE(s),
                    price: depthBuf.readUInt32BE(s + 4) / divisor,
                    orders: depthBuf.readUInt16BE(s + 8)
                };
                (i < 5 ? buy : sell).push(entry);
            }

            tick.depth = { buy, sell };
        }

        return tick;
    }

    // Unknown packet length — never guess, drop it rather
    // than emit a malformed tick into the live feed.
    return null;
}

//======================================================
// PARSE ONE FULL WEBSOCKET BINARY FRAME
//======================================================

export function parseTicks(buf) {

    // Heartbeat: tiny binary frames carry no data.
    if (!buf || buf.length <= 2) {
        return [];
    }

    const packets = splitPackets(buf);
    const ticks = [];

    for (const packet of packets) {
        const tick = parsePacket(packet);
        if (tick) {
            ticks.push(tick);
        }
    }

    return ticks;
}

// Exported for testing only — not part of the public
// runtime surface used by the WebSocket transport layer.
export const _internal = { parsePacket, splitPackets, segmentOf, divisorFor, SEGMENT };