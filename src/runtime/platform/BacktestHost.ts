//=======================
// .\src\runtime\platform\BacktestHost.ts
//============================
import { BacktestEngine } from "../../backtest/BacktestEngine";
import type {Signal} from "../signals/Signal";

export class BacktestHost {

  static evaluate(

    signals: Signal[]

  ) {

    return BacktestEngine.run(
      signals
    );

  }

}

