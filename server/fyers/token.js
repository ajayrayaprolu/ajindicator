//======================================================
// server/fyers/token.js
//======================================================
// FYERS API v3
// Token/session persistence.
// Authentication contract:
//   FYERS_APP_ID
//   FYERS_SECRET_ID
//   FYERS_REDIRECT_URI
// Runtime token:
//   session.json
// FYERS authorization format:
//   APP_ID:ACCESS_TOKEN
//======================================================

import fs from "fs";
import path from "path";

const SESSION_FILE = path.join(
    process.cwd(),
    "server",
    "fyers",
    "session.json"
);

function ensureDirectory() {
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
}

export function loadSession() {
    try {
        if (!fs.existsSync(SESSION_FILE)) return null;
        return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    } catch (error) {
        console.error("[FYERS TOKEN] Session read failed:", error.message);
        return null;
    }
}

export function saveSession(session) {
    if (!session || typeof session !== "object" || Array.isArray(session)) {
        throw new Error("[FYERS TOKEN] Invalid session.");
    }

    ensureDirectory();

    const tempFile = `${SESSION_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(session, null, 4), "utf8");
    fs.renameSync(tempFile, SESSION_FILE);

    return session;
}

export function clearSession() {
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
    }
}

export function getAppId() {
    return (
        process.env.FYERS_APP_ID ||
        process.env.FYERS_CLIENT_ID ||
        loadSession()?.appId ||
        ""
    );
}

export function getSecretId() {
    return process.env.FYERS_SECRET_ID || process.env.FYERS_SECRET_KEY || "";
}

export function getRedirectUri() {
    return process.env.FYERS_REDIRECT_URI || "";
}

export function getAccessToken() {
    return loadSession()?.accessToken || process.env.FYERS_ACCESS_TOKEN || "";
}

export function getRefreshToken() {
    return loadSession()?.refreshToken || "";
}

export function saveAccessToken(accessToken, extra = {}) {
    if (!accessToken) {
        throw new Error("[FYERS TOKEN] Cannot save an empty access token.");
    }

    const previous = loadSession() || {};

    return saveSession({
        ...previous,
        ...extra,
        appId: getAppId() || previous.appId || "",
        accessToken,
        generatedAt: new Date().toISOString()
    });
}

export function getFullAccessToken() {
    const appId = getAppId();
    const accessToken = getAccessToken();

    if (!appId || !accessToken) {
        throw new Error("[FYERS TOKEN] App ID or access token missing.");
    }

    return `${appId}:${accessToken}`;
}

export function isLoggedIn() {
    return Boolean(getAppId() && getAccessToken());
}

export function getTokenStatus() {
    const session = loadSession();
    const accessToken = getAccessToken();

    return {
        provider: "fyers",
        configured: Boolean(getAppId() && getSecretId() && getRedirectUri()),
        loggedIn: Boolean(getAppId() && accessToken),
        appId: getAppId(),
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(session?.refreshToken),
        generatedAt: session?.generatedAt || null,
        lastRefreshAt: session?.lastRefreshAt || null,
        lastAuthError: session?.lastAuthError || null
    };
}

export default {
    loadSession,
    saveSession,
    clearSession,
    getAppId,
    getSecretId,
    getRedirectUri,
    getAccessToken,
    getRefreshToken,
    saveAccessToken,
    getFullAccessToken,
    isLoggedIn,
    getTokenStatus
};