//==================================
// \src\feeds\DataSourceFactory.ts
//=================================

import type { IDataFeed } from "../types/IDataFeed";
import { YahooFeed } from "./YahooFeed";
import { BinanceFeed } from "./BinanceFeed";
import { DhanFeed } from "./DhanFeed";
import { ZerodhaFeed } from "./ZerodhaFeed";
import { UpstoxFeed } from "./UpstoxFeed";
import { AliceblueFeed } from "./AliceblueFeed";
import { TwelveDataFeed } from "./TwelveDataFeed";

//=========================================================
export function getFeed(
  source: string
): IDataFeed {

  switch (source) {

    case "Yahoo":
      return new YahooFeed();

    case "Binance":
      return new BinanceFeed();

    case "Dhan":
      return new DhanFeed();

    case "Zerodha":
      return new ZerodhaFeed();

    case "Upstox":
      return new UpstoxFeed();

    case "AliceBlue":
      return new AliceblueFeed();

    case "TwelveData":
      return new TwelveDataFeed();

    default:
      return new YahooFeed();

  }

}
