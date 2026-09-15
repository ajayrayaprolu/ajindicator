//==============================
// src/scanner/TestScanner.ts
//=================================
import {ScannerEngine} from "./ScannerEngine";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
//======================================================

async function test() {

  const results =
    await ScannerEngine.scan(
      [
        "NIFTY",
        "BANKNIFTY",
        "RELIANCE",
        "BTCUSDT",
        "ETHUSDT"
      ],
      "5m",
      "Yahoo"
    );

  AJLoggingGate.log(
    results
  );

}

test();
