//====================================
// \src\runtime\StrategyRegistry.ts
//====================================

import {StrategyRuntime} from "./StrategyRuntime";

export class StrategyRegistry {

  private static strategies:
    Record<
      string,
      StrategyRuntime
    > = {};

  static register(

    name: string,

    strategy:
      StrategyRuntime

  ) {

    this.strategies[
      name
    ] = strategy;

  }

  static get(
    name: string
  ) {

    return this.strategies[
      name
    ];

  }

  static list() {

    return Object.keys(
      this.strategies
    );

  }

}

