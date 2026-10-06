/**
 * Telegram notifier behaviour test - no network, no real Telegram messages.
 *
 * Put this file in  C:\AI-Institutional\scripts\  and run from the project root:
 *     npx tsx scripts/telegram-dedup-test.ts
 *
 * It stubs window/localStorage/fetch, replays ticks through
 * src/services/TelegramNotifier.ts and checks what WOULD be sent.
 */

const posts: any[] = [];
const store = new Map<string, string>();

(globalThis as any).window = globalThis;

Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); }
    }
});

(globalThis as any).fetch = async (_url: string, init: any) => {
    posts.push(JSON.parse(init.body));
    return { ok: true };
};

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
    if (!condition) failures++;
    console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

(async () => {

    const { TelegramNotifier } = await import("../src/services/TelegramNotifier");

    const SYM = "NIFTY 06OCT 22550PE";

    // Chart A = IndStocks feed, Chart B = Fyers feed (slightly different entry)
    const base = {
        symbol: SYM,
        stopLoss: 71.53,
        tps: [131.07, 154.89, 190.61],
        executionAllowed: true
    };

    const A = { ...base, entry: 95.35, price: 95.35, high: 96, low: 94 };
    const B = { ...base, entry: 93.10, price: 93.10, high: 94, low: 92 };

    console.log("\n--- same option on two feeds ---");

    TelegramNotifier.onTick(A); await tick();
    check("1. first feed sends ONE entry", posts.length === 1 && posts[0].type === "ENTRY",
        JSON.stringify(posts[0]));

    TelegramNotifier.onTick(B); await tick();
    check("2. second feed (different entry price) does NOT send a second entry", posts.length === 1,
        `${posts.length} message(s) so far`);

    console.log("\n--- targets ---");

    TelegramNotifier.onTick({ ...B, price: 131.5, high: 131.5, low: 120 }); await tick();
    check("3. TP1 reached -> one TARGET message (index 1)",
        posts.length === 2 && posts[1].type === "TARGET" && posts[1].targetIndex === 1,
        JSON.stringify(posts[1]));

    TelegramNotifier.onTick({ ...B, price: 131.5, high: 131.5, low: 120 }); await tick();
    check("4. same tick again -> nothing new", posts.length === 2);

    TelegramNotifier.onTick({ ...A, price: 155, high: 155, low: 140 }); await tick();
    check("5. TP2 reached (via the other feed) -> TARGET index 2",
        posts.length === 3 && posts[2].targetIndex === 2,
        JSON.stringify(posts[2]));

    console.log("\n--- filters ---");

    const before = posts.length;

    TelegramNotifier.onTick({ ...A, symbol: "NIFTY" }); await tick();
    check("6. non-option chart (spot) sends nothing", posts.length === before);

    TelegramNotifier.setEnabled(false);
    TelegramNotifier.onTick({ ...A, symbol: "NIFTY 06OCT 22700PE" }); await tick();
    check("7. switch OFF sends nothing", posts.length === before);
    TelegramNotifier.setEnabled(true);

    console.log("\n--- stop-out closes the trade ---");

    const CE = {
        symbol: "NIFTY 06OCT 22600CE", entry: 80, stopLoss: 60, tps: [110, 125, 140],
        executionAllowed: true, price: 80, high: 81, low: 79
    };

    TelegramNotifier.onTick(CE); await tick();
    check("8. new contract -> entry sent", posts.length === before + 1 && posts[before].type === "ENTRY");

    TelegramNotifier.onTick({ ...CE, price: 59, high: 70, low: 59 }); await tick();
    TelegramNotifier.onTick({ ...CE, price: 111, high: 111, low: 100 }); await tick();
    check("9. after the stop was hit, a later TP1 touch sends NO target message",
        posts.length === before + 1, `${posts.length - before} message(s) for this contract`);

    TelegramNotifier.onTick(CE); await tick();
    check("10. the same plan is not re-sent after it closed", posts.length === before + 1);

    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}  (${posts.length} message(s) would have been sent)`);
    process.exit(failures === 0 ? 0 : 1);

})();
