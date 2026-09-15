//======================================================
// server/fyers/token.js
//======================================================
//
// FYERS API v3
//
// Token/session persistence.
//
// Authentication contract:
//
//   FYERS_APP_ID
//   FYERS_SECRET_ID
//   FYERS_REDIRECT_URI
//
// Runtime token:
//
//   session.json
//
// FYERS authorization format:
//
//   APP_ID:ACCESS_TOKEN
//
//======================================================

import fs from "fs";
import path from "path";

//======================================================
// SESSION FILE
//======================================================

const SESSION_FILE =
    path.join(
        process.cwd(),
        "server",
        "fyers",
        "session.json"
    );

//======================================================
// INTERNAL
//======================================================

function ensureDirectory() {

    const directory =
        path.dirname(
            SESSION_FILE
        );

    if (
        !fs.existsSync(
            directory
        )
    ) {

        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

    }

}

//======================================================
// LOAD SESSION
//======================================================

export function loadSession() {

    if (
        !fs.existsSync(
            SESSION_FILE
        )
    ) {

        return null;

    }

    try {

        const raw =
            fs.readFileSync(
                SESSION_FILE,
                "utf8"
            );

        return JSON.parse(
            raw
        );

    }

    catch (error) {

        console.error(
            "[FYERS TOKEN] Unable to read session:",
            error.message
        );

        return null;

    }

}

//======================================================
// SAVE SESSION
//======================================================

export function saveSession(
    session
) {

    if (
        !session ||
        typeof session !== "object"
    ) {

        throw new Error(
            "[FYERS TOKEN] Invalid session."
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

//======================================================
// CLEAR SESSION
//======================================================

export function clearSession() {

    if (
        fs.existsSync(
            SESSION_FILE
        )
    ) {

        fs.unlinkSync(
            SESSION_FILE
        );

    }

}

//======================================================
// APP ID
//======================================================

export function getAppId() {

    return (
        process.env.FYERS_APP_ID ??
        process.env.FYERS_CLIENT_ID ??
        loadSession()?.appId ??
        ""
    );

}

//======================================================
// SECRET
//======================================================

export function getSecretId() {

    return (
        process.env.FYERS_SECRET_ID ??
        process.env.FYERS_SECRET_KEY ??
        ""
    );

}

//======================================================
// REDIRECT URI
//======================================================

export function getRedirectUri() {

    return (
        process.env.FYERS_REDIRECT_URI ??
        ""
    );

}

//======================================================
// ACCESS TOKEN
//======================================================

export function getAccessToken() {

    const session =
        loadSession();

    return (
        session?.accessToken ??
        process.env.FYERS_ACCESS_TOKEN ??
        ""
    );

}

//======================================================
// FULL ACCESS TOKEN
//======================================================
//
// FYERS REST/WebSocket authorization:
//
//   APP_ID:ACCESS_TOKEN
//
//======================================================

export function getFullAccessToken() {

    const appId =
        getAppId();

    const accessToken =
        getAccessToken();

    if (
        !appId ||
        !accessToken
    ) {

        throw new Error(
            "[FYERS TOKEN] App ID or access token missing."
        );

    }

    return `${appId}:${accessToken}`;

}

//======================================================
// LOGIN STATE
//======================================================

export function isLoggedIn() {

    return Boolean(
        getAppId() &&
        getAccessToken()
    );

}

//======================================================
// TOKEN STATUS
//======================================================

export function getTokenStatus() {

    const session =
        loadSession();

    return {

        configured:
            Boolean(
                getAppId() &&
                getSecretId() &&
                getRedirectUri()
            ),

        loggedIn:
            isLoggedIn(),

        appId:
            getAppId(),

        hasAccessToken:
            Boolean(
                getAccessToken()
            ),

        generatedAt:
            session?.generatedAt ??
            null

    };

}

//======================================================
// EXPORT
//======================================================

export default {

    loadSession,

    saveSession,

    clearSession,

    getAppId,

    getSecretId,

    getRedirectUri,

    getAccessToken,

    getFullAccessToken,

    isLoggedIn,

    getTokenStatus

};