/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/context/index.ts
 *
 * Purpose:
 * Public barrel exports for the AJ Institutional Context subsystem.
 *
 * The Context layer is responsible for evaluating the current market
 * environment before any confidence scoring, authority decisions,
 * risk qualification, or execution planning occurs.
 *
 * This module exposes the Context Engine together with its canonical
 * input and output contracts. It also re-exports the Confidence
 * subsystem so downstream consumers can transition from the legacy
 * score-based architecture to the institutional confidence model
 * through a single import path.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Context
 *      ↓
 * Confidence
 *      ↓
 * Risk Qualification
 *      ↓
 * Authority
 *      ↓
 * Execution
 *
 * Responsibilities
 *
 * ✅ Export ContextEngine
 * ✅ Export Context input contracts
 * ✅ Export Context result contracts
 * ✅ Re-export Confidence engine
 * ✅ Provide a single entry point for context-related modules
 * ✅ Maintain compatibility during migration from ScoreEngine
 *    to ConfidenceEngine
 ****************************************************************************************/

//======================================================
// CONTEXT ENGINE
//======================================================

export * from "./ContextEngine";

//======================================================
// CONTEXT TYPES
//======================================================

export * from "./AJContextTypes";

//======================================================
// CONTEXT RESULT
//======================================================

export * from "./AJContextResult";

//======================================================
// CONFIDENCE ENGINE
//======================================================

export * from "../engines/Confidence";