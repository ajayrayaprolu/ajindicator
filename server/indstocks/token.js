//======================================================
// server/indstocks/token.js
//
// IndStocks Token Manager
//
// Hardened: single-flight lock, failure cooldown with
// exponential backoff, and Cloudflare-challenge detection.
// Without these, a failed login retried on a timer will
// rate-limit the /generate/token route and lock itself out.
//======================================================

import fs from "fs";
import path from "path";
import https from "https";
import axios from "axios";
import speakeasy from "speakeasy";

const INDSTOCKS_BASE = "https://api.indstocks.com";

const DATA_DIR = path.resolve(process.cwd(), "server", "indstocks", "data");
const SESSION_FILE = path.join(DATA_DIR, "session.json");

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Backoff schedule after a failed login attempt.
const BACKOFF_BASE_MS   = 60 * 1000;        // 1 min
const BACKOFF_MAX_MS    = 15 * 60 * 1000;   // 15 min
const EDGE_BLOCK_MS     = 10 * 60 * 1000;   // Cloudflare meta-refresh was 360s; be generous

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

//======================================================
// STATE
//======================================================

let cachedToken = null;
let cachedExpiry = 0;

let inFlight = null;            // single-flight promise
let cooldownUntil = 0;          // no network attempts before this
let consecutiveFailures = 0;
let lastFailureReason = null;

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 4 });

const http = axios.create({
    timeout: 15000,
    httpsAgent: keepAliveAgent,
    headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "https://indstocks.com",
        "Referer": "https://indstocks.com/",
        "Connection": "keep-alive"
    },
    // We want to inspect non-2xx ourselves rather than have axios throw.
    validateStatus: () => true
});

//======================================================
// HELPERS
//======================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function isChallengeBody(data) {
    const text = typeof data === "string" ? data : "";
    return /Just a moment|_cf_chl_opt|cf-browser-verification|challenge-platform/i.test(text);
}

function decodeJwtExpiry(token) {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payload = Buffer.from(
            parts[1].replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
        ).toString("utf8");
        const parsed = JSON.parse(payload);
        return typeof parsed.exp === "number" ? parsed.exp * 1000 : null;
    } catch {
        return null;
    }
}

function readSessionFile() {
    try {
        if (!fs.existsSync(SESSION_FILE)) return null;
        const parsed = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
        if (parsed && parsed.accessToken && typeof parsed.expiresAt === "number") return parsed;
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
                { accessToken, expiresAt, savedAt: new Date().toISOString() },
                null, 2
            ),
            "utf8"
        );
        console.log("[INDSTOCKS TOKEN] Session cached at:", SESSION_FILE);
    } catch (error) {
        console.warn("[INDSTOCKS TOKEN] Failed to write session cache:", error?.message ?? error);
    }
}

function generateTotpCode() {
    const secret = process.env.INDSTOCKS_TOTP_SECRET;
    if (!secret) throw new Error("[INDSTOCKS TOKEN] INDSTOCKS_TOTP_SECRET is not set in .env");
    return speakeasy.totp({ secret, encoding: "base32" });
}

function enterCooldown(ms, reason) {
    cooldownUntil = Date.now() + ms;
    lastFailureReason = reason;
    console.warn(
        `[INDSTOCKS TOKEN] Cooldown ${Math.round(ms / 1000)}s (${reason}). ` +
        `No login attempts until ${new Date(cooldownUntil).toLocaleTimeString()}.`
    );
}

function cooldownError() {
    const remaining = Math.max(0, cooldownUntil - Date.now());
    const err = new Error(
        `[INDSTOCKS TOKEN] In cooldown for ${Math.ceil(remaining / 1000)}s ` +
        `after ${consecutiveFailures} failure(s): ${lastFailureReason}`
    );
    err.indstocksReason = "TOKEN_COOLDOWN";
    err.retryAfterMs = remaining;
    return err;
}

//======================================================
// REQUEST NEW TOKEN  (never call directly - use getAccessToken)
//======================================================

