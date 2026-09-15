import {
  ScannerEngine
}
from "./ScannerEngine";

import type {
  ScanResult
}
from "./ScannerTypes";

export class MultiTimeframeScanner {

  static async scan(

    symbols: string[],

    datasource: string

  ): Promise<ScanResult[]> {

    const timeframes = [

      "5m",
      "15m",
      "1h"

    ];

    const results:
      ScanResult[] = [];

    for (
      const tf
      of timeframes
    ) {

      const scans =
        await ScannerEngine.scan(
          symbols,
          tf,
          datasource
        );

      results.push(
        ...scans
      );

    }

    return results;

  }

}
