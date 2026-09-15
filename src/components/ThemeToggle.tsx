//======================================
// src/components/ThemeToggle.tsx
// AJ Institutional
// Global Dark / Light Theme Toggle
//                    ┌───────────────────┐
//                    │   ThemeToggle     │
//                    └─────────┬─────────┘
//                              │
//                              ▼
//                    ┌───────────────────┐
//                    │   ThemeContext    │
//                    │                   │
//                    │ dark ↔ light      │
//                    └─────────┬─────────┘
//                              │
//                    data-theme attribute
//                              │
//              ┌───────────────┼────────────────┐
//              ▼               ▼                ▼
//         theme.css       Workspace8       Chart Engine
//              │               │                │
//              ▼               ▼                ▼
//          UI colors       chart panels     canvas colors
//              │               │                │
//              └───────────────┼────────────────┘
//                              ▼
//                     ENTIRE APPLICATION
//======================================

import {
  useTheme
} from "../theme/ThemeContext";

//======================================
// COMPONENT
//======================================

export default function ThemeToggle() {

  const {
    theme,
    toggleTheme
  } = useTheme();

  const isDark =
    theme === "dark";

  return (

    <button
      type="button"
      onClick={toggleTheme}
      title={
        isDark
          ? "Switch to Light Theme"
          : "Switch to Dark Theme"
      }
      aria-label={
        isDark
          ? "Switch to Light Theme"
          : "Switch to Dark Theme"
      }
      style={{
        height: 30,

        minWidth: 36,

        padding: "0 8px",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        gap: 5,

        background:
          "var(--bg-panel)",

        color:
          "var(--text-primary)",

        border:
          "1px solid var(--border-primary)",

        borderRadius: 4,

        cursor: "pointer",

        fontSize: 14,

        fontWeight: 700,

        boxShadow:
          "var(--shadow)"
      }}
    >

      <span
        aria-hidden="true"
      >
        {isDark ? "☀" : "☾"}
      </span>

    </button>

  );

}