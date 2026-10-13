import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { mergeOrderState } from "./order-state.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.resolve(MODULE_DIR, "..", "data", "execution.sqlite");

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS execution_orders (
  broker TEXT NOT NULL,
  account_key TEXT NOT NULL,
  record_key TEXT NOT NULL,
  client_request_id TEXT,
  broker_order_id TEXT,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL DEFAULT '',
  order_type TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  limit_price REAL,
  trigger_price REAL,
  filled_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL DEFAULT 0,
  average_fill_price REAL,
  status TEXT NOT NULL,
  raw_status TEXT,
  status_message TEXT,
  order_time TEXT,
  raw_json TEXT,
  is_local INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (broker, account_key, record_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS execution_orders_broker_order_id_uq
  ON execution_orders(broker, account_key, broker_order_id)
  WHERE broker_order_id IS NOT NULL AND broker_order_id <> '';
CREATE UNIQUE INDEX IF NOT EXISTS execution_orders_client_request_id_uq
  ON execution_orders(broker, account_key, client_request_id)
  WHERE client_request_id IS NOT NULL AND client_request_id <> '';
CREATE INDEX IF NOT EXISTS execution_orders_status_idx
  ON execution_orders(broker, account_key, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS execution_trades (
  broker TEXT NOT NULL,
  account_key TEXT NOT NULL,
  trade_key TEXT NOT NULL,
  broker_trade_id TEXT,
  broker_order_id TEXT,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  price REAL,
  trade_value REAL,
  trade_time TEXT,
  raw_json TEXT,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (broker, account_key, trade_key)
);
CREATE INDEX IF NOT EXISTS execution_trades_time_idx
  ON execution_trades(broker, account_key, trade_time DESC);

CREATE TABLE IF NOT EXISTS execution_positions (
  broker TEXT NOT NULL,
  account_key TEXT NOT NULL,
  position_key TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  net_quantity INTEGER NOT NULL DEFAULT 0,
  average_price REAL,
  ltp REAL,
  broker_reported_pnl REAL,
  estimated_open_pnl REAL,
  pnl REAL,
  pnl_source TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  realized_pnl REAL,
  unrealized_pnl REAL,
  is_open INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  as_of TEXT NOT NULL,
  raw_json TEXT,
  PRIMARY KEY (broker, account_key, position_key)
);
CREATE INDEX IF NOT EXISTS execution_positions_active_idx
  ON execution_positions(broker, account_key, is_active, is_open);

CREATE TABLE IF NOT EXISTS execution_sync_state (
  broker TEXT NOT NULL,
  account_key TEXT NOT NULL,
  resource TEXT NOT NULL,
  last_attempt_at TEXT NOT NULL,
  last_success_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  record_count INTEGER,
  PRIMARY KEY (broker, account_key, resource)
);

CREATE TABLE IF NOT EXISTS execution_order_events (
  event_id TEXT PRIMARY KEY,
  broker TEXT NOT NULL,
  account_key TEXT NOT NULL,
  record_key TEXT NOT NULL,
  broker_order_id TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  source TEXT NOT NULL,
  event_at TEXT NOT NULL,
  details_json TEXT
);
CREATE INDEX IF NOT EXISTS execution_order_events_order_idx
  ON execution_order_events(broker, account_key, record_key, event_at DESC);
`;

function jsonOrNull(value) {
  try { return value === undefined ? null : JSON.stringify(value); }
  catch { return null; }
}

function viewOrderRow(row) {
  if (!row) return null;
  return {
    broker: row.broker,
    accountKey: row.account_key,
    recordKey: row.record_key,
    clientRequestId: row.client_request_id,
    brokerOrderId: row.broker_order_id,
    symbol: row.symbol,
    exchange: row.exchange,
    product: row.product,
    side: row.side,
    orderType: row.order_type,
    quantity: row.quantity,
    limitPrice: row.limit_price,
    triggerPrice: row.trigger_price,
    filledQuantity: row.filled_quantity,
    remainingQuantity: row.remaining_quantity,
    averageFillPrice: row.average_fill_price,
    status: row.status,
    rawStatus: row.raw_status,
    statusMessage: row.status_message,
    orderTime: row.order_time,
    isLocal: Boolean(row.is_local),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getRecordKey(order) {
  return order.brokerOrderId ? String(order.brokerOrderId) : `local:${order.clientRequestId ?? randomUUID()}`;
}

export class ExecutionStore {
  constructor({ db = null, dbPath = process.env.AJ_EXECUTION_DB_PATH || DEFAULT_DB_PATH } = {}) {
    if (db) {
      this.db = db;
      this.dbPath = dbPath;
    } else {
      if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
      this.db = new Database(dbPath);
      this.dbPath = dbPath;
    }
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(SCHEMA);
    this._prepareStatements();
  }

  _prepareStatements() {
    this.readOrder = this.db.prepare(
      "SELECT * FROM execution_orders WHERE broker = ? AND account_key = ? AND record_key = ?",
    );
    this.upsertOrder = this.db.prepare(`
      INSERT INTO execution_orders (
        broker, account_key, record_key, client_request_id, broker_order_id,
        symbol, exchange, product, side, order_type, quantity, limit_price,
        trigger_price, filled_quantity, remaining_quantity, average_fill_price,
        status, raw_status, status_message, order_time, raw_json, is_local,
        created_at, updated_at
      ) VALUES (
        @broker, @accountKey, @recordKey, @clientRequestId, @brokerOrderId,
        @symbol, @exchange, @product, @side, @orderType, @quantity, @limitPrice,
        @triggerPrice, @filledQuantity, @remainingQuantity, @averageFillPrice,
        @status, @rawStatus, @statusMessage, @orderTime, @rawJson, @isLocal,
        @createdAt, @updatedAt
      ) ON CONFLICT(broker, account_key, record_key) DO UPDATE SET
        client_request_id = excluded.client_request_id,
        broker_order_id = excluded.broker_order_id,
        symbol = excluded.symbol,
        exchange = excluded.exchange,
        product = excluded.product,
        side = excluded.side,
        order_type = excluded.order_type,
        quantity = excluded.quantity,
        limit_price = excluded.limit_price,
        trigger_price = excluded.trigger_price,
        filled_quantity = excluded.filled_quantity,
        remaining_quantity = excluded.remaining_quantity,
        average_fill_price = excluded.average_fill_price,
        status = excluded.status,
        raw_status = excluded.raw_status,
        status_message = excluded.status_message,
        order_time = COALESCE(execution_orders.order_time, excluded.order_time),
        raw_json = excluded.raw_json,
        is_local = excluded.is_local,
        updated_at = excluded.updated_at
    `);
    this.insertEvent = this.db.prepare(`
      INSERT INTO execution_order_events (
        event_id, broker, account_key, record_key, broker_order_id,
        event_type, from_status, to_status, source, event_at, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.upsertTrade = this.db.prepare(`
      INSERT INTO execution_trades (
        broker, account_key, trade_key, broker_trade_id, broker_order_id,
        symbol, exchange, product, side, quantity, price, trade_value,
        trade_time, raw_json, fetched_at
      ) VALUES (
        @broker, @accountKey, @tradeKey, @brokerTradeId, @brokerOrderId,
        @symbol, @exchange, @product, @side, @quantity, @price, @tradeValue,
        @timestamp, @rawJson, @fetchedAt
      ) ON CONFLICT(broker, account_key, trade_key) DO UPDATE SET
        broker_trade_id = excluded.broker_trade_id,
        broker_order_id = excluded.broker_order_id,
        symbol = excluded.symbol,
        exchange = excluded.exchange,
        product = excluded.product,
        side = excluded.side,
        quantity = excluded.quantity,
        price = excluded.price,
        trade_value = excluded.trade_value,
        trade_time = excluded.trade_time,
        raw_json = excluded.raw_json,
        fetched_at = excluded.fetched_at
    `);
    this.upsertPosition = this.db.prepare(`
      INSERT INTO execution_positions (
        broker, account_key, position_key, symbol, exchange, product,
        net_quantity, average_price, ltp, broker_reported_pnl, estimated_open_pnl,
        pnl, pnl_source, realized_pnl, unrealized_pnl, is_open, is_active, as_of, raw_json
      ) VALUES (
        @broker, @accountKey, @positionKey, @symbol, @exchange, @product,
        @netQuantity, @averagePrice, @ltp, @brokerReportedPnl, @estimatedOpenPnl,
        @pnl, @pnlSource, @realizedPnl, @unrealizedPnl, @isOpen, 1, @asOf, @rawJson
      ) ON CONFLICT(broker, account_key, position_key) DO UPDATE SET
        symbol = excluded.symbol,
        exchange = excluded.exchange,
        product = excluded.product,
        net_quantity = excluded.net_quantity,
        average_price = excluded.average_price,
        ltp = excluded.ltp,
        broker_reported_pnl = excluded.broker_reported_pnl,
        estimated_open_pnl = excluded.estimated_open_pnl,
        pnl = excluded.pnl,
        pnl_source = excluded.pnl_source,
        realized_pnl = excluded.realized_pnl,
        unrealized_pnl = excluded.unrealized_pnl,
        is_open = excluded.is_open,
        is_active = 1,
        as_of = excluded.as_of,
        raw_json = excluded.raw_json
    `);
    this.upsertSyncState = this.db.prepare(`
      INSERT INTO execution_sync_state (
        broker, account_key, resource, last_attempt_at, last_success_at,
        last_error_code, last_error_message, record_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(broker, account_key, resource) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at,
        last_success_at = COALESCE(excluded.last_success_at, execution_sync_state.last_success_at),
        last_error_code = excluded.last_error_code,
        last_error_message = excluded.last_error_message,
        record_count = COALESCE(excluded.record_count, execution_sync_state.record_count)
    `);
  }

  upsertBrokerOrders(broker, accountKey, orders, fetchedAt = new Date().toISOString()) {
    let changed = 0;
    const transaction = this.db.transaction(() => {
      for (const order of orders) {
        if (!order.brokerOrderId) continue;
        const recordKey = String(order.brokerOrderId);
        const priorRow = this.readOrder.get(broker, accountKey, recordKey);
        const prior = priorRow ? {
          broker: priorRow.broker,
          accountKey: priorRow.account_key,
          recordKey: priorRow.record_key,
          clientRequestId: priorRow.client_request_id,
          brokerOrderId: priorRow.broker_order_id,
          symbol: priorRow.symbol,
          exchange: priorRow.exchange,
          product: priorRow.product,
          side: priorRow.side,
          orderType: priorRow.order_type,
          quantity: priorRow.quantity,
          limitPrice: priorRow.limit_price,
          triggerPrice: priorRow.trigger_price,
          filledQuantity: priorRow.filled_quantity,
          remainingQuantity: priorRow.remaining_quantity,
          averageFillPrice: priorRow.average_fill_price,
          status: priorRow.status,
          rawStatus: priorRow.raw_status,
          statusMessage: priorRow.status_message,
          orderTime: priorRow.order_time,
          raw: priorRow.raw_json ? JSON.parse(priorRow.raw_json) : null,
        } : null;
        const merged = mergeOrderState(prior, order);
        const createdAt = priorRow?.created_at ?? fetchedAt;
        const params = {
          broker,
          accountKey,
          recordKey,
          clientRequestId: order.clientRequestId ?? priorRow?.client_request_id ?? null,
          brokerOrderId: order.brokerOrderId,
          symbol: merged.symbol || "",
          exchange: merged.exchange || "",
          product: merged.product || "",
          side: merged.side || "",
          orderType: merged.orderType || "",
          quantity: Math.max(0, Math.trunc(Number(merged.quantity ?? 0))),
          limitPrice: merged.limitPrice ?? null,
          triggerPrice: merged.triggerPrice ?? null,
          filledQuantity: Math.max(0, Math.trunc(Number(merged.filledQuantity ?? 0))),
          remainingQuantity: Math.max(0, Math.trunc(Number(merged.remainingQuantity ?? 0))),
          averageFillPrice: merged.averageFillPrice ?? null,
          status: merged.status || "UNKNOWN",
          rawStatus: merged.rawStatus ?? null,
          statusMessage: merged.statusMessage ?? null,
          orderTime: merged.orderTime ?? null,
          rawJson: jsonOrNull(order.raw),
          isLocal: 0,
          createdAt,
          updatedAt: fetchedAt,
        };
        this.upsertOrder.run(params);
        if (!priorRow || String(priorRow.status) !== String(params.status)) {
          this.insertEvent.run(
            randomUUID(), broker, accountKey, recordKey, order.brokerOrderId,
            priorRow ? "BROKER_STATUS_CHANGED" : "BROKER_ORDER_DISCOVERED",
            priorRow?.status ?? null, params.status, "BROKER_RECONCILIATION", fetchedAt,
            jsonOrNull({ quantity: params.quantity, filledQuantity: params.filledQuantity, rawStatus: params.rawStatus }),
          );
        }
        changed += 1;
      }
    });
    transaction();
    return changed;
  }

  createDryRunOrder(broker, accountKey, orderRequest, now = new Date().toISOString()) {
    const existing = this.db.prepare(`
      SELECT * FROM execution_orders
      WHERE broker = ? AND account_key = ? AND client_request_id = ?
      LIMIT 1
    `).get(broker, accountKey, orderRequest.clientRequestId);
    if (existing) return { order: viewOrderRow(existing), idempotentReplay: true };

    const recordKey = `local:${orderRequest.clientRequestId}`;
    const row = {
      broker,
      accountKey,
      recordKey,
      clientRequestId: orderRequest.clientRequestId,
      brokerOrderId: null,
      symbol: orderRequest.symbol,
      exchange: orderRequest.exchange,
      product: orderRequest.product,
      side: orderRequest.side,
      orderType: orderRequest.orderType,
      quantity: orderRequest.quantity,
      limitPrice: orderRequest.limitPrice,
      triggerPrice: orderRequest.triggerPrice,
      filledQuantity: 0,
      remainingQuantity: orderRequest.quantity,
      averageFillPrice: null,
      status: "DRY_RUN",
      rawStatus: null,
      statusMessage: "Simulation only. No broker request was sent.",
      orderTime: now,
      rawJson: jsonOrNull({ dryRun: true, source: "AJ_EXECUTION_SERVICE" }),
      isLocal: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.upsertOrder.run(row);
    this.insertEvent.run(randomUUID(), broker, accountKey, recordKey, null, "DRY_RUN_INTENT_CREATED", null, "DRY_RUN", "LOCAL_SIMULATION", now, jsonOrNull({ clientRequestId: row.clientRequestId }));
    return { order: viewOrderRow(this.readOrder.get(broker, accountKey, recordKey)), idempotentReplay: false };
  }

  upsertBrokerTrades(broker, accountKey, trades, fetchedAt = new Date().toISOString()) {
    const transaction = this.db.transaction(() => {
      for (const trade of trades) {
        if (!trade.tradeKey) continue;
        this.upsertTrade.run({
          ...trade,
          broker,
          accountKey,
          rawJson: jsonOrNull(trade.raw),
          fetchedAt,
        });
      }
    });
    transaction();
    return trades.length;
  }

  replacePositionSnapshot(broker, accountKey, positions, fetchedAt = new Date().toISOString()) {
    const transaction = this.db.transaction(() => {
      this.db.prepare(`UPDATE execution_positions SET is_active = 0 WHERE broker = ? AND account_key = ?`).run(broker, accountKey);
      for (const position of positions) {
        if (!position.positionKey) continue;
        this.upsertPosition.run({
          ...position,
          broker,
          accountKey,
          isOpen: position.isOpen ? 1 : 0,
          asOf: position.asOf || fetchedAt,
          rawJson: jsonOrNull(position.raw),
        });
      }
    });
    transaction();
    return positions.length;
  }

  updateSyncState({ broker, accountKey, resource, attemptedAt = new Date().toISOString(), success = false, errorCode = null, errorMessage = null, recordCount = null }) {
    this.upsertSyncState.run(
      broker,
      accountKey,
      resource,
      attemptedAt,
      success ? attemptedAt : null,
      success ? null : errorCode,
      success ? null : errorMessage,
      recordCount,
    );
  }

  getSyncState(broker, accountKey) {
    return this.db.prepare(`
      SELECT resource, last_attempt_at AS lastAttemptAt, last_success_at AS lastSuccessAt,
             last_error_code AS lastErrorCode, last_error_message AS lastErrorMessage,
             record_count AS recordCount
      FROM execution_sync_state WHERE broker = ? AND account_key = ? ORDER BY resource
    `).all(broker, accountKey);
  }

  getOrders(broker, accountKey, limit = 500) {
    return this.db.prepare(`
      SELECT * FROM execution_orders WHERE broker = ? AND account_key = ?
      ORDER BY COALESCE(order_time, updated_at) DESC LIMIT ?
    `).all(broker, accountKey, limit).map(viewOrderRow);
  }

  getTrades(broker, accountKey, limit = 1000) {
    return this.db.prepare(`
      SELECT broker, account_key AS accountKey, trade_key AS tradeKey,
             broker_trade_id AS brokerTradeId, broker_order_id AS brokerOrderId,
             symbol, exchange, product, side, quantity, price, trade_value AS tradeValue,
             trade_time AS timestamp, fetched_at AS fetchedAt
      FROM execution_trades WHERE broker = ? AND account_key = ?
      ORDER BY trade_time DESC LIMIT ?
    `).all(broker, accountKey, limit);
  }

  getPositions(broker, accountKey, { includeFlat = false } = {}) {
    const flatClause = includeFlat ? "" : " AND is_open = 1";
    return this.db.prepare(`
      SELECT broker, account_key AS accountKey, position_key AS positionKey,
             symbol, exchange, product, net_quantity AS netQuantity,
             average_price AS averagePrice, ltp, broker_reported_pnl AS brokerReportedPnl,
             estimated_open_pnl AS estimatedOpenPnl, pnl, pnl_source AS pnlSource,
             realized_pnl AS realizedPnl, unrealized_pnl AS unrealizedPnl,
             is_open AS isOpen, is_active AS isActive, as_of AS asOf
      FROM execution_positions WHERE broker = ? AND account_key = ? AND is_active = 1${flatClause}
      ORDER BY symbol
    `).all(broker, accountKey).map((row) => ({ ...row, isOpen: Boolean(row.isOpen), isActive: Boolean(row.isActive) }));
  }

  getOrderEvents(broker, accountKey, limit = 200) {
    return this.db.prepare(`
      SELECT event_id AS eventId, broker, account_key AS accountKey,
             record_key AS recordKey, broker_order_id AS brokerOrderId,
             event_type AS eventType, from_status AS fromStatus,
             to_status AS toStatus, source, event_at AS eventAt
      FROM execution_order_events WHERE broker = ? AND account_key = ?
      ORDER BY event_at DESC LIMIT ?
    `).all(broker, accountKey, limit);
  }

  close() {
    this.db.close();
  }
}

let singleton;
export function getExecutionStore() {
  if (!singleton) singleton = new ExecutionStore();
  return singleton;
}

export function resetExecutionStoreForTests() {
  if (singleton) singleton.close();
  singleton = null;
}
