//======================================================
// server/indstocks/token.js
//
// IndStocks Token Manager
//
// Uses TOTP-based programmatic token generation so the
// daily SEBI-mandated token reset never requires manual
// dashboard visits. Mirrors the token.js pattern used by
// AliceBlue/Fyers/Zerodha in this project.
//======================================================

import fs from "fs";
import path from "path";
import axios from "axios";
import speakeasy from "speakeasy";

const INDSTOCKS_BASE =
    "https://api.indstocks.com";

const DATA_DIR =
    path.resolve(process.cwd(), "server", "indstocks", "data");

const SESSION_FILE =
    path.join(DATA_DIR, "session.json");

//======================================================
// STATE
//======================================================

let cachedToken = null;
let cachedExpiry = 0;

//======================================================
// DIRECTORY
//======================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

//======================================================
// JWT EXPIRY DECODE
//
// The access token is a JWT with its own embedded "exp"
// claim (seconds since epoch). Decoding it directly means
// we never have to guess or hardcode "resets at 7am" logic
// - we always know exactly when THIS token expires.
//======================================================

function decodeJwtExpiry(token) {

    try {

        const parts = token.split(".");

        if (parts.length < 2) {
            return null;
        }

        const payload = Buffer.from(
            parts[1].replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
        ).toString("utf8");

        const parsed = JSON.parse(payload);

        if (typeof parsed.exp === "number") {
            return parsed.exp * 1000; // ms
        }

        return null;

    } catch {

        return null;

    }

}

//======================================================
// LOCAL SESSION CACHE
//======================================================

function readSessionFile() {

    try {

        if (!fs.existsSync(SESSION_FILE)) {
            return null;
        }

        const parsed = JSON.parse(
            fs.readFileSync(SESSION_FILE, "utf8")
        );

        if (
            parsed &&
            parsed.accessToken &&
            typeof parsed.expiresAt === "number"
        ) {
            return parsed;
        }

        return null;

    } catch {

        return null;

    }

}

function writeSessionFile(accessToken, expiresAt) {

    try {

        ensureDataDir();

        fs.writeFileSync(
            SESSION_FILE,
            JSON.stringify(
                {
                    accessToken,
                    expiresAt,
                    savedAt: new Date().toISOString()
                },
                null,
                2
            ),
            "utf8"
        );

    } catch (error) {

        console.warn(
            "[INDSTOCKS TOKEN] Failed to write session cache:",
            error?.message ?? error
        );

    }

}

//======================================================
// TOTP CODE
//======================================================

function generateTotpCode() {

    const secret =
        process.env.INDSTOCKS_TOTP_SECRET;

    if (!secret) {
        throw new Error(
            "[INDSTOCKS TOKEN] INDSTOCKS_TOTP_SECRET is not set in .env"
        );
    }

    return speakeasy.totp({
        secret,
        encoding: "base32"
    });

}

//======================================================
// REQUEST NEW TOKEN
//======================================================

async function requestNewToken() {

    const clientId =
        process.env.INDSTOCKS_CLIENT_ID;

    const mpin =
        process.env.INDSTOCKS_MPIN;

    if (!clientId || !mpin) {
        throw new Error(
            "[INDSTOCKS TOKEN] INDSTOCKS_CLIENT_ID or INDSTOCKS_MPIN is not set in .env"
        );
    }

    const totp =
        generateTotpCode();

    console.log(
        "[INDSTOCKS TOKEN] Requesting new access token via TOTP..."
    );

    let response;

    try {
        response = await axios.post(

            `${INDSTOCKS_BASE}/generate/token`,

            {
                mpin,
                totp
            },

            {
                headers: {
                    "x-api-key": clientId,
                    "Content-Type": "application/json"
                },
                timeout: 15000
            }

        );

    } catch (error) {

        console.error(
            "[INDSTOCKS TOKEN] Token generation FAILED:",
            {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message
            }
        );

        throw new Error(
            error?.response?.data?.message ??
            "IndStocks token generation failed."
        );

    }

    // Defensive: response field name for the token isn't
    // confirmed from docs yet - check every likely shape.
    const data = response?.data;

    const accessToken =
        data?.token ??
        data?.data?.token ??
        null;

    if (!accessToken) {

        console.error(
            "[INDSTOCKS TOKEN] Unexpected response shape:",
            JSON.stringify(data)
        );

        throw new Error(
            "[INDSTOCKS TOKEN] Could not find access token in response - see logged shape above."
        );

    }

    const expiresAt =
        decodeJwtExpiry(accessToken) ??
        (Date.now() + 23 * 60 * 60 * 1000); // fallback: ~23h

    cachedToken = accessToken;
    cachedExpiry = expiresAt;

    writeSessionFile(accessToken, expiresAt);

    console.log(
        "[INDSTOCKS TOKEN] New token acquired. Expires at:",
        new Date(expiresAt).toISOString()
    );

    return accessToken;

}

//======================================================
// GET ACCESS TOKEN (public entry point)
//
// Returns a valid token, transparently refreshing when
// missing or within 5 minutes of expiry. Callers never
// need to think about the daily reset.
//======================================================

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getAccessToken() {

    const now = Date.now();

    if (
        cachedToken &&
        cachedExpiry - now > REFRESH_BUFFER_MS
    ) {
        return cachedToken;
    }

    const fromDisk =
        readSessionFile();

    if (
        fromDisk &&
        fromDisk.expiresAt - now > REFRESH_BUFFER_MS
    ) {

        cachedToken = fromDisk.accessToken;
        cachedExpiry = fromDisk.expiresAt;

        return cachedToken;

    }

    return requestNewToken();

}

//======================================================
// FORCE REFRESH
//======================================================

export async function refreshToken() {

    cachedToken = null;
    cachedExpiry = 0;

    return requestNewToken();

}

//======================================================
// STATUS
//======================================================

export function getTokenStatus() {

    return {

        hasToken: Boolean(cachedToken),

        expiresAt:
            cachedExpiry
                ? new Date(cachedExpiry).toISOString()
                : null,

        minutesRemaining:
            cachedExpiry
                ? Math.max(
                    0,
                    Math.round((cachedExpiry - Date.now()) / 60000)
                )
                : 0

    };

}

//======================================================
// DEFAULT
//======================================================

export default {
    getAccessToken,
    refreshToken,
    getTokenStatus
};