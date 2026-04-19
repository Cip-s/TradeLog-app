import { createContext, useContext, useState, ReactNode } from "react";

type Theme = {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
  negative: string;
  inputBg: string;
};

const darkTheme: Theme = {
  dark: true,
  bg: "#0d1117",
  card: "#1a1f2e",
  text: "#ffffff",
  subtext: "#888888",
  border: "#2a3044",
  accent: "#00c896",
  negative: "#ff4d6d",
  inputBg: "#1a1f2e",
};

const lightTheme: Theme = {
  dark: false,
  bg: "#f0f4f8",
  card: "#ffffff",
  text: "#0d1117",
  subtext: "#666666",
  border: "#e0e0e0",
  accent: "#00a87a",
  negative: "#e03050",
  inputBg: "#ffffff",
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark((v) => !v);
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
