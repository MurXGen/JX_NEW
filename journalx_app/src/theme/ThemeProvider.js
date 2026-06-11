import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getTheme } from "./tokens";
import { getItem, setItem, KEYS } from "../lib/storage";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState(getItem(KEYS.theme) || system || "dark");

  useEffect(() => {
    // if the user hasn't chosen explicitly, follow the system scheme
    if (!getItem(KEYS.theme) && system) setMode(system);
  }, [system]);

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
