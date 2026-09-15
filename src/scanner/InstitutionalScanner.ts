import type {
  ScanResult
}
from "./ScannerTypes";

import {
  AICandidateEngine
}
from "./AICandidateEngine";

export class InstitutionalScanner {

  static selectBest(

    scans: ScanResult[]

  ) {

    const ranked =

      AICandidateEngine.rank(
        scans
      );

    return ranked.slice(
      0,
      10
    );

  }

}
