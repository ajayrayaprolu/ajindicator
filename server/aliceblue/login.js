//======================================================
// server/aliceblue/login.js
//
// Alice Blue authentication.
//
// Flow:
//
// ChartWindow
//     ↓
// /api/aliceblue/login
//     ↓
// Alice Blue login
//     ↓
// /api/aliceblue/callback?authCode=...&userId=...
//     ↓
// SHA256(userId + authCode + apiSecret)
//     ↓
// getUserDetails
//     ↓
// userSession
//     ↓
// session.json
//======================================================

import crypto from "crypto";
import axios from "axios";

import {

    getAppCode,
    getApiSecret,
    getRedirectUri,

    saveSession,
    clearSession,
    getTokenStatus

} from "./token.js";

//======================================================
// BASE URL
//======================================================

const ALICEBLUE_BASE =
    "https://a3.aliceblueonline.com";

//======================================================
// LOGIN URL
//======================================================

export function generateLoginUrl() {

    const appCode =
        getAppCode();

    if (!appCode) {

        throw new Error(
            "[ALICEBLUE LOGIN] ALICEBLUE_APPCODE missing."
        );

    }

    const redirectUri =
        getRedirectUri();

    if (!redirectUri) {

        throw new Error(
            "[ALICEBLUE LOGIN] ALICEBLUE_REDIRECT_URI missing."
        );

    }

	return (
		"https://ant.aliceblueonline.com/" +
		"?appcode=" +
		encodeURIComponent(appCode) +
		"&redirect_uri=" +
		encodeURIComponent(redirectUri)
	);
}

//======================================================
// CHECKSUM
//======================================================
//
// SHA256:
//
// userId + authCode + apiSecret
//
//======================================================

function createChecksum(
    userId,
    authCode,
    apiSecret
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            `${userId}${authCode}${apiSecret}`
        )
        .digest(
            "hex"
        );

}

//======================================================
// EXCHANGE AUTH CODE
//======================================================

export async function exchangeAuthCode(
    userId,
    authCode
) {

    if (
        !userId
    ) {

        throw new Error(
            "[ALICEBLUE LOGIN] userId is required."
        );

    }

    if (
        !authCode
    ) {

        throw new Error(
            "[ALICEBLUE LOGIN] authCode is required."
        );

    }

    const apiSecret =
        getApiSecret();

    if (
        !apiSecret
    ) {

        throw new Error(
            "[ALICEBLUE LOGIN] ALICEBLUE_API_SECRET missing."
        );

    }

    const checksum =
        createChecksum(
            userId,
            authCode,
            apiSecret
        );

    const response =
        await axios.post(

            `${ALICEBLUE_BASE}/open-api/od/v1/vendor/getUserDetails`,

            {

                checkSum:
                    checksum

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

    const data =
        response.data;

    if (
        !data ||
        (
            data.stat !== "Ok" &&
            data.status !== "Ok"
        ) ||
        !data.userSession
    ) {

        throw new Error(

            `[ALICEBLUE LOGIN] Session generation failed: ${
                data?.emsg ??
                data?.message ??
                JSON.stringify(data)
            }`

        );

    }

    const session = {

        appCode:
            getAppCode(),

        userId,

        authCode,

        clientId:
            data.clientId ??
            userId,

        userSession:
            data.userSession,

        generatedAt:
            new Date().toISOString()

    };

    saveSession(
        session
    );

    console.log(
        "[ALICEBLUE LOGIN] User session saved."
    );

    return session;

}

//======================================================
// LOGIN FROM CALLBACK
//======================================================

export async function loginFromRedirectUrl(
    redirectUrl
) {

    if (!redirectUrl) {

        throw new Error(
            "[ALICEBLUE LOGIN] Redirect URL is required."
        );

    }

    const parsed =
        new URL(
            redirectUrl
        );

    const authCode =
        parsed.searchParams.get(
            "authCode"
        );

    const userId =
        parsed.searchParams.get(
            "userId"
        );

    if (!authCode) {

        throw new Error(
            "[ALICEBLUE LOGIN] authCode missing."
        );

    }

    if (!userId) {

        throw new Error(
            "[ALICEBLUE LOGIN] userId missing."
        );

    }

    console.log(
        "[ALICEBLUE LOGIN] Exchanging authCode...",
        {
            userId,
            hasAuthCode:
                Boolean(authCode)
        }
    );

    return await exchangeAuthCode(
        userId,
        authCode
    );
}

//======================================================
// LOGOUT
//======================================================

export function logout() {

    clearSession();

    console.log(
        "[ALICEBLUE LOGIN] Local session cleared."
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
    loginFromRedirectUrl,
    logout,
    getLoginStatus

};