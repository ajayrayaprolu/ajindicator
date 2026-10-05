//==========================================
// server/deltaexchange/probe-liquidity.ts
//
// Scans live BTC put options near a strike across all
// expiries and reports which series actually return
// candle history on Delta India.
//
//   npx tsx server/deltaexchange/probe-liquidity.ts [strike]
//==========================================

import axios from "axios";

const REST_API =
    process.env.DELTA_API_BASE ??
    "https://api.india.delta.exchange";

const STRIKE =
    Number(process.argv[2] ?? 83500);

async function main() {

    const prodRes = await axios.get(
        `${REST_API}/v2/products`,
        { timeout: 20000 }
    );

    const puts = prodRes.data.result.filter(
        (p: any) =>
            p.contract_type === "put_options" &&
            p.underlying_asset?.symbol === "BTC" &&
            p.state === "live"
    );

    // Group by expiry, take the strike nearest to STRIKE per expiry
    const byExpiry = new Map<string, any[]>();

    for (const p of puts) {
        const d = String(p.settlement_time ?? "").slice(0, 10);
        if (!byExpiry.has(d)) byExpiry.set(d, []);
        byExpiry.get(d)!.push(p);
    }

    const end = Math.floor(Date.now() / 1000);
    const start = end - 7 * 86400;

    for (const [expiry, rows] of [...byExpiry.entries()].sort()) {

        rows.sort(
            (a: any, b: any) =>
                Math.abs(Number(a.strike_price) - STRIKE) -
                Math.abs(Number(b.strike_price) - STRIKE)
        );

        const p = rows[0];

        try {

            const r = await axios.get(
                `${REST_API}/v2/history/candles`,
                {
                    timeout: 10000,
                    params: {
                        symbol: p.symbol,
                        resolution: "5m",
                        start,
                        end
                    }
                }
            );

            const n = Array.isArray(r?.data?.result)
                ? r.data.result.length
                : 0;

            console.log(
                `${expiry}  ${p.symbol}  strike=${p.strike_price}  ` +
                `candles(7d,5m)=${n}`
            );

        } catch (e: any) {

            console.log(
                `${expiry}  ${p.symbol}  strike=${p.strike_price}  ` +
                `FAIL ${e?.response?.status ?? ""}`
            );
        }
    }
}

main().catch(e => {
    console.error("probe failed:", e?.response?.status, e?.message);
    process.exit(1);
});
