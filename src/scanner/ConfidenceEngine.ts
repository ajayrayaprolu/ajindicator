import type {
  ScanResult
}
from "./ScannerTypes";

import {
  InstitutionalScoring
}
from "./InstitutionalScoring";

export class ConfidenceEngine {

  static calculate(
    result: ScanResult
  ): number {

    const score =

      InstitutionalScoring.calculate(
        result
      );

    let confidence =

      score.compositeScore;

    confidence +=
      result.score;

    return Math.min(
      100,
      confidence
    );

  }

}
