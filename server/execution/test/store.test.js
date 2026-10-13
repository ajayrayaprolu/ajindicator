import test from "node:test";
import assert from "node:assert/strict";
let Database = null;
let ExecutionStoreClass = null;
try {
  ({ default: Database } = await import("better-sqlite3"));
  ({ ExecutionStore: ExecutionStoreClass } = await import("../store.js"));
} catch {
  // The isolated authoring sandbox may not have the AJ project's native
  // better-sqlite3 dependency. The installer reruns this integration test in
  // the actual project and does not treat a skipped local test as a pass.
}

test("SQLite store persists broker orders/trades/positions and prevents order-state regression", { skip: !Database || !ExecutionStoreClass ? "better-sqlite3 is unavailable in this isolated authoring sandbox" : false }, () => {
  const db = new Database(":memory:");
  const store = new ExecutionStoreClass({ db });
  try {
    const now = "2026-10-12T10:00:00.000Z";
    store.upsertBrokerOrders("fyers", "test-account", [{
      broker: "fyers", brokerOrderId: "O-100", symbol: "NSE:ABC-EQ", exchange: "NSE", product: "MIS",
      side: "BUY", orderType: "MARKET", quantity: 10, filledQuantity: 10, remainingQuantity: 0,
      averageFillPrice: 15.5, status: "FILLED", rawStatus: "2", statusMessage: null, orderTime: now, raw: { status: 2 },
    }], now);
    store.upsertBrokerOrders("fyers", "test-account", [{
      broker: "fyers", brokerOrderId: "O-100", symbol: "NSE:ABC-EQ", exchange: "NSE", product: "MIS",
      side: "BUY", orderType: "MARKET", quantity: 10, filledQuantity: 5, remainingQuantity: 5,
      averageFillPrice: null, status: "OPEN", rawStatus: "6", statusMessage: null, orderTime: now, raw: { status: 6 },
    }], "2026-10-12T10:00:02.000Z");

    const order = store.getOrders("fyers", "test-account")[0];
    assert.equal(order.status, "FILLED");
    assert.equal(order.filledQuantity, 10);
    assert.equal(order.remainingQuantity, 0);
    assert.equal(order.averageFillPrice, 15.5);
    assert.equal(store.getOrderEvents("fyers", "test-account").length, 1);

    store.upsertBrokerTrades("fyers", "test-account", [{
      tradeKey: "T-1", brokerTradeId: "T-1", brokerOrderId: "O-100", symbol: "NSE:ABC-EQ",
      exchange: "NSE", product: "MIS", side: "BUY", quantity: 10, price: 15.5,
      tradeValue: 155, timestamp: now, raw: { tradeNumber: "T-1" },
    }], now);
    assert.equal(store.getTrades("fyers", "test-account").length, 1);

    store.replacePositionSnapshot("fyers", "test-account", [{
      positionKey: "NSE:ABC-EQ|NSE|MIS", symbol: "NSE:ABC-EQ", exchange: "NSE", product: "MIS",
      netQuantity: 10, averagePrice: 15.5, ltp: 16, brokerReportedPnl: 5, estimatedOpenPnl: 5,
      pnl: 5, pnlSource: "BROKER_REPORTED", realizedPnl: null, unrealizedPnl: null,
      isOpen: true, asOf: now, raw: {},
    }], now);
    assert.equal(store.getPositions("fyers", "test-account").length, 1);

    const dryRun = store.createDryRunOrder("fyers", "test-account", {
      clientRequestId: "dry-1", symbol: "NSE:ABC-EQ", exchange: "NSE", product: "MIS",
      side: "BUY", orderType: "MARKET", quantity: 1, limitPrice: null, triggerPrice: null,
    }, now);
    const replay = store.createDryRunOrder("fyers", "test-account", {
      clientRequestId: "dry-1", symbol: "NSE:ABC-EQ", exchange: "NSE", product: "MIS",
      side: "BUY", orderType: "MARKET", quantity: 1, limitPrice: null, triggerPrice: null,
    }, now);
    assert.equal(dryRun.order.status, "DRY_RUN");
    assert.equal(replay.idempotentReplay, true);
    assert.equal(store.getOrders("fyers", "test-account").filter((row) => row.clientRequestId === "dry-1").length, 1);
  } finally {
    store.close();
  }
});
