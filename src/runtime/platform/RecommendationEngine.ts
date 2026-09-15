import type {
  ScanResult
}
from "../../scanner/ScannerTypes";

export class RecommendationEngine {

  static build(

    scans: ScanResult[]

  ) {

    return scans

      .sort(

        (a, b) =>

          b.score - a.score

      )

      .slice(0, 5);

  }

}

