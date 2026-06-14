import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [theme, setTheme] = useState<Theme>("light");

  // Load system scheme initially and on changes
  useEffect(() => {
    if (systemScheme) {
      setTheme(systemScheme);
    }
  }, [systemScheme]);

  // Keep global flag in sync
  (globalThis as any).isDarkMode = theme === "dark";

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
