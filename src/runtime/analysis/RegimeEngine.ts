export type MarketRegime =

  | "TRENDING"
  | "RANGING"
  | "VOLATILE";

export class RegimeEngine {

  static detect(

    adx: number,

    atr: number

  ): MarketRegime {

    if (adx > 25)
      return "TRENDING";

    if (atr > 3)
      return "VOLATILE";

    return "RANGING";

  }

}

