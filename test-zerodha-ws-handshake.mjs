import WebSocket from "ws";

import {
    getApiKey,
    getAccessToken
} from "./server/zerodha/token.js";

const apiKey = getApiKey();
const accessToken = getAccessToken();

const url =
    `wss://ws.kite.trade?api_key=${encodeURIComponent(apiKey)}` +
    `&access_token=${encodeURIComponent(accessToken)}`;

console.log("Connecting to Zerodha WebSocket...");

const ws = new WebSocket(url);

ws.on("open", () => {
    console.log("CONNECTED");
    ws.close();
});

ws.on("unexpected-response", (_request, response) => {
    console.log("HTTP STATUS:", response.statusCode);

    console.log(
        "HEADERS:",
        Object.fromEntries(
            Object.entries(response.headers)
        )
    );

    let body = "";

    response.on("data", chunk => {
        body += chunk.toString();
    });

    response.on("end", () => {
        console.log("BODY:", body);
    });
});

ws.on("error", error => {
    console.log("ERROR:", error.message);
});

ws.on("close", (code, reason) => {
    console.log(
        "CLOSED:",
        code,
        reason?.toString?.() ?? ""
    );
});