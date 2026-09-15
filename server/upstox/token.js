// server/upstox/token.js

import fs from "fs";
import path from "path";

const SESSION_FILE =
    path.join(
        process.cwd(),
        "server",
        "upstox",
        "session.json"
    );

export function loadSession() {

    if (
        !fs.existsSync(
            SESSION_FILE
        )
    ) {
        return null;
    }

    try {

        return JSON.parse(
            fs.readFileSync(
                SESSION_FILE,
                "utf8"
            )
        );

    }

    catch {

        return null;

    }
}

export function saveSession(
    session
) {

    fs.mkdirSync(
        path.dirname(
            SESSION_FILE
        ),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        SESSION_FILE,
        JSON.stringify(
            session,
            null,
            4
        )
    );

    return session;
}

export function getAccessToken() {

    const session =
        loadSession();

    if (
        !session?.accessToken
    ) {

        throw new Error(
            "No Upstox access token."
        );

    }

    return session.accessToken;
}

export function isLoggedIn() {

    try {

        return Boolean(
            getAccessToken()
        );

    }

    catch {

        return false;

    }
}