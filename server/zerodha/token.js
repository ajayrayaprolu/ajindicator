//======================================================
// server/zerodha/token.js
//======================================================
//
// Zerodha Session Token Manager
//
// Responsibilities
//
// • Read saved session
// • Validate session
// • Return access token
// • Save updated session
// • Clear session
// • Utility methods for future refresh support
//
// NOTE
// -----
// Zerodha access tokens are generated once per trading
// day. There is currently NO refresh-token API.
// When expired, user must login again.
//
//======================================================

import fs from "fs";
import path from "path";

//------------------------------------------------------
// SESSION FILE
//------------------------------------------------------

const SESSION_FILE =
    path.join(
        process.cwd(),
        "server",
        "zerodha",
        "session.json"
    );

//------------------------------------------------------
// FILE EXISTS
//------------------------------------------------------

export function sessionExists() {

    return fs.existsSync(
        SESSION_FILE
    );

}

//------------------------------------------------------
// LOAD SESSION
//------------------------------------------------------

export function loadSession() {

    if (
        !sessionExists()
    ) {

        return null;

    }

    try {

        const json =
            fs.readFileSync(
                SESSION_FILE,
                "utf8"
            );

        return JSON.parse(
            json
        );

    }

    catch (err) {

        console.error(

            "[ZERODHA]",

            "Unable to read session.",

            err.message

        );

        return null;

    }

}

//------------------------------------------------------
// SAVE SESSION
//------------------------------------------------------

export function saveSession(
    session
) {

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

//------------------------------------------------------
// DELETE SESSION
//------------------------------------------------------

export function clearSession() {

    if (
        sessionExists()
    ) {

        fs.unlinkSync(
            SESSION_FILE
        );

    }

}

//------------------------------------------------------
// ACCESS TOKEN
//------------------------------------------------------

export function getAccessToken() {

    const session =
        loadSession();

    if (
        !session
    ) {

        throw new Error(

            "No Zerodha session available."

        );

    }

    if (
        !session.accessToken
    ) {

        throw new Error(

            "Access token missing."

        );

    }

    return session.accessToken;

}

//------------------------------------------------------
// PUBLIC TOKEN
//------------------------------------------------------

export function getPublicToken() {

    const session =
        loadSession();

    return
        session?.publicToken ??
        "";

}

//------------------------------------------------------
// USER ID
//------------------------------------------------------

export function getUserId() {

    const session =
        loadSession();

    return
        session?.userId ??
        "";

}

//------------------------------------------------------
// API KEY
//------------------------------------------------------

export function getApiKey() {

    const session =
        loadSession();

    return
        session?.apiKey ??

        process.env
            .ZERODHA_API_KEY ??

        "";

}

//------------------------------------------------------
// AUTH HEADER
//------------------------------------------------------

export function getAuthorizationHeader() {

    return {

	Authorization:
	
	`token ${getApiKey()}:${getAccessToken()}`

    };

}

//------------------------------------------------------
// LOGIN STATUS
//------------------------------------------------------

export function isLoggedIn() {

    try {

        const token =
            getAccessToken();

        return
            token.length > 0;

    }

    catch {

        return false;

    }

}

//------------------------------------------------------
// SESSION INFO
//------------------------------------------------------

export function getSessionInfo() {

    const session =
        loadSession();

	//--------------------------------------------------
	// NO SESSION
	//--------------------------------------------------
	
	if (!session) {
	
		return {
	
			loggedIn: false,
	
			status: "login_required",
	
			message:
				"Please log in to Zerodha.",
	
			apiKey: "",
	
			userId: "",
	
			loginTime: "",
	
			accessToken: ""
	
		};
	
	}

    //--------------------------------------------------
    // INVALID SESSION
    //--------------------------------------------------

    const validation =
        validateSession();
	
	//--------------------------------------------------
	// OAUTH FAILED
	//--------------------------------------------------
	
	if (session.authError) {
	
		return {
	
			loggedIn: false,
	
			status: "oauth_failed",
	
			message:
				session.authError,
	
			apiKey:
				session.apiKey ?? "",
	
			userId:
				session.userId ?? "",
	
			loginTime:
				session.loginTime ?? "",
	
			accessToken: ""
	
		};
	
	}

    if (!validation.valid) {

        return {

            loggedIn: false,

            status: "invalid_session",

            message:
                validation.reason,

            apiKey:
                session.apiKey ?? "",

            userId:
                session.userId ?? "",

            loginTime:
                session.loginTime ?? "",

            accessToken: ""

        };

    }

    //--------------------------------------------------
    // VALID SESSION
    //--------------------------------------------------

    return {

        loggedIn: true,

        status: "connected",

        message:
            "Connected to Zerodha.",

        apiKey:
            session.apiKey,

        userId:
            session.userId,

        loginTime:
            session.loginTime,

        accessToken:
            session.accessToken

    };

}

//------------------------------------------------------
// VALIDATE SESSION
//------------------------------------------------------

export function validateSession() {

    const session =
        loadSession();

    if (
        !session
    ) {

        return {

            valid: false,

            reason:
                "Session file missing."

        };

    }

    if (
        !session.apiKey
    ) {

        return {

            valid: false,

            reason:
                "API Key missing."

        };

    }

    if (
        !session.accessToken
    ) {

        return {

            valid: false,

            reason:
                "Access Token missing."

        };

    }

    if (
        !session.userId
    ) {

        return {

            valid: false,

            reason:
                "User ID missing."

        };

    }

    return {

        valid: true,

        reason:
            "OK"

    };

}

//------------------------------------------------------
// DEBUG
//------------------------------------------------------

export function printSession() {

    console.log();

    console.log(
        "======================================"
    );

    console.log(
        "ZERODHA SESSION"
    );

    console.log(
        "======================================"
    );

    const info =
        getSessionInfo();

    console.table(
        info
    );

    console.log(
        "======================================"
    );

    console.log();

}

//------------------------------------------------------
// EXPRESS ROUTES
//------------------------------------------------------

export function registerTokenRoutes(
    app
) {

    //--------------------------------------------------
    // SESSION STATUS
    //--------------------------------------------------

    app.get(

        "/api/zerodha/session",

        (_, res) => {

            res.json(

                getSessionInfo()

            );

        }

    );

    //--------------------------------------------------
    // VALIDATE
    //--------------------------------------------------

    app.get(

        "/api/zerodha/session/validate",

        (_, res) => {

            res.json(

                validateSession()

            );

        }

    );

    //--------------------------------------------------
    // LOGOUT
    //--------------------------------------------------

    app.post(

        "/api/zerodha/logout",

        (_, res) => {

            clearSession();

            res.json({

                success: true,

                message:

                    "Session cleared."

            });

        }

    );

}