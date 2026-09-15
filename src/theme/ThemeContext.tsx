//======================================
// src/theme/ThemeContext.tsx
// AJ Institutional
// GLOBAL Theme Context
//                    ThemeContext
//                         │
//                         ▼
//                 data-theme="dark"
//                 data-theme="light"
//                         │
//                         ▼
//                    theme.css
//                         │
//        ┌────────────────┼────────────────┐
//        ▼                ▼                ▼
//   Chart Window     AJ Console       Workspace
//        │                │                │
//        ▼                ▼                ▼
//   toolbar/grid     dashboard       controls/panels
//        │                │                │
//        └────────────────┼────────────────┘
//                         ▼
//                 GLOBAL THEME
//======================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

//======================================
// TYPES
//======================================

export type ThemeMode =
  | "dark"
  | "light";

interface ThemeContextValue {

  theme: ThemeMode;

  toggleTheme: () => void;

  setTheme: (
    theme: ThemeMode
  ) => void;

}

//======================================
// CONTEXT
//======================================

const ThemeContext =
  createContext<
    ThemeContextValue | undefined
  >(undefined);

//======================================
// STORAGE
//======================================

const THEME_STORAGE_KEY =
  "aj-theme";

//======================================
// INITIAL THEME
//======================================

function getInitialTheme(): ThemeMode {

  try {

    const savedTheme =
      localStorage.getItem(
        THEME_STORAGE_KEY
      );

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {

      return savedTheme;

    }

  } catch {
    // Ignore localStorage errors.
  }

  return "dark";
}

//======================================
// PROVIDER
//======================================

interface ThemeProviderProps {

  children: ReactNode;

}

export function ThemeProvider({
  children
}: ThemeProviderProps) {

  const [
    theme,
    setThemeState
  ] = useState<ThemeMode>(
    getInitialTheme
  );

  //====================================
  // APPLY GLOBAL THEME
  //====================================

  useEffect(() => {

    const root =
      document.documentElement;

    root.setAttribute(
      "data-theme",
      theme
    );

    try {

      localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
      );

    } catch {
      // Ignore localStorage errors.
    }

  }, [theme]);

  //====================================
  // TOGGLE
  //====================================

  function toggleTheme() {

    setThemeState(
      previous =>
        previous === "dark"
          ? "light"
          : "dark"
    );

  }

  //====================================
  // EXPLICIT SET
  //====================================

  function setTheme(
    nextTheme: ThemeMode
  ) {

    setThemeState(
      nextTheme
    );

  }

  //====================================
  // RENDER
  //====================================

  return (

    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme
      }}
    >

      {children}

    </ThemeContext.Provider>

  );

}

//======================================
// HOOK
//======================================

export function useTheme() {

  const context =
    useContext(
      ThemeContext
    );

  if (!context) {

    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );

  }

  return context;

}