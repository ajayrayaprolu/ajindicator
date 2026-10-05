//==========================================
// server/deltaexchange/probe-candles.ts
//
// Probe Delta candle endpoints for one option product,
// printing the full error bodies so the failing
// parameter is visible.
//
//   npx tsx server/deltaexchange/probe-candles.ts [symbol]
//==========================================

import axios from "axios";

const REST_API =
    process.env.DELTA_API_BASE ??
    "https://api.india.delta.exchange";

const SYMBOL =
    process.argv[2] ?? "P-BTC-83500-231026";

async function main() {

    // 1. Resolve the product
    const prodRes = await axios.get(
        `${REST_API}/v2/products`,
        { timeout: 20000 }
    );

    const product = prodRes.data.result.find(
        (x: any) => x.symbol === SYMBOL
    );

    if (!product) {
        console.log(`product not found: ${SYMBOL}`);
        return;
    }

    console.log(
        `product: symbol=${product.symbol} id=${product.id} ` +
        `type=${product.contract_type} state=${product.state} ` +
        `settlement=${product.settlement_time}`
    );

    const end = Math.floor(Date.now() / 1000);
    const start = end - 7 * 86400;

    const variants: Array<Record<string, unknown>> = [
        { product_id: product.id, resolution: "5m", start, end },
        { symbol: SYMBOL, resolution: "5m", start, end },
        { product_id: product.id, resolution: "60", start, end },
        { symbol: SYMBOL, resolution: "60", start, end },
        { product_id: String(product.id), resolution: "1m", start, end }
    ];

    for (const params of variants) {

        const label = JSON.stringify({
            kind: params.product_id !== undefined ? "product_id" : "symbol",
            resolution: params.resolution
        });

        try {

            const r = await axios.get(
                `${REST_API}/v2/history/candles`,
                { params, timeout: 15000 }
            );

            const rows = r?.data?.result;

            console.log(
                `${label}: OK, ${Array.isArray(rows) ? rows.length : "??"} candles` +
                (Array.isArray(rows) && rows.length
                    ? ` last=${JSON.stringify(rows[rows.length - 1])}`
                    : "")
            );

        } catch (e: any) {

            console.log(
                `${label}: FAIL ${e?.response?.status ?? ""} ` +
                `${JSON.stringify(e?.response?.data ?? e?.message).slice(0, 300)}`
            );
        }
    }
}

main().catch(e => {
    console.error(
        "probe failed:",
        e?.response?.status,
        e?.message
    );
    process.exit(1);
});
