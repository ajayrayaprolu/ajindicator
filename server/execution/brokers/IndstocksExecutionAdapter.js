import { BrokerExecutionAdapter, BrokerAdapterError } from "../adapter-contract.js";

/**
 * IndStocks adapter contract placeholder.
 *
 * The supplied audit explicitly marks order/position/history/WebSocket URLs as
 * unconfirmed in the AJ Python client. We therefore declare the capabilities but
 * do not send requests to guessed endpoints and do not register this adapter for
 * account reconciliation. Wire it only after its official request/response schema
 * is verified for the exact AJ account/API product.
 */
export class IndstocksExecutionAdapter extends BrokerExecutionAdapter {
  constructor() {
    super("indstocks", {
      ordersRead: false,
      tradesRead: false,
      positionsRead: false,
      orderUpdateStream: false,
      liveSubmit: false,
      cancel: false,
      modify: false,
    });
  }

  _unverified(resource) {
    throw new BrokerAdapterError(`IndStocks ${resource} integration is blocked until the endpoint and payload contract is verified.`, {
      broker: "indstocks",
      resource,
      code: "BROKER_CAPABILITY_UNVERIFIED",
      httpStatus: 501,
    });
  }

  async getOrders() { return this._unverified("order book"); }
  async getTrades() { return this._unverified("trade book"); }
  async getPositions() { return this._unverified("position book"); }
}

export default IndstocksExecutionAdapter;