async function requestNewToken() {

    const clientId = process.env.INDSTOCKS_CLIENT_ID;
    const mpin     = process.env.INDSTOCKS_MPIN;

    if (!clientId || !mpin) {
        throw new Error("[INDSTOCKS TOKEN] INDSTOCKS_CLIENT_ID or INDSTOCKS_MPIN is not set in .env");
    }

    const totp = generateTotpCode();

    console.log("[INDSTOCKS TOKEN] Requesting new access token via TOTP...");

    let response;

    try {
        response = await http.post(
            `${INDSTOCKS_BASE}/generate/token`,
            { mpin, totp },
            { headers: { "x-api-key": clientId, "Content-Type": "application/json" } }
        );
    } catch (error) {
        // Transport-level failure (DNS, TLS, timeout).
        consecutiveFailures += 1;
        const wait = Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);
        enterCooldown(wait, `network: ${error?.code ?? error?.message}`);
        const err = new Error(`[INDSTOCKS TOKEN] Network failure: ${error?.message}`);
        err.indstocksReason = "NETWORK";
        throw err;
    }

    const status  = response.status;
    const data    = response.data;
    const headers = response.headers ?? {};

    // ---- Cloudflare / edge interception -------------------------------
    if (isChallengeBody(data) || headers["cf-mitigated"]) {
        consecutiveFailures += 1;
        const retryAfter = Number(headers["retry-after"]) * 1000;
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : EDGE_BLOCK_MS;
        console.error("[INDSTOCKS TOKEN] EDGE BLOCK - Cloudflare challenge, not an auth failure.", {
            status,
            cfRay: headers["cf-ray"],
            cfMitigated: headers["cf-mitigated"] ?? "(none)"
        });
        enterCooldown(wait, `cloudflare challenge (HTTP ${status})`);
        const err = new Error("[INDSTOCKS TOKEN] Blocked by Cloudflare challenge on /generate/token.");
        err.indstocksReason = "EDGE_BLOCKED";
        throw err;
    }

    // ---- Plain rate limit ---------------------------------------------
    if (status === 429) {
        consecutiveFailures += 1;
        const retryAfter = Number(headers["retry-after"]) * 1000;
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter
            : Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);
        enterCooldown(wait, "rate limited (429)");
        const err = new Error("[INDSTOCKS TOKEN] Rate limited by IndStocks.");
        err.indstocksReason = "RATE_LIMITED";
        throw err;
    }

    // ---- Auth rejection -------------------------------------------------
    if (status === 401 || status === 403) {
        consecutiveFailures += 1;
        enterCooldown(BACKOFF_MAX_MS, `credentials rejected (HTTP ${status})`);
        console.error("[INDSTOCKS TOKEN] Credentials rejected:", { status, data });
        const err = new Error("[INDSTOCKS TOKEN] Credentials rejected - check CLIENT_ID / MPIN / TOTP secret.");
        err.indstocksReason = "BAD_CREDENTIALS";
        throw err;
    }

    if (status < 200 || status >= 300) {
        consecutiveFailures += 1;
        const wait = Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);
        enterCooldown(wait, `HTTP ${status}`);
        console.error("[INDSTOCKS TOKEN] Unexpected status:", { status, data });
        const err = new Error(`[INDSTOCKS TOKEN] Login failed with HTTP ${status}.`);
        err.indstocksReason = "HTTP_ERROR";
        throw err;
    }

    // ---- Success --------------------------------------------------------
    const accessToken = data?.token ?? data?.data?.token ?? null;

    if (!accessToken) {
        consecutiveFailures += 1;
        enterCooldown(BACKOFF_MAX_MS, "unexpected response shape");
        console.error("[INDSTOCKS TOKEN] Unexpected response shape:", JSON.stringify(data));
        const err = new Error("[INDSTOCKS TOKEN] No access token in response - see logged shape above.");
        err.indstocksReason = "BAD_SHAPE";
        throw err;
    }

    const expiresAt = decodeJwtExpiry(accessToken) ?? (Date.now() + 23 * 60 * 60 * 1000);

    cachedToken = accessToken;
    cachedExpiry = expiresAt;
    consecutiveFailures = 0;
    cooldownUntil = 0;
    lastFailureReason = null;

    writeSessionFile(accessToken, expiresAt);

    console.log("[INDSTOCKS TOKEN] New token acquired. Expires at:", new Date(expiresAt).toISOString());

    return accessToken;
}

//======================================================
// GET ACCESS TOKEN (public entry point)
//======================================================

export async function getAccessToken() {

    const now = Date.now();

    if (cachedToken && cachedExpiry - now > REFRESH_BUFFER_MS) return cachedToken;

    const fromDisk = readSessionFile();
    if (fromDisk && fromDisk.expiresAt - now > REFRESH_BUFFER_MS) {
        cachedToken  = fromDisk.accessToken;
        cachedExpiry = fromDisk.expiresAt;
        console.log("[INDSTOCKS TOKEN] Reusing cached session from disk. Expires:",
            new Date(cachedExpiry).toISOString());
        return cachedToken;
    }

    if (now < cooldownUntil) throw cooldownError();

    // Single-flight: concurrent callers share one login request.
    if (inFlight) return inFlight;

    inFlight = requestNewToken().finally(() => { inFlight = null; });

    return inFlight;
}

//======================================================
// FORCE REFRESH  (clears cooldown - manual use only)
//======================================================

export async function refreshToken() {
    cachedToken = null;
    cachedExpiry = 0;
    cooldownUntil = 0;
    consecutiveFailures = 0;
    try { if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE); } catch { /* ignore */ }
    if (inFlight) return inFlight;
    inFlight = requestNewToken().finally(() => { inFlight = null; });
    return inFlight;
}

//======================================================
// STATUS
//======================================================

export function getTokenStatus() {
    return {
        hasToken: Boolean(cachedToken),
        expiresAt: cachedExpiry ? new Date(cachedExpiry).toISOString() : null,
        minutesRemaining: cachedExpiry
            ? Math.max(0, Math.round((cachedExpiry - Date.now()) / 60000))
            : 0,
        sessionFileExists: fs.existsSync(SESSION_FILE),
        consecutiveFailures,
        lastFailureReason,
        cooldownSecondsRemaining: Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
    };
}

export default { getAccessToken, refreshToken, getTokenStatus };