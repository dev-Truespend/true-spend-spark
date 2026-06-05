import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { typography } from "@/shared/theme/typography";

type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo<Theme>(() => ({ colors, spacing, typography }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}
