/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/PriceAction/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Price Action Engine.
 *
 * This barrel file provides a single import point for the
 * Price Action module and keeps the engine architecture
 * consistent with all other AJ institutional engines.
 *
 * AJ Architecture
 *
 * Runtime
 *     ↓
 * PriceActionEngine
 *     ↓
 * PriceActionResult
 *     ↓
 * Trend
 *     ↓
 * Momentum
 *     ↓
 * Risk
 *     ↓
 * Confidence
 ****************************************************************************************/

//======================================================
// ENGINE
//======================================================

export { PriceActionEngine } from "./PriceActionEngine";

//======================================================
// TYPES
//======================================================

export type {
    PriceActionInput,
    PriceActionCandle,
    CandleMetrics,
    CompressionState,
    ExpansionState,
    ReversalEvidence,
    PriceActionConfiguration,
    CandleQuality,
    WickQuality,
    RejectionType,
    PriceActionPattern
} from "./PriceActionTypes";

//======================================================
// RESULT
//======================================================

export type {
    PriceActionResult
} from "./PriceActionResult";

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export {
    DefaultPriceActionConfiguration
} from "./PriceActionTypes";