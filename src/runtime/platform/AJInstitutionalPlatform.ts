//====================================================
//src/runtime/platform/AJInstitutionalPlatform.ts
//=====================================================

import type {ScanResult} from "../../scanner/ScannerTypes";
import {AIHost} from "../../scanner/AIHost";


export class AJInstitutionalPlatform {

  static run(
    scans: ScanResult[],
    capital = 100000
  ) {
    const ranked = AIHost.run(scans);
    const symbols =
      ranked
        .slice(0,10)
        .map(
          x => x.symbol
        );

    const portfolio = {
        symbols,
        capital
    };

    return {
      ranked,
      portfolio
    };
  }
}

