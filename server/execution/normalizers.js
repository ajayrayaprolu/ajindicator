import { createHash } from "node:crypto";

export const ORDER_STATUSES = Object.freeze([
  "NEW",
  "OPEN",
  "TRIGGER_PENDING",
  "PARTIALLY_FILLED",
  "FILLED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
  "UNKNOWN",
  "DRY_RUN",
]);

export class BrokerPayloadError extends Error {
  constructor(message, { broker = "unknown", resource = "unknown", code = "BROKER_PAYLOAD_ERROR", httpStatus = 502 } = {}) {
    super(message);
    this.name = "BrokerPayloadError";
    this.broker = broker;
    this.resource = resource;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/,/g, "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function firstString(...values) {
  const value = firstPresent(...values);
  if (value === undefined) return "";
  return String(value).trim();
}

function normalizeSide(value) {
  if (value === 1 || value === "1") return "BUY";
  if (value === -1 || value === "-1") return "SELL";
  const text = String(value ?? "").trim().toUpperCase();
  if (["BUY", "B", "LONG"].includes(text)) return "BUY";
  if (["SELL", "S", "SHORT"].includes(text)) return "SELL";
  return "UNKNOWN";
}

function normalizeProduct(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  const map = {
    CNC: "CNC",
    INTRADAY: "MIS",
    MIS: "MIS",
    MARGIN: "NRML",
    NRML: "NRML",
    CO: "CO",
    BO: "BO",
  };
  return map[raw] ?? (raw || "UNKNOWN");
}

function normalizeOrderType(value) {
  if (typeof value === "number" || /^\d+$/.test(String(value ?? ""))) {
    return ({ 1: "LIMIT", 2: "MARKET", 3: "SL-M", 4: "SL" })[Number(value)] ?? "UNKNOWN";
  }
  const text = String(value ?? "").trim().toUpperCase().replaceAll("_", "-");
  if (["MARKET", "LIMIT", "SL", "SL-M", "STOP", "STOP-LIMIT", "STOP-MARKET"].includes(text)) {
    if (text === "STOP") return "SL";
    if (text === "STOP-LIMIT") return "SL";
    if (text === "STOP-MARKET") return "SL-M";
    return text;
  }
  return text || "UNKNOWN";
}

function normalizeOrderStatus(rawStatus, { filledQuantity = 0, quantity = 0, orderType = "UNKNOWN", triggerPrice = null } = {}) {
  const text = String(rawStatus ?? "").trim().toUpperCase().replaceAll("_", " ");
  const byName = {
    NEW: "NEW",
    PENDING: "OPEN",
    OPEN: "OPEN",
    TRANSIT: "OPEN",
    "TRIGGER PENDING": "TRIGGER_PENDING",
    "PARTIALLY FILLED": "PARTIALLY_FILLED",
    "PARTIAL FILLED": "PARTIALLY_FILLED",
    "PARTIALLY TRADED": "PARTIALLY_FILLED",
    TRADED: "FILLED",
    "TRADED/EXECUTED": "FILLED",
    COMPLETE: "FILLED",
    COMPLETED: "FILLED",
    FILLED: "FILLED",
    CANCELLED: "CANCELLED",
    CANCELED: "CANCELLED",
    REJECTED: "REJECTED",
    FAILED: "REJECTED",
    EXPIRED: "EXPIRED",
    UNKNOWN: "UNKNOWN",
  };
  if (Object.hasOwn(byName, text)) return byName[text];

  const code = toNumber(rawStatus);
  if (code === 1) return "CANCELLED";
  if (code === 2) return "FILLED";
  if (code === 3) {
    return filledQuantity > 0 && filledQuantity < quantity ? "PARTIALLY_FILLED" : "UNKNOWN";
  }
  if (code === 4) {
    // Fyers source references differ on status 4 (transit vs trigger-pending).
    // Only label it trigger-pending when the order itself has stop semantics.
    return triggerPrice > 0 || ["SL", "SL-M"].includes(orderType) ? "TRIGGER_PENDING" : "OPEN";
  }
  if (code === 5) return "REJECTED";
  if (code === 6) return "OPEN";
  if (code === 7) return "EXPIRED";
  return "UNKNOWN";
}

function unwrapPayload(payload, listKeys, resource) {
  if (!payload || typeof payload !== "object") {
    if (Array.isArray(payload)) return payload;
    throw new BrokerPayloadError(`FYERS ${resource} response was not an object.`, { broker: "fyers", resource, code: "MALFORMED_BROKER_RESPONSE" });
  }

  const status = String(payload.s ?? payload.status ?? "").trim().toLowerCase();
  if (status === "error" || payload.success === false || (toNumber(payload.code) !== null && toNumber(payload.code) < 0)) {
    const code = firstString(payload.code, payload.errorCode, "BROKER_REPORTED_ERROR");
    throw new BrokerPayloadError(`FYERS ${resource} request failed (${code}).`, { broker: "fyers", resource, code, httpStatus: 502 });
  }

  const roots = [payload, payload.data, payload.d].filter((value) => value && typeof value === "object");
  for (const root of roots) {
    if (Array.isArray(root)) return root;
    for (const key of listKeys) {
      if (Array.isArray(root[key])) return root[key];
    }
  }

  throw new BrokerPayloadError(`FYERS ${resource} response did not contain an expected list.`, { broker: "fyers", resource, code: "MALFORMED_BROKER_RESPONSE" });
}

function normalizeExchange(symbol, exchange) {
  const explicit = firstString(exchange).toUpperCase();
  if (explicit) return explicit;
  const match = String(symbol ?? "").match(/^([A-Z]+):/i);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

function cleanSymbol(symbol) {
  return firstString(symbol);
}

function normalizedTimestamp(...values) {
  const raw = firstPresent(...values);
  if (raw === undefined) return null;
  if (typeof raw === "number" || /^\d{10,13}$/.test(String(raw))) {
    const numeric = Number(raw);
    const millis = String(Math.trunc(numeric)).length <= 10 ? numeric * 1000 : numeric;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? String(raw) : date.toISOString();
  }
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? String(raw) : date.toISOString();
}

export function normalizeFyersOrder(raw) {
  const row = raw && typeof raw === "object" ? raw : {};
  const brokerOrderId = firstString(row.id, row.orderId, row.orderid, row.order_number);
  const symbol = cleanSymbol(firstPresent(row.symbol, row.tradingsymbol, row.tradingSymbol));
  const exchange = normalizeExchange(symbol, row.exchange);
  const quantity = Math.max(0, Math.trunc(firstNumber(row.qty, row.quantity, row.orderQty) ?? 0));
  const reportedFilledQuantity = firstNumber(row.filledQty, row.qty_filled, row.tradedQty, row.filled_quantity);
  const initialFilledQuantity = Math.max(0, Math.trunc(reportedFilledQuantity ?? 0));
  const orderType = normalizeOrderType(firstPresent(row.type, row.order_type, row.orderType));
  const triggerPrice = firstNumber(row.stopPrice, row.trigger_price, row.triggerPrice);
  const rawStatus = firstPresent(row.status, row.org_ord_status, row.ord_status);
  const status = normalizeOrderStatus(rawStatus, { filledQuantity: initialFilledQuantity, quantity, orderType, triggerPrice });
  const filledQuantity = status === "FILLED" && reportedFilledQuantity === null
    ? quantity
    : initialFilledQuantity;
  const orderTime = normalizedTimestamp(row.orderDateTime, row.order_date_time, row.createdAt, row.timestamp);
  const remainingFromBroker = firstNumber(row.remainingQty, row.pendingQty, row.remaining_quantity, row.pending_quantity);

  return {
    broker: "fyers",
    accountKey: "primary",
    brokerOrderId: brokerOrderId || null,
    clientRequestId: null,
    symbol,
    brokerSymbol: symbol,
    exchange,
    product: normalizeProduct(firstPresent(row.productType, row.product, row.product_type)),
    side: normalizeSide(firstPresent(row.side, row.tran_side, row.action)),
    orderType,
    quantity,
    limitPrice: firstNumber(row.limitPrice, row.price_limit, row.price),
    triggerPrice,
    filledQuantity,
    remainingQuantity: Math.max(0, Math.trunc(status === "FILLED" ? 0 : remainingFromBroker ?? quantity - filledQuantity)),
    averageFillPrice: firstNumber(row.tradedPrice, row.price_traded, row.averagePrice, row.average_price),
    status,
    rawStatus: rawStatus === undefined ? null : String(rawStatus),
    statusMessage: firstString(row.message, row.statusMessage, row.status_msg, row.oms_msg, row.errorMessage) || null,
    orderTime,
    raw: row,
  };
}

export function normalizeFyersOrders(payload) {
  return unwrapPayload(payload, ["orderBook", "orders", "orderbook"], "orders")
    .map(normalizeFyersOrder)
    .filter((order) => order.brokerOrderId);
}

export function normalizeFyersTrade(raw) {
  const row = raw && typeof raw === "object" ? raw : {};
  const symbol = cleanSymbol(firstPresent(row.symbol, row.tradingsymbol, row.tradingSymbol));
  const exchange = normalizeExchange(symbol, row.exchange);
  const quantity = Math.max(0, Math.trunc(firstNumber(row.tradedQty, row.filledQty, row.quantity, row.qty) ?? 0));
  const price = firstNumber(row.tradePrice, row.tradedPrice, row.averagePrice, row.price);
  const timestamp = normalizedTimestamp(row.orderDateTime, row.tradeDateTime, row.tradeTime, row.timestamp);
  const brokerTradeId = firstString(row.tradeNumber, row.tradeId, row.trade_id, row.id);
  const brokerOrderId = firstString(row.orderNumber, row.orderId, row.orderid, row.order_id);
  const side = normalizeSide(firstPresent(row.side, row.tran_side, row.action));
  const product = normalizeProduct(firstPresent(row.productType, row.product, row.product_type));
  const stableFields = [brokerOrderId, symbol, exchange, side, quantity, price, timestamp, product].join("|");
  const tradeKey = brokerTradeId || createHash("sha256").update(stableFields).digest("hex");

  return {
    broker: "fyers",
    accountKey: "primary",
    tradeKey,
    brokerTradeId: brokerTradeId || null,
    brokerOrderId: brokerOrderId || null,
    symbol,
    brokerSymbol: symbol,
    exchange,
    product,
    side,
    quantity,
    price,
    tradeValue: firstNumber(row.tradeValue, row.trade_value) ?? (price !== null ? price * quantity : null),
    timestamp,
    raw: row,
  };
}

export function normalizeFyersTrades(payload) {
  return unwrapPayload(payload, ["tradeBook", "tradebook", "trades"], "trades")
    .map(normalizeFyersTrade)
    .filter((trade) => trade.symbol && trade.quantity > 0);
}

export function normalizeFyersPosition(raw) {
  const row = raw && typeof raw === "object" ? raw : {};
  const symbol = cleanSymbol(firstPresent(row.symbol, row.tradingsymbol, row.tradingSymbol));
  const exchange = normalizeExchange(symbol, row.exchange);
  const product = normalizeProduct(firstPresent(row.productType, row.product, row.product_type));
  const netQuantity = Math.trunc(firstNumber(row.netQty, row.net_quantity, row.quantity, row.qty) ?? 0);
  const averagePrice = firstNumber(row.netAvg, row.average_price, row.avgPrice, row.averagePrice);
  const ltp = firstNumber(row.ltp, row.last_price, row.lastPrice);
  const brokerReportedPnl = firstNumber(row.pl, row.pnl, row.profitLoss, row.profit_loss);
  const estimatedOpenPnl = averagePrice !== null && ltp !== null
    ? (ltp - averagePrice) * netQuantity
    : null;
  const pnlSource = brokerReportedPnl !== null ? "BROKER_REPORTED" : estimatedOpenPnl !== null ? "LOCAL_ESTIMATE" : "UNAVAILABLE";
  const pnl = brokerReportedPnl ?? estimatedOpenPnl;

  return {
    broker: "fyers",
    accountKey: "primary",
    positionKey: [symbol, exchange, product].join("|"),
    symbol,
    brokerSymbol: symbol,
    exchange,
    product,
    netQuantity,
    averagePrice,
    ltp,
    brokerReportedPnl,
    estimatedOpenPnl,
    pnl,
    pnlSource,
    realizedPnl: firstNumber(row.realized_profit, row.realizedProfit, row.realized_pnl),
    unrealizedPnl: firstNumber(row.unrealized_profit, row.unrealizedProfit, row.unrealized_pnl),
    isOpen: netQuantity !== 0,
    asOf: new Date().toISOString(),
    raw: row,
  };
}

export function normalizeFyersPositions(payload) {
  return unwrapPayload(payload, ["netPositions", "positions", "positionBook"], "positions")
    .map(normalizeFyersPosition)
    .filter((position) => position.symbol);
}

/**
 * Calculate gross realized P&L from the supplied trade history using a FIFO
 * inventory ledger. Charges/taxes are not deducted. Completeness is deliberately
 * labelled as trade-history-only because broker feeds may return only today's trades.
 */
export function calculateGrossRealizedPnlFifo(trades) {
  const sorted = [...trades].sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : Number.NaN;
    const tb = b.timestamp ? Date.parse(b.timestamp) : Number.NaN;
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
    return 0;
  });
  const inventory = new Map();
  let realizedPnl = 0;
  let matchedQuantity = 0;
  let skippedTrades = 0;

