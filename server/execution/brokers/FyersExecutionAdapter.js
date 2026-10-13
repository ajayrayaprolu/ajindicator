import { getFullAccessToken, isLoggedIn } from "../../fyers/token.js";
import { BrokerExecutionAdapter, BrokerAdapterError } from "../adapter-contract.js";
import {
  normalizeFyersOrders,
  normalizeFyersPositions,
  normalizeFyersTrades,
  BrokerPayloadError,
} from "../normalizers.js";

/**
 * FYERS read/reconciliation adapter.
 *
 * This adapter intentionally has no live order-submit/cancel/modify code path.
 * REST paths and auth header follow the supplied OpenAlgo order_api.py audit:
 * /api/v3/orders, /api/v3/tradebook and /api/v3/positions with appId:token.
 */
export class FyersExecutionAdapter extends BrokerExecutionAdapter {
  constructor({
    fetchImpl = globalThis.fetch,
    baseUrl = process.env.FYERS_API_BASE_URL || "https://api-t1.fyers.in",
    tokenProvider = getFullAccessToken,
    sessionCheck = isLoggedIn,
    timeoutMs = 8_000,
    maxRetries = 2,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = {}) {
    super("fyers", {
      ordersRead: true,
      tradesRead: true,
      positionsRead: true,
      orderUpdateStream: false,
      liveSubmit: false,
      cancel: false,
      modify: false,
    });
    if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");
    this.fetchImpl = fetchImpl;
    this.baseUrl = String(baseUrl).replace(/\/+$/, "");
    this.tokenProvider = tokenProvider;
    this.sessionCheck = sessionCheck;
    this.timeoutMs = timeoutMs;
    this.maxRetries = Math.max(0, Math.min(3, Math.trunc(Number(maxRetries) || 0)));
    this.sleep = sleep;
  }

  _retryDelay(response, attempt) {
    const retryAfter = response?.headers?.get?.("Retry-After");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) return Math.min(10_000, seconds * 1000);
      const when = Date.parse(retryAfter);
      if (Number.isFinite(when)) return Math.max(0, Math.min(10_000, when - Date.now()));
    }
    return Math.min(2_000, 250 * (2 ** attempt));
  }

  async request(resource, endpoint) {
    if (!this.sessionCheck()) {
      throw new BrokerAdapterError("FYERS is not authenticated. Complete broker login first.", {
        broker: "fyers", resource, code: "BROKER_NOT_AUTHENTICATED", httpStatus: 401,
      });
    }

    let authorization;
    try {
      authorization = this.tokenProvider();
    } catch {
      authorization = "";
    }
    if (!authorization || !String(authorization).includes(":")) {
      throw new BrokerAdapterError("FYERS authorization is not available.", {
        broker: "fyers", resource, code: "BROKER_NOT_AUTHENTICATED", httpStatus: 401,
      });
    }

    let response;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
          method: "GET",
          headers: {
            Authorization: String(authorization),
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (cause) {
        const timeout = cause?.name === "TimeoutError" || cause?.name === "AbortError";
        const retryable = timeout || cause instanceof TypeError;
        if (retryable && attempt < this.maxRetries) {
          await this.sleep(Math.min(2_000, 250 * (2 ** attempt)));
          continue;
        }
        throw new BrokerAdapterError(
          timeout ? `FYERS ${resource} request timed out.` : `Unable to reach FYERS ${resource} endpoint.`,
          { broker: "fyers", resource, code: timeout ? "BROKER_TIMEOUT" : "BROKER_NETWORK_ERROR", httpStatus: 502, cause },
        );
      }

      const retryableStatus = response.status === 429 || [500, 502, 503, 504].includes(response.status);
      if (retryableStatus && attempt < this.maxRetries) {
        await this.sleep(this._retryDelay(response, attempt));
        continue;
      }
      break;
    }

    if (!response.ok) {
      const code = `BROKER_HTTP_${response.status}`;
      const unauthorized = response.status === 401 || response.status === 403;
      throw new BrokerAdapterError(
        unauthorized
          ? "FYERS rejected the current session. Re-authenticate and retry."
          : `FYERS ${resource} request failed with HTTP ${response.status}.`,
        { broker: "fyers", resource, code, httpStatus: unauthorized ? 401 : 502 },
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new BrokerAdapterError(`FYERS ${resource} response was not valid JSON.`, {
        broker: "fyers", resource, code: "BROKER_INVALID_JSON", httpStatus: 502, cause,
      });
    }

    const brokerStatus = String(payload?.s ?? payload?.status ?? "").toLowerCase();
    if (brokerStatus === "error" || payload?.success === false) {
      const code = String(payload?.code ?? payload?.errorCode ?? "BROKER_REPORTED_ERROR");
      throw new BrokerAdapterError(`FYERS rejected the ${resource} request (${code}).`, {
        broker: "fyers", resource, code, httpStatus: 502,
      });
    }

    return payload;
  }

  async getOrders() {
    const raw = await this.request("orders", "/api/v3/orders");
    try {
      return normalizeFyersOrders(raw);
    } catch (cause) {
      if (cause instanceof BrokerPayloadError) throw cause;
      throw new BrokerAdapterError("Unable to normalize FYERS order book.", {
        broker: "fyers", resource: "orders", code: "BROKER_PAYLOAD_ERROR", httpStatus: 502, cause,
      });
    }
  }

  async getTrades() {
    const raw = await this.request("trades", "/api/v3/tradebook");
    try {
      return normalizeFyersTrades(raw);
    } catch (cause) {
      if (cause instanceof BrokerPayloadError) throw cause;
      throw new BrokerAdapterError("Unable to normalize FYERS trade book.", {
        broker: "fyers", resource: "trades", code: "BROKER_PAYLOAD_ERROR", httpStatus: 502, cause,
      });
    }
  }

  async getPositions() {
    const raw = await this.request("positions", "/api/v3/positions");
    try {
      return normalizeFyersPositions(raw);
    } catch (cause) {
      if (cause instanceof BrokerPayloadError) throw cause;
      throw new BrokerAdapterError("Unable to normalize FYERS position book.", {
        broker: "fyers", resource: "positions", code: "BROKER_PAYLOAD_ERROR", httpStatus: 502, cause,
      });
    }
  }

  async placeOrder() {
    throw new BrokerAdapterError("Live order submission is disabled in this phase.", {
      broker: "fyers", resource: "orders", code: "LIVE_EXECUTION_DISABLED", httpStatus: 423,
    });
  }

  async cancelOrder() {
    throw new BrokerAdapterError("Live order cancellation is disabled in this phase.", {
      broker: "fyers", resource: "orders", code: "LIVE_EXECUTION_DISABLED", httpStatus: 423,
    });
  }

  async modifyOrder() {
    throw new BrokerAdapterError("Live order modification is disabled in this phase.", {
      broker: "fyers", resource: "orders", code: "LIVE_EXECUTION_DISABLED", httpStatus: 423,
    });
  }
}

export default FyersExecutionAdapter;
