import { FyersExecutionAdapter } from "./brokers/FyersExecutionAdapter.js";
import { assertReadAdapterContract } from "./adapter-contract.js";
import { summarizePnl } from "./normalizers.js";
import { validateOrderIntent } from "./validation.js";

// Intentionally hard-coded off for this rollout. Do not make this env-overridable
// until account reconciliation, dry-run, duplicate prevention, risk gates and exit
// safety tests have passed in the actual broker account.
export const LIVE_ORDER_SUBMISSION_ENABLED = false;
export const SUPPORTED_READ_BROKERS = Object.freeze(["fyers"]);

export class ExecutionServiceError extends Error {
  constructor(message, { code = "EXECUTION_SERVICE_ERROR", httpStatus = 500, details = null } = {}) {
    super(message);
    this.name = "ExecutionServiceError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

function sanitizeReadError(error) {
  return {
    code: String(error?.code ?? "BROKER_READ_FAILED"),
    message: String(error?.message ?? "Broker read failed."),
    httpStatus: Number(error?.httpStatus ?? 502),
  };
}

export class ExecutionService {
  constructor({
    store = null,
    adapterFactory = (broker) => broker === "fyers" ? new FyersExecutionAdapter() : null,
    accountKey = process.env.AJ_EXECUTION_ACCOUNT_KEY || "primary",
    minimumSyncIntervalMs = 3_000,
    clock = () => Date.now(),
  } = {}) {
    this.store = store;
    this.adapterFactory = adapterFactory;
    this.accountKey = accountKey;
    this.minimumSyncIntervalMs = minimumSyncIntervalMs;
    this.clock = clock;
    this.lastSyncStarted = new Map();
    this.inFlightSync = new Map();
  }

  _store() {
    if (!this.store) {
      throw new ExecutionServiceError("Execution store has not been initialized.", {
        code: "EXECUTION_STORE_UNAVAILABLE", httpStatus: 503,
      });
    }
    return this.store;
  }

  _checkBroker(broker) {
    const name = String(broker ?? "fyers").trim().toLowerCase();
    if (!SUPPORTED_READ_BROKERS.includes(name)) {
      throw new ExecutionServiceError(
        `The ${name || "requested"} broker has no verified read adapter enabled.`,
        { code: "BROKER_NOT_SUPPORTED", httpStatus: 501 },
      );
    }
    return name;
  }

  getStoredSnapshot(broker = "fyers") {
    const name = this._checkBroker(broker);
    const store = this._store();
    const orders = store.getOrders(name, this.accountKey);
    const trades = store.getTrades(name, this.accountKey);
    const allPositions = store.getPositions(name, this.accountKey, { includeFlat: true });
    const positions = allPositions.filter((position) => position.isOpen !== false && position.netQuantity !== 0);
    const sync = store.getSyncState(name, this.accountKey);
    const positionsState = sync.find((row) => row.resource === "positions");
    const positionSnapshotComplete = Boolean(
      positionsState?.lastSuccessAt && !positionsState?.lastErrorCode,
    );

    return {
      success: true,
      broker: name,
      accountKey: this.accountKey,
      readOnly: true,
      liveOrderSubmissionEnabled: LIVE_ORDER_SUBMISSION_ENABLED,
      data: {
        orders,
        trades,
        positions,
        pnl: summarizePnl(allPositions, trades, { positionSnapshotComplete }),
      },
      sync,
      source: "PERSISTED_BROKER_RECONCILIATION",
      returnedAt: new Date(this.clock()).toISOString(),
    };
  }

  async syncSnapshot(broker = "fyers", { force = false } = {}) {
    const name = this._checkBroker(broker);
    if (this.inFlightSync.has(name)) return this.inFlightSync.get(name);

    const now = this.clock();
    const priorStart = this.lastSyncStarted.get(name) ?? 0;
    if (!force && now - priorStart < this.minimumSyncIntervalMs) {
      return { ...this.getStoredSnapshot(name), refresh: { skipped: true, reason: "MINIMUM_SYNC_INTERVAL" } };
    }

    this.lastSyncStarted.set(name, now);
    const task = this._performSync(name);
    this.inFlightSync.set(name, task);
    try {
      return await task;
    } finally {
      if (this.inFlightSync.get(name) === task) this.inFlightSync.delete(name);
    }
  }

  async _performSync(broker) {
    const store = this._store();
    let adapter;
    try {
      adapter = this.adapterFactory(broker);
    } catch (error) {
      throw new ExecutionServiceError("Could not initialize the broker read adapter.", {
        code: "BROKER_ADAPTER_INIT_FAILED", httpStatus: 503,
      });
    }
    if (!adapter) {
      throw new ExecutionServiceError(`No verified read adapter is available for ${broker}.`, {
        code: "BROKER_NOT_SUPPORTED", httpStatus: 501,
      });
    }
    try {
      assertReadAdapterContract(adapter, broker);
    } catch (error) {
      throw new ExecutionServiceError(error.message, {
        code: error.code ?? "INVALID_ADAPTER_CONTRACT",
        httpStatus: error.httpStatus ?? 503,
      });
    }

    const accountKey = this.accountKey;
    const resources = [
      ["orders", () => adapter.getOrders(), (rows, at) => store.upsertBrokerOrders(broker, accountKey, rows, at)],
      ["trades", () => adapter.getTrades(), (rows, at) => store.upsertBrokerTrades(broker, accountKey, rows, at)],
      ["positions", () => adapter.getPositions(), (rows, at) => store.replacePositionSnapshot(broker, accountKey, rows, at)],
    ];

    // Each resource is independently reconciled. If, for example, position read
    // fails, we preserve the previous stored snapshot and mark it stale/failed;
    // we never interpret a read failure as an empty position book.
    const results = await Promise.all(resources.map(async ([resource, read, persist]) => {
      const attemptedAt = new Date().toISOString();
      try {
        const rows = await read();
        if (!Array.isArray(rows)) {
          throw new ExecutionServiceError(`Broker ${resource} adapter did not return a list.`, {
            code: "INVALID_ADAPTER_RESULT", httpStatus: 502,
          });
        }
        const recordCount = persist(rows, attemptedAt);
        store.updateSyncState({
          broker, accountKey, resource, attemptedAt, success: true, recordCount,
        });
        return { resource, status: "success", recordCount, lastSuccessAt: attemptedAt };
      } catch (error) {
        const safe = sanitizeReadError(error);
        store.updateSyncState({
          broker,
          accountKey,
          resource,
          attemptedAt,
          success: false,
          errorCode: safe.code,
          errorMessage: safe.message,
          recordCount: null,
        });
        return { resource, status: "error", error: safe };
      }
    }));

    const snapshot = this.getStoredSnapshot(broker);
    snapshot.refresh = {
      skipped: false,
      resources: results,
      hasErrors: results.some((result) => result.status === "error"),
    };
    return snapshot;
  }

  createDryRunOrderIntent({ broker = "fyers", order = {} } = {}) {
    const name = this._checkBroker(broker);
    if (order?.dryRun !== true) {
      throw new ExecutionServiceError(
        "Live orders are disabled. Submit dryRun: true to create a local simulation intent.",
        { code: "LIVE_EXECUTION_DISABLED", httpStatus: 423 },
      );
    }
    if (LIVE_ORDER_SUBMISSION_ENABLED) {
      // Deliberately unreachable in this rollout; the constant is hard-coded off.
      throw new ExecutionServiceError("Live orders are disabled in this rollout.", {
        code: "LIVE_EXECUTION_DISABLED", httpStatus: 423,
      });
    }

    const validated = validateOrderIntent(order);
    const result = this._store().createDryRunOrder(name, this.accountKey, validated);
    return {
      success: true,
      broker: name,
      liveOrderSubmitted: false,
      simulationOnly: true,
      idempotentReplay: result.idempotentReplay,
      order: result.order,
      message: "Simulation intent recorded locally. No broker request was sent.",
    };
  }

  rejectLiveOrderMutation() {
    throw new ExecutionServiceError(
      "Live order submission, modification and cancellation are disabled pending safety validation.",
      { code: "LIVE_EXECUTION_DISABLED", httpStatus: 423 },
    );
  }
}

let singleton;
export async function getExecutionService() {
  if (!singleton) {
    const { getExecutionStore } = await import("./store.js");
    singleton = new ExecutionService({ store: getExecutionStore() });
  }
  return singleton;
}
