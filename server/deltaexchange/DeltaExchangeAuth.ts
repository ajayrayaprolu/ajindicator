//==========================================
// server/deltaexchange/DeltaExchangeAuth.ts
//
// Delta Exchange API authentication (HMAC SHA256).
//
// Public market-data endpoints need no auth. Auth is required
// for account endpoints (wallet balances, positions, orders).
//
// Signature scheme (per docs.delta.exchange):
//   signature = HMAC_SHA256(
//       secret,
//       method + timestamp + requestData
//   ).hexdigest()
//
//   where requestData for GET/DELETE is
//     path + query  (e.g. "/v2/products" or "/v2/positions?product_id=27")
//   and for POST/PUT it is the raw JSON body string.
//
//   timestamp = epoch seconds
//
// Headers sent with every authenticated request:
//   api-key:    <DELTA_API_KEY>
//   timestamp:  <epoch seconds>
//   signature:  <hex digest>
//==========================================

import crypto from "crypto";
import axios from "axios";

const REST_API = process.env.DELTA_API_BASE ?? "https://api.india.delta.exchange";

//==========================================
// CREDENTIALS (from .env)
//==========================================

export function getDeltaCredentials(): {
    apiKey: string;
    apiSecret: string;
} {
    return {
        apiKey: String(process.env.DELTA_API_KEY ?? "").trim(),
        apiSecret: String(process.env.DELTA_API_SECRET ?? "").trim()
    };
}

//==========================================
// SIGNATURE
//==========================================

export function buildDeltaSignature(
    method: string,
    timestamp: string,
    requestData: string,
    apiSecret: string
): string {
    const payload =
        String(method).toUpperCase() +
        String(timestamp) +
        String(requestData ?? "");

    return crypto
        .createHmac("sha256", apiSecret)
        .update(payload)
        .digest("hex");
}

//==========================================
// AUTHENTICATED REQUEST
//==========================================

export async function deltaAuthenticatedRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    pathWithQuery: string,
    body?: Record<string, unknown>
): Promise<any> {

    const { apiKey, apiSecret } = getDeltaCredentials();

    if (!apiKey || !apiSecret) {
        throw new Error(
            "Delta Exchange credentials missing. Set DELTA_API_KEY and " +
            "DELTA_API_SECRET in .env."
        );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();

    // GET/DELETE sign path+query; POST/PUT sign the JSON body.
    const requestData =
        method === "GET" || method === "DELETE"
            ? pathWithQuery
            : JSON.stringify(body ?? {});

    const signature = buildDeltaSignature(
        method,
        timestamp,
        requestData,
        apiSecret
    );

    return axios({
        method,
        url: `${REST_API}${pathWithQuery}`,
        data: method === "POST" || method === "PUT" ? (body ?? {}) : undefined,
        timeout: 10000,
        headers: {
            "api-key": apiKey,
            timestamp,
            signature,
            "Content-Type": "application/json"
        }
    });
}

//==========================================
// TOKEN / CREDENTIAL CHECK
//
// Delta does not use a "login" - the API key pair IS the session.
// A key is valid when an authenticated account endpoint answers 200.
// /v2/wallet/balances (account balances) is the lightest such endpoint.
//==========================================

export async function checkDeltaCredentials(): Promise<{
    ok: boolean;
    message: string;
    details?: any;
}> {

    const { apiKey, apiSecret } = getDeltaCredentials();

    if (!apiKey || !apiSecret) {
        return {
            ok: false,
            message:
                "DELTA_API_KEY / DELTA_API_SECRET not set in .env - " +
                "fill them in and re-run the check."
        };
    }

    try {
        const response = await deltaAuthenticatedRequest("GET", "/v2/wallet/balances");

        return {
            ok: true,
            message: "Delta Exchange credentials are valid - wallet reachable.",
            details: response?.data?.result ?? response?.data
        };

    } catch (error: any) {

        const status = error?.response?.status;
        const data = error?.response?.data;

        if (status === 401 || status === 403) {
            return {
                ok: false,
                message:
                    "Delta Exchange rejected the API key or signature (401/403). " +
                    "Check DELTA_API_KEY / DELTA_API_SECRET in .env and that the " +
                    "key is active in MyDelta -> API Keys.",
                details: data
            };
        }

        if (status === 429) {
            return {
                ok: false,
                message:
                    "Delta Exchange rate limit hit while checking credentials - " +
                    "the key itself looks accepted; retry in a minute.",
                details: data
            };
        }

        return {
            ok: false,
            message:
                "Delta Exchange check failed with an unexpected error - " +
                "see details in the log.",
            details: data ?? error?.message
        };
    }
}
