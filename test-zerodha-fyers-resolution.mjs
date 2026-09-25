import * as z from "./server/zerodha/instruments.js";
import * as f from "./server/fyers/symbolMaster.js";
import * as s from "./server/fyers/symbols.js";

z.loadCache();

const tests = [
    ["RELIANCE", z.getInstrument("NSE", "RELIANCE")],
    ["NIFTY 50", z.getInstrument("NSE", "NIFTY 50")],
    ["NIFTY26SEP23350CE", z.getInstrument("NFO", "NIFTY26SEP23350CE")]
];

for (const [symbol, row] of tests) {
    console.log("\n===", symbol, "===");

    console.log("Zerodha row:", row);

    if (!row) continue;

    const underlying = String(row.name ?? "")
        .replace(/^"+|"+$/g, "")
        .trim()
        .toUpperCase();

    console.log("cleanUnderlying:", underlying);

    if (
        row.instrument_type === "CE" ||
        row.instrument_type === "PE"
    ) {
        const contract = f.getFyersOptionContract({
            underlying,
            expiry: row.expiry,
            strike: Number(row.strike),
            optionType: row.instrument_type
        });

        console.log("FYERS option:", contract);
    } else {
        console.log(
            "FYERS symbol:",
            s.resolveFyersSymbol(symbol)
        );
    }
}