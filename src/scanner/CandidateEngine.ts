// src/scanner/CandidateEngine.ts

import type {
  ScanResult
}
from "./ScannerTypes";

export class CandidateEngine {

  static selectTop(

    scans: ScanResult[],

    count = 10

  ): ScanResult[] {

    return scans

      .sort(

        (a, b) =>

          b.score - a.score

      )

      .slice(
        0,
        count
      );

  }

}
