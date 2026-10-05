// ============================================================
// src/App.tsx
// AJ Institutional
//
// Root routing for the new Algo Home and the existing Terminal.
// The existing Terminal remains untouched.
// ============================================================

import AlgoHome from "./pages/AlgoHome";
import Terminal from "./pages/Terminal";

function App() {
  const params = new URLSearchParams(window.location.search);

  // Existing chart terminal:
  // https://ajtrade.in/?terminal=1
  if (params.get("terminal") === "1") {
    return <Terminal />;
  }

  // New default homepage:
  // https://ajtrade.in/
  // https://ajtrade.in/?feed=fyers
  // https://ajtrade.in/?feed=indstocks
  return <AlgoHome />;
}

export default App;
