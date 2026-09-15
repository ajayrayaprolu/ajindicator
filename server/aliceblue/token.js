//======================================================
// server/aliceblue/token.js
//
// Alice Blue API authentication/session persistence.
//
// Credentials:
//
//   ALICEBLUE_APPCODE
//   ALICEBLUE_API_SECRET
//   ALICEBLUE_REDIRECT_URI
//
// Runtime session:
//
// Alice Blue authentication:
//
//   authCode
//       +
//   userId
//       +
//   apiSecret
//       ↓
//   SHA256
//       ↓
//   getUserDetails
//       ↓
//   userSession
//
//   server/aliceblue/session.json
//
// Session contains:
//
//   appCode
//   apiSecret     -> NOT persisted
//   userId
//   authCode
//   clientId
//   userSession
//   generatedAt
//======================================================
//======================================================
// server/aliceblue/token.js
//======================================================

import fs from "fs";
import path from "path";

const SESSION_FILE = path.join(
    process.cwd(),
    "server",
    "aliceblue",
    "session.json"
);

//======================================================
// SESSION
//======================================================

function ensureDirectory() {
    fs.mkdirSync(
        path.dirname(SESSION_FILE),
        { recursive: true }
    );
}

export function loadSession() {
    if (!fs.existsSync(SESSION_FILE)) {
        return null;
    }

    try {
        return JSON.parse(
            fs.readFileSync(
                SESSION_FILE,
                "utf8"
            )
        );
    } catch (error) {
        console.error(
            "[ALICEBLUE TOKEN] Session read failed:",
            error?.message
        );

        return null;
    }
}

export function saveSession(session) {
    if (
        !session ||
        typeof session !== "object"
    ) {
        throw new Error(
            "[ALICEBLUE TOKEN] Invalid session."
        );
    }

    ensureDirectory();

    fs.writeFileSync(
        SESSION_FILE,
        JSON.stringify(
            session,
            null,
            4
        ),
        "utf8"
    );

    return session;
}

export function clearSession() {
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
    }
}

//======================================================
// CONFIG
//======================================================

export function getAppCode() {
    return (
        process.env.ALICEBLUE_APPCODE ??
        process.env.ALICEBLUE_APP_CODE ??
        process.env.ALICEBLUE_APPID ??
        ""
    );
}

export function getApiSecret() {
    return (
        process.env.ALICEBLUE_API_SECRET ??
        process.env.ALICEBLUE_SECRET ??
        ""
    );
}

export function getRedirectUri() {
    return (
        process.env.ALICEBLUE_REDIRECT_URI ??
        ""
    );
}

//======================================================
// SESSION VALUES
//======================================================

export function getUserId() {
    return (
        loadSession()?.userId ??
        process.env.ALICEBLUE_USER_ID ??
        ""
    );
}

export function getAuthCode() {
    return (
        loadSession()?.authCode ??
        ""
    );
}

export function getSessionId() {
    return (
        loadSession()?.userSession ??
        ""
    );
}

export function getClientId() {
    return (
        loadSession()?.clientId ??
        getUserId()
    );
}

//======================================================
// LOGIN STATE
//======================================================

export function isLoggedIn() {
    return Boolean(
        getUserId() &&
        getSessionId()
    );
}

//======================================================
// STATUS
//======================================================

export function getTokenStatus() {
    const session = loadSession();

    return {
        configured: Boolean(
            getAppCode() &&
            getApiSecret() &&
            getRedirectUri()
        ),

        loggedIn: isLoggedIn(),

        appCode: getAppCode(),

        userId: getUserId(),

        clientId: getClientId(),

        hasSession: Boolean(
            getSessionId()
        ),

        generatedAt:
            session?.generatedAt ??
            null
    };
}

export default {
    loadSession,
    saveSession,
    clearSession,

    getAppCode,
    getApiSecret,
    getRedirectUri,

    getUserId,
    getAuthCode,
    getSessionId,
    getClientId,

    isLoggedIn,
    getTokenStatus
};