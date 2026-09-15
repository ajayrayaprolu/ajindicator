import type {
  StrategyTemplate
}
from "./StrategyTemplate";

export class StrategyFactory {

  static create(
    template:
      StrategyTemplate
  ) {

    return {

      name:
        template.name,

      rules:
        template.conditions

    };

  }

}
