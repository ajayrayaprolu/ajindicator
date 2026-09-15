import type {
  ScanResult
}
from "./ScannerTypes";

import {
  CandidateEngine
}
from "./CandidateEngine";

import {
  MultiFactorDecisionEngine
}
from "./MultiFactorDecisionEngine";

export class AIHost {

  static run(

    scans: ScanResult[]

  ) {

    const candidates =

      CandidateEngine.selectTop(
        scans,
        20
      );

    return MultiFactorDecisionEngine.rank(
      candidates
    );

  }

}
