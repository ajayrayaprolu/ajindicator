const ALLOWED_EXCHANGES = new Set(["NSE", "NFO", "BSE", "BFO", "CDS", "BCD", "MCX"]);
const ALLOWED_PRODUCTS = new Set(["CNC", "MIS", "NRML", "CO", "BO"]);
const ALLOWED_SIDES = new Set(["BUY", "SELL"]);
const ALLOWED_TYPES = new Set(["MARKET", "LIMIT", "SL", "SL-M"]);

export class OrderValidationError extends Error {
  constructor(message, code = "INVALID_ORDER_REQUEST") {
    super(message);
    this.name = "OrderValidationError";
    this.code = code;
    this.httpStatus = 400;
  }
}

function number(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateOrderIntent(input = {}) {
  const symbol = String(input.symbol ?? "").trim();
  const exchange = String(input.exchange ?? "").trim().toUpperCase();
  const product = String(input.product ?? "").trim().toUpperCase();
  const side = String(input.side ?? input.action ?? "").trim().toUpperCase();
  const orderType = String(input.orderType ?? input.pricetype ?? "MARKET").trim().toUpperCase();
  const quantity = number(input.quantity ?? input.qty);
  const limitPrice = number(input.limitPrice ?? input.price);
  const triggerPrice = number(input.triggerPrice ?? input.trigger_price);
  const clientRequestId = String(input.clientRequestId ?? input.client_request_id ?? "").trim();

  if (!symbol || symbol.length > 160) throw new OrderValidationError("A valid canonical symbol is required.", "INVALID_SYMBOL");
  if (!ALLOWED_EXCHANGES.has(exchange)) throw new OrderValidationError("Exchange is missing or unsupported.", "INVALID_EXCHANGE");
  if (!ALLOWED_PRODUCTS.has(product)) throw new OrderValidationError("Product is missing or unsupported.", "INVALID_PRODUCT");
  if (!ALLOWED_SIDES.has(side)) throw new OrderValidationError("Side must be BUY or SELL.", "INVALID_SIDE");
  if (!ALLOWED_TYPES.has(orderType)) throw new OrderValidationError("Order type must be MARKET, LIMIT, SL or SL-M.", "INVALID_ORDER_TYPE");
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1_000_000) {
    throw new OrderValidationError("Quantity must be a positive integer within the configured hard bound.", "INVALID_QUANTITY");
  }
  if (orderType === "LIMIT" && (limitPrice === null || limitPrice <= 0)) {
    throw new OrderValidationError("A positive limit price is required for LIMIT orders.", "INVALID_LIMIT_PRICE");
  }
  if (["SL", "SL-M"].includes(orderType) && (triggerPrice === null || triggerPrice <= 0)) {
    throw new OrderValidationError("A positive trigger price is required for stop orders.", "INVALID_TRIGGER_PRICE");
  }
  if (!clientRequestId || clientRequestId.length > 128) {
    throw new OrderValidationError("clientRequestId is required for idempotency.", "INVALID_CLIENT_REQUEST_ID");
  }

  return {
    symbol,
    exchange,
    product,
    side,
    orderType,
    quantity,
    limitPrice,
    triggerPrice,
    clientRequestId,
  };
}
