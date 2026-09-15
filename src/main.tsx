//==================================
// src/main.tsx
// AJ Institutional
//==================================

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

//------------------------------------
// AJ Runtime Boot
//------------------------------------

bootstrapRuntime();

//------------------------------------
// React Application
//------------------------------------

createRoot(
  document.getElementById("root")!
).render(

  <StrictMode>

    <ThemeProvider>

      <App />

    </ThemeProvider>

  </StrictMode>

);