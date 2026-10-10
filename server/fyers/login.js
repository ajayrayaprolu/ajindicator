//======================================================
// server/fyers/login.js
//======================================================
// FYERS API v3 OAuth authentication.
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
//======================================================
// AJ V2 NOTES
// 1. Handles FYERS API v3 login URL generation and OAuth auth-code exchange.
// 2. Persists access/refresh tokens and session metadata in session.json.
// 3. Supports refresh-token renewal, login status, and local logout.
//======================================================

import crypto from "crypto";
import axios from "axios";

import {
    getAppId,
    getSecretId,
    getRedirectUri,
    loadSession,
    saveSession,
    clearSession,
    getTokenStatus
} from "./token.js";

const FYERS_AUTH_URL =
    "https://api-t1.fyers.in/api/v3/generate-authcode";

const FYERS_VALIDATE_AUTH_URL =
    "https://api-t1.fyers.in/api/v3/validate-authcode";

const FYERS_REFRESH_URL =
    "https://api-t1.fyers.in/api/v3/validate-refresh-token";

const REQUEST_TIMEOUT_MS = 15000;

//======================================================
// APP ID HASH
//======================================================

function createAppIdHash(appId, secretId) {
    return crypto
        .createHash("sha256")
        .update(`${appId}:${secretId}`)
        .digest("hex");
}

//======================================================
// CONFIGURATION VALIDATION
//======================================================

function getRequiredConfiguration() {
    const appId = getAppId();
    const secretId = getSecretId();
    const redirectUri = getRedirectUri();

    if (!appId) {
        throw new Error(
            "[FYERS LOGIN] FYERS_APP_ID is missing."
        );
    }

    if (!secretId) {
        throw new Error(
            "[FYERS LOGIN] FYERS_SECRET_ID or FYERS_SECRET_KEY is missing."
        );
    }

    if (!redirectUri) {
        throw new Error(
            "[FYERS LOGIN] FYERS_REDIRECT_URI is missing."
        );
    }

    return {
        appId,
        secretId,
        redirectUri
    };
}

//======================================================
// LOGIN URL
//======================================================

export function generateLoginUrl() {
    const {
        appId,
        redirectUri
    } = getRequiredConfiguration();

    return (
        `${FYERS_AUTH_URL}` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        "&response_type=code" +
        "&state=AJTRADE"
    );
}

//======================================================
// AUTH-CODE EXCHANGE
//======================================================

export async function exchangeAuthCode(authCode) {
    if (
        typeof authCode !== "string" ||
        !authCode.trim()
    ) {
        throw new Error(
            "[FYERS LOGIN] A valid authCode is required."
        );
    }

    const {
        appId,
        secretId
    } = getRequiredConfiguration();

    const appIdHash = createAppIdHash(
        appId,
        secretId
    );

    let response;

    try {
        response = await axios.post(
            FYERS_VALIDATE_AUTH_URL,
            {
                grant_type: "authorization_code",
                appIdHash,
                code: authCode.trim()
            },
            {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: REQUEST_TIMEOUT_MS
            }
        );
    } catch (error) {
        const status = error?.response?.status;
        const providerMessage =
            error?.response?.data?.message;

        console.error(
            "[FYERS LOGIN] Auth-code exchange failed.",
            {
                status,
                message:
                    providerMessage ||
                    error?.message ||
                    "Unknown provider error"
            }
        );

        throw new Error(
            `[FYERS LOGIN] Auth-code exchange failed${
                status ? ` (HTTP ${status})` : ""
            }: ${
                providerMessage ||
                error?.message ||
                "Unknown error"
            }`
        );
    }

    
	const data = response?.data;
	
	console.log("[FYERS LOGIN] Auth response diagnostics:", {
		responseType: typeof data,
		responseKeys:
			data && typeof data === "object"
				? Object.keys(data)
				: [],
		hasAccessToken: Boolean(data?.access_token),
		hasRefreshToken: Boolean(
			data?.refresh_token ?? data?.refreshToken
		),
		status: data?.s ?? data?.status ?? null,
		code: data?.code ?? null
	});

    const success =
        String(data?.s ?? data?.status ?? "")
            .toLowerCase() === "ok";

    if (!success || !data?.access_token) {
        throw new Error(
            "[FYERS LOGIN] Token generation failed: " +
            String(
                data?.message ??
                data?.code ??
                "The provider returned no access token."
            )
        );
    }

    const previousSession =
        loadSession() || {};

    const session = {
        ...previousSession,
        appId,
        accessToken: data.access_token,
        refreshToken:
            data.refresh_token ??
            data.refreshToken ??
            "",
        generatedAt: new Date().toISOString(),
        lastRefreshAt: null,
        lastAuthError: null
    };

    saveSession(session);

    console.log(
        "[FYERS LOGIN] Session saved.",
        {
            hasAccessToken: true,
            hasRefreshToken: Boolean(session.refreshToken)
        }
    );

    return session;
}

