/****************************************************************************************
 * File:
 * index.ts
 *
 * Path:
 * src/indicators/AJIndicator/hosts/index.ts
 *
 * Purpose:
 * Public barrel exports for the AJ Institutional Host layer.
 *
 * The Host layer adapts the canonical RuntimeResult into a renderer-ready
 * payload consumed by ChartEngine, Dashboard, Replay Engine and future
 * visualization modules.
 *
 * Responsibilities:
 * -----------------
 * • Export AJHost.
 * • Provide a single import entry for host components.
 * • Isolate renderer dependencies from the decision pipeline.
 *
 * AJ Architecture
 *
 * RuntimeEngine
 *        │
 *        ▼
 * RuntimeResult
 *        │
 *        ▼
 * AJHost
 *        │
 *        ▼
 * ChartEngine
 * Dashboard
 * Replay
 * Analytics
 ****************************************************************************************/

//======================================================
// HOST
//======================================================

export { AJHost } from "./AJHost";