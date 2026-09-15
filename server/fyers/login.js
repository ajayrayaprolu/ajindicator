//======================================================
// server/fyers/login.js
//======================================================
//
// FYERS API v3 OAuth authentication.
//
// Flow:
//
//   generateLoginUrl()
//          ↓
//   FYERS login
//          ↓
//   redirect_uri?auth_code=...
//          ↓
//   exchangeAuthCode()
//          ↓
//   session.json
//
//======================================================

import crypto from "crypto";
import axios from "axios";

import {
    getAppId,
    getSecretId,
    getRedirectUri,
    saveSession,
    clearSession,
    getTokenStatus
} from "./token.js";

//======================================================
// LOGIN URL
//======================================================

export function generateLoginUrl() {

    const appId =
        getAppId();

    const secretId =
        getSecretId();

    const redirectUri =
        getRedirectUri();

    if (!appId) {

        throw new Error(
            "[FYERS LOGIN] FYERS_APP_ID missing."
        );

    }

    if (!secretId) {

        throw new Error(
            "[FYERS LOGIN] FYERS_SECRET_ID missing."
        );

    }

    if (!redirectUri) {

        throw new Error(
            "[FYERS LOGIN] FYERS_REDIRECT_URI missing."
        );

    }

    const url =
        "https://api-t1.fyers.in/api/v3/generate-authcode" +
        `?client_id=${encodeURIComponent(appId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&state=AJTRADE`;

    return url;

}

//======================================================
// APP ID HASH
//======================================================
//
// FYERS API v3:
//
// SHA256(
//     appId + ":" + secretId
// )
//
// IMPORTANT:
// Do NOT send:
//     appId:secretId
//
// Send the SHA256 hexadecimal hash.
//

function createAppIdHash(
    appId,
    secretId
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            `${appId}:${secretId}`
        )
        .digest(
            "hex"
        );

}

//======================================================
// EXCHANGE AUTH CODE
//======================================================

export async function exchangeAuthCode(
    authCode
) {

    if (!authCode) {

        throw new Error(
            "[FYERS LOGIN] authCode is required."
        );

    }

    const appId =
        getAppId();

    const secretId =
        getSecretId();

    const redirectUri =
        getRedirectUri();

    if (!appId) {

        throw new Error(
            "[FYERS LOGIN] FYERS_APP_ID missing."
        );

    }

    if (!secretId) {

        throw new Error(
            "[FYERS LOGIN] FYERS_SECRET_ID missing."
        );

    }

    if (!redirectUri) {

        throw new Error(
            "[FYERS LOGIN] FYERS_REDIRECT_URI missing."
        );

    }

    const appIdHash =
        createAppIdHash(
            appId,
            secretId
        );

    console.log(
        "[FYERS LOGIN] Exchanging auth code...",
        {
            appId,
            hasSecretId:
                Boolean(secretId),
            redirectUri,
            hasAuthCode:
                Boolean(authCode),
            hashLength:
                appIdHash.length
        }
    );

    let response;

    try {

        response =
            await axios.post(
                "https://api-t1.fyers.in/api/v3/validate-authcode",
                {
                    grant_type:
                        "authorization_code",

                    appIdHash:
                        appIdHash,

                    code:
                        authCode
                },
                {
                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    timeout:
                        15000
                }
            );

    }
    catch (error) {

        console.error(
            "[FYERS LOGIN] validate-authcode FAILED",
            {
                status:
                    error?.response?.status,

                response:
                    error?.response?.data,

                message:
                    error?.message
            }
        );

        throw new Error(
            error?.response?.data?.message ??
            JSON.stringify(
                error?.response?.data ??
                error?.message
            )
        );

    }

    const data =
        response?.data;

    console.log(
        "[FYERS LOGIN] validate-authcode RESPONSE",
        {
            status:
                response?.status,

            data:
                data
        }
    );

    if (
        !data ||
        String(
            data.s ??
            data.status ??
            ""
        )
            .toLowerCase() !==
            "ok" ||
        !data.access_token
    ) {

        throw new Error(
            `[FYERS LOGIN] Token generation failed: ${
                data?.message ??
                data?.code ??
                JSON.stringify(data)
            }`
        );

    }

    const session = {

        appId:
            appId,

        accessToken:
            data.access_token,

        generatedAt:
            new Date().toISOString()

    };

    saveSession(
        session
    );

    console.log(
        "[FYERS LOGIN] Session saved."
    );

    return session;

}

//======================================================
// LOGOUT
//======================================================

export function logout() {

    clearSession();

    console.log(
        "[FYERS LOGIN] Local session cleared."
    );

}

//======================================================
// STATUS
//======================================================

export function getLoginStatus() {

    return getTokenStatus();

}

//======================================================
// DEFAULT
//======================================================

export default {

    generateLoginUrl,

    exchangeAuthCode,

    logout,

    getLoginStatus

};