//======================================================
// REFRESH ACCESS TOKEN
//======================================================

export async function refreshAccessToken() {
    const {
        appId,
        secretId
    } = getRequiredConfiguration();

    const session = loadSession() || {};

    const refreshToken =
        session.refreshToken ||
        session.refresh_token ||
        "";

    if (!refreshToken) {
        throw new Error(
            "[FYERS SESSION] No refresh token is stored. " +
            "Complete an interactive FYERS login first."
        );
    }

    const pin =
        process.env.FYERS_PIN ||
        process.env.FYERS_USER_PIN;

    if (!pin) {
        throw new Error(
            "[FYERS SESSION] FYERS_PIN or FYERS_USER_PIN " +
            "must be configured to refresh the access token."
        );
    }

    const appIdHash = createAppIdHash(
        appId,
        secretId
    );

    let response;

    try {
        response = await axios.post(
            FYERS_REFRESH_URL,
            {
                grant_type: "refresh_token",
                appIdHash,
                refresh_token: refreshToken,
                pin: String(pin)
            },
            {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: REQUEST_TIMEOUT_MS
            }
        );
    } catch (error) {
        const status = error?.response?.status;
        const providerMessage =
            error?.response?.data?.message;

        saveSession({
            ...session,
            lastAuthError: new Date().toISOString()
        });

        console.error(
            "[FYERS SESSION] Token refresh failed.",
            {
                status,
                message:
                    providerMessage ||
                    error?.message ||
                    "Unknown provider error"
            }
        );

        throw new Error(
            `[FYERS SESSION] Token refresh failed${
                status ? ` (HTTP ${status})` : ""
            }: ${
                providerMessage ||
                error?.message ||
                "Unknown error"
            }`
        );
    }

    const data = response?.data;

    const success =
        String(data?.s ?? data?.status ?? "")
            .toLowerCase() === "ok";

    const newAccessToken =
        data?.access_token ??
        data?.accessToken ??
        data?.token;

    if (!success || !newAccessToken) {
        saveSession({
            ...session,
            lastAuthError: new Date().toISOString()
        });

        throw new Error(
            "[FYERS SESSION] Refresh response did not contain " +
            "a valid access token: " +
            String(
                data?.message ??
                data?.code ??
                "Unknown provider response"
            )
        );
    }

    const updatedSession = {
        ...session,
        appId,
        accessToken: newAccessToken,
        refreshToken,
        lastRefreshAt: new Date().toISOString(),
        lastAuthError: null
    };

    saveSession(updatedSession);

    console.log(
        "[FYERS SESSION] Access token refreshed and saved."
    );

    return newAccessToken;
}

//======================================================
// LOGOUT
//======================================================

export function logout() {
    clearSession();

    console.log(
        "[FYERS LOGIN] Local session cleared."
    );

    return {
        success: true,
        message: "FYERS local session cleared."
    };
}

//======================================================
// LOGIN STATUS
//======================================================

export function getLoginStatus() {
    return getTokenStatus();
}

//======================================================
// DEFAULT EXPORT
//======================================================

export default {
    generateLoginUrl,
    exchangeAuthCode,
    refreshAccessToken,
    logout,
    getLoginStatus
};