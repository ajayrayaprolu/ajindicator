import test from "node:test";
import assert from "node:assert/strict";
import { OrderValidationError, validateOrderIntent } from "../validation.js";
import { ExecutionService, LIVE_ORDER_SUBMISSION_ENABLED } from "../service.js";

test("order intent validator requires normalized symbol, exchange, side, quantity and idempotency key", () => {
  const order = validateOrderIntent({
    symbol: "NSE:NIFTY26OCT25000CE",
    exchange: "NFO",
    product: "MIS",
    side: "BUY",
    orderType: "MARKET",
    quantity: 75,
    clientRequestId: "sig-123",
  });
  assert.equal(order.quantity, 75);
  assert.equal(order.side, "BUY");
  assert.equal(order.clientRequestId, "sig-123");
  assert.throws(() => validateOrderIntent({}), OrderValidationError);
  assert.throws(() => validateOrderIntent({ symbol: "X", exchange: "NFO", product: "MIS", side: "BUY", quantity: 0, clientRequestId: "sig" }), /positive integer/);
});

test("live order submission remains hard-disabled and cannot be enabled by request payload", () => {
  assert.equal(LIVE_ORDER_SUBMISSION_ENABLED, false);
  const fakeStore = {
    createDryRunOrder: (_broker, _accountKey, order) => ({
      order: { ...order, status: "DRY_RUN" },
      idempotentReplay: false,
    }),
  };
  const service = new ExecutionService({ store: fakeStore, adapterFactory: () => null, accountKey: "test" });
  assert.throws(
    () => service.createDryRunOrderIntent({ broker: "fyers", order: {
      symbol: "NSE:NIFTY26OCT25000CE", exchange: "NFO", product: "MIS", side: "BUY",
      orderType: "MARKET", quantity: 75, clientRequestId: "sig-1", dryRun: false,
    } }),
    (error) => error.code === "LIVE_EXECUTION_DISABLED" && error.httpStatus === 423,
  );
  const result = service.createDryRunOrderIntent({ broker: "fyers", order: {
    symbol: "NSE:NIFTY26OCT25000CE", exchange: "NFO", product: "MIS", side: "BUY",
    orderType: "MARKET", quantity: 75, clientRequestId: "sig-2", dryRun: true,
  } });
  assert.equal(result.simulationOnly, true);
  assert.equal(result.liveOrderSubmitted, false);
  assert.equal(result.order.status, "DRY_RUN");
});

test("limit and stop order validations enforce prices", () => {
  const base = { symbol: "NFO:ABC", exchange: "NFO", product: "MIS", side: "BUY", quantity: 10, clientRequestId: "sig" };
  assert.throws(() => validateOrderIntent({ ...base, orderType: "LIMIT" }), /limit price is required/);
  assert.throws(() => validateOrderIntent({ ...base, orderType: "SL-M" }), /trigger price is required/);
  assert.equal(validateOrderIntent({ ...base, orderType: "LIMIT", limitPrice: 12.5 }).limitPrice, 12.5);
});
