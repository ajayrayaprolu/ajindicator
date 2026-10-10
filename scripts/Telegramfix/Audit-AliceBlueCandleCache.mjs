import {
    loadTrackedKeys,
    loadCandles,
    getCandleFreshness,
    getCandleCount
} from "../server/aliceblue/data/AliceBlueCandleDatabase.js";

const keys = loadTrackedKeys();

console.log(`Tracked keys: ${keys.length}`);
console.log("");

for (const key of keys) {
    const args = {
        exchange: key.exchange,
        token: key.token,
        resolution: key.resolution
    };

    const count = getCandleCount(args);
    const candles = loadCandles(args);
    const freshness = getCandleFreshness(args);

    const latest = candles.reduce(
        (max, candle) => Math.max(max, Number(candle.time) || 0),
        0
    );

    console.log(JSON.stringify({
        key: key.key,
        count,
        latestCandleUTC: latest
            ? new Date(latest < 1e12 ? latest * 1000 : latest).toISOString()
            : null,
        freshness
    }));
}
