/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/RiskQualification/index.ts
 *
 * Purpose:
 * Public barrel exports for the AJ v2 Institutional Risk subsystem.
 *
 * Responsibilities:
 * -----------------
 * • Exposes the Risk Qualification Engine.
 * • Exposes the Institutional Entry Risk Engine.
 * • Exposes the Institutional Risk Model.
 * • Provides a single import location for all Risk contracts.
 *
 * No business logic belongs in this file.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * Market Analysis
 *      ↓
 * Trend / Momentum / Volatility
 *      ↓
 * Multi-Timeframe
 *      ↓
 * Risk Qualification
 *      ↓
 * Entry Risk Planning
 *      ↓
 * Institutional Risk Model
 *      ↓
 * Authority
 *      ↓
 * Execution
 ****************************************************************************************/

//======================================================
// RISK QUALIFICATION ENGINE
//======================================================

export * from "./RiskQualificationEngine";

export * from "./RiskQualificationTypes";

export * from "./RiskQualificationResult";

//======================================================
// ENTRY RISK ENGINE
//======================================================

export * from "./EntryRiskEngine";

export * from "./EntryRiskTypes";

export * from "./EntryRiskResult";

//======================================================
// INSTITUTIONAL RISK MODEL
//======================================================

export * from "./RiskModel";

export * from "./RiskTypes";

export * from "./RiskResult";

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export {

    DefaultRiskQualificationConfiguration

} from "./RiskQualificationTypes";