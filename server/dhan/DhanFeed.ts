import axios from "axios";

import { mapSymbol }
from "./SymbolMapper";

import type { Candle }
from "../types/Candle";

import { DhanConfig }
from "../auth/DhanAuth";

export class DhanFeed {

  async getHistory(
    symbol: string
  ): Promise<Candle[]> {

    const securityId =
      mapSymbol(
        symbol,
        "dhan"
      );

    const response =
      await axios.post(

        "https://api.dhan.co/charts/historical",

        {
          securityId,
          exchangeSegment: "NSE_EQ",
          interval: "1"
        },

        {
          headers: {
            "access-token":
              DhanConfig.accessToken,

            "client-id":
              DhanConfig.clientId
          }
        }
      );

    return response.data;
  }
}
