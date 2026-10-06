/**
 * Telegram notifier behaviour test (v2) - no network, no real Telegram messages.
 *
 * Put this file in  C:\AI-Institutional\scripts\  and run it from the PROJECT ROOT:
 *     cd C:\AI-Institutional
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

(async () => {

    const { TelegramNotifier } = await import("../src/services/TelegramNotifier");

    const tick = async (t: any) => { TelegramNotifier.onTick(t); await settle(); };

    //-----------------------------------------------------------------
    console.log("\n--- page load, two feeds of the same option ---");
    //-----------------------------------------------------------------

    const SYM = "NIFTY 06OCT 22550PE";

    const base = { symbol: SYM, stopLoss: 71.53, tps: [131.07, 154.89, 190.61] };

    const A = { ...base, entry: 95.35, price: 95.35, high: 96, low: 94, executionAllowed: true };
    const B = { ...base, entry: 93.10, price: 93.10, high: 94, low: 92, executionAllowed: true };
    const idle = { ...base, entry: 0, price: 94, high: 95, low: 93, executionAllowed: false };

    await tick(A);
    check("1. plan already active when the page loads is NOT announced (history)", posts.length === 0,
        `${posts.length} message(s)`);

    await tick(idle);
    check("2. idle tick sends nothing", posts.length === 0);

    await tick(B);
    check("3. NEW plan after an idle period -> exactly ONE entry, carrying the expiry",
        posts.length === 1 && posts[0].type === "ENTRY" && posts[0].expiry === "06OCT",
        JSON.stringify(posts[0]));

    await tick(A);
    check("4. the other feed (different plan) does NOT send a second entry", posts.length === 1,
        `${posts.length} message(s)`);

    //-----------------------------------------------------------------
    console.log("\n--- targets ---");
    //-----------------------------------------------------------------

    await tick({ ...B, price: 131.5, high: 131.5, low: 120 });
    check("5. TP1 reached -> one TARGET message (index 1)",
        posts.length === 2 && posts[1].type === "TARGET" && posts[1].targetIndex === 1,
        JSON.stringify(posts[1]));

    await tick({ ...B, price: 131.5, high: 131.5, low: 120 });
    check("6. same tick again -> nothing new", posts.length === 2);

    await tick({ ...A, price: 155, high: 155, low: 140 });
    check("7. TP2 reached (via the other feed) -> TARGET index 2",
        posts.length === 3 && posts[2].targetIndex === 2,
        JSON.stringify(posts[2]));

    //-----------------------------------------------------------------
    console.log("\n--- filters ---");
    //-----------------------------------------------------------------

    const n0 = posts.length;

    await tick({ ...A, symbol: "NIFTY" });
    check("8. spot chart (not an option) sends nothing", posts.length === n0);

    TelegramNotifier.setEnabled(false);
    await tick({ ...idle, symbol: "NIFTY 06OCT 22700PE" });
    await tick({ ...A, symbol: "NIFTY 06OCT 22700PE", entry: 100, stopLoss: 80, tps: [130, 140, 150], price: 100 });
    check("9. switch OFF sends nothing", posts.length === n0);
    TelegramNotifier.setEnabled(true);

    //-----------------------------------------------------------------
    console.log("\n--- stop-out closes the trade ---");
    //-----------------------------------------------------------------

    const CE = {
        symbol: "NIFTY 06OCT 22600CE", entry: 80, stopLoss: 60, tps: [110, 125, 140],
        executionAllowed: true, price: 80, high: 81, low: 79
    };
    const CE_IDLE = { ...CE, executionAllowed: false, entry: 0 };

    const n1 = posts.length;

    await tick(CE_IDLE);
    await tick(CE);
    check("10. new contract -> entry sent", posts.length === n1 + 1 && posts[n1].type === "ENTRY");

    await tick({ ...CE, price: 59, high: 70, low: 59 });
    await tick({ ...CE, price: 111, high: 111, low: 100 });
    check("11. after the stop was hit, a later TP1 touch sends NO target message",
        posts.length === n1 + 1, `${posts.length - n1} message(s) for this contract`);

    await tick(CE_IDLE);
    await tick(CE);
    check("12. the same plan is not re-announced after it closed", posts.length === n1 + 1);

    //-----------------------------------------------------------------
    console.log("\n--- stale plans are never announced ---");
    //-----------------------------------------------------------------

    const n2 = posts.length;

    const PAST_TP1 = { symbol: "NIFTY 06OCT 22650PE", entry: 100, stopLoss: 80, tps: [130, 150, 170],
        executionAllowed: true, price: 140, high: 141, low: 139 };
    await tick({ ...PAST_TP1, executionAllowed: false, entry: 0 });
    await tick(PAST_TP1);
    check("13. plan whose price is already past TP1 is not announced", posts.length === n2);

    const DRIFTED = { symbol: "NIFTY 06OCT 22700CE", entry: 100, stopLoss: 80, tps: [130, 150, 170],
        executionAllowed: true, price: 120, high: 121, low: 119 };
    await tick({ ...DRIFTED, executionAllowed: false, entry: 0 });
    await tick(DRIFTED);
    check("14. plan whose price drifted >5% from entry is not announced", posts.length === n2);

    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}  (${posts.length} message(s) would have been sent)`);
    process.exit(failures === 0 ? 0 : 1);

})();
