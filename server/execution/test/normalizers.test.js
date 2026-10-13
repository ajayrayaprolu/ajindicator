import test from "node:test";
import assert from "node:assert/strict";
import {
  BrokerPayloadError,
  toNumber,
  calculateGrossRealizedPnlFifo,
  normalizeFyersOrders,
  normalizeFyersPositions,
  normalizeFyersTrades,
  summarizePnl,
} from "../normalizers.js";

 test("normalizes FYERS orderbook and respects fill/status fields", () => {
  const orders = normalizeFyersOrders({
    s: "ok",
    code: 200,
    orderBook: [
      { id: "F-1", symbol: "NSE:NIFTY26OCT25000CE", exchange: "NFO", productType: "INTRADAY", side: 1, type: 2, qty: 75, status: 2, limitPrice: 0, tradedPrice: 104.5, orderDateTime: "2026-10-12 10:15:42" },
      { id: "F-2", symbol: "NSE:SBIN-EQ", side: -1, type: 1, qty: 10, filledQty: 4, status: 6, limitPrice: 845, orderDateTime: "2026-10-12 10:16:00" },
    ],
  });

  assert.equal(orders.length, 2);
  assert.equal(orders[0].side, "BUY");
  assert.equal(orders[0].product, "MIS");
  assert.equal(orders[0].status, "FILLED");
  assert.equal(orders[0].filledQuantity, 75, "filled order defaults filledQty to order qty when broker omits it");
  assert.equal(orders[0].remainingQuantity, 0);
  assert.equal(orders[1].side, "SELL");
  assert.equal(orders[1].status, "OPEN");
  assert.equal(orders[1].filledQuantity, 4);
  assert.equal(orders[1].remainingQuantity, 6);
});

test("malformed or failed broker order payloads are errors, not empty snapshots", () => {
  assert.throws(
    () => normalizeFyersOrders({ s: "error", code: -99, message: "rejected" }),
    (error) => error instanceof BrokerPayloadError && error.code === "-99",
  );
  assert.throws(
    () => normalizeFyersPositions({ s: "ok", code: 200, message: "unexpected shape" }),
    (error) => error instanceof BrokerPayloadError && error.code === "MALFORMED_BROKER_RESPONSE",
  );
});

test("positions prefer broker P&L and clearly label estimated signed open P&L", () => {
  const positions = normalizeFyersPositions({
    s: "ok", code: 200,
    netPositions: [
      { symbol: "NSE:NIFTY26OCT25000CE", exchange: "NFO", productType: "INTRADAY", netQty: 75, netAvg: 100, ltp: 120, pl: 1400 },
      { symbol: "NSE:SBIN-EQ", exchange: "NSE", productType: "CNC", netQty: -10, netAvg: 800, ltp: 790 },
    ],
  });
  assert.equal(positions[0].brokerReportedPnl, 1400);
  assert.equal(positions[0].pnl, 1400);
  assert.equal(positions[0].pnlSource, "BROKER_REPORTED");
  assert.equal(positions[0].estimatedOpenPnl, 1500);
  assert.equal(positions[1].estimatedOpenPnl, 100);
  assert.equal(positions[1].pnlSource, "LOCAL_ESTIMATE");
});

test("FIFO gross realized P&L handles long closes and short closes", () => {
  const trades = normalizeFyersTrades({
    s: "ok", code: 200,
    tradeBook: [
      { tradeNumber: "T1", orderNumber: "O1", symbol: "NSE:SBIN-EQ", exchange: "NSE", productType: "CNC", side: 1, tradedQty: 10, tradePrice: 100, orderDateTime: "2026-10-12T09:15:00Z" },
      { tradeNumber: "T2", orderNumber: "O2", symbol: "NSE:SBIN-EQ", exchange: "NSE", productType: "CNC", side: -1, tradedQty: 4, tradePrice: 110, orderDateTime: "2026-10-12T09:16:00Z" },
      { tradeNumber: "T3", orderNumber: "O3", symbol: "NSE:ABC-EQ", exchange: "NSE", productType: "CNC", side: -1, tradedQty: 5, tradePrice: 50, orderDateTime: "2026-10-12T09:17:00Z" },
      { tradeNumber: "T4", orderNumber: "O4", symbol: "NSE:ABC-EQ", exchange: "NSE", productType: "CNC", side: 1, tradedQty: 2, tradePrice: 45, orderDateTime: "2026-10-12T09:18:00Z" },
    ],
  });
  const realized = calculateGrossRealizedPnlFifo(trades);
  assert.equal(realized.value, 50); // +40 long close, +10 short close
  assert.equal(realized.matchedQuantity, 6);
  assert.equal(realized.chargesIncluded, false);
});

test("P&L summary does not invent charges or a net-after-charges result", () => {
  const positions = normalizeFyersPositions({ s: "ok", code: 200, netPositions: [
    { symbol: "NSE:SBIN-EQ", exchange: "NSE", netQty: 10, netAvg: 100, ltp: 101, pl: 10 },
  ] });
  const summary = summarizePnl(positions, [], { positionSnapshotComplete: true });
  assert.equal(summary.brokerReportedPnlTotal, 10);
  assert.equal(summary.chargesAndTaxes, null);
  assert.equal(summary.netPnlAfterCharges, null);
  assert.equal(summary.dataQuality.brokerPnlComplete, true);
});


test("numeric normalization treats whitespace and malformed values as missing rather than zero", () => {
  assert.equal(toNumber("   "), null);
  assert.equal(toNumber("1,234.50"), 1234.5);
  assert.equal(toNumber("not-a-number"), null);
  assert.equal(toNumber(0), 0);
});
