/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Volatility/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Volatility Engine.
 *
 * This barrel file exposes the Volatility Engine, result
 * contract and reusable types through a single entry point,
 * keeping the architecture consistent with every other
 * institutional engine.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * VolatilityEngine
 *      ↓
 * VolatilityResult
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

export { VolatilityEngine } from "./VolatilityEngine";

//======================================================
// RESULT
//======================================================

export type {
    VolatilityResult
} from "./VolatilityResult";

//======================================================
// TYPES
//======================================================

export type {

    VolatilityInput,

    VolatilityDirection,

    VolatilityStrength,

    VolatilityRegime,

    ATRInformation,

    ExpansionInformation,

    CompressionInformation,

    VolatilityMetrics,

    VolatilityConfiguration

} from "./VolatilityTypes";

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export {

    DefaultVolatilityConfiguration

} from "./VolatilityTypes";