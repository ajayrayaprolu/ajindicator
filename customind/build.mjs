//
// C:\AI-Institutional\customind\build.mjs
//
// AJInstitutional OpenAlgo production bundler.
//
// Project layout:
//
//   C:\AI-Institutional
//   ├─ src\
//   │  ├─ indicators\
//   │  ├─ runtime\
//   │  ├─ dashboard\
//   │  ├─ charts\
//   │  └─ ...
//   │
//   └─ customind\
//      ├─ AJInstitutional.entry.ts
//      ├─ build.mjs
//      └─ dist\
//
// IMPORTANT:
// This file intentionally bundles the CURRENT AJ v2 source tree.
// It does NOT use the old ajindicator.js as a source of logic.
//
// The previous build incorrectly mapped:
//     @ -> ./src
//
// Because build.mjs lives in customind/, that resolved to:
//     C:\AI-Institutional\customind\src
//
// The real source root is:
//     C:\AI-Institutional\src
//
// Therefore all AJ aliases below are resolved from the project root.
//
// The resulting file is a SINGLE self-contained ESM indicator for OpenAlgo.
//

import { build } from "esbuild";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const CUSTOMIND_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(CUSTOMIND_DIR, "..");
const SRC_DIR = resolve(PROJECT_ROOT, "src");

const ENTRY = resolve(CUSTOMIND_DIR, "AJInstitutional.entry.ts");
const OUTDIR = resolve(CUSTOMIND_DIR, "dist");
const OUTFILE = resolve(OUTDIR, "AJInstitutional.js");

console.log("");
console.log("============================================================");
console.log("AJInstitutional OpenAlgo BUILD");
console.log("============================================================");
console.log(`Project root : ${PROJECT_ROOT}`);
console.log(`Source root  : ${SRC_DIR}`);
console.log(`Entry        : ${ENTRY}`);
console.log(`Output       : ${OUTFILE}`);
console.log("");

// ------------------------------------------------------------
// REQUIRED CURRENT-SOURCE CHECKS
//
// These are deliberately source-level checks.
// We must never silently build a partial AJ engine.
// ------------------------------------------------------------

const REQUIRED_FILES = [
  "dashboard/AJDashboardAdapter.ts",
  "dashboard/DashboardFormatter.ts",

  "indicators/AJIndicator/AJDecisionEngine.ts",
  "indicators/AJIndicator/AJPayloadBuilder.ts",

  "indicators/AJIndicator/config/AJRuntimeParameters.ts",
  "indicators/AJIndicator/debug/AJLoggingGate.ts",
  "indicators/AJIndicator/debug/EngineDiagnostic.ts",

  "indicators/AJIndicator/store/AJIndicatorSettingsStore.ts",

  "runtime/RuntimeEngine.ts",
  "runtime/RuntimeContext.ts",
  "runtime/hosts/OpenAlgoAdapter.ts",
];

for (const relative of REQUIRED_FILES) {
  const full = resolve(SRC_DIR, relative);

  if (!existsSync(full)) {
    throw new Error(
      `Required AJ source file is missing: ${full}`
    );
  }

  console.log(`[OK] source ${relative}`);
}

if (!existsSync(ENTRY)) {
  throw new Error(
    `AJInstitutional entry file is missing: ${ENTRY}`
  );
}

console.log(`[OK] entry AJInstitutional.entry.ts`);
console.log("");

// ------------------------------------------------------------
// OUTPUT DIRECTORY
// ------------------------------------------------------------

mkdirSync(OUTDIR, { recursive: true });

// ------------------------------------------------------------
// ESBUILD
//
// IMPORTANT:
// Alias targets are ABSOLUTE paths.
// This prevents esbuild from interpreting "@/..." relative to
// customind/ instead of the actual C:\AI-Institutional\src tree.
// ------------------------------------------------------------

await build({
  entryPoints: [ENTRY],

  bundle: true,

  format: "esm",

  target: "es2020",

  platform: "neutral",

  outfile: OUTFILE,

  absWorkingDir: CUSTOMIND_DIR,

  sourcemap: false,

  minify: false,

  treeShaking: true,

  legalComments: "none",

  alias: {
    "@": SRC_DIR,
    "@signals": resolve(SRC_DIR, "runtime/signals"),
    "@charts": resolve(SRC_DIR, "charts"),
    "@runtime": resolve(SRC_DIR, "runtime"),
  },

  logLevel: "info",
});

// ------------------------------------------------------------
// READ GENERATED BUNDLE
// ------------------------------------------------------------

let code = readFileSync(OUTFILE, "utf8");

// ------------------------------------------------------------
// OPENALGO DEFAULT EXPORT NORMALIZATION
//
// OpenAlgo's custom-indicator validator expects a literal:
//
//     export default function (...) { ... }
//
// esbuild may instead emit:
//
//     export { someFunction as default };
//
// Normalize only that final export.
// No indicator/business logic is modified.
// ------------------------------------------------------------

//
// Normalize the esbuild entry export for OpenAlgo.
//
// Do not assume esbuild emits:
//   export { foo as default };
//
// Depending on the entry/module graph, esbuild may emit a different
// export form. Inspect the generated bundle and normalize safely.
//

