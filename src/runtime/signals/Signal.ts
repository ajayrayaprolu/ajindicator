//=========================================
// src\runtime\signals\Signal.ts
//==========================================

import type { AJDecisionResult } from "../../indicators/AJIndicator/AJTypes";

export interface Signal {

  //--------------------------------------------------
  // BAR CONTEXT
  //--------------------------------------------------

  index: number;
  time: number;

  //--------------------------------------------------
  // EXECUTION ACTION
  //--------------------------------------------------

  action: "BUY" | "SELL" | "SHORT" | "COVER";

  direction: -1 | 0 | 1;

  //--------------------------------------------------
  // PRICE MODEL
  //--------------------------------------------------

  price: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;

  //--------------------------------------------------
  // RISK + QUALITY
  //--------------------------------------------------

  tradeScore: number;

  executionAllowed: boolean;

  //--------------------------------------------------
  // LIFECYCLE STATE MACHINE
  //--------------------------------------------------

  state:
    | "SCAN"
    | "ARMED"
    | "CONFIRMED"
    | "EXECUTED"
    | "MANAGE"
    | "CLOSED";

  //--------------------------------------------------
  // OPTIONAL CONTEXT
  //--------------------------------------------------

  optionSymbol?: string;
  reason: string;

  //--------------------------------------------------
  // EXECUTION EVENT
  //--------------------------------------------------

  enteredExecuted: boolean;

  //--------------------------------------------------
  // DEBUG / TRACEABILITY
  //--------------------------------------------------

  decision: AJDecisionResult;

}
