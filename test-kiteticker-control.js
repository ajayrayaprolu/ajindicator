import { KiteTicker } from "kiteconnect";
import { getApiKey, getAccessToken, isLoggedIn } from "./server/zerodha/token.js";

if (!isLoggedIn()) {
    console.error("Not logged in.");
    process.exit(1);
}

const ticker = new KiteTicker({
    api_key: getApiKey(),
    access_token: getAccessToken()
});

ticker.on("connect", () => {
    console.log("[CONTROL TEST] CONNECTED via official KiteTicker.");
    ticker.subscribe([408065]);
    ticker.setMode(ticker.modeFull, [408065]);
});

ticker.on("ticks", (ticks) => {
    console.log("[CONTROL TEST] REAL TICK:", JSON.stringify(ticks, null, 2));
});

ticker.on("error", (error) => {
    console.error("[CONTROL TEST] ERROR:", error);
});

ticker.on("close", (reason) => {
    console.error("[CONTROL TEST] CLOSED:", reason);
});

ticker.connect();

setTimeout(() => {
    console.log("[CONTROL TEST] Timed out after 20s - closing.");
    ticker.disconnect();
    process.exit(0);
}, 20000);