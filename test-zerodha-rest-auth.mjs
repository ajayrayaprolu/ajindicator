import {
    getApiKey,
    getAccessToken,
    getUserId
} from "./server/zerodha/token.js";

const apiKey = getApiKey();
const accessToken = getAccessToken();

console.log({
    apiKeyPresent: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    accessTokenPresent: Boolean(accessToken),
    accessTokenLength: accessToken.length,
    userId: getUserId()
});

const response = await fetch(
    "https://api.kite.trade/user/profile",
    {
        headers: {
            "X-Kite-Version": "3",
            "Authorization": `token ${apiKey}:${accessToken}`
        }
    }
);

console.log("profileStatus:", response.status);

const body = await response.text();

console.log("profileResponse:", body);