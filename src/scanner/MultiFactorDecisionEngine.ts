import type {
  ScanResult
}
from "./ScannerTypes";

import {
  InstitutionalCompositeEngine
}
from "./InstitutionalCompositeEngine";

export class MultiFactorDecisionEngine {

  static rank(
    scans: ScanResult[]
  ) {

    return scans

      .map(scan => ({

        ...scan,

        composite:

          InstitutionalCompositeEngine.score(
            scan
          )

      }))

      .sort(

        (a, b) =>

          b.composite -
          a.composite

      );

  }

}
