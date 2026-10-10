//======================================================
// server/zerodha/login.js
//======================================================
// Zerodha OAuth Login Responsibilities:
//   1. Generate Login URL
//   2. Receive request_token
//   3. Exchange request_token
//      for access_token
//   4. Persist session
//   5. Synchronize Zerodha instrument master
//      after successful authentication
//======================================================

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

import axios from "axios";

import {
    refreshInstrumentCache
}
from "./instruments/instruments.js";

import {
    synchronizeInstrumentMaster
}
from "./instruments/InstrumentSynchronizer.js";


//======================================================
// SESSION FILE
//======================================================

const SESSION_FILE =
    path.join(
        process.cwd(),
        "server",
        "zerodha",
        "session.json"
    );

function writeSessionAtomically(session) {
    const tempFile = `${SESSION_FILE}.tmp`;

    try {
        fs.mkdirSync(path.dirname(SESSION_FILE), {
            recursive: true
        });

        fs.writeFileSync(
            tempFile,
            JSON.stringify(session, null, 4),
            "utf8"
        );

        fs.renameSync(tempFile, SESSION_FILE);
    } catch (error) {
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch {
            // Ignore temporary-file cleanup errors.
        }

        throw error;
    }
}

//======================================================
// CONFIG
//======================================================

function getApiKey() {
    return (
        process.env.ZERODHA_API_KEY ?? ""
    );
}
function getApiSecret() {
    return (
        process.env.ZERODHA_API_SECRET ?? ""
    );
}
function getCallbackUrl() {
    return (
        process.env.ZERODHA_CALLBACK_URL ??
        "https://localhost:3001/api/zerodha/callback"
    );
}

//======================================================
// LOGIN URL
//======================================================

export function getLoginUrl() {
    const apiKey =
        getApiKey();
    if (!apiKey) {
        throw new Error(
            "ZERODHA_API_KEY missing."
        );
    }
    return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
}

//======================================================
// REGISTER ROUTES
//======================================================

