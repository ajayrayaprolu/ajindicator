//==========================================
// server/deltaexchange/diagnose-options.ts
//
// Prints what Delta's product master actually contains
// for BTC/ETH options, so option resolution can be
// checked against reality.
//
//   npx tsx server/deltaexchange/diagnose-options.ts
//==========================================

import axios from "axios";

const REST_API =
    process.env.DELTA_API_BASE ??
    "https://api.india.delta.exchange";

async function main() {

    const response = await axios.get(
        `${REST_API}/v2/products`,
        { timeout: 20000 }
    );

    const rows: any[] =
        response?.data?.result ?? [];

    console.log(
        `total products: ${rows.length}`
    );

    const optionRows = rows.filter(
        p =>
            String(p?.contract_type ?? "").includes("options")
    );

    console.log(
        `option products: ${optionRows.length}`
    );

    // Dump one full option product so the real field
    // names are visible (underlying_asset_symbol is
    // evidently not what India's master uses).
    if (optionRows.length > 0) {

        console.log(
            "\nSAMPLE OPTION PRODUCT (full JSON):"
        );

        console.log(
            JSON.stringify(
                optionRows[0],
                null,
                2
            )
        );

    }

    // Distinct underlyings carrying options
    const underlyings = new Map<string, number>();

    for (const p of optionRows) {

        const u = String(
            p?.underlying_asset_symbol ?? "?"
        );

        underlyings.set(
            u,
            (underlyings.get(u) ?? 0) + 1
        );
    }

    console.log("\nOPTION UNDERLYINGS:");
    for (const [u, n] of [...underlyings.entries()].sort()) {
        console.log(`  ${u}: ${n} contracts`);
    }

    // Show a few sample contracts per crypto underlying
    for (const u of ["BTC", "ETH", "XRP"]) {

        const sample = optionRows
            .filter(p =>
                String(p?.underlying_asset_symbol ?? "").toUpperCase() === u
            )
            .slice(0, 5);

        if (sample.length === 0) {
            console.log(`\n${u}: NO option contracts found`);
            continue;
        }

        console.log(`\n${u} sample contracts:`);

        for (const p of sample) {

            console.log(
                [
                    `  symbol=${p.symbol}`,
                    `type=${p.contract_type}`,
                    `strike=${p.strike_price}`,
                    `expiry=${p.expiry_date_time}`,
                    `state=${p.state}`,
                    `underlying_asset=${p.underlying_asset_symbol}`
                ].join(" ")
            );
        }
    }

    // Any product whose symbol mentions 27 OCT 2026
    const oct27 = rows.filter(p =>
        String(p?.symbol ?? "").toUpperCase().includes("271026") ||
        String(p?.expiry_date_time ?? "").startsWith("2026-10-27")
    );

    console.log(
        `\nproducts with expiry 2026-10-27: ${oct27.length}`
    );

    for (const p of oct27.slice(0, 10)) {
        console.log(
            `  ${p.symbol} type=${p.contract_type} strike=${p.strike_price} state=${p.state}`
        );
    }

    //---- Resolver live test ----
    const { resolveDeltaOptionContract } = await import("./DeltaOptionResolver.ts");

    console.log("\nRESOLVER TEST: BTC PE 83650 expiry 2026-10-27");
    const resolved = await resolveDeltaOptionContract({
        underlying: "BTC",
        expiry: "2026-10-27",
        strike: 83650,
        optionType: "PE"
    });
    console.log(resolved ? JSON.stringify({
        symbol: resolved.symbol,
        strike: resolved.strike,
        expiry: resolved.expiryIso,
        snapped: (resolved as any).snapped
    }) : "null");
}

main().catch(e => {

    console.error(
        "diagnostic failed:",
        e?.response?.status,
        e?.message
    );

    process.exit(1);
});
