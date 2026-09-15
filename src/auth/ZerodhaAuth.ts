//======================================================
// src/auth/ZerodhaAuth.ts
//======================================================
// Central Zerodha configuration.
// No authentication logic belongs here.
// Server is responsible for login/token generation.
//======================================================

export interface ZerodhaConfiguration {

    //--------------------------------------------------
    // APP
    //--------------------------------------------------

    apiKey: string;

    apiSecret: string;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    accessToken: string;

    publicToken: string;

    requestToken: string;

    userId: string;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    loginUrl: string;

    redirectUrl: string;

    sessionExpiry: string;

}

export const ZerodhaConfig: ZerodhaConfiguration = {

    //--------------------------------------------------
    // FILL THESE
    //--------------------------------------------------

    apiKey: "",

    apiSecret: "",

    redirectUrl:
        "https://localhost:3001/api/zerodha/callback",

    //--------------------------------------------------
    // GENERATED AFTER LOGIN
    //--------------------------------------------------

    accessToken: "",

    publicToken: "",

    requestToken: "",

    userId: "",

    sessionExpiry: "",

    //--------------------------------------------------
    // LOGIN URL
    //--------------------------------------------------

    loginUrl: ""

};

export function buildLoginUrl(): string {

    if (!ZerodhaConfig.apiKey) {

        throw new Error(
            "Zerodha API Key not configured."
        );

    }

    return `https://kite.zerodha.com/connect/login?v=3&api_key=${ZerodhaConfig.apiKey}`;

}