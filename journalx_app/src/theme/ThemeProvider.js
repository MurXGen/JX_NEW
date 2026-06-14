import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getTheme } from "./tokens";
import { getItem, setItem, KEYS } from "../lib/storage";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  useColorScheme(); // kept so the app re-renders on system changes
  // Default to the white (light) theme. We intentionally do NOT follow the
  // system scheme by default — light is the brand default. An explicit choice
  // the user made (saved under KEYS.theme) always wins and is restored here.
  const [mode, setMode] = useState(getItem(KEYS.theme) || "light");

  const setThemeMode = (next) => {
    setMode(next);
    setItem(KEYS.theme, next);
  };
  const toggleTheme = () => setThemeMode(mode === "dark" ? "light" : "dark");

  const theme = useMemo(() => getTheme(mode), [mode]);
  const value = useMemo(() => ({ theme, mode, setThemeMode, toggleTheme }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
