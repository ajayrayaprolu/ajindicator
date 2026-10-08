//=====================================================================
// telegramRoute.js   (BACKEND)   v2
//
// Copy to:  C:\AI-Institutional\server\telegramRoute.js
// (Fix-MountTelegram.ps1 does the copy AND mounts it in server\index.js)
//
// Holds the Telegram bot token on the SERVER so it never ships in the
// browser bundle, and builds the message text itself.
//
// v2 adds:
//   - server-side de-duplication, so several browsers / tabs watching the
//     same option can never produce the same Telegram message twice
//     (ENTRY: once per contract per 15 min, TARGET n: once per 6 h)
//   - express.json() inside the router (no dependency on global middleware)
//   - optional `expiry` in the payload, `buildMessage` exported for tests
//
// .env (server side):
//     TELEGRAM_BOT_TOKEN=123456:ABC...
//     TELEGRAM_CHAT_ID=-1001234567890      (or @channelname)
//
// Needs Node 18+ (global fetch). ESM (import/export).
//=====================================================================

import express, { Router } from "express";

const router = Router();

router.use(express.json({ limit: "10kb" }));

//---------------------------------------------------------------------
// Abuse cap: max 30 messages per minute for the whole server.
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
// De-duplication (in memory; resets when the server restarts)
//---------------------------------------------------------------------

const ENTRY_TTL_MS = 15 * 60_000;
const TARGET_TTL_MS = 6 * 60 * 60_000;
const recent = new Map(); // key -> { at, ttl }

function dedupeKey(p) {
    if (p.type === "TEST") return null;
    const contract = [p.underlying, p.expiry || "", p.strike, p.optionType].join("|");
    return p.type === "ENTRY"
        ? `ENTRY|${contract}`
        : `TARGET${p.targetIndex}|${contract}`;
}

function isDuplicate(key) {
    const now = Date.now();
    for (const [k, v] of recent) {
        if (now - v.at > v.ttl) recent.delete(k);
    }
    if (recent.has(key)) return true;
    recent.set(key, { at: now, ttl: key.startsWith("ENTRY") ? ENTRY_TTL_MS : TARGET_TTL_MS });
    return false;
}

//---------------------------------------------------------------------
// Payload validation (the endpoint can't push arbitrary text)
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
    const expiryRaw = String(body.expiry ?? "").toUpperCase();
    const expiry = /^\d{1,2}[A-Z]{3}$/.test(expiryRaw) ? expiryRaw : "";
    const strike = positive(body.strike);
    const target = positive(body.target);

    if (!/^[A-Z0-9&-]{1,20}$/.test(underlying)) return null;
    if (optionType !== "CE" && optionType !== "PE") return null;
    if (strike == null || target == null) return null;

    if (type === "ENTRY") {
        const entry = positive(body.entry);
        const stopLoss = positive(body.stopLoss);
        if (entry == null || stopLoss == null) return null;
        return { type, underlying, expiry, optionType, strike, entry, stopLoss, target };
    }

    const targetIndex = Math.min(3, Math.max(1, Number(body.targetIndex) || 1));
    return { type, underlying, expiry, optionType, strike, target, targetIndex };
}

//---------------------------------------------------------------------
// MESSAGE FORMAT  (edit the text here)
//---------------------------------------------------------------------

// 160 -> "160"   95.35 -> "95.35"
function fmt(n) {
    return String(Number(Number(n).toFixed(2)));
}

export function buildMessage(p) {
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
        return res.status(503).json({ ok: false, error: "Telegram is not configured on the server (.env not loaded?)" });
    }

    const payload = parsePayload(req.body);

    if (!payload) {
        return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    const key = dedupeKey(payload);

    if (key && isDuplicate(key)) {
        // 200 so the browser does not retry; nothing is sent to Telegram
        return res.json({ ok: true, deduped: true });
    }

    if (rateLimited()) {
        if (key) recent.delete(key);
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
            if (key) recent.delete(key); // let the browser retry
            return res.status(502).json({ ok: false, error: data.description ?? "Telegram rejected the message" });
        }

        return res.json({ ok: true });

    } catch {
        if (key) recent.delete(key);
        return res.status(502).json({ ok: false, error: "Could not reach Telegram" });
    }
});

export default router;