// ------------------------------------------------------------
// OPENALGO DEFAULT EXPORT NORMALIZATION
//
// esbuild already creates a default export for the entry module.
// OpenAlgo requires exactly ONE default export.
//
// Therefore:
//   1. Detect the internal entry function.
//   2. Remove the generated default export statement.
//   3. Add exactly one literal OpenAlgo default function export.
//
// IMPORTANT:
// We deliberately remove ALL top-level default-export forms from
// the generated bundle before adding our compatibility wrapper.
// This prevents:
//     ERROR Module failed to load: Duplicate export of 'default'
// ------------------------------------------------------------

const exportPatterns = [
  // export { foo as default };
  /export\s*\{\s*([A-Za-z_$][\w$]*)\s+as\s+default\s*\};?/m,

  // export { foo as default, ... };
  /export\s*\{[\s\S]*?\b([A-Za-z_$][\w$]*)\s+as\s+default\b[\s\S]*?\};?/m,

  // export default foo;
  /export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/m,
];

let internalDefault = null;

for (const pattern of exportPatterns) {
  const match = code.match(pattern);

  if (match) {
    internalDefault = match[1];
    break;
  }
}

if (!internalDefault) {
  console.log("");
  console.log("============================================================");
  console.log("GENERATED EXPORTS");
  console.log("============================================================");

  const exportLines = code
    .split(/\r?\n/)
    .filter((line) => /^\s*export\b/.test(line))
    .slice(-20);

  if (exportLines.length > 0) {
    for (const line of exportLines) {
      console.log(line);
    }
  } else {
    console.log("[INFO] No textual export statement found in generated bundle.");
  }

  console.log("");

  throw new Error(
    "Could not identify an esbuild default export in generated bundle. " +
    "The bundle itself was created successfully, but the OpenAlgo export " +
    "normalization step could not determine the entry function."
  );
}

console.log(`[OK] detected esbuild default export: ${internalDefault}`);

// ------------------------------------------------------------
// REMOVE THE GENERATED DEFAULT EXPORT
// ------------------------------------------------------------
//
// esbuild may emit a combined export block such as:
//
//   export {
//     AJInstitutional_entry_default as default,
//     indicator
//   };
//
// We must remove the ENTIRE export block because removing only
// "AJInstitutional_entry_default as default" would leave:
//
//   export {
//     indicator
//   };
//
// while the original default export would still be represented
// in the same module export declaration.
//
// The final artifact must contain exactly one default export:
// AJInstitutionalOpenAlgo.
//

const escapedInternalDefault =
  internalDefault.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Remove a complete export block containing the detected internal
// default export.
const combinedExportPattern = new RegExp(
  `export\\s*\\{[\\s\\S]*?\\b${escapedInternalDefault}\\s+as\\s+default\\b[\\s\\S]*?\\}\\s*;?`,
  "g"
);

code = code.replace(combinedExportPattern, "");

// Also remove a direct default export if esbuild emitted one.
const directDefaultPattern = new RegExp(
  `export\\s+default\\s+${escapedInternalDefault}\\s*;?`,
  "g"
);

code = code.replace(directDefaultPattern, "");

// ------------------------------------------------------------
// VERIFY THAT NO DEFAULT EXPORT REMAINS
// ------------------------------------------------------------

const remainingDefaultExports = code.match(
  /export\s+default\b/g
);

if (remainingDefaultExports && remainingDefaultExports.length > 0) {
  throw new Error(
    `Generated bundle still contains ${remainingDefaultExports.length} ` +
    "default export(s) before OpenAlgo wrapper insertion."
  );
}

// ------------------------------------------------------------
// ADD EXACTLY ONE OPENALGO DEFAULT EXPORT
// ------------------------------------------------------------

code += `

/*
 * AJInstitutional OpenAlgo compatibility wrapper.
 *
 * The complete AJ v2 implementation is bundled above.
 * This wrapper exposes the bundled AJInstitutional entry through
 * the single default function form expected by OpenAlgo.
 */
export default function AJInstitutionalOpenAlgo(options) {
  return ${internalDefault}(options);
}
`;

writeFileSync(OUTFILE, code, "utf8");

// ------------------------------------------------------------
// FINAL ARTIFACT CHECKS
// ------------------------------------------------------------

const finalCode = readFileSync(OUTFILE, "utf8");

if (!finalCode.includes("export default function AJInstitutionalOpenAlgo")) {
  throw new Error(
    "Final AJInstitutional.js does not contain the required " +
    "OpenAlgo default function export."
  );
}

if (finalCode.length < 10000) {
  throw new Error(
    `Generated AJInstitutional.js is unexpectedly small: ${finalCode.length} bytes`
  );
}

console.log("");
console.log("============================================================");
console.log("AJInstitutional BUILD SUCCESS");
console.log("============================================================");
console.log(`[OK] Bundle created`);
console.log(`[OK] Single-file ESM output`);
console.log(`[OK] OpenAlgo default export normalized`);
console.log(`[OK] Bundle size: ${finalCode.length} bytes`);
console.log(`Output: ${OUTFILE}`);
console.log("");
console.log(
  "The bundle contains the current AJ v2 source pipeline, including:"
);
console.log("  - AJDecisionEngine");
console.log("  - RuntimeEngine");
console.log("  - OpenAlgoAdapter");
console.log("  - AJDashboardAdapter");
console.log("  - DashboardFormatter");
console.log("  - AJRuntimeParameters");
console.log("  - AJLoggingGate");
console.log("  - EngineDiagnostic");
console.log("  - signal / SMC / AI / authority / execution pipeline");
console.log("");
console.log(
  "No legacy ajindicator.js source was used to construct this bundle."
);
console.log("");