  for (const trade of sorted) {
    if (!trade || !["BUY", "SELL"].includes(trade.side) || !Number.isFinite(trade.quantity) || trade.quantity <= 0 || !Number.isFinite(trade.price)) {
      skippedTrades += 1;
      continue;
    }

    const key = [trade.exchange ?? "", trade.symbol ?? "", trade.product ?? ""].join("|");
    const lots = inventory.get(key) ?? [];
    const direction = trade.side === "BUY" ? 1 : -1;
    let remaining = trade.quantity;

    while (remaining > 0 && lots.length > 0 && Math.sign(lots[0].signedQuantity) !== direction) {
      const lot = lots[0];
      const lotQty = Math.abs(lot.signedQuantity);
      const matched = Math.min(remaining, lotQty);
      realizedPnl += lot.signedQuantity > 0
        ? (trade.price - lot.price) * matched
        : (lot.price - trade.price) * matched;
      matchedQuantity += matched;
      lot.signedQuantity += direction * matched;
      remaining -= matched;
      if (Math.abs(lot.signedQuantity) < 1e-9) lots.shift();
    }

    if (remaining > 0) {
      lots.push({ signedQuantity: direction * remaining, price: trade.price });
    }
    inventory.set(key, lots);
  }

  return {
    value: Math.round((realizedPnl + Number.EPSILON) * 100) / 100,
    matchedQuantity,
    skippedTrades,
    basis: "FIFO_GROSS_TRADEBOOK_ONLY",
    chargesIncluded: false,
  };
}

