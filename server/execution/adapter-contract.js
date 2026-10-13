export class BrokerAdapterError extends Error {
  constructor(message, { broker = "unknown", resource = "unknown", code = "ADAPTER_ERROR", httpStatus = 502, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "BrokerAdapterError";
    this.broker = broker;
    this.resource = resource;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const REQUIRED_READ_METHODS = Object.freeze(["getOrders", "getTrades", "getPositions"]);

export function assertReadAdapterContract(adapter, expectedBroker) {
  if (!adapter || adapter.broker !== expectedBroker) {
    throw new BrokerAdapterError("Broker adapter identity does not match the requested broker.", {
      broker: expectedBroker,
      resource: "adapter",
      code: "INVALID_ADAPTER_CONTRACT",
      httpStatus: 503,
    });
  }
  const capabilityForMethod = {
    getOrders: "ordersRead",
    getTrades: "tradesRead",
    getPositions: "positionsRead",
  };
  for (const method of REQUIRED_READ_METHODS) {
    if (typeof adapter[method] !== "function") {
      throw new BrokerAdapterError(`Broker adapter is missing required read method: ${method}.`, {
        broker: expectedBroker,
        resource: method,
        code: "INVALID_ADAPTER_CONTRACT",
        httpStatus: 503,
      });
    }
  }
  if (!adapter.capabilities || typeof adapter.capabilities !== "object") {
    throw new BrokerAdapterError("Broker adapter must declare supported capabilities.", {
      broker: expectedBroker,
      resource: "adapter",
      code: "INVALID_ADAPTER_CONTRACT",
      httpStatus: 503,
    });
  }
  for (const [method, capability] of Object.entries(capabilityForMethod)) {
    if (adapter.capabilities[capability] !== true) {
      throw new BrokerAdapterError(`Broker adapter does not declare verified capability ${capability}.`, {
        broker: expectedBroker,
        resource: method,
        code: "BROKER_CAPABILITY_UNVERIFIED",
        httpStatus: 501,
      });
    }
  }
  return adapter;
}

export class BrokerExecutionAdapter {
  constructor(broker, capabilities = {}) {
    this.broker = String(broker ?? "unknown").trim().toLowerCase();
    this.capabilities = Object.freeze({
      ordersRead: false,
      tradesRead: false,
      positionsRead: false,
      orderUpdateStream: false,
      liveSubmit: false,
      cancel: false,
      modify: false,
      ...capabilities,
    });
  }

  _unsupported(resource) {
    throw new BrokerAdapterError(`The ${this.broker} ${resource} capability is not verified/enabled.`, {
      broker: this.broker,
      resource,
      code: "BROKER_CAPABILITY_UNVERIFIED",
      httpStatus: 501,
    });
  }

  async getOrders() { return this._unsupported("order book"); }
  async getTrades() { return this._unsupported("trade book"); }
  async getPositions() { return this._unsupported("position book"); }

  async placeOrder() {
    throw new BrokerAdapterError("Live order submission is disabled in this phase.", {
      broker: this.broker,
      resource: "orders",
      code: "LIVE_EXECUTION_DISABLED",
      httpStatus: 423,
    });
  }

  async cancelOrder() {
    throw new BrokerAdapterError("Live order cancellation is disabled in this phase.", {
      broker: this.broker,
      resource: "orders",
      code: "LIVE_EXECUTION_DISABLED",
      httpStatus: 423,
    });
  }

  async modifyOrder() {
    throw new BrokerAdapterError("Live order modification is disabled in this phase.", {
      broker: this.broker,
      resource: "orders",
      code: "LIVE_EXECUTION_DISABLED",
      httpStatus: 423,
    });
  }
}
