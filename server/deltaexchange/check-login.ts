//======================================================
// server/deltaexchange/check-login.ts
//
// Delta Exchange login / token check (no order placement,
// no cost, safe to run any time).
//
//   1. Loads DELTA_API_KEY / DELTA_API_SECRET from the
//      repo root .env
//   2. Confirms the keys are present
//   3. Public check : GET /v2/products  (no auth needed)
//   4. Auth check   : GET /v2/wallet/balances (signed request)
//
// Run:   npx tsx server/deltaexchange/check-login.ts
//======================================================

import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import crypto from "crypto";

//------------------------------------------------------
// Minimal .env loader (repo root) - avoids depending on
// how the host process loads env when run standalone.
//------------------------------------------------------
function loadRootEnv(): void {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
        console.log(`[ENV] No .env found at ${envPath} - relying on process env.`);
        return;
    }
    for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    }
}

const REST_API = process.env.DELTA_API_BASE ?? "https://api.india.delta.exchange";

async function main() {
    console.log("=".repeat(60));
    console.log(" DELTA EXCHANGE LOGIN / TOKEN CHECK");
    console.log("=".repeat(60));

    loadRootEnv();

    const apiKey = String(process.env.DELTA_API_KEY ?? "").trim();
    const apiSecret = String(process.env.DELTA_API_SECRET ?? "").trim();

    //--------------------------------------------------
    // 1. Keys present?
    //--------------------------------------------------
    if (!apiKey || !apiSecret) {
        console.log("[FAIL] DELTA_API_KEY / DELTA_API_SECRET missing.");
        console.log("       Add them to the repo root .env (see");
        console.log("       server/deltaexchange/.env.deltaexchange.sample)");
        process.exit(1);
    }
    console.log(`[OK]   Keys present. api-key=${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`);

    //--------------------------------------------------
    // 2. Public endpoint reachable? (no auth, no cost)
    //--------------------------------------------------
    try {
        const t0 = Date.now();
        const res = await axios.get(`${REST_API}/v2/products`, { timeout: 15000 });
        const count = Array.isArray(res?.data?.result) ? res.data.result.length : 0;
        console.log(`[OK]   Public API reachable - /v2/products returned ${count} products in ${Date.now() - t0}ms`);
    } catch (e: any) {
        console.log("[FAIL] Public API NOT reachable:", e?.response?.status ?? e?.message);
        console.log("       Check internet / firewall. Auth test skipped.");
        process.exit(1);
    }

    //--------------------------------------------------
    // 3. Signed request against /v2/summary
    //    signature = HMAC_SHA256(secret, METHOD + timestamp + path)
    //--------------------------------------------------
    const method = "GET";
    const reqPath = "/v2/wallet/balances";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(method + timestamp + reqPath)
        .digest("hex");

    try {
        const res = await axios.get(`${REST_API}${reqPath}`, {
            timeout: 15000,
            headers: {
                "api-key": apiKey,
                timestamp,
                signature,
                "Content-Type": "application/json"
            }
        });
        console.log("[OK]   AUTH VALID - /v2/wallet/balances answered 200.");
        const balances = Array.isArray(res?.data?.result) ? res.data.result : [];
        if (balances.length > 0) {
            for (const b of balances.slice(0, 5)) {
                console.log(`       balance: ${b?.asset_symbol ?? b?.asset_code ?? b?.asset ?? "?"} ` +
                    `available=${b?.available_balance ?? b?.balance ?? "?"}`);
            }
        } else {
            console.log("       (no balance rows returned - account reachable)");
        }
        console.log("");
        console.log("RESULT: LOGIN SUCCESSFUL - Delta Exchange connection is ready.");
        process.exit(0);
    } catch (e: any) {
        const status = e?.response?.status;
        const data = e?.response?.data;

        if (status === 401 || status === 403) {
            console.log("[FAIL] AUTH REJECTED (401/403).");
            console.log("       - Re-check DELTA_API_KEY and DELTA_API_SECRET in .env");
            console.log("         (copy both exactly from MyDelta -> API Keys).");
            if (data?.error?.code === "invalid_api_key" || data?.meta?.error?.code) {
                console.log(`       - Delta said: ${data?.error?.code ?? data?.meta?.error?.code}`);
            }
        } else if (status === 429) {
            console.log("[FAIL] Rate limited (429) - wait a minute and re-run.");
        } else {
            console.log(`[FAIL] Unexpected error (status=${status ?? "?"}):`, e?.message);
        }
        process.exit(1);
    }
}

main();
