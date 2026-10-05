/*==================================
  src/main.tsx
  AJ Institutional
==================================*/

import {
  StrictMode
} from "react";

import {
  createRoot
} from "react-dom/client";

import "./index.css";

import "./theme/theme.css";

import App from "./App";

import {
  bootstrapRuntime
} from "./runtime/bootstrap";

import {
  ThemeProvider
} from "./theme/ThemeContext";

/*------------------------------------
  Console Silence Boot
------------------------------------
  All browser console output is disabled at
  startup. Nothing from this application may
  appear in the browser F12 console, in any
  environment, in any mode. AJLoggingGate is
  forced OFF first so no AJ engine can turn
  diagnostics back on, and the console methods
  themselves are no-op'd so raw console.log /
  warn / error / info / debug calls anywhere
  in the bundle stay silent as well.

  Server-side logging is unaffected: all
  diagnostics continue into log/errors.jsonl.
------------------------------------*/

import {
  AJLoggingGate
} from "./indicators/AJIndicator/debug/AJLoggingGate";

AJLoggingGate.setEnabled(false);

type ConsoleMethod =
  (...args: unknown[]) => void;

const consoleSilence: string[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "trace",
  "dir",
  "dirxml",
  "group",
  "groupEnd",
  "groupCollapsed",
  "table",
  "time",
  "timeEnd",
  "timeLog",
  "count",
  "countReset",
  "assert"
];

const nativeConsole: Record<string, unknown> =
  console as unknown as Record<string, unknown>;

const noopConsoleMethod: ConsoleMethod =
  () => {
    /* console silenced */
  };

for (const method of consoleSilence) {
  if (typeof nativeConsole[method] === "function") {
    (
      console as unknown as Record<
        string,
        ConsoleMethod
      >
    )[method] = noopConsoleMethod;
  }
}

/*------------------------------------
  AJ Runtime Boot
------------------------------------*/

bootstrapRuntime();

/*------------------------------------
  React Application Root
------------------------------------
  The old AJWelcomeGateway has been
  intentionally removed.

  Homepage routing is now handled by
  src/App.tsx.

  Therefore:

    /
      → AJ Institutional Algo Home

    /?feed=fyers
      → Algo Home / FYERS

    /?feed=indstocks
      → Algo Home / INDSTOCKS

    /?terminal=1
      → Existing AJTrade Terminal

  The existing Terminal / ChartWindow /
  broker-feed implementation is not changed
  by this file.
------------------------------------*/

function AJRoot() {
  return (
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
}

/*------------------------------------
  Mount AJ Institutional
------------------------------------*/

createRoot(
  document.getElementById("root")!
).render(
  <AJRoot />
);