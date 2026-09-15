/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Trend/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Trend Engine.
 *
 * This barrel file provides a single entry point for the
 * Trend module and keeps the engine architecture consistent
 * with all other AJ institutional engines.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * TrendEngine
 *      ↓
 * TrendResult
 *      ↓
 * Momentum
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 ****************************************************************************************/

//======================================================
// ENGINE
//======================================================

export { TrendEngine } from "./TrendEngine";

//======================================================
// RESULT
//======================================================

export type {
    TrendResult
} from "./TrendResult";

//======================================================
// TYPES
//======================================================

export type {

    TrendInput,

    TrendDirection,

    TrendStrength,

    TrendStage,

    TrendPhase,

    AlphaTrendState,

    HigherTimeframeAlignment,

    EMAStructure,

    ADXInformation,

    AlphaTrendInformation,

    TrendMetrics,

    TrendConfiguration

} from "./TrendTypes";

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export {

    DefaultTrendConfiguration

} from "./TrendTypes";