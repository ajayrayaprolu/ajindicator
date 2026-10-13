import test from "node:test";
import assert from "node:assert/strict";
import { FyersExecutionAdapter } from "../brokers/FyersExecutionAdapter.js";
import { assertReadAdapterContract } from "../adapter-contract.js";

test("FYERS adapter uses the expected read-only v3 endpoints and normalizes results", async () => {
  const calls = [];
  const fixtures = new Map([
    ["https://fyers.test/api/v3/orders", { s: "ok", code: 200, orderBook: [{ id: "O-1", symbol: "NSE:ABC-EQ", exchange: "NSE", side: 1, type: 2, qty: 5, status: 2 }] }],
    ["https://fyers.test/api/v3/tradebook", { s: "ok", code: 200, tradeBook: [{ tradeNumber: "T-1", orderNumber: "O-1", symbol: "NSE:ABC-EQ", exchange: "NSE", side: 1, tradedQty: 5, tradePrice: 10 }] }],
    ["https://fyers.test/api/v3/positions", { s: "ok", code: 200, netPositions: [{ symbol: "NSE:ABC-EQ", exchange: "NSE", netQty: 5, netAvg: 10, ltp: 11, pl: 5 }] }],
  ]);
  const adapter = new FyersExecutionAdapter({
    baseUrl: "https://fyers.test/",
    tokenProvider: () => "app-id:unit-test-token",
    sessionCheck: () => true,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => fixtures.get(url) };
    },
  });

  const [orders, trades, positions] = await Promise.all([
    adapter.getOrders(), adapter.getTrades(), adapter.getPositions(),
  ]);
  assert.equal(orders[0].brokerOrderId, "O-1");
  assert.equal(trades[0].brokerTradeId, "T-1");
  assert.equal(positions[0].brokerReportedPnl, 5);
  assert.deepEqual(calls.map((call) => call.url).sort(), [...fixtures.keys()].sort());
  for (const call of calls) {
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.headers.Authorization, "app-id:unit-test-token");
  }
});

test("FYERS adapter fails closed if broker authentication is missing", async () => {
  let requested = false;
  const adapter = new FyersExecutionAdapter({
    tokenProvider: () => "",
    sessionCheck: () => false,
    fetchImpl: async () => { requested = true; throw new Error("must not send"); },
  });
  await assert.rejects(adapter.getPositions(), (error) => error.code === "BROKER_NOT_AUTHENTICATED");
  assert.equal(requested, false);
});

test("FYERS adapter never sends a live order even if asked directly", async () => {
  let requested = false;
  const adapter = new FyersExecutionAdapter({
    tokenProvider: () => "app-id:unit-test-token",
    sessionCheck: () => true,
    fetchImpl: async () => { requested = true; throw new Error("must not send"); },
  });
  await assert.rejects(adapter.placeOrder({ symbol: "TEST" }), (error) => error.code === "LIVE_EXECUTION_DISABLED");
  await assert.rejects(adapter.cancelOrder("ORDER-ID"), (error) => error.code === "LIVE_EXECUTION_DISABLED");
  await assert.rejects(adapter.modifyOrder({}), (error) => error.code === "LIVE_EXECUTION_DISABLED");
  assert.equal(requested, false);
});


test("read adapter contract rejects declared methods without verified capability flags", () => {
  const adapter = {
    broker: "fyers",
    capabilities: { ordersRead: true, tradesRead: true, positionsRead: false },
    getOrders: async () => [],
    getTrades: async () => [],
    getPositions: async () => [],
  };
  assert.throws(
    () => assertReadAdapterContract(adapter, "fyers"),
    (error) => error.code === "BROKER_CAPABILITY_UNVERIFIED" && error.httpStatus === 501,
  );
});


test("FYERS HTTP auth failures are classified before attempting JSON parsing", async () => {
  const adapter = new FyersExecutionAdapter({
    tokenProvider: () => "app-id:unit-test-token",
    sessionCheck: () => true,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => { throw new Error("HTML login page"); } }),
  });
  await assert.rejects(
    adapter.getOrders(),
    (error) => error.code === "BROKER_HTTP_401" && error.httpStatus === 401,
  );
});


test("FYERS adapter retries rate-limited read requests using Retry-After", async () => {
  let calls = 0;
  const delays = [];
  const adapter = new FyersExecutionAdapter({
    baseUrl: "https://fyers.test",
    tokenProvider: () => "app-id:unit-test-token",
    sessionCheck: () => true,
    sleep: async (ms) => delays.push(ms),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 429, headers: { get: (name) => name === "Retry-After" ? "0" : null } };
      }
      return { ok: true, status: 200, json: async () => ({ s: "ok", code: 200, orderBook: [] }) };
    },
  });
  assert.deepEqual(await adapter.getOrders(), []);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [0]);
});
