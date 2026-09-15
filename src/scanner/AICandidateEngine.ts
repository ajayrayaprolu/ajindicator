import type {
  ScanResult
}
from "./ScannerTypes";

import {
  ConfidenceEngine
}
from "./ConfidenceEngine";

export interface AICandidate {

  symbol: string;

  signal: string;

  confidence: number;

  score: number;

}

export class AICandidateEngine {

  static rank(

    scans: ScanResult[]

  ): AICandidate[] {

    return scans

      .map(scan => ({

        symbol:
          scan.symbol,

        signal:
          scan.signal,

        score:
          scan.score,

        confidence:

          ConfidenceEngine.calculate(
            scan
          )

      }))

      .sort(

        (a, b) =>

          b.confidence -
          a.confidence

      );

  }

}