export function registerLoginRoutes(app) {

    //==================================================
    // CALLBACK
    //==================================================

    app.get(
        "/api/zerodha/callback",
        async (req, res) => {
            try {
                console.log(
                    "[ZERODHA CALLBACK] Callback received."
                );
                const requestToken =
                    req.query.request_token;

                //--------------------------------------------------
                // REQUEST TOKEN
                //--------------------------------------------------
                if (!requestToken) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            error:
                                "Missing request_token."
                        });
                }

                //--------------------------------------------------
                // GENERATE SESSION
                //--------------------------------------------------
                const response =
                    await axios.post(
                        "https://api.kite.trade/session/token",
                        new URLSearchParams({
                            api_key:
                                getApiKey(),
                            request_token:
                                requestToken,
                            checksum:
                                createChecksum(
                                    getApiKey(),
                                    requestToken,
                                    getApiSecret()
                                )
                        }),

                        {
                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded"
                            }
                        }
                    );

                console.log(
                    "[ZERODHA CALLBACK] Token exchange response received.",
                    {
                        httpStatus: response.status,
                        providerStatus:
                            response.data?.status ?? null,
                        hasSessionData:
                            Boolean(response.data?.data),
                        hasAccessToken:
                            Boolean(response.data?.data?.access_token),
                        hasPublicToken:
                            Boolean(response.data?.data?.public_token),
                        hasRefreshToken:
                            Boolean(response.data?.data?.refresh_token),
                        hasUserId:
                            Boolean(response.data?.data?.user_id)
                    }
                );

                //--------------------------------------------------
                // RESPONSE DATA
                //--------------------------------------------------
                const data =
                    response.data.data;

                //--------------------------------------------------
                // SAVE SESSION
                //--------------------------------------------------

                const session = {
                    apiKey:
                        getApiKey(),
                    accessToken:
                        data.access_token,
                    publicToken:
                        data.public_token,
                    refreshToken:
                        data.refresh_token,
                    userId:
                        data.user_id,
                    loginTime:
                        new Date()
                            .toISOString()
                };

				writeSessionAtomically(session);

                console.log(
                    "[ZERODHA CALLBACK] Session saved.",
                    {
                        hasAccessToken:
                            Boolean(session.accessToken),
                        hasPublicToken:
                            Boolean(session.publicToken),
                        hasRefreshToken:
                            Boolean(session.refreshToken),
                        hasUserId:
                            Boolean(session.userId)
                    }
                );

                //==================================================
                // LOGIN SUCCESS
                //==================================================
                console.log();
                console.log(
                    "======================================"
                );
                console.log(
                    "ZERODHA LOGIN SUCCESS"
                );
                //==================================================
                // INSTRUMENT MASTER SYNCHRONIZATION
                //
                // The access token is now available, so this is
                // the correct point to download the Zerodha
                // instrument master and populate SQLite.
                //
                // IMPORTANT:
                // A synchronization failure must NOT invalidate
                // an otherwise successful Zerodha login.
                //==================================================

                try {

                    console.log();
                    console.log(
                        "[ZERODHA] Synchronizing master contract..."
                    );
                    await refreshInstrumentCache();
                    const count =
                        synchronizeInstrumentMaster();
                    console.log(
                        "[ZERODHA] master contract synchronized:",
                        count
                    );
                    console.log();
                }

                catch (syncError) {
                    console.error(
                        "[ZERODHA] master contract synchronization failed:",
                        syncError?.message ||
                        syncError
                    );
                    console.warn(
                        "[ZERODHA] Login succeeded, but master contract database was not populated."
                    );
                }

                //==================================================
                // LOGIN RESPONSE
                //==================================================

                res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Zerodha Login</title>
                </head>
                <body>
                <h2>Zerodha Login Successful</h2>
                <p>You can close this window.</p>

				<script>
				(function () {
					try {
						if (window.opener && !window.opener.closed) {
							window.opener.postMessage(
								{ type: "ZERODHA_LOGIN_SUCCESS" },
								"https://ajtrade.in"
							);
						}
					} catch (error) {
						console.error(
							"[ZERODHA LOGIN] Failed to notify opener:",
							error
						);
					}
				
					// Attempt to close even when window.opener is unavailable.
					setTimeout(function () {
						window.close();
					}, 300);
				})();
				</script>

                </body>
                </html>
                `);
            }

            catch (err) {

                //--------------------------------------------------
                // EXTRACT ERROR MESSAGE
                //--------------------------------------------------

				const errorMessage =
					err.response?.data?.message
						? "Zerodha rejected the authentication request."
						: "Zerodha authentication failed.";

                //--------------------------------------------------
                // SAVE AUTH STATUS
                //--------------------------------------------------

				writeSessionAtomically({
					loggedIn: false,
					authError: errorMessage,
					loginTime: new Date().toISOString()
				});

                //--------------------------------------------------
                // LOG
                //--------------------------------------------------

				console.error("[ZERODHA CALLBACK] Authentication failed.", {
					message: errorMessage,
					httpStatus: err.response?.status ?? null,
					providerStatus:
						typeof err.response?.data?.status === "string"
							? err.response.data.status
							: null,
					responseKeys:
						err.response?.data &&
						typeof err.response.data === "object"
							? Object.keys(err.response.data)
							: []
				});

                //--------------------------------------------------
                // RESPONSE
                //--------------------------------------------------

                res.status(500).json({
                    success: false,
                    error:
                        errorMessage
                });
            }
        }
    );
}

//======================================================
// SHA256 CHECKSUM
//======================================================

import crypto from "crypto";
function createChecksum(
    apiKey,
    requestToken,
    apiSecret
) {
    return crypto
        .createHash("sha256")
        .update(
            apiKey +
            requestToken +
            apiSecret
        )
        .digest("hex");
}