/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/MultiTimeframe/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Multi-Timeframe Engine.
 *
 * This barrel file exposes the Multi-Timeframe Engine,
 * result contract and reusable types through a single
 * entry point, maintaining consistency with every other
 * AJ institutional engine.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * MultiTimeframeEngine
 *      ↓
 * MultiTimeframeResult
 *      ↓
 * Trend
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

export { MultiTimeframeEngine } from "./MultiTimeframeEngine";

//======================================================
// RESULT
//======================================================

export type {
    MultiTimeframeResult
} from "./MultiTimeframeResult";

//======================================================
// TYPES
//======================================================

export type {

    MultiTimeframeInput,

    TimeframeVote,

    TimeframeDirection,

    TimeframeName,

    DominantTrend,

    AgreementLevel,

    AgreementMetrics,

    ConflictMetrics,

    MultiTimeframeConfiguration

} from "./MultiTimeframeTypes";

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export {

    DefaultMultiTimeframeConfiguration

} from "./MultiTimeframeTypes";