/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Momentum/index.ts
 *
 * Purpose:
 * Public exports for the AJ v2 Momentum Engine.
 *
 * This barrel file exposes the Momentum Engine, result
 * contract and reusable types through a single entry point,
 * keeping the architecture consistent with every other
 * institutional engine.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * MomentumEngine
 *      ↓
 * MomentumResult
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

export { MomentumEngine } from "./MomentumEngine";

//======================================================
// RESULT
//======================================================

export type {
    MomentumResult
} from "./MomentumResult";

//======================================================
// TYPES
//======================================================

export type {

    MomentumInput,

    MomentumDirection,

    MomentumStrength,

    MomentumStage,

    BreakoutType,

    ImpulseType,

    RSIInformation,

    MomentumMetrics,

    BreakoutInformation,

    ImpulseInformation,

    MomentumConfiguration

} from "./MomentumTypes";

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export {

    DefaultMomentumConfiguration

} from "./MomentumTypes";