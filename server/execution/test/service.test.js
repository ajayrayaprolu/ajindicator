import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionService } from "../service.js";

function makeStore(seed = {}) {
  const state = {
    orders: [...(seed.orders ?? [])],
    trades: [...(seed.trades ?? [])],
    positions: [...(seed.positions ?? [])],
    sync: [...(seed.sync ?? [])],
  };
  return {
    state,
    getOrders: () => [...state.orders],
    getTrades: () => [...state.trades],
    getPositions: (_broker, _account, options = {}) => options.includeFlat ? [...state.positions] : state.positions.filter((p) => p.isOpen),
    getSyncState: () => [...state.sync],
    upsertBrokerOrders: (_broker, _account, rows) => { state.orders = [...rows]; return rows.length; },
    upsertBrokerTrades: (_broker, _account, rows) => { state.trades = [...rows]; return rows.length; },
    replacePositionSnapshot: (_broker, _account, rows) => { state.positions = [...rows]; return rows.length; },
    updateSyncState: (next) => {
      const current = state.sync.find((row) => row.resource === next.resource);
      if (current) {
        current.lastAttemptAt = next.attemptedAt;
        current.lastErrorCode = next.success ? null : next.errorCode;
        current.lastErrorMessage = next.success ? null : next.errorMessage;
        current.recordCount = next.recordCount ?? current.recordCount;
        if (next.success) current.lastSuccessAt = next.attemptedAt;
      } else {
        state.sync.push({
          resource: next.resource,
          lastAttemptAt: next.attemptedAt,
          lastSuccessAt: next.success ? next.attemptedAt : null,
          lastErrorCode: next.success ? null : next.errorCode,
          lastErrorMessage: next.success ? null : next.errorMessage,
          recordCount: next.recordCount,
        });
      }
    },
    createDryRunOrder: (_broker, _accountKey, order) => ({ order: { ...order, status: "DRY_RUN" }, idempotentReplay: false }),
  };
}

test("one failed broker resource does not replace the prior saved snapshot with an empty list", async () => {
  const previousPosition = { symbol: "NFO:ABC", netQuantity: 25, averagePrice: 100, ltp: 102, brokerReportedPnl: 50, estimatedOpenPnl: 50, pnl: 50, pnlSource: "BROKER_REPORTED", isOpen: true, isActive: true };
  const store = makeStore({ positions: [previousPosition] });
  const service = new ExecutionService({
    store,
    minimumSyncIntervalMs: 0,
    adapterFactory: () => ({
      broker: "fyers",
      capabilities: { ordersRead: true, tradesRead: true, positionsRead: true },
      getOrders: async () => [{ brokerOrderId: "O-1", symbol: "NFO:ABC", status: "OPEN", quantity: 25, filledQuantity: 0 }],
      getTrades: async () => { throw Object.assign(new Error("timeout"), { code: "BROKER_TIMEOUT", httpStatus: 502 }); },
      getPositions: async () => { throw Object.assign(new Error("positions timeout"), { code: "BROKER_TIMEOUT", httpStatus: 502 }); },
    }),
  });

  const result = await service.syncSnapshot("fyers", { force: true });
  assert.equal(store.state.orders.length, 1);
  assert.equal(store.state.positions.length, 1);
  assert.equal(store.state.positions[0].symbol, "NFO:ABC");
  assert.equal(result.refresh.hasErrors, true);
  assert.equal(result.refresh.resources.find((item) => item.resource === "positions").status, "error");
  assert.equal(result.data.pnl.brokerReportedPnlTotal, null, "stale P&L is not presented as a fresh complete total");
});

test("dry-run intent is explicit and response cannot claim a broker order was submitted", () => {
  const store = makeStore();
  const service = new ExecutionService({ store, accountKey: "test-account" });
  const result = service.createDryRunOrderIntent({
    broker: "fyers",
    order: {
      dryRun: true,
      clientRequestId: "test-signal-001",
      symbol: "NSE:NIFTY26OCT25000CE",
      exchange: "NFO",
      product: "MIS",
      side: "BUY",
      orderType: "MARKET",
      quantity: 75,
    },
  });
  assert.equal(result.success, true);
  assert.equal(result.simulationOnly, true);
  assert.equal(result.liveOrderSubmitted, false);
  assert.equal(result.order.status, "DRY_RUN");
});
