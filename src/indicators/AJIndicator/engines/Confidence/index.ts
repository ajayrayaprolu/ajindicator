/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Confidence/index.ts
 *
 * Purpose:
 * Public barrel exports for the AJ v2 Institutional Confidence subsystem.
 *
 * Responsibilities:
 * -----------------
 * • Exposes the Confidence Engine.
 * • Exposes Confidence contracts.
 * • Exposes Evidence contracts.
 * • Exposes Confidence Factors and scoring metadata.
 * • Provides a single import location for all Confidence components.
 *
 * No business logic belongs in this file.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Trend
 *      ↓
 * Momentum
 *      ↓
 * Market Structure
 *      ↓
 * Liquidity
 *      ↓
 * Order Flow
 *      ↓
 * Volatility
 *      ↓
 * Multi-Timeframe
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 *      ↓
 * Execution
 ****************************************************************************************/

//======================================================
// CONFIDENCE ENGINE
//======================================================

export * from "./ConfidenceEngine";

//======================================================
// CONFIDENCE CONTRACTS
//======================================================

export * from "./ConfidenceTypes";

export * from "./ConfidenceResult";

//======================================================
// EVIDENCE
//======================================================

export * from "./ConfidenceEvidence";

//======================================================
// FACTORS
//======================================================

export * from "./ConfidenceFactors";