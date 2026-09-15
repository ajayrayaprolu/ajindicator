export class SMCScoringEngine {

  static calculate(
    signals: string[]
  ) {

    let score = 0;

    for (
      const signal
      of signals
    ) {

      if (
        signal.includes(
          "ORDER_BLOCK"
        )
      ) {
        score += 220;
      }

      else if (
        signal.includes(
          "FVG"
        )
      ) {
        score += 200;
      }

      else if (
        signal.includes(
          "MITIGATION"
        )
      ) {
        score += 180;
      }

      else if (
        signal.includes(
          "LIQUIDITY"
        )
      ) {
        score += 150;
      }

      else if (
        signal.includes(
          "CHOCH"
        )
      ) {
        score += 130;
      }

      else if (
        signal.includes(
          "BOS"
        )
      ) {
        score += 110;
      }

    }

    return score;

  }

}
