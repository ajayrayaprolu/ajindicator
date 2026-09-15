import type {
  ScanResult
} from "./ScannerTypes";

export class ScannerStore {

  private static results:
    ScanResult[] = [];

  static set(
    results: ScanResult[]
  ) {

    this.results =
      results;

  }

  static get() {

    return this.results;

  }

  static clear() {

    this.results = [];

  }

}
