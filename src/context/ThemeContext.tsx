import { ReactNode, createContext, useContext, useEffect, useMemo } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import useCookie from "react-use-cookie";

import { createCustomTheme, createCustomThemeLight } from "@src/styles/theme";

type ThemeMode = "light" | "dark";
interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);
const useThemeContext = () => useContext(ThemeContext);

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useCookie("themeMode");

  useEffect(() => {
    if (!themeMode) {
      setThemeMode("dark");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    switch (themeMode) {
      case "light":
        setThemeMode("dark");
        break;
      case "dark":
        setThemeMode("light");
        break;
      default:
    }
  };

  const getCorrectTheme = useMemo(() => {
    return themeMode === "light" ? createCustomThemeLight({ mode: "light" }) : createCustomTheme({ mode: "dark" });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode: themeMode as ThemeMode, toggleTheme }}>
      <MuiThemeProvider theme={getCorrectTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export { useThemeContext, ThemeProvider };
