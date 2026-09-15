//======================================================
// server/zerodha/login.js
//======================================================
//
// Zerodha OAuth Login
//
// Responsibilities
//
// 1. Generate Login URL
// 2. Receive request_token
// 3. Exchange request_token
//    for access_token
// 4. Persist session
// 5. Synchronize Zerodha instrument master
//    after successful authentication
//
//======================================================

import dotenv from "dotenv";
dotenv.config();

console.log(
    "[LOGIN] dotenv loaded"
);

import fs from "fs";
import path from "path";

import axios from "axios";

import {
    refreshInstrumentCache
}
from "./instruments.js";

import {
    synchronizeInstrumentMaster
}
from "../instruments/InstrumentSynchronizer.js";


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
    // LOGIN
    //==================================================

    app.get(
        "/api/zerodha/login",
        (_, res) => {

            try {

                console.log(
                    "[ZERODHA] Redirecting to Kite login..."
                );

                res.redirect(
                    getLoginUrl()
                );

            }

            catch (err) {

                res.status(500).json({

                    success: false,

                    error:
                        err.message

                });

            }

        }
    );


    //==================================================
    // CALLBACK
    //==================================================

    app.get(
        "/api/zerodha/callback",

        async (req, res) => {

            try {

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


                fs.writeFileSync(

                    SESSION_FILE,

                    JSON.stringify(

                        session,

                        null,

                        4

                    )

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

                console.log(
                    "======================================"
                );

                console.log(
                    "User:",
                    session.userId
                );

                console.log(
                    "======================================"
                );

                console.log();


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
                        "[ZERODHA] Synchronizing instrument master..."
                    );

                    await refreshInstrumentCache();

                    const count =
                        synchronizeInstrumentMaster();

                    console.log(
                        "[ZERODHA] Instrument master synchronized:",
                        count
                    );

                    console.log();

                }

                catch (syncError) {

                    console.error(
                        "[ZERODHA] Instrument synchronization failed:",
                        syncError?.message ||
                        syncError
                    );

                    console.warn(
                        "[ZERODHA] Login succeeded, but instrument database was not populated."
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

                if (window.opener) {

                    window.opener.postMessage(
                        {
                            type: "ZERODHA_LOGIN_SUCCESS"
                        },
                        "*"
                    );

                    window.close();

                }

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

                    ??

                    err.message;


                //--------------------------------------------------
                // SAVE AUTH STATUS
                //--------------------------------------------------

                fs.writeFileSync(

                    SESSION_FILE,

                    JSON.stringify(

                        {

                            loggedIn: false,

                            authError:
                                errorMessage,

                            loginTime:
                                new Date()
                                    .toISOString()

                        },

                        null,

                        4

                    )

                );


                //--------------------------------------------------
                // LOG
                //--------------------------------------------------

                console.error(

                    "[ZERODHA LOGIN]",

                    errorMessage

                );


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