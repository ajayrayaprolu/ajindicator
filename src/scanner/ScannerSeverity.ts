export type ScannerSeverity =

  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "EXTREME";

export class ScannerSeverityEngine {

  static calculate(
    score: number
  ): ScannerSeverity {

    if (score >= 500) {
      return "EXTREME";
    }

    if (score >= 300) {
      return "HIGH";
    }

    if (score >= 150) {
      return "MEDIUM";
    }

    return "LOW";

  }

}
