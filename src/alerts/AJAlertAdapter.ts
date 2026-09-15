import { AlertDispatcher } from "./AlertDispatcher";

import {
  AlertCategory,
  AlertSeverity
} from "./AlertTypes";

export class AJAlertAdapter {

  static tradeExecuted(

    symbol: string,

    direction: string,

    entry: number

  ): void {

    AlertDispatcher.dispatch(

      "Trade Executed",

      `${direction} @ ${entry}`,

      AlertSeverity.SUCCESS,

      AlertCategory.EXECUTION,

      symbol
    );
  }

  static optionRecommended(

    symbol: string,

    optionSymbol: string

  ): void {

    AlertDispatcher.dispatch(

      "Option Recommendation",

      optionSymbol,

      AlertSeverity.INFO,

      AlertCategory.OPTIONS,

      symbol
    );
  }

  static reEntry(

    symbol: string,

    price: number

  ): void {

    AlertDispatcher.dispatch(

      "Re-Entry Triggered",

      `Re-entry @ ${price}`,

      AlertSeverity.SUCCESS,

      AlertCategory.LIFECYCLE,

      symbol
    );
  }

  static tp1Hit(
    symbol: string
  ): void {

    AlertDispatcher.dispatch(

      "TP1 Hit",

      "30% Exit Zone",

      AlertSeverity.SUCCESS,

      AlertCategory.LIFECYCLE,

      symbol
    );
  }

  static tp2Hit(
    symbol: string
  ): void {

    AlertDispatcher.dispatch(

      "TP2 Hit",

      "70% Exit Zone",

      AlertSeverity.SUCCESS,

      AlertCategory.LIFECYCLE,

      symbol
    );
  }

  static tp3Hit(
    symbol: string
  ): void {

    AlertDispatcher.dispatch(

      "TP3 Hit",

      "Final Target Reached",

      AlertSeverity.SUCCESS,

      AlertCategory.LIFECYCLE,

      symbol
    );
  }

  static stopLossHit(
    symbol: string
  ): void {

    AlertDispatcher.dispatch(

      "Stop Loss Hit",

      "Trade Closed",

      AlertSeverity.ERROR,

      AlertCategory.RISK,

      symbol
    );
  }

  static sessionExit(
    symbol: string
  ): void {

    AlertDispatcher.dispatch(

      "Session Exit",

      "Forced Session Close",

      AlertSeverity.WARNING,

      AlertCategory.RISK,

      symbol
    );
  }
}
