import type {
  ScanResult
}
from "./ScannerTypes";

import {
  InstitutionalScoring
}
from "./InstitutionalScoring";

export class InstitutionalCompositeEngine {

  static score(
    scan: ScanResult
  ): number {

    const score =

      InstitutionalScoring.calculate(
        scan
      );

    return (

      score.trendScore +
      score.momentumScore +
      score.volatilityScore +
      score.liquidityScore

    );

  }

}