export function summarizePnl(positions, trades, { positionSnapshotComplete = true } = {}) {
  // `positions` may include flat rows so broker-reported realised values are not
  // accidentally discarded just because net quantity is zero.
  const allPositions = [...positions];
  const open = allPositions.filter((position) => position.isOpen !== false && position.netQuantity !== 0);
  const allHaveBrokerPnl = open.every((position) => position.brokerReportedPnl !== null && position.brokerReportedPnl !== undefined);
  const allHaveEstimate = open.every((position) => position.estimatedOpenPnl !== null && position.estimatedOpenPnl !== undefined);
  const realisedRows = allPositions.filter((position) => position.isActive !== false);
  const allHaveBrokerRealized = realisedRows.length > 0 && realisedRows.every((position) => position.realizedPnl !== null && position.realizedPnl !== undefined);
  const brokerPnlTotal = positionSnapshotComplete && allHaveBrokerPnl
    ? Math.round((open.reduce((sum, position) => sum + position.brokerReportedPnl, 0) + Number.EPSILON) * 100) / 100
    : null;
  const estimatedOpenPnlTotal = positionSnapshotComplete && allHaveEstimate
    ? Math.round((open.reduce((sum, position) => sum + position.estimatedOpenPnl, 0) + Number.EPSILON) * 100) / 100
    : null;
  const brokerRealizedPnlTotal = positionSnapshotComplete && allHaveBrokerRealized
    ? Math.round((realisedRows.reduce((sum, position) => sum + position.realizedPnl, 0) + Number.EPSILON) * 100) / 100
    : null;
  const realizedEstimate = calculateGrossRealizedPnlFifo(trades);

  return {
    currency: "INR",
    openPositionCount: open.length,
    brokerReportedPnlTotal: brokerPnlTotal,
    brokerReportedPnlBasis: "SUM_OF_OPEN_NET_POSITION_ROWS",
    estimatedOpenPnlTotal,
    brokerReportedRealizedPnlTotal: brokerRealizedPnlTotal,
    estimatedGrossRealizedPnlFromAvailableTrades: realizedEstimate.value,
    realizedPnlBasis: realizedEstimate.basis,
    realizedPnlMatchedQuantity: realizedEstimate.matchedQuantity,
    realizedPnlSkippedTrades: realizedEstimate.skippedTrades,
    chargesAndTaxes: null,
    netPnlAfterCharges: null,
    dataQuality: {
      positionSnapshotComplete,
      brokerPnlComplete: brokerPnlTotal !== null,
      estimatedOpenPnlComplete: estimatedOpenPnlTotal !== null,
      brokerRealizedPnlComplete: brokerRealizedPnlTotal !== null,
      tradebookPnlIsGrossAndMayBeIntradayOnly: true,
      chargesAvailable: false,
    },
  };
}
