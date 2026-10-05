//=====================================================================
// telegramRoute.js  (BACKEND - put it next to your other server routes)
//
// Holds the Telegram bot token on the SERVER so it never ships in the
// browser bundle (ajtrade.in is public - anything in src/ is readable).
//
// Mount it in your server entry file:
//
//     import telegramRoute from "./telegramRoute.js";
//     app.use(express.json());                       // if not already present
//     app.use("/api/telegram", telegramRoute);
//
// (CommonJS server? change the first line to
//      const { Router } = require("express");
//  and the last line to  module.exports = router;)
//
// .env (server side):
//     TELEGRAM_BOT_TOKEN=123456:ABC...        <- from @BotFather
//     TELEGRAM_CHAT_ID=-1001234567890         <- channel/group id (or @channelname)
//
// Needs Node 18+ (global fetch).
//=====================================================================

import { Router } from "express";

const router = Router();

//---------------------------------------------------------------------
// Basic abuse cap: max 30 messages per minute for the whole server.
// (The endpoint is reachable from the public site, so keep it capped.)
//---------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
let sentTimes = [];

function rateLimited() {
    const now = Date.now();
    sentTimes = sentTimes.filter((t) => now - t < WINDOW_MS);
    if (sentTimes.length >= MAX_PER_WINDOW) return true;
    sentTimes.push(now);
    return false;
}

//---------------------------------------------------------------------
// Payload validation - the server builds the text itself, so the
// endpoint can't be used to push arbitrary text into your channel.
//---------------------------------------------------------------------

function positive(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePayload(body) {
    if (!body || typeof body !== "object") return null;

    const type = String(body.type ?? "");

    if (type === "TEST") return { type };

    if (type !== "ENTRY" && type !== "TARGET") return null;

    const underlying = String(body.underlying ?? "").toUpperCase();
    const optionType = String(body.optionType ?? "").toUpperCase();
    const strike = positive(body.strike);
    const target = positive(body.target);

    if (!/^[A-Z0-9&-]{1,20}$/.test(underlying)) return null;
    if (optionType !== "CE" && optionType !== "PE") return null;
    if (strike == null || target == null) return null;

    if (type === "ENTRY") {
        const entry = positive(body.entry);
        const stopLoss = positive(body.stopLoss);
        if (entry == null || stopLoss == null) return null;
        return { type, underlying, optionType, strike, entry, stopLoss, target };
    }

    const targetIndex = Math.min(3, Math.max(1, Number(body.targetIndex) || 1));
    return { type, underlying, optionType, strike, target, targetIndex };
}

//---------------------------------------------------------------------
// MESSAGE FORMAT  (edit the text here)
//---------------------------------------------------------------------

// 160 -> "160"   95.35 -> "95.35"
function fmt(n) {
    return String(Number(Number(n).toFixed(2)));
}

function buildMessage(p) {
    if (p.type === "TEST") {
        return "✅ AJ Institutional - Telegram connected";
    }

    const header = "📊 F&O | ⚡️ INTRADAY";
    const trade = `🟢 BUY ${p.underlying} ${p.strike} ${p.optionType}`;

    if (p.type === "ENTRY") {
        return [
            header,
            "",
            trade,
            "",
            `💰 Entry: ₹ ${fmt(p.entry)}`,
            `🎯 Target: ₹ ${fmt(p.target)}`,
            `🛑 Stop Loss: ₹ ${fmt(p.stopLoss)}`
        ].join("\n");
    }

    const label = p.targetIndex > 1 ? `Target ${p.targetIndex}` : "Target";

    return [
        header,
        "",
        trade,
        "",
        `🎯 ${label}: ₹ ${fmt(p.target)} Done ✅`
    ].join("\n");
}

//---------------------------------------------------------------------
// POST /api/telegram/signal
//---------------------------------------------------------------------

router.post("/signal", async (req, res) => {

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        return res.status(503).json({ ok: false, error: "Telegram is not configured on the server" });
    }

    const payload = parsePayload(req.body);

    if (!payload) {
        return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    if (rateLimited()) {
        return res.status(429).json({ ok: false, error: "Too many messages" });
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: buildMessage(payload),
                    disable_web_page_preview: true
                })
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.ok === false) {
            // never echo the token; Telegram's description is safe to return
            return res.status(502).json({ ok: false, error: data.description ?? "Telegram rejected the message" });
        }

        return res.json({ ok: true });

    } catch {
        return res.status(502).json({ ok: false, error: "Could not reach Telegram" });
    }
});

export default router;
