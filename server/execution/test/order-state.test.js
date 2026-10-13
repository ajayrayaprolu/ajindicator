import test from "node:test";
import assert from "node:assert/strict";
import { isTerminalOrderStatus, mergeOrderState, normalizeOrderTransition } from "../order-state.js";

test("stale open snapshot cannot move a filled order backwards", () => {
  const merged = mergeOrderState(
    { status: "FILLED", quantity: 75, filledQuantity: 75, remainingQuantity: 0, averageFillPrice: 101 },
    { status: "OPEN", quantity: 75, filledQuantity: 50, remainingQuantity: 25, averageFillPrice: null },
  );
  assert.equal(merged.status, "FILLED");
  assert.equal(merged.filledQuantity, 75);
  assert.equal(merged.remainingQuantity, 0);
  assert.equal(merged.averageFillPrice, 101);
});

test("broker cancellation can be upgraded to filled after a race/reconciliation", () => {
  const merged = mergeOrderState(
    { status: "CANCELLED", quantity: 10, filledQuantity: 0, remainingQuantity: 10 },
    { status: "FILLED", quantity: 10, filledQuantity: 10, remainingQuantity: 0 },
  );
  assert.equal(merged.status, "FILLED");
  assert.equal(merged.filledQuantity, 10);
});

test("terminal status helper and transition diagnostic behave explicitly", () => {
  assert.equal(isTerminalOrderStatus("CANCELLED"), true);
  assert.equal(isTerminalOrderStatus("OPEN"), false);
  assert.deepEqual(normalizeOrderTransition("FILLED", "OPEN"), {
    accepted: false,
    reason: "STALE_OR_UNKNOWN_TRANSITION",
  });
